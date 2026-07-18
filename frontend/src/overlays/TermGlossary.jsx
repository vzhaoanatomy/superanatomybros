import { backdrop, card } from './overlayStyles';

// A mid-run reference card — every term/definition for the current world,
// so a student who wants to study rather than react can check without
// losing their run (opened via the HUD button or the G key, pauses like
// any other overlay, no scoring involved).
export default function TermGlossary({ items, onClose }) {
  return (
    <div style={backdrop}>
      <div style={{ ...card, textAlign: 'left', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#ffd23f', textAlign: 'center', margin: '0 0 4px' }}>📖 Term Glossary</h2>
        <p style={{ color: '#9fb0d0', fontSize: 12.5, textAlign: 'center', margin: '0 0 12px' }}>
          Press G or Close to resume
        </p>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {items.map((item) => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #2a3a5c' }}>
              <strong style={{ color: '#89e0ff' }}>{item.term}</strong>
              <div style={{ color: '#ccd3e0', fontSize: 14 }}>{item.definition}</div>
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
