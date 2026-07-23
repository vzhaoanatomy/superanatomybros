import { backdrop, card } from './overlayStyles';
import { getFieldNotes } from '../storage';
import { GENERAL_FACTS } from '../game/facts';

// A student's permanent collection of case-file facts, found one at a time
// from bonus-room alcoves and the main level's own highest-platform card
// (see level.js/GameCanvas.jsx). Persists across every world and every
// play — the point is to give a reason to keep exploring decks already
// beaten, not just replay for score.
export default function FieldNotes({ onClose }) {
  const collected = getFieldNotes();
  const total = GENERAL_FACTS.length;
  const complete = collected.length >= total;

  return (
    <div style={backdrop}>
      <div style={{ ...card, textAlign: 'left', maxHeight: '75vh', display: 'flex', flexDirection: 'column', width: 480 }}>
        <h2 style={{ color: '#ffd23f', textAlign: 'center', margin: '0 0 2px' }}>📓 Field Notes</h2>
        <p style={{ color: '#9fb0d0', textAlign: 'center', fontSize: 12.5, margin: '0 0 10px' }}>
          Case-file facts found while exploring — {collected.length}/{total} collected
        </p>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: '#0e1526',
            border: '1px solid #2a3a5c',
            overflow: 'hidden',
            marginBottom: complete ? 10 : 14,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${total ? (collected.length / total) * 100 : 0}%`,
              background: '#ffd23f',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        {complete && (
          <p
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#0e1526',
              background: '#ffd23f',
              borderRadius: 20,
              padding: '4px 12px',
              margin: '0 0 14px',
            }}
          >
            🏅 Field Notes Complete!
          </p>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {collected.length === 0 ? (
            <p style={{ color: '#6d7ea3', fontSize: 13.5, textAlign: 'center', padding: '20px 0' }}>
              No facts found yet — look for a glowing card near a bonus pipe or on a high platform.
            </p>
          ) : (
            collected.map((fact) => (
              <div key={fact} style={{ padding: '10px 0', borderBottom: '1px solid #2a3a5c', display: 'flex', gap: 8 }}>
                <span>💡</span>
                <span style={{ color: '#ccd3e0', fontSize: 13.5 }}>{fact}</span>
              </div>
            ))
          )}
          {!complete &&
            Array.from({ length: total - collected.length }).map((_, i) => (
              <div
                key={`locked-${i}`}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #2a3a5c',
                  display: 'flex',
                  gap: 8,
                  color: '#4a5670',
                  fontSize: 13.5,
                }}
              >
                <span>🔒</span>
                <span>??? — not yet discovered</span>
              </div>
            ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 6,
            border: '2px solid #3a4a6c',
            background: '#22304f',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
