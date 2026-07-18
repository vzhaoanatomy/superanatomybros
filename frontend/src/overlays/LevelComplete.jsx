import { useEffect, useMemo, useState } from 'react';
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

const FIREWORK_COLORS = ['#ff6b6b', '#ffd23f', '#4ecdc4', '#a78bfa', '#7de37b', '#ff8ac0'];
const BURST_COUNT = 3;
const PARTICLES_PER_BURST = 14;

// A handful of repeating CSS-keyframe particle bursts behind the card —
// pure decoration, no canvas/render-loop needed since it's just a few dozen
// animated spans.
function Fireworks() {
  const bursts = useMemo(
    () =>
      Array.from({ length: BURST_COUNT }, (_, b) => {
        const originX = 20 + Math.random() * 60;
        const originY = 15 + Math.random() * 40;
        const baseDelay = b * 0.7;
        const particles = Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
          const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST + Math.random() * 0.3;
          const dist = 70 + Math.random() * 50;
          return {
            id: `${b}-${i}`,
            color: FIREWORK_COLORS[(b + i) % FIREWORK_COLORS.length],
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            delay: baseDelay + Math.random() * 0.15,
          };
        });
        return { id: b, originX, originY, particles };
      }),
    []
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes firework-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.15); opacity: 0; }
        }
      `}</style>
      {bursts.map((burst) =>
        burst.particles.map((p) => (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              left: `${burst.originX}%`,
              top: `${burst.originY}%`,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              animation: `firework-particle 1.3s ease-out ${p.delay}s infinite`,
            }}
          />
        ))
      )}
    </div>
  );
}

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
      <Fireworks />
      <div style={{ ...card, position: 'relative' }}>
        <h2 style={{ color: '#2ecc71', margin: '0 0 8px' }}>🎉 Level Complete! 🎉</h2>
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
