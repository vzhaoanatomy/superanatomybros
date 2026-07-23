import { useEffect, useState } from 'react';
import { fetchAttempts } from '../api';
import * as t from './teacherStyles';

function formatWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Every individual play, not just each student's best — a student can
// replay to chase a higher score, and this is where the teacher sees each
// of those attempts (score, right/wrong counts, and the actual terms) with
// their nickname attached, unlike MissedTermsPanel's class-wide aggregate.
export default function StudentAttemptsPanel({ code, vocab, onClose }) {
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAttempts(code)
      .then((rows) => {
        if (!cancelled) setAttempts(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const termLookup = new Map(vocab.map((v) => [v.id, v]));
  const termNames = (ids) => ids.map((id) => termLookup.get(id)?.term ?? id).join(', ');

  // Already sorted nickname-then-time by the backend — just group
  // consecutive rows into one block per student.
  const groups = [];
  for (const row of attempts ?? []) {
    const last = groups[groups.length - 1];
    if (last && last.nickname === row.nickname) last.attempts.push(row);
    else groups.push({ nickname: row.nickname, attempts: [row] });
  }

  // "Most Improved" needs at least two attempts from the same student to
  // mean anything — first score vs. their latest replay, not just whoever
  // has the highest score outright (that's what the leaderboard is for).
  let mostImproved = null;
  for (const group of groups) {
    if (group.attempts.length < 2) continue;
    const delta = group.attempts[group.attempts.length - 1].score - group.attempts[0].score;
    if (delta > 0 && (!mostImproved || delta > mostImproved.delta)) {
      mostImproved = { nickname: group.nickname, delta };
    }
  }

  // Biggest streak across every submitted attempt, not just each student's
  // best-scoring one — a student can post their longest streak on a run
  // that wasn't actually their highest score.
  let biggestStreak = null;
  for (const row of attempts ?? []) {
    if (row.bestStreak > 0 && (!biggestStreak || row.bestStreak > biggestStreak.streak)) {
      biggestStreak = { nickname: row.nickname, streak: row.bestStreak };
    }
  }

  return (
    <div style={{ ...t.panel, marginTop: 10, background: '#0e1526', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: '#ffd23f' }}>🧑‍🎓 Student Attempts · {code}</strong>
        <button type="button" style={{ ...t.button, padding: '5px 10px', fontSize: 12 }} onClick={onClose}>
          Close
        </button>
      </div>

      {error && <p style={{ color: '#ff8a5c', fontSize: 13 }}>{error}</p>}
      {!error && attempts === null && <p style={{ color: '#9fb0d0', fontSize: 13 }}>Loading…</p>}
      {!error && attempts?.length === 0 && (
        <p style={{ color: '#9fb0d0', fontSize: 13 }}>No runs submitted yet for this code.</p>
      )}

      {(mostImproved || biggestStreak) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {mostImproved && (
            <div
              style={{
                flex: '1 1 200px',
                background: '#1a2e1a',
                border: '1px solid #2e5c2e',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#7de37b' }}>📈 Most Improved</div>
              <div style={{ fontSize: 13.5 }}>
                <strong>{mostImproved.nickname}</strong> · +{mostImproved.delta} pts since first run
              </div>
            </div>
          )}
          {biggestStreak && (
            <div
              style={{
                flex: '1 1 200px',
                background: '#2e1f14',
                border: '1px solid #5c3a1e',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#ff8a5c' }}>🔥 Biggest Streak</div>
              <div style={{ fontSize: 13.5 }}>
                <strong>{biggestStreak.nickname}</strong> · {biggestStreak.streak} correct in a row
              </div>
            </div>
          )}
        </div>
      )}

      {!error && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map((group) => (
            <div key={group.nickname}>
              <strong style={{ fontSize: 13.5, color: '#89e0ff' }}>{group.nickname}</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                {group.attempts.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#16213a',
                      border: '1px solid #2a3a5c',
                      borderRadius: 6,
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
                      <span style={{ color: '#ffd23f' }}>Score {a.score}</span>
                      <span style={{ color: '#7de37b' }}>✓ {a.correctCount} correct</span>
                      <span style={{ color: '#ff8a5c' }}>✗ {a.wrongCount} wrong</span>
                      <span style={{ color: '#6b7688', marginLeft: 'auto' }}>{formatWhen(a.submittedAt)}</span>
                    </div>
                    {a.correctTermIds.length > 0 && (
                      <div style={{ fontSize: 11.5, color: '#7de37b', marginTop: 4 }}>
                        Right: {termNames(a.correctTermIds)}
                      </div>
                    )}
                    {a.missedTermIds.length > 0 && (
                      <div style={{ fontSize: 11.5, color: '#ff8a5c', marginTop: 2 }}>
                        Wrong: {termNames(a.missedTermIds)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
