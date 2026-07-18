import { backdrop, card } from './overlayStyles';
import { CHARACTERS } from '../game/characters';

const sectionStyle = { textAlign: 'left', marginTop: 16 };
const headingStyle = { color: '#ffd23f', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' };
const listStyle = { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#d6def0' };

const buttonStyle = {
  padding: '12px 16px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#22304f',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 15,
  fontFamily: 'inherit',
  marginTop: 18,
};

export default function HowToPlay({ onClose }) {
  return (
    <div style={backdrop}>
      <div style={{ ...card, width: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px' }}>How to Play</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9fb0d0' }}>
          Run, jump, and answer questions correctly to survive and score points.
        </p>

        <div style={sectionStyle}>
          <p style={headingStyle}>Controls</p>
          <ul style={listStyle}>
            <li>Arrows / WASD — move left and right</li>
            <li>Space / Up — jump (hold longer for a higher jump)</li>
            <li>Down — use your character's ability</li>
            <li>F — throw a fireball (once you've picked up a Fire Flower)</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <p style={headingStyle}>Characters</p>
          <ul style={listStyle}>
            {CHARACTERS.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> — {c.abilityName}: {c.abilityDescription}
              </li>
            ))}
          </ul>
        </div>

        <div style={sectionStyle}>
          <p style={headingStyle}>Quiz Mechanics</p>
          <ul style={listStyle}>
            <li>Coins: correct answer = +15 and collected; wrong = -10, coin bounces away</li>
            <li>Enemies: correct answer defeats it; wrong costs a life</li>
            <li>Checkpoint doors: must answer correctly to pass</li>
            <li>End of level: 5 questions, your missed terms are asked first</li>
            <li>World 7 boss: 3 questions — each correct removes 1 dragon HP, each wrong costs a life</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <p style={headingStyle}>Power-Ups</p>
          <ul style={listStyle}>
            <li>🍄 Mushroom — +1 life (max 5) and makes you bigger until your next hit</li>
            <li>⭐ Star — rainbow invincibility for ~8 seconds; touching enemies defeats them instantly</li>
            <li>🥚 Egg — ride a dino at 1.5x speed; absorbs one hit before popping</li>
            <li>🌺 Fire Flower — press F to throw fireballs that defeat enemies on contact</li>
          </ul>
        </div>

        <button type="button" onClick={onClose} style={buttonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}
