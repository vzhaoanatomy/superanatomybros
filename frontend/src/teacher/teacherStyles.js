// Shared look for the full-screen Teacher Mode builder — a distinct visual
// context from the in-game overlays (overlayStyles.js), since this is a
// standalone screen rather than something layered over the canvas.
export const screen = {
  minHeight: '100vh',
  width: '100%',
  boxSizing: 'border-box',
  background: '#0e1526',
  color: '#e6ecff',
  padding: '24px 20px 60px',
  fontFamily: 'ui-monospace, Consolas, monospace',
};

export const container = {
  maxWidth: 760,
  margin: '0 auto',
};

export const topBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
};

export const panel = {
  background: '#16213a',
  border: '2px solid #2a3a5c',
  borderRadius: 10,
  padding: 18,
  marginBottom: 14,
};

export const sectionHeader = {
  fontSize: 13,
  fontWeight: 'bold',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#9fb0d0',
  margin: '18px 0 0',
};

export const sectionSubtext = {
  fontSize: 12.5,
  color: '#6d7ea3',
  margin: '2px 0 8px',
};

export const label = {
  display: 'block',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  color: '#9fb0d0',
  margin: '14px 0 6px',
};

export const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#0e1526',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
};

export const textarea = {
  ...input,
  minHeight: 160,
  resize: 'vertical',
  lineHeight: 1.5,
};

export const button = {
  padding: '10px 16px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#22304f',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
};

export const buttonPrimary = {
  ...button,
  background: '#2ecc71',
  color: '#0a1a0a',
  border: '2px solid #1e8449',
  fontWeight: 'bold',
};

export const buttonPurple = {
  ...button,
  background: '#7d3fd6',
  border: '2px solid #5a2ba0',
};

export const buttonDanger = {
  ...button,
  background: '#c0392b',
  border: '2px solid #8e2a1f',
};
