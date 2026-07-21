// A shuffled no-repeat term queue shared by every quiz source in a level
// (coins, enemies, the checkpoint door, and boss questions) — every vocab
// word gets asked once before any word repeats, reshuffled fresh only after
// a full pass. Split out of GameCanvas.jsx to keep the main loop file
// within CLAUDE.md's line budget.
export function createTermQueue(vocab) {
  let queue = [];
  let index = 0;

  function refill() {
    queue = vocab.map((v) => v.id);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    index = 0;
  }

  function next() {
    if (index >= queue.length) refill();
    const id = queue[index];
    index += 1;
    return id;
  }

  // Reshuffles fresh (so a Play Again doesn't repeat the same order) and
  // assigns every coin/enemy/door a termId drawn from the queue. Boss
  // questions draw from the same queue via `next()` directly, so the whole
  // level shares one no-repeat sequence.
  function assignAll(level) {
    refill();
    for (const coin of level.coins) coin.termId = next();
    for (const enemy of level.enemies) enemy.termId = next();
    for (const flyer of level.flyers) flyer.termId = next();
    level.door.termId = next();
  }

  return { next, assignAll };
}
