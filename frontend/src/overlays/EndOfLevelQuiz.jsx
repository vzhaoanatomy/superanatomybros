import { useState } from 'react';
import QuizOverlay from './QuizOverlay';

// Sequential 5-question review, seeded with the run's missed terms first
// (see vocab.buildEndOfLevelQuestions). onFinish(results) fires once all
// questions are answered, where results is [{ termId, correct }].
export default function EndOfLevelQuiz({ questions, onFinish }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);

  const question = questions[index];

  function handleAnswer(isCorrect) {
    const next = [...results, { termId: question.termId, correct: isCorrect }];
    if (index + 1 >= questions.length) {
      onFinish(next);
    } else {
      setResults(next);
      setIndex(index + 1);
    }
  }

  return (
    <QuizOverlay
      key={question.termId}
      title={`End-of-Level Quiz (${index + 1}/${questions.length})`}
      statsText="Missed terms first"
      prompt="Which term matches:"
      question={question}
      onAnswer={handleAnswer}
    />
  );
}
