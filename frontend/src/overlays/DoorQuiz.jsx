import QuizOverlay from './QuizOverlay';

export default function DoorQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Checkpoint Door"
      statsText="Correct: Unlock · Wrong: Stay Blocked"
      prompt="Which term matches:"
      question={question}
      onAnswer={onAnswer}
    />
  );
}
