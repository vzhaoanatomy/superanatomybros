import { useEffect, useRef } from 'react';
import { CHARACTERS } from './game/characters';
import { drawPlayer } from './game/spriteRenderer';

const PREVIEW_SIZE = 96;

function CharacterCard({ character, onSelect }) {
  const canvasRef = useRef(null);
  const accent = character.colors.cap ?? character.colors.crown ?? character.colors.hair;

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
        border: `3px solid ${accent}`,
        borderRadius: 10,
        boxShadow: '0 4px 0 rgba(0,0,0,0.35)',
        color: '#fff',
        cursor: 'pointer',
        width: 190,
      }}
    >
      <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} style={{ imageRendering: 'pixelated' }} />
      <strong style={{ fontSize: 14, lineHeight: 1.3 }}>{character.name}</strong>
      <span style={{ fontSize: 13, color: '#ffd23f' }}>{character.abilityName}</span>
      <span style={{ fontSize: 11, color: '#aab4cc', textAlign: 'center' }}>{character.abilityDescription}</span>
    </button>
  );
}

export default function CharacterSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', color: '#1a2a4a', padding: 24 }}>
      <div className="title-banner">
        <h1 style={{ fontSize: 32 }}>Choose Your Character</h1>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
        {CHARACTERS.map((c) => (
          <CharacterCard key={c.id} character={c} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
