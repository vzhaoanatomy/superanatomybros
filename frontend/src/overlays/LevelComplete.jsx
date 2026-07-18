import { useEffect, useState } from 'react';
import { backdrop, card } from './overlayStyles';
import { fetchLeaderboard } from '../api';
import { getNickname } from '../storage';
import LeaderboardList from '../classroom/LeaderboardList';

const buttonStyle = {
  padding: '12px 16px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#22304f',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 15,
  fontFamily: 'inherit',
};

export default function LevelComplete({ score, timeBonus, hasMissed, onReview, onPlayAgain, onQuit, classroomCode }) {
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    if (!classroomCode) return;
    let cancelled = false;
    fetchLeaderboard(classroomCode)
      .then((entries) => {
        if (!cancelled) setLeaderboard(entries);
      })
      .catch(() => {
        if (!cancelled) setLeaderboard([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomCode]);

  return (
    <div style={backdrop}>
      <div style={card}>
        <h2 style={{ color: '#2ecc71', margin: '0 0 8px' }}>Level Complete!</h2>
        {timeBonus > 0 && (
          <p style={{ fontSize: 14, color: '#89e0ff', margin: '0 0 4px' }}>Time Bonus: +{timeBonus}</p>
        )}
        <p style={{ fontSize: 22, margin: '8px 0 20px' }}>Score: {score}</p>

        {classroomCode && (
          <div style={{ textAlign: 'left', marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: '#ffd23f', margin: '0 0 4px', textTransform: 'uppercase' }}>
              Classroom Leaderboard · {classroomCode}
            </p>
            {leaderboard === null ? (
              <p style={{ fontSize: 13, color: '#9fb0d0' }}>Loading…</p>
            ) : (
              <LeaderboardList entries={leaderboard} highlightNickname={getNickname()} />
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hasMissed && (
            <button type="button" onClick={onReview} style={{ ...buttonStyle, border: '2px solid #ffd23f' }}>
              Review Missed Terms
            </button>
          )}
          <button type="button" onClick={onPlayAgain} style={buttonStyle}>
            Play Again
          </button>
          <button type="button" onClick={onQuit} style={buttonStyle}>
            Quit to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
