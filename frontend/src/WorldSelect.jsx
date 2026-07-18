import { useEffect, useRef } from 'react';
import { WORLDS } from './game/worlds';
import { CHARACTERS } from './game/characters';
import { drawBackground, drawPlayer } from './game/spriteRenderer';

const ENEMY_LABELS = {
  goomba: 'Goomba-style blob',
  skinBlob: 'Skin-disease blob',
  skeleton: 'Skeleton',
  muscleBrawler: 'Muscle-brawler',
  neuron: 'Neuron',
  clot: 'Blood clot',
  labCat: 'Lab cat',
  dragonling: 'Dragonlings',
};

const PREVIEW_W = 190;
const PREVIEW_H = 96;

function WorldCard({ world, onSelect }) {
  const canvasRef = useRef(null);
  const heroId = CHARACTERS[(world.index - 1) % CHARACTERS.length].id;

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
      <canvas
        ref={canvasRef}
        width={PREVIEW_W}
        height={PREVIEW_H}
        style={{ borderRadius: 6, imageRendering: 'pixelated', display: 'block' }}
      />
      <strong style={{ fontSize: 14 }}>
        World {world.index}: {world.name}
      </strong>
      <span style={{ fontSize: 12, color: world.palette.accent }}>{ENEMY_LABELS[world.enemyType]}</span>
    </button>
  );
}

export default function WorldSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', color: '#1a2a4a', padding: 24 }}>
      <div className="title-banner">
        <h1>Super Anatomy Bros</h1>
      </div>
      <p className="tagline-ribbon">
        Anatomy and Physiology Edition — Collect as many coins as you can. Highest score wins!
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '24px auto 0' }}>
        {WORLDS.map((world) => (
          <WorldCard key={world.id} world={world} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
