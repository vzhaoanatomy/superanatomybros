import { useEffect, useState } from 'react';
import { fetchMissedTerms } from '../api';
import * as t from './teacherStyles';

// Aggregated across every run submitted for this classroom code (not just
// each student's best run) — answers "which terms is the class actually
// struggling with," the question a per-student leaderboard can't answer.
export default function MissedTermsPanel({ code, vocab, onClose }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMissedTerms(code)
      .then((rows) => {
        if (!cancelled) setStats(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const termLookup = new Map(vocab.map((v) => [v.id, v]));
  const maxCount = stats?.length ? Math.max(...stats.map((s) => s.missCount)) : 1;

  return (
    <div style={{ ...t.panel, marginTop: 10, background: '#0e1526' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: '#ffd23f' }}>📊 Most-Missed Terms · {code}</strong>
        <button type="button" style={{ ...t.button, padding: '5px 10px', fontSize: 12 }} onClick={onClose}>
          Close
        </button>
      </div>

      {error && <p style={{ color: '#ff8a5c', fontSize: 13 }}>{error}</p>}
      {!error && stats === null && <p style={{ color: '#9fb0d0', fontSize: 13 }}>Loading…</p>}
      {!error && stats?.length === 0 && (
        <p style={{ color: '#9fb0d0', fontSize: 13 }}>No runs submitted yet for this code.</p>
      )}

      {!error && stats && stats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.map((row) => {
            const term = termLookup.get(row.termId);
            return (
              <div key={row.termId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                  <span>{term ? term.term : row.termId}</span>
                  <span style={{ color: '#9fb0d0' }}>
                    missed {row.missCount}×
                  </span>
                </div>
                <div style={{ height: 6, background: '#1f2937', borderRadius: 3 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(row.missCount / maxCount) * 100}%`,
                      background: 'linear-gradient(90deg, #e2574a, #ff8a5c)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
