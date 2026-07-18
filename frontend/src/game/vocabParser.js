// Turns a teacher's pasted vocab list into { id, term, definition } entries.
// Accepts "Term - Definition" lines (also :, |, en-dash, em-dash as the
// separator) and CSV paste (term,definition per line, only used when the
// line has no dash/colon/pipe separator).
const SEPARATOR_REGEX = /\s*[-:|–—]\s*/;

function slugify(term) {
  const slug = term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'term';
}

export function parseVocabPaste(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const terms = [];
  const usedIds = new Set();
  let skipped = 0;

  for (const line of lines) {
    let term;
    let definition;

    // Whichever separator occurs earliest in the line wins — a CSV
    // definition can itself contain a dash (e.g. "finger-like"), so just
    // checking "does a dash exist anywhere" would misfire on those lines.
    const commaIndex = line.indexOf(',');
    const dashMatch = line.match(SEPARATOR_REGEX);
    const dashIndex = dashMatch ? dashMatch.index : -1;
    const useComma = commaIndex !== -1 && (dashIndex === -1 || commaIndex < dashIndex);

    if (useComma) {
      term = line.slice(0, commaIndex).trim();
      definition = line.slice(commaIndex + 1).trim();
    } else if (dashIndex !== -1) {
      term = line.slice(0, dashMatch.index).trim();
      definition = line.slice(dashMatch.index + dashMatch[0].length).trim();
    } else {
      skipped += 1;
      continue;
    }

    if (!term || !definition) {
      skipped += 1;
      continue;
    }

    let id = slugify(term);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${slugify(term)}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    terms.push({ id, term, definition });
  }

  return { terms, skipped };
}
