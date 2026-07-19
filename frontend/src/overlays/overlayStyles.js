// `fixed` (not `absolute`) so this always covers the real viewport regardless
// of scroll position — matters most for page-level modals (Settings, How to
// Play) on a tall/scrolled mobile page; in-game quiz overlays already sit
// inside a viewport-sized `.game-viewport`, so this is a no-op change there.
export const backdrop = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(4, 8, 20, 0.72)',
  zIndex: 10,
};

export const card = {
  background: '#16213a',
  border: '3px solid #2a3a5c',
  borderRadius: 10,
  padding: 24,
  width: 480,
  maxWidth: '90%',
  color: '#fff',
  textAlign: 'center',
  fontFamily: 'ui-monospace, Consolas, monospace',
};

export const optionsGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
  marginTop: 18,
};

export const optionButton = {
  padding: '12px 8px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  color: '#fff',
  fontSize: 15,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// Red-header / yellow-body theme for the quiz question box.
export const quizCard = {
  width: 560,
  maxWidth: '92%',
  borderRadius: 10,
  overflow: 'hidden',
  border: '4px solid #1a0f0a',
  boxShadow: '6px 6px 0 rgba(0,0,0,0.35)',
  fontFamily: 'ui-monospace, Consolas, monospace',
};

export const quizHeader = {
  background: '#e2574a',
  color: '#fff',
  padding: '14px 22px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '4px solid #1a0f0a',
};

export const quizBody = {
  background: '#f2c94c',
  padding: '26px 24px 24px',
  color: '#1a1200',
  textAlign: 'left',
};

export const quizOptionsGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
  marginTop: 22,
};

export const quizOptionButton = {
  padding: '16px 10px',
  borderRadius: 6,
  border: '3px solid #1a0f0a',
  background: '#ffffff',
  color: '#1a0f0a',
  fontWeight: 'bold',
  fontSize: 15,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '3px 3px 0 rgba(0,0,0,0.3)',
};
