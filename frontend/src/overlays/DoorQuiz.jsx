import QuizOverlay from './QuizOverlay';

export default function DoorQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Checkpoint Door"
      statsText="Correct: Unlock · Wrong: Stay Blocked"
      prompt="Which term matches:"
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
