import { backdrop } from './overlayStyles';
import { CHARACTERS } from '../game/characters';

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

const SECTIONS = [
  {
    header: '#3d72d9',
    body: '#5c8ce0',
    title: 'Controls',
    items: [
      <>
        ← / → or A/D — <strong>Move</strong>
      </>,
      <>
        ↑ / W / Space — <strong>Jump</strong> (hold for higher)
      </>,
      <>
        ↓ / S — <strong>Character ability</strong>
      </>,
      <>
        F — <strong>Throw fireball</strong> (with Fire Flower)
      </>,
    ],
  },
  {
    header: '#d9a92c',
    body: '#e8c34f',
    title: 'Coins = Questions',
    items: [
      <>Every coin pops a 4-choice question.</>,
      <>
        Right = <strong>+15</strong>, wrong = <strong>-10</strong>.
      </>,
      <>More coins collected = higher score.</>,
    ],
  },
  {
    header: '#d97a2c',
    body: '#e89a55',
    title: 'Timer + Time Bonus',
    items: [
      <>Every level has a countdown timer.</>,
      <>
        Finish faster to earn <strong>+10 per second</strong> left.
      </>,
    ],
  },
  {
    header: '#c0392b',
    body: '#d9695c',
    title: 'Enemies',
    items: [
      <>
        Touch = a <strong>definition-match</strong> question.
      </>,
      <>
        <strong>Big (mushroom)</strong> or a stomp from above defeats them instantly.
      </>,
      <>
        <strong>Koopas</strong> need a head-stomp; the <strong>boss</strong> needs 3 correct answers.
      </>,
    ],
  },
  {
    header: '#7d3fd6',
    body: '#9c6fe0',
    title: 'Checkpoint Doors',
    items: [
      <>A door mid-level needs a correct answer to pass.</>,
      <>Wrong answer just bounces you back.</>,
    ],
  },
  {
    header: '#1e8449',
    body: '#3aa65a',
    title: 'Power-Ups',
    items: [
      <>
        🍄 <strong>Mushroom</strong> — +1 life, bigger size
      </>,
      <>
        ⭐ <strong>Star</strong> — ~8s rainbow invincibility
      </>,
      <>
        🥚 <strong>Egg</strong> — ride a dino, 1.5x speed
      </>,
      <>
        🌺 <strong>Fire Flower</strong> — press F for fireballs
      </>,
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
  padding: '10px 16px',
  color: '#fff',
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const bodyStyle = {
  padding: '12px 16px',
  color: '#1a1a1a',
  fontSize: 14.5,
  lineHeight: 1.6,
};

const closeButtonStyle = {
  margin: '20px auto 0',
  display: 'block',
  padding: '10px 28px',
  borderRadius: 6,
  border: '3px solid #000',
  background: '#2ecc71',
  color: '#0a1a0a',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
  fontFamily: FONT,
};

export default function HowToPlay({ onClose }) {
  return (
    <div style={backdrop}>
      <div
        style={{
          width: 980,
          maxWidth: '96%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#0e1526',
          border: '4px solid #000',
          borderRadius: 12,
          padding: 24,
          fontFamily: FONT,
        }}
      >
        <h2 style={{ margin: '0 0 16px', color: '#fff', textAlign: 'center', fontSize: 26 }}>How to Play</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
          {SECTIONS.map((section) => (
            <div key={section.title} style={cardStyle}>
              <div style={{ ...headerStyle, background: section.header }}>{section.title}</div>
              <div style={{ ...bodyStyle, background: section.body }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, marginTop: 14 }}>
          <div style={{ ...headerStyle, background: '#d9a92c' }}>Heroes &amp; Special Abilities</div>
          <div
            style={{
              background: '#0e1526',
              padding: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            {CHARACTERS.map((c, i) => (
              <div key={c.id} style={{ border: '2px solid #2a3a5c', borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <span style={{ width: 15, height: 15, borderRadius: 3, background: HERO_COLORS[i], display: 'inline-block' }} />
                  <strong style={{ color: '#fff', fontSize: 14.5 }}>{c.name}</strong>
                </div>
                <div style={{ color: '#7de37b', fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>
                  {c.abilityName}
                </div>
                <div style={{ color: '#c8d3ea', fontSize: 12.5, lineHeight: 1.45 }}>{c.abilityDescription}</div>
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
