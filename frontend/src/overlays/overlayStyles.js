export const backdrop = {
  position: 'absolute',
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
