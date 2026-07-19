import { useState } from 'react';
import { backdrop, card } from '../overlays/overlayStyles';
import { loadLocalLeaderboard, clearLocalLeaderboard } from '../storage';
import LeaderboardList from './LeaderboardList';

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
  flex: 1,
};

const resetButtonStyle = {
  ...buttonStyle,
  background: '#c0392b',
  border: '2px solid #8e2a1f',
};

const confirmButtonStyle = {
  ...buttonStyle,
  background: '#c0392b',
  border: '2px solid #8e2a1f',
  marginTop: 0,
};

const cancelButtonStyle = {
  ...buttonStyle,
  marginTop: 0,
};

// Top local scores across all plays (any world, built-in or custom) — pure
// localStorage, distinct from the per-code classroom leaderboard which lives
// in Mongo and is only shown for classroom-code worlds. Meant to track one
// class period's runs, so a teacher can wipe it clean before the next one.
export default function LocalLeaderboard({ onClose }) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [entries, setEntries] = useState(() =>
    loadLocalLeaderboard().map((e) => ({
      nickname: `${e.nickname || 'Anonymous'} · ${e.worldName}`,
      score: e.score,
    }))
  );

  function handleReset() {
    clearLocalLeaderboard();
    setEntries([]);
    setConfirmingReset(false);
  }

  return (
    <div style={backdrop}>
      <div style={{ ...card, width: 480, maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px' }}>🏆 Local Leaderboard</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9fb0d0' }}>Your top scores on this device.</p>
        <LeaderboardList entries={entries} emptyMessage="No runs completed yet — go play a level!" />
        {confirmingReset ? (
          <>
            <p style={{ margin: '18px 0 0', fontSize: 13, color: '#ff8a5c' }}>Reset all scores on this device?</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setConfirmingReset(false)} style={cancelButtonStyle}>
                Cancel
              </button>
              <button type="button" onClick={handleReset} style={confirmButtonStyle}>
                Confirm Reset
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={buttonStyle}>
              Close
            </button>
            <button type="button" onClick={() => setConfirmingReset(true)} style={resetButtonStyle}>
              🗑 Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
