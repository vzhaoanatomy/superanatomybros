import { useState } from 'react';
import { backdrop, card } from './overlays/overlayStyles';
import { getNickname, setNickname } from './storage';

const rowButtonStyle = {
  padding: '12px 16px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#22304f',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 15,
  fontFamily: 'inherit',
  width: '100%',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#0e1526',
  color: '#fff',
  fontSize: 15,
  fontFamily: 'inherit',
};

// Consolidates what used to be scattered inline toggles in WorldSelect.jsx
// (music/SFX) plus nickname, which previously only had a UI inside
// JoinClassroom.jsx even though it matters for any classroom leaderboard.
export default function Settings({ musicOn, sfxOn, onToggleMusic, onToggleSfx, onClose }) {
  const [nickname, setNicknameState] = useState(getNickname());

  function handleNicknameBlur() {
    setNicknameState(setNickname(nickname));
  }

  return (
    <div style={backdrop}>
      <div style={{ ...card, textAlign: 'left' }}>
        <h2 style={{ color: '#ffd23f', textAlign: 'center', margin: '0 0 18px' }}>⚙️ Settings</h2>

        <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', color: '#9fb0d0', marginBottom: 6 }}>
          Nickname (shown on classroom leaderboards)
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNicknameState(e.target.value)}
          onBlur={handleNicknameBlur}
          maxLength={24}
          placeholder="Enter a nickname"
          style={{ ...inputStyle, marginBottom: 18 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <button type="button" style={rowButtonStyle} onClick={onToggleSfx}>
            {sfxOn ? '🔊 SFX: On' : '🔇 SFX: Off'}
          </button>
          <button type="button" style={rowButtonStyle} onClick={onToggleMusic}>
            {musicOn ? '♪ Music: On' : '♪ Music: Off'}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{ ...rowButtonStyle, background: '#2ecc71', border: '2px solid #1e8449', color: '#0a1a0a', fontWeight: 'bold' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
