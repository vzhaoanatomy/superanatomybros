import { useEffect, useState } from 'react';
import { backdrop, card } from '../overlays/overlayStyles';
import { fetchLeaderboard } from '../api';
import { getNickname } from '../storage';
import LeaderboardList from './LeaderboardList';

// Read-only view of a classroom code's leaderboard — no play or join needed.
export default function ClassLeaderboardModal({ code, worldName, onClose }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => setSlow(true), 3000);
    fetchLeaderboard(code)
      .then((rows) => !cancelled && setEntries(rows))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [code]);

  return (
    <div style={backdrop}>
      <div style={{ ...card, width: 480, maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px' }}>🏆 Leaderboard</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9fb0d0' }}>
          {worldName} · {code}
        </p>
        {error && <p style={{ color: '#ff8a5c', fontSize: 13 }}>{error}</p>}
        {!error && entries === null && <p style={{ color: '#9fb0d0', fontSize: 13 }}>
            {slow ? 'Waking up the server — this can take up to a minute the first time…' : 'Loading…'}
          </p>}
        {entries && (
          <LeaderboardList
            entries={entries}
            highlightNickname={getNickname()}
            emptyMessage="No scores yet — be the first!"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '12px 16px',
            borderRadius: 6,
            border: '2px solid #3a4a6c',
            background: '#22304f',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 15,
            fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
