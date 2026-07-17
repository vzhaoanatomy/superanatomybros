// Sample vocab for the placeholder level (World 1: Anatomical & Directional
// Terms). Teacher Mode (Phase 6) lets teachers replace/extend this per world —
// this is just enough to make the quiz loop playable end to end.
export const WORLD1_VOCAB = [
  { id: 'anterior', term: 'Anterior', definition: 'Toward the front of the body.' },
  { id: 'posterior', term: 'Posterior', definition: 'Toward the back of the body.' },
  { id: 'superior', term: 'Superior', definition: 'Toward the head; above.' },
  { id: 'inferior', term: 'Inferior', definition: 'Away from the head; below.' },
  { id: 'medial', term: 'Medial', definition: 'Toward the midline of the body.' },
  { id: 'lateral', term: 'Lateral', definition: 'Away from the midline of the body.' },
  { id: 'proximal', term: 'Proximal', definition: 'Closer to the point of attachment on a limb.' },
  { id: 'distal', term: 'Distal', definition: 'Farther from the point of attachment on a limb.' },
  { id: 'superficial', term: 'Superficial', definition: 'Closer to the surface of the body.' },
  { id: 'deep', term: 'Deep', definition: 'Farther from the surface of the body.' },
];

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

// Builds a single definition-prompt question: the target term's definition
// plus 4 shuffled term options (1 correct + 3 distractors).
export function buildQuestion(vocab, termId) {
  const target = findTerm(vocab, termId);
  const distractors = shuffle(vocab.filter((v) => v.id !== termId)).slice(0, 3);
  const options = shuffle([target, ...distractors]);
  return {
    termId,
    definition: target.definition,
    options: options.map((o) => ({ id: o.id, term: o.term })),
  };
}

// Builds the 5-question end-of-level set: the run's missed terms first, then
// random fill from the rest of the vocab (or all random if nothing was missed).
export function buildEndOfLevelQuestions(vocab, missedTermIds) {
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

  return chosen.map((id) => buildQuestion(vocab, id));
}
