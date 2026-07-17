import QuizOverlay from './QuizOverlay';

export default function CoinQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Coin Question"
      statsText="Correct: +15 · Wrong: -10"
      prompt="Which term matches:"
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
