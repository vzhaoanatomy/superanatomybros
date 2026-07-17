import QuizOverlay from './QuizOverlay';

export default function EnemyEncounter({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Enemy Encounter!"
      accent="#e74c3c"
      prompt="Answer correctly to defeat it — wrong costs a life."
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
