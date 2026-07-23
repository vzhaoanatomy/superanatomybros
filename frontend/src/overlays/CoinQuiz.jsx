import QuizOverlay from './QuizOverlay';

export default function CoinQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Coin Question"
      statsText="Correct: +15 · Wrong: -10"
      prompt="Which term matches:"
      question={question}
      onAnswer={onAnswer}
    />
  );
}
