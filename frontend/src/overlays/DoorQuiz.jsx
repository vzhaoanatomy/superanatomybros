import QuizOverlay from './QuizOverlay';

export default function DoorQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Checkpoint Door"
      accent="#8e6bff"
      prompt="Answer correctly to unlock the door."
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
