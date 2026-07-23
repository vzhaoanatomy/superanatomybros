import { useEffect, useRef } from 'react';
import { CHARACTERS } from './characters';
import { drawBackground, drawPlayer } from './spriteRenderer';
import { getBestLocalScore } from '../storage';

const PREVIEW_W = 190;
const PREVIEW_H = 96;

// Shared between the teacher's WorldSelect grid and the student's
// StudentHome library — same canvas preview, same card chrome, so a joined
// world looks exactly like the one the teacher published.
export default function WorldCard({ world, onSelect }) {
  const canvasRef = useRef(null);
  // Joined classroom worlds (student library) never carry a numeric index —
  // that numbering only exists for the teacher's own built-in/custom list —
  // so this falls back to a stable pick rather than NaN.
  // Custom/teacher-made decks stick to just Dr. Marrow and Nurse Liggy
  // (alternating) rather than cycling through all 4 — Chief Madam Plasma
  // and Dr. Bowtox stay reserved for the built-in 7.
  const heroId = world.custom
    ? CHARACTERS[(world.index ?? 1) % 2].id
    : CHARACTERS[Math.max(0, (world.index ?? 1) - 1) % CHARACTERS.length].id;
  const bestScore = getBestLocalScore(world.id);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    drawBackground(ctx, PREVIEW_W, PREVIEW_H, world.palette);
    ctx.fillStyle = world.palette.ground;
    ctx.fillRect(0, PREVIEW_H - 20, PREVIEW_W, 20);
    drawPlayer(
      ctx,
      { x: PREVIEW_W / 2 - 15, y: PREVIEW_H - 20 - 46, width: 30, height: 46, facing: 1 },
      heroId,
      {}
    );
  }, [world.id, heroId]);

  return (
    <button
      type="button"
      onClick={() => onSelect(world.id)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        background: '#16213a',
        border: `3px solid ${world.palette.accent}`,
        borderRadius: 10,
        boxShadow: '0 4px 0 rgba(0,0,0,0.35)',
        color: '#fff',
        cursor: 'pointer',
        width: 190,
      }}
    >
      {world.custom && (
        <span style={{ position: 'absolute', top: -10, right: -6, fontSize: 20 }} title="Custom world">
          ⭐
        </span>
      )}
      <canvas
        ref={canvasRef}
        width={PREVIEW_W}
        height={PREVIEW_H}
        style={{ borderRadius: 6, imageRendering: 'pixelated', display: 'block' }}
      />
      <strong style={{ fontSize: 14 }}>{world.name}</strong>
      <span style={{ fontSize: 12, color: world.palette.accent }}>{world.subtitle || '🦠 Viruses & Bacteria'}</span>
      {bestScore != null && <span style={{ fontSize: 11, color: '#9fb0d0' }}>Best: {bestScore}</span>}
      {world.isClassroom && <span style={{ fontSize: 11, color: '#9fb0d0' }}>Code: {world.code}</span>}
    </button>
  );
}
