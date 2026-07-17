import { useState } from 'react';
import { backdrop, card, optionsGrid, optionButton } from './overlayStyles';

const FEEDBACK_DELAY_MS = 700;

// Shared single-question quiz UI used by CoinQuiz, EnemyEncounter, and
// DoorQuiz. onAnswer(isCorrect) fires after a brief highlight so the player
// sees whether they got it right before the overlay closes.
export default function QuizOverlay({ title, accent, prompt, definition, options, correctId, onAnswer }) {
  const [selected, setSelected] = useState(null);

  function handleClick(optionId) {
    if (selected) return;
    setSelected(optionId);
    setTimeout(() => onAnswer(optionId === correctId), FEEDBACK_DELAY_MS);
  }

  return (
    <div style={backdrop}>
      <div style={{ ...card, borderColor: accent }}>
        <h2 style={{ color: accent, margin: '0 0 8px' }}>{title}</h2>
        <p style={{ color: '#aab4cc', margin: '0 0 4px', fontSize: 13 }}>{prompt}</p>
        <p style={{ fontSize: 18, margin: '12px 0' }}>{definition}</p>
        <div style={optionsGrid}>
          {options.map((opt) => {
            let background = '#22304f';
            if (selected) {
              if (opt.id === correctId) background = '#2ecc71';
              else if (opt.id === selected) background = '#e74c3c';
            }
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!!selected}
                onClick={() => handleClick(opt.id)}
                style={{ ...optionButton, background }}
              >
                {opt.term}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
