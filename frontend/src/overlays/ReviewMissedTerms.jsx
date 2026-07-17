import { backdrop, card } from './overlayStyles';

export default function ReviewMissedTerms({ items, onClose }) {
  return (
    <div style={backdrop}>
      <div style={{ ...card, textAlign: 'left', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#ffd23f', textAlign: 'center', margin: '0 0 12px' }}>Review Missed Terms</h2>
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
