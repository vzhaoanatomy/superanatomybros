import QuizOverlay from './QuizOverlay';

export default function EnemyEncounter({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Enemy Encounter!"
      statsText="Correct: Defeat it · Wrong: -1 Life"
      prompt="Which term matches:"
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
