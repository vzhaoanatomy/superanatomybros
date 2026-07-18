import { backdrop, card } from '../overlays/overlayStyles';
import { loadLocalLeaderboard } from '../storage';
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
};

// Top local scores across all plays (any world, built-in or custom) — pure
// localStorage, distinct from the per-code classroom leaderboard which lives
// in Mongo and is only shown for classroom-code worlds.
export default function LocalLeaderboard({ onClose }) {
  const entries = loadLocalLeaderboard().map((e) => ({
    nickname: `${e.characterName} · ${e.worldName}`,
    score: e.score,
  }));

  return (
    <div style={backdrop}>
      <div style={{ ...card, width: 480, maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px' }}>🏆 Local Leaderboard</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9fb0d0' }}>Your top scores on this device.</p>
        <LeaderboardList entries={entries} emptyMessage="No runs completed yet — go play a level!" />
        <button type="button" onClick={onClose} style={buttonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}
