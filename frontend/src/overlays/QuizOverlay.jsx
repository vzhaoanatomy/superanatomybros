import { useState } from 'react';
import { backdrop, quizCard, quizHeader, quizBody, quizOptionsGrid, quizOptionButton } from './overlayStyles';
import { playCorrectChime, playWrongBuzz } from '../game/music';

const FEEDBACK_DELAY_MS = 700;

// Shared single-question quiz UI used by every quiz overlay (coin, enemy,
// door, pipe, boss, end-of-level). `question.style` is a per-world Teacher
// Mode setting (see vocab.js's buildQuestion) — both 'quick' and 'scenario'
// are answered the same way, picking one of 4 term buttons; 'scenario' only
// changes the framing above the definition to a longer, narrative stem for
// teachers who want something harder to skim than a flat "which term
// matches," without switching to a typed-answer mechanic.
export default function QuizOverlay({ title, statsText, prompt, question, onAnswer }) {
  const isScenario = question.style === 'scenario';
  const [selected, setSelected] = useState(null);
  const [wrong, setWrong] = useState(false);

  function handleClick(optionId) {
    if (selected) return;
    setSelected(optionId);
    const isCorrect = optionId === question.termId;
    if (isCorrect) {
      playCorrectChime();
    } else {
      playWrongBuzz();
      setWrong(true);
    }
    setTimeout(() => onAnswer(isCorrect), FEEDBACK_DELAY_MS);
  }

  return (
    <div style={{ ...backdrop, background: wrong ? 'rgba(120, 20, 20, 0.6)' : backdrop.background }}>
      <div style={quizCard} className={wrong ? 'quiz-shake' : undefined}>
        <div style={quizHeader}>
          <strong style={{ fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</strong>
          {statsText && <span style={{ fontSize: 13, opacity: 0.92 }}>{statsText}</span>}
        </div>
        <div style={quizBody}>
          {isScenario ? (
            <>
              <p
                style={{
                  fontWeight: 'bold',
                  fontSize: 13,
                  margin: '0 0 6px',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  opacity: 0.7,
                }}
              >
                📋 Case Note
              </p>
              <p style={{ fontStyle: 'italic', fontSize: 17, margin: '0 0 12px' }}>&ldquo;{question.definition}&rdquo;</p>
              <p style={{ fontWeight: 'bold', fontSize: 16, margin: 0 }}>Which term best fits this description?</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 'bold', fontSize: 18, margin: '0 0 10px' }}>{prompt}</p>
              <p style={{ fontStyle: 'italic', fontSize: 17, margin: 0 }}>&ldquo;{question.definition}&rdquo;</p>
            </>
          )}
          <div style={quizOptionsGrid}>
            {question.options.map((opt) => {
              let background = '#ffffff';
              if (selected) {
                if (opt.id === question.termId) background = '#8bd17c';
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
