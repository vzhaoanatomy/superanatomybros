import { useState } from 'react';
import { parseVocabPaste } from '../game/vocabParser';
import { ENEMY_TYPE_OPTIONS, PALETTE_PRESETS } from '../game/worlds';
import * as t from './teacherStyles';

function vocabToText(vocab) {
  return (vocab ?? []).map((v) => `${v.term} - ${v.definition}`).join('\n');
}

function slugifyName(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'world';
}

// Builder for both "create a new custom world" and "edit an existing world's
// vocab" (built-in override or custom-world edit) — `isBuiltIn` controls
// whether the theme pickers (enemy/palette) show, since built-in edits keep
// the built-in's own theme.
// Difficulty feeds level.js's difficulty scaling (gap size, enemy count/
// speed, platform count — see buildLevel) the same way a built-in's World
// 1-7 index always has. A brand-new custom world has no such index, so it
// silently defaulted to a fixed medium — this makes that an actual choice.
const DIFFICULTY_OPTIONS = [
  { label: 'Easy', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Hard', value: 6 },
];

export default function WorldBuilderForm({ initialWorld, isBuiltIn, onSave, onCancel }) {
  const [name, setName] = useState(initialWorld?.name ?? '');
  const [subtitle, setSubtitle] = useState(initialWorld?.subtitle ?? '');
  const [durationMinutes, setDurationMinutes] = useState(initialWorld?.defaultDurationMinutes ?? 3);
  const [enemyType, setEnemyType] = useState(initialWorld?.enemyType ?? ENEMY_TYPE_OPTIONS[0].type);
  const [paletteKey, setPaletteKey] = useState(PALETTE_PRESETS[0].key);
  const [difficulty, setDifficulty] = useState(initialWorld?.difficulty ?? 4);
  const [vocabText, setVocabText] = useState(vocabToText(initialWorld?.vocab));
  const [preview, setPreview] = useState(() => {
    if (!initialWorld?.vocab?.length) return null;
    return { terms: initialWorld.vocab, skipped: 0 };
  });

  function handleParse() {
    setPreview(parseVocabPaste(vocabText));
  }

  function handleSave() {
    const parsed = preview ?? parseVocabPaste(vocabText);
    if (!parsed.terms.length) return;
    const palette = PALETTE_PRESETS.find((p) => p.key === paletteKey)?.palette ?? PALETTE_PRESETS[0].palette;

    if (isBuiltIn) {
      onSave({
        name: name.trim() || initialWorld.name,
        subtitle: subtitle.trim() || initialWorld.subtitle,
        defaultDurationMinutes: Number(durationMinutes),
        vocab: parsed.terms,
      });
    } else {
      onSave({
        id: initialWorld?.id ?? `custom-${slugifyName(name || 'world')}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim() || 'Untitled World',
        subtitle: subtitle.trim(),
        enemyType,
        palette,
        defaultDurationMinutes: Number(durationMinutes),
        difficulty,
        vocab: parsed.terms,
        classroomCode: initialWorld?.classroomCode,
      });
    }
  }

  return (
    <div style={t.panel}>
      <label style={t.label}>World name</label>
      <input style={t.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Digestive Depths" />

      <label style={t.label}>Subtitle</label>
      <input
        style={t.input}
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="e.g. Digestive System"
      />

      <label style={t.label}>Level duration</label>
      <select style={t.input} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}>
        <option value={2}>2 minutes</option>
        <option value={3}>3 minutes</option>
        <option value={5}>5 minutes</option>
      </select>

      {!isBuiltIn && (
        <>
          <label style={t.label}>Enemy sprite</label>
          <select style={t.input} value={enemyType} onChange={(e) => setEnemyType(e.target.value)}>
            {ENEMY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.type} value={opt.type}>
                {opt.label}
              </option>
            ))}
          </select>

          <label style={t.label}>Theme</label>
          <select style={t.input} value={paletteKey} onChange={(e) => setPaletteKey(e.target.value)}>
            {PALETTE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>

          <label style={t.label}>Difficulty</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                style={{
                  ...t.button,
                  flex: 1,
                  background: difficulty === opt.value ? '#7d3fd6' : t.button.background,
                  border: difficulty === opt.value ? '2px solid #5a2ba0' : t.button.border,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      <label style={t.label}>Vocab — paste "Term - Definition" lines, or CSV (term,definition)</label>
      <textarea
        style={t.textarea}
        value={vocabText}
        onChange={(e) => {
          setVocabText(e.target.value);
          setPreview(null);
        }}
        placeholder={'Mitosis - Cell division producing two identical daughter cells\nMeiosis: Cell division producing gametes'}
      />
      <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
        <button type="button" style={t.button} onClick={handleParse}>
          Parse Vocab
        </button>
        {preview && (
          <span style={{ fontSize: 13, color: preview.skipped ? '#f1c40f' : '#7fdba0', alignSelf: 'center' }}>
            {preview.terms.length} term{preview.terms.length === 1 ? '' : 's'} parsed
            {preview.skipped > 0 ? `, ${preview.skipped} line${preview.skipped === 1 ? '' : 's'} skipped` : ''}
          </span>
        )}
      </div>

      {preview && preview.terms.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 180, overflowY: 'auto', border: '1px solid #2a3a5c', borderRadius: 6 }}>
          {preview.terms.map((term) => (
            <div
              key={term.id}
              style={{ padding: '8px 10px', borderBottom: '1px solid #22304f', fontSize: 13, display: 'flex', gap: 8 }}
            >
              <strong style={{ minWidth: 140, color: '#ffd23f' }}>{term.term}</strong>
              <span style={{ color: '#c8d3ea' }}>{term.definition}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <button type="button" style={t.buttonPrimary} onClick={handleSave} disabled={!(preview?.terms.length)}>
          Save World
        </button>
        <button type="button" style={t.button} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
