import QuizOverlay from './QuizOverlay';

// Reuses the shared quiz UI, chained a couple times by GameCanvas
// (openPipeQuestion) under overlay type 'pipe' — same pattern as
// BossEncounter's multi-question sequence, just gating a bonus room instead
// of a boss's HP.
export default function PipeQuiz({ question, onAnswer }) {
  return (
    <QuizOverlay
      key={question.questionNum}
      title={`Pipe Bonus (${question.questionNum}/${question.totalQuestions})`}
      statsText="Answer right to unlock the bonus room"
      prompt="Which term matches:"
      definition={question.definition}
      options={question.options}
      correctId={question.termId}
      onAnswer={onAnswer}
    />
  );
}
