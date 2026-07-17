import QuizOverlay from './QuizOverlay';

export default function CoinQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Coin Quiz"
      accent="#ffd23f"
      prompt="Which term matches this definition?"
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
