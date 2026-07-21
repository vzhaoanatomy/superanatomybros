import { backdrop } from './overlayStyles';

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

const cardStyle = {
  width: 520,
  maxWidth: '92%',
  background: '#0e1526',
  border: '4px solid #000',
  borderRadius: 12,
  padding: '26px 28px',
  color: '#fff',
  fontFamily: FONT,
  boxShadow: '6px 6px 0 rgba(0,0,0,0.35)',
};

const tipStyle = {
  display: 'flex',
  gap: 8,
  fontSize: 13.5,
  color: '#c8d3ea',
  marginBottom: 6,
  lineHeight: 1.4,
};

export default function LevelIntro({ world, character, onStart }) {
  return (
    <div style={backdrop}>
      <div style={cardStyle}>
        <p style={{ margin: '0 0 4px', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#ffd23f' }}>
          Mission Briefing
        </p>
        <h2 style={{ margin: '0 0 14px', fontSize: 22 }}>
          🩺 {world?.name}
          {world?.subtitle ? ` — ${world.subtitle}` : ''}
        </h2>

        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#e6ecfa', margin: '0 0 14px' }}>
          An outbreak has taken hold of the {world?.subtitle || 'body'}. As <strong>{character?.name}</strong>,
          you're the first responder sent in to contain it — clear the pathogens, answer questions to prove
          your diagnosis skills, and reach the flag to close out this system before the infection spreads.
        </p>

        {character?.abilityName && (
          <p
            style={{
              fontSize: 13,
              color: '#7de37b',
              background: '#132018',
              border: '2px solid #1e8449',
              borderRadius: 6,
              padding: '8px 10px',
              margin: '0 0 16px',
            }}
          >
            🌟 Special Skill — <strong>{character.abilityName}</strong>: {character.abilityDescription}
          </p>
        )}

        <div
          style={{
            border: '2px solid #2a3a5c',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 20,
            background: '#111a30',
          }}
        >
          <div style={tipStyle}>
            <span>←/→ or A/D</span>
            <span>move · ↑ / W / Space to jump</span>
          </div>
          <div style={tipStyle}>
            <span>🪙</span>
            <span>Coins pop a quiz question</span>
          </div>
          <div style={tipStyle}>
            <span>🦠</span>
            <span>Touch a pathogen for a question (or stomp/use your ability to clear it instantly)</span>
          </div>
          <div style={{ ...tipStyle, marginBottom: 0 }}>
            <span>🚩</span>
            <span>Reach the flag to complete the level</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 8,
            border: '3px solid #000',
            background: '#2ecc71',
            color: '#0a1a0a',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          Start Rounds ▶
        </button>
      </div>
    </div>
  );
}
