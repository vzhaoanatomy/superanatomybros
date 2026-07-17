import { WORLDS } from './game/worlds';

const ENEMY_LABELS = {
  goomba: 'Goomba-style blob',
  skinBlob: 'Skin-disease blob',
  skeleton: 'Skeleton',
  muscleBrawler: 'Muscle-brawler',
  neuron: 'Neuron',
  labCat: 'Lab cat',
  dragonling: 'Dragonlings',
};

export default function WorldSelect({ onSelect }) {
  return (
    <div style={{ textAlign: 'center', color: '#fff', padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>Super Anatomy Bros</h1>
      <p style={{ color: '#aab4cc', marginBottom: 24 }}>
        Anatomy and Physiology Edition — Collect as many coins as you can. Highest score wins!
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
        {WORLDS.map((world) => (
          <button
            key={world.id}
            type="button"
            onClick={() => onSelect(world.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: 16,
              background: '#16213a',
              border: `2px solid ${world.palette.accent}55`,
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              width: 190,
            }}
          >
            <div
              style={{
                width: '100%',
                height: 56,
                borderRadius: 6,
                background: `linear-gradient(180deg, ${world.palette.sky}, ${world.palette.ground})`,
              }}
            />
            <strong style={{ fontSize: 14 }}>
              World {world.index}: {world.name}
            </strong>
            <span style={{ fontSize: 12, color: world.palette.accent }}>{ENEMY_LABELS[world.enemyType]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
