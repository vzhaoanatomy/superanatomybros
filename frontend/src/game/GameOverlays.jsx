import CoinQuiz from '../overlays/CoinQuiz';
import EnemyEncounter from '../overlays/EnemyEncounter';
import DoorQuiz from '../overlays/DoorQuiz';
import BossEncounter from '../overlays/BossEncounter';
import EndOfLevelQuiz from '../overlays/EndOfLevelQuiz';
import ReviewMissedTerms from '../overlays/ReviewMissedTerms';
import LevelComplete from '../overlays/LevelComplete';

// Picks the one overlay component matching the loop's current `overlay`
// state (see openQuiz in GameCanvas) and wires its callbacks back to the
// handlersRef bridge (`h`) the loop exposes.
export default function GameOverlays({ overlay, h, onQuit }) {
  return (
    <>
      {overlay?.type === 'coin' && <CoinQuiz question={overlay.question} onAnswer={h.resolveQuiz} />}
      {overlay?.type === 'enemy' && <EnemyEncounter question={overlay.question} onAnswer={h.resolveQuiz} />}
      {overlay?.type === 'door' && <DoorQuiz question={overlay.question} onAnswer={h.resolveQuiz} />}
      {overlay?.type === 'boss' && <BossEncounter question={overlay.question} onAnswer={h.resolveQuiz} />}
      {overlay?.type === 'endOfLevel' && (
        <EndOfLevelQuiz questions={overlay.questions} onFinish={h.finishEndOfLevel} />
      )}
      {overlay?.type === 'complete' && (
        <LevelComplete
          score={h.getScore?.() ?? 0}
          timeBonus={h.getTimeBonus?.() ?? 0}
          hasMissed={h.hasMissed?.() ?? false}
          onReview={h.openReview}
          onPlayAgain={h.playAgain}
          onQuit={onQuit}
        />
      )}
      {overlay?.type === 'review' && (
        <ReviewMissedTerms items={h.getMissedItems?.() ?? []} onClose={h.closeReview} />
      )}
    </>
  );
}
