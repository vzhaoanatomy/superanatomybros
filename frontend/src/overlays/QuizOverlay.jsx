import { useState } from 'react';
import { backdrop, quizCard, quizHeader, quizBody, quizOptionsGrid, quizOptionButton } from './overlayStyles';
import { playCorrectChime, playWrongBuzz } from '../game/music';

const FEEDBACK_DELAY_MS = 700;
// Typed answers get a beat longer than a button click does, since the
// player also has to read the correct-answer reveal below the input.
const SCENARIO_FEEDBACK_DELAY_MS = 1400;

// Case/punctuation/whitespace-insensitive so "hair follicle", "Hair-Follicle",
// or a trailing space all still count — the game is testing vocab recall,
// not typing precision.
function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const scenarioInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 12px',
  borderRadius: 6,
  border: '3px solid #1a0f0a',
  fontSize: 16,
  fontFamily: 'inherit',
  marginTop: 18,
};

const scenarioSubmitStyle = {
  ...quizOptionButton,
  marginTop: 12,
  width: '100%',
};

// Shared single-question quiz UI used by every quiz overlay (coin, enemy,
// door, pipe, boss, end-of-level). `question` carries a `style` — 'quick'
// (default) renders 4 term-option buttons; 'scenario' renders a text input
// the player types the term into instead (see vocab.js's buildQuestion).
// Both styles resolve through the same onAnswer(isCorrect) callback.
export default function QuizOverlay({ title, statsText, prompt, question, onAnswer }) {
  const isScenario = question.style === 'scenario';
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState(false);
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

  function handleSubmitTyped(e) {
    e.preventDefault();
    if (answered || !typed.trim()) return;
    setAnswered(true);
    const isCorrect = normalize(typed) === normalize(question.term);
    if (isCorrect) {
      playCorrectChime();
    } else {
      playWrongBuzz();
      setWrong(true);
    }
    setTimeout(() => onAnswer(isCorrect), SCENARIO_FEEDBACK_DELAY_MS);
  }

  return (
    <div style={{ ...backdrop, background: wrong ? 'rgba(120, 20, 20, 0.6)' : backdrop.background }}>
      <div style={quizCard} className={wrong ? 'quiz-shake' : undefined}>
        <div style={quizHeader}>
          <strong style={{ fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</strong>
          {statsText && <span style={{ fontSize: 13, opacity: 0.92 }}>{statsText}</span>}
        </div>
        <div style={quizBody}>
          <p style={{ fontWeight: 'bold', fontSize: 18, margin: '0 0 10px' }}>
            {isScenario ? 'Type the term that matches:' : prompt}
          </p>
          <p style={{ fontStyle: 'italic', fontSize: 17, margin: 0 }}>&ldquo;{question.definition}&rdquo;</p>

          {isScenario ? (
            <form onSubmit={handleSubmitTyped}>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={typed}
                disabled={answered}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Your answer…"
                style={scenarioInputStyle}
              />
              {answered ? (
                <p style={{ margin: '10px 0 0', fontWeight: 'bold', color: wrong ? '#7a2020' : '#1e6b38' }}>
                  {wrong ? `Correct answer: ${question.term}` : '✓ Correct!'}
                </p>
              ) : (
                <button type="submit" disabled={!typed.trim()} style={scenarioSubmitStyle}>
                  Submit
                </button>
              )}
            </form>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
