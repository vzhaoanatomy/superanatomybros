// Procedural chiptune background music via the Web Audio API — no audio
// files, just oscillators. Square lead + triangle harmony (an octave below)
// + sawtooth bass + a simple kick/snare pulse, ~195 BPM with short staccato
// notes and an accented downbeat for a bouncy, platformer-ish feel. Six
// short chord-progression "sections" are picked in a non-consecutive order
// so the loop doesn't feel like the same 4 bars over and over.

const BPM = 195;
const BEAT_SEC = 60 / BPM;
const STEP_SEC = BEAT_SEC / 2; // eighth notes
const STEPS_PER_SECTION = 16;
const LOOKAHEAD_SEC = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const freqCache = {};

function noteFreq(name) {
  if (freqCache[name]) return freqCache[name];
  const match = name.match(/^([A-G]#?)(\d)$/);
  const [, pitch, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitoneFromA4 = NOTE_NAMES.indexOf(pitch) - NOTE_NAMES.indexOf('A') + (octave - 4) * 12;
  const freq = 440 * Math.pow(2, semitoneFromA4 / 12);
  freqCache[name] = freq;
  return freq;
}

function transposeOctave(name, delta) {
  const match = name.match(/^([A-G]#?)(\d)$/);
  const [, pitch, octaveStr] = match;
  return `${pitch}${parseInt(octaveStr, 10) + delta}`;
}

// Chord voicings in octave 4 — root, third, fifth, octave.
const CHORDS = {
  C: ['C4', 'E4', 'G4', 'C5'],
  Am: ['A3', 'C4', 'E4', 'A4'],
  F: ['F3', 'A3', 'C4', 'F4'],
  G: ['G3', 'B3', 'D4', 'G4'],
};

// Each section: a 4-chord progression (one chord per 4-step group) plus an
// arpeggio index pattern applied within each group.
const SECTIONS = {
  A: { progression: ['C', 'F', 'G', 'C'], pattern: [0, 1, 2, 3] },
  B: { progression: ['Am', 'F', 'C', 'G'], pattern: [0, 2, 1, 3] },
  C: { progression: ['F', 'G', 'Am', 'C'], pattern: [2, 1, 0, 3] },
  D: { progression: ['C', 'G', 'Am', 'F'], pattern: [0, 1, 3, 2] },
  E: { progression: ['G', 'C', 'F', 'G'], pattern: [3, 2, 1, 0] },
  F: { progression: ['Am', 'G', 'F', 'G'], pattern: [0, 3, 1, 2] },
};
const SECTION_KEYS = Object.keys(SECTIONS);

let audioCtx = null;
let playing = false;
let schedulerTimer = null;
let nextStepTime = 0;
let currentStep = 0;
let currentSectionKey = null;
let recentSections = [];

function ensureContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

function pickNextSection() {
  let choice;
  do {
    choice = SECTION_KEYS[Math.floor(Math.random() * SECTION_KEYS.length)];
  } while (recentSections.includes(choice) && recentSections.length < SECTION_KEYS.length - 1);
  recentSections.push(choice);
  if (recentSections.length > 2) recentSections.shift();
  return choice;
}

function playTone(ctx, freq, startTime, duration, type, peakGain) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playKick(ctx, startTime) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, startTime);
  osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.12);
  gain.gain.setValueAtTime(0.5, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.16);
}

function playSnare(ctx, startTime) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.1);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
  noise.connect(gain).connect(ctx.destination);
  noise.start(startTime);
}

function scheduleStep(step, time) {
  const ctx = audioCtx;
  const section = SECTIONS[currentSectionKey];
  const groupIndex = Math.floor(step / 4);
  const chord = CHORDS[section.progression[groupIndex]];
  const chordTone = chord[section.pattern[step % 4]];

  // Short, staccato notes with an accented downbeat give a bouncy,
  // platformer "hop" feel rather than a smooth legato line.
  const isDownbeat = step % 4 === 0;
  const leadNote = transposeOctave(chordTone, 1);
  playTone(ctx, noteFreq(leadNote), time, STEP_SEC * 0.55, 'square', isDownbeat ? 0.15 : 0.1);
  playTone(ctx, noteFreq(transposeOctave(leadNote, -1)), time, STEP_SEC * 0.55, 'triangle', 0.07);

  if (step % 4 === 0) {
    const rootNote = transposeOctave(chord[0], -1);
    playTone(ctx, noteFreq(rootNote), time, STEP_SEC * 4 * 0.95, 'sawtooth', 0.08);
  }
  if (step === 0 || step === 8) playKick(ctx, time);
  if (step === 4 || step === 12) playSnare(ctx, time);
}

function scheduler() {
  const ctx = audioCtx;
  while (nextStepTime < ctx.currentTime + LOOKAHEAD_SEC) {
    scheduleStep(currentStep, nextStepTime);
    nextStepTime += STEP_SEC;
    currentStep++;
    if (currentStep >= STEPS_PER_SECTION) {
      currentStep = 0;
      currentSectionKey = pickNextSection();
    }
  }
}

export function isMusicPlaying() {
  return playing;
}

export function toggleMusic() {
  if (playing) {
    playing = false;
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
  } else {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    currentStep = 0;
    currentSectionKey = pickNextSection();
    nextStepTime = ctx.currentTime + 0.05;
    schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
  }
  return playing;
}

// One-shot SFX — share the same lazily-created AudioContext as the music so
// they work whether or not background music is toggled on. These are called
// from real click handlers (quiz answers) or shortly after one (reaching the
// flag), so the context is already unlocked by the time they fire.
export function playCorrectChime() {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  playTone(ctx, noteFreq('C6'), t, 0.12, 'square', 0.16);
  playTone(ctx, noteFreq('E6'), t + 0.09, 0.16, 'square', 0.16);
}

export function playWrongBuzz() {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(85, t + 0.25);
  gain.gain.setValueAtTime(0.16, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

// A sparkly ascending arpeggio that fills the whole star duration, scheduled
// entirely up front on the audio clock — no JS timer keeps it running, so it
// can't be cut short by rAF/setTimeout throttling in a backgrounded tab.
export function playStarPowerSound(durationMs = 8000) {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;
  const notes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
  const stepDur = 0.12;
  const totalSteps = Math.floor(durationMs / 1000 / stepDur);
  for (let i = 0; i < totalSteps; i++) {
    const note = notes[i % notes.length];
    const start = t0 + i * stepDur;
    playTone(ctx, noteFreq(note), start, stepDur * 0.9, 'square', 0.09);
    if (i % 2 === 0) {
      playTone(ctx, noteFreq(transposeOctave(note, 1)), start, stepDur * 0.9, 'triangle', 0.05);
    }
  }
}

export function playFireballSound() {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 0.14);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.17);
}

export function playSuccessFanfare() {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const notes = ['C5', 'C5', 'C5', 'G5'];
  notes.forEach((n, i) => {
    const dur = i === notes.length - 1 ? 0.4 : 0.14;
    playTone(ctx, noteFreq(n), t + i * 0.15, dur, 'square', 0.18);
  });
}
