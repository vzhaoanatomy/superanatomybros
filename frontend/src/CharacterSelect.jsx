import { useEffect, useRef } from 'react';
import { CHARACTERS } from './game/characters';
import { drawPlayer } from './game/spriteRenderer';

const PREVIEW_SIZE = 96;

function CharacterCard({ character, onSelect }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    const width = PREVIEW_SIZE * 0.55;
    const height = PREVIEW_SIZE * 0.8;
    drawPlayer(
      ctx,
      { x: (PREVIEW_SIZE - width) / 2, y: (PREVIEW_SIZE - height) / 2, width, height, facing: 1 },
      character.id,
      {}
    );
  }, [character.id]);

  return (
    <button
      type="button"
      onClick={() => onSelect(character.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        background: '#16213a',
        border: '2px solid #2a3a5c',
        borderRadius: 8,
        color: '#fff',
        cursor: 'pointer',
        width: 160,
      }}
    >
      <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} style={{ imageRendering: 'pixelated' }} />
      <strong>{character.name}</strong>
      <span style={{ fontSize: 13, color: '#ffd23f' }}>{character.abilityName}</span>
      <span style={{ fontSize: 11, color: '#aab4cc', textAlign: 'center' }}>{character.abilityDescription}</span>
    </button>
  );
}

export default function CharacterSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', color: '#fff', padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Super Anatomy Bros</h1>
      <p style={{ color: '#aab4cc', marginBottom: 24 }}>Choose your character</p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {CHARACTERS.map((c) => (
          <CharacterCard key={c.id} character={c} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
