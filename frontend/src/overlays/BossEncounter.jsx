import QuizOverlay from './QuizOverlay';

// Reuses the shared quiz UI for each question, one at a time — GameCanvas
// chains up to 3 of these per round via the same openQuiz/resolveQuiz path
// used by coin/enemy/door encounters, just under overlay type 'boss'.
export default function BossEncounter({ question, onAnswer }) {
  const hpBar = '♥'.repeat(question.hp) + '♡'.repeat(Math.max(0, question.maxHp - question.hp));
  return (
    <QuizOverlay
      key={question.questionNum}
      title={`Boss Battle (${question.questionNum}/3)`}
      statsText={`Pathogen HP: ${hpBar}`}
      prompt="Which term matches:"
      question={question}
      onAnswer={onAnswer}
    />
  );
}
