import { useState } from 'react';
import { backdrop, quizCard, quizHeader, quizBody, quizOptionsGrid, quizOptionButton } from './overlayStyles';

const FEEDBACK_DELAY_MS = 700;

// Shared single-question quiz UI used by CoinQuiz, EnemyEncounter, and
// DoorQuiz. onAnswer(isCorrect) fires after a brief highlight so the player
// sees whether they got it right before the overlay closes.
export default function QuizOverlay({ title, statsText, prompt, definition, options, correctId, onAnswer }) {
  const [selected, setSelected] = useState(null);

  function handleClick(optionId) {
    if (selected) return;
    setSelected(optionId);
    setTimeout(() => onAnswer(optionId === correctId), FEEDBACK_DELAY_MS);
  }

  return (
    <div style={backdrop}>
      <div style={quizCard}>
        <div style={quizHeader}>
          <strong style={{ fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</strong>
          {statsText && <span style={{ fontSize: 13, opacity: 0.92 }}>{statsText}</span>}
        </div>
        <div style={quizBody}>
          <p style={{ fontWeight: 'bold', fontSize: 18, margin: '0 0 10px' }}>{prompt}</p>
          <p style={{ fontStyle: 'italic', fontSize: 17, margin: 0 }}>&ldquo;{definition}&rdquo;</p>
          <div style={quizOptionsGrid}>
            {options.map((opt) => {
              let background = '#ffffff';
              if (selected) {
                if (opt.id === correctId) background = '#8bd17c';
                else if (opt.id === selected) background = '#e97c6d';
              }
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!selected}
                  onClick={() => handleClick(opt.id)}
                  style={{ ...quizOptionButton, background }}
                >
                  {opt.term}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
