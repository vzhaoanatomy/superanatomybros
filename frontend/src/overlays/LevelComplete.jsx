import { backdrop, card } from './overlayStyles';

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

export default function LevelComplete({ score, timeBonus, hasMissed, onReview, onPlayAgain, onQuit }) {
  return (
    <div style={backdrop}>
      <div style={card}>
        <h2 style={{ color: '#2ecc71', margin: '0 0 8px' }}>Level Complete!</h2>
        {timeBonus > 0 && (
          <p style={{ fontSize: 14, color: '#89e0ff', margin: '0 0 4px' }}>Time Bonus: +{timeBonus}</p>
        )}
        <p style={{ fontSize: 22, margin: '8px 0 20px' }}>Score: {score}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hasMissed && (
            <button type="button" onClick={onReview} style={{ ...buttonStyle, borderColor: '#ffd23f' }}>
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
