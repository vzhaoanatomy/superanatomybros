import { backdrop } from './overlayStyles';
import { CHARACTERS } from '../game/characters';

const SECTIONS = [
  {
    header: '#3d72d9',
    body: '#5c8ce0',
    title: 'Controls',
    items: [
      '← / → or A/D — Move',
      '↑ / W / Space — Jump (hold for higher)',
      '↓ / S — Character ability',
      'F — Throw fireball (with Fire Flower)',
    ],
  },
  {
    header: '#d9a92c',
    body: '#e8c34f',
    title: 'Coins = Questions',
    items: ['Every coin pops a 4-choice question.', 'Right = +15, wrong = -10.', 'More coins = higher score.'],
  },
  {
    header: '#d97a2c',
    body: '#e89a55',
    title: 'Timer + Time Bonus',
    items: ['Every level has a countdown timer.', 'Finish faster to earn +10 per second left.'],
  },
  {
    header: '#c0392b',
    body: '#d9695c',
    title: 'Enemies',
    items: [
      'Touch = a definition-match question.',
      'Big (mushroom) or a stomp from above defeats them instantly.',
      'Koopas need a head-stomp; the boss needs 3 correct answers.',
    ],
  },
  {
    header: '#7d3fd6',
    body: '#9c6fe0',
    title: 'Checkpoint Doors',
    items: ['A door mid-level needs a correct answer to pass.', 'Wrong answer just bounces you back.'],
  },
  {
    header: '#1e8449',
    body: '#3aa65a',
    title: 'Power-Ups',
    items: [
      '🍄 Mushroom — +1 life, bigger size',
      '⭐ Star — ~8s rainbow invincibility',
      '🥚 Egg — ride a dino, 1.5x speed',
      '🌺 Fire Flower — press F for fireballs',
    ],
  },
];

const HERO_COLORS = ['#c0392b', '#27ae60', '#e75480', '#ffd23f'];

const cardStyle = {
  border: '3px solid #000',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
};

const headerStyle = {
  padding: '10px 14px',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 13,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const bodyStyle = {
  padding: '12px 14px',
  color: '#1a1a1a',
  fontSize: 13.5,
  lineHeight: 1.5,
};

const closeButtonStyle = {
  margin: '18px auto 0',
  display: 'block',
  padding: '10px 24px',
  borderRadius: 6,
  border: '3px solid #000',
  background: '#2ecc71',
  color: '#0a1a0a',
  fontWeight: 'bold',
  fontSize: 14,
  cursor: 'pointer',
};

export default function HowToPlay({ onClose }) {
  return (
    <div style={backdrop}>
      <div
        style={{
          width: 640,
          maxWidth: '94%',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: '#0e1526',
          border: '4px solid #000',
          borderRadius: 12,
          padding: 20,
          fontFamily: 'ui-monospace, Consolas, monospace',
        }}
      >
        <h2 style={{ margin: '0 0 14px', color: '#fff', textAlign: 'center' }}>How to Play</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          {SECTIONS.map((section) => (
            <div key={section.title} style={cardStyle}>
              <div style={{ ...headerStyle, background: section.header }}>{section.title}</div>
              <div style={{ ...bodyStyle, background: section.body }}>
                {section.items.map((item) => (
                  <div key={item} style={{ marginBottom: 4 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, marginTop: 12 }}>
          <div style={{ ...headerStyle, background: '#d9a92c' }}>Heroes &amp; Special Abilities</div>
          <div
            style={{
              background: '#0e1526',
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
            }}
          >
            {CHARACTERS.map((c, i) => (
              <div key={c.id} style={{ border: '2px solid #2a3a5c', borderRadius: 6, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: HERO_COLORS[i], display: 'inline-block' }} />
                  <strong style={{ color: '#fff', fontSize: 13 }}>{c.name}</strong>
                </div>
                <div style={{ color: '#7de37b', fontSize: 11.5, marginBottom: 2 }}>{c.abilityName}</div>
                <div style={{ color: '#c8d3ea', fontSize: 11.5, lineHeight: 1.4 }}>{c.abilityDescription}</div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" onClick={onClose} style={closeButtonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}
