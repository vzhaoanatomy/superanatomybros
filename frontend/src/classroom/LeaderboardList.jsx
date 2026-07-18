// Sorted nickname/score rows, shared by the per-code classroom leaderboard
// and the local leaderboard. Highlights the row matching `highlightNickname`.
export default function LeaderboardList({ entries, highlightNickname, emptyMessage = 'No scores yet.' }) {
  if (!entries.length) {
    return <p style={{ color: '#9fb0d0', fontSize: 13, margin: '10px 0' }}>{emptyMessage}</p>;
  }

  return (
    <div style={{ marginTop: 10, border: '1px solid #2a3a5c', borderRadius: 6, overflow: 'hidden' }}>
      {entries.map((entry, i) => {
        const isMe = highlightNickname && entry.nickname === highlightNickname;
        return (
          <div
            key={`${entry.nickname}-${i}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: 13,
              background: isMe ? '#2e4a2e' : i % 2 === 0 ? '#16213a' : '#131c30',
              color: isMe ? '#8bd17c' : '#e6ecff',
            }}
          >
            <span>
              #{i + 1} {entry.nickname}
              {isMe ? ' (you)' : ''}
            </span>
            <strong>{entry.score}</strong>
          </div>
        );
      })}
    </div>
  );
}
