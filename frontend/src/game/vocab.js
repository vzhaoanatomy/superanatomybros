// Generic quiz-question helpers, shared by every world. Per-world vocab data
// lives in worlds.js.
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function findTerm(vocab, termId) {
  return vocab.find((v) => v.id === termId);
}

// Builds a single definition-prompt question. `style` is a per-world Teacher
// Mode setting (see worlds.js) — 'quick' (default) and 'scenario' both
// return the same 4-shuffled-option shape (1 correct + 3 distractors,
// picked by closest term-length to the correct answer so the right option
// can't be spotted just by "which one looks different"); 'scenario' only
// changes how QuizOverlay.jsx *phrases* the prompt (a longer, narrative
// stem instead of the flat "which term matches"), not the answer mechanic —
// still multiple choice, not typed.
export function buildQuestion(vocab, termId, style = 'quick') {
  const target = findTerm(vocab, termId);
  const candidates = shuffle(vocab.filter((v) => v.id !== termId));
  const distractors = candidates
    .sort((a, b) => Math.abs(a.term.length - target.term.length) - Math.abs(b.term.length - target.term.length))
    .slice(0, 3);
  const options = shuffle([target, ...distractors]);
  return {
    style,
    termId,
    term: target.term,
    definition: target.definition,
    options: options.map((o) => ({ id: o.id, term: o.term })),
  };
}

// Builds the 5-question end-of-level set: the run's missed terms first, then
// random fill from the rest of the vocab (or all random if nothing was missed).
export function buildEndOfLevelQuestions(vocab, missedTermIds, style = 'quick') {
  const count = Math.min(5, vocab.length);
  const chosen = [];

  for (const id of missedTermIds) {
    if (chosen.length >= count) break;
    if (!chosen.includes(id)) chosen.push(id);
  }

  const remaining = shuffle(vocab.map((v) => v.id).filter((id) => !chosen.includes(id)));
  for (const id of remaining) {
    if (chosen.length >= count) break;
    chosen.push(id);
  }

  return chosen.map((id) => buildQuestion(vocab, id, style));
}
