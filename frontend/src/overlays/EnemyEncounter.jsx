import QuizOverlay from './QuizOverlay';

export default function EnemyEncounter({ question, onAnswer }) {
  return (
    <QuizOverlay
      title="Enemy Encounter!"
      statsText="Correct: Defeat it · Wrong: -1 Life"
      prompt="Which term matches:"
      question={question}
      onAnswer={onAnswer}
    />
  );
}
