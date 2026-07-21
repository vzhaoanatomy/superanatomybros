// Background music is a single looping <audio> element — a bundled
// 8-bit track (frontend/public/audio/pixelland.mp3) plays by default for
// every world; a classroom world's own uploaded track takes over the same
// slot exactly as before, layered on top via setCustomTrack(). SFX below
// stay on the Web Audio API (procedural oscillators), untouched by this.
const DEFAULT_TRACK_URL = '/audio/pixelland.mp3';

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

let audioCtx = null;
// Background music defaults ON — it previously defaulted off and only ever
// started from an explicit toggle click, which meant most playthroughs had
// no ambient track running at all. That silently broke two things that
// looked like separate bugs: the bonus-room jingle being ducked "under"
// nothing, and the main track never being there to audibly resume once the
// player came back up a pipe. See unlockAudio() below for where it actually
// starts (autoplay policy requires a real user gesture).
let playing = true;

function ensureContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

// Resumes the (lazily-created) AudioContext AND kicks off background music
// (if still on, i.e. the player hasn't toggled it off before this fires)
// from inside a real user-gesture handler — App.jsx's first-tap listener
// calls this once, which is the trusted event mobile browsers require to
// allow any audio, <audio> element playback included, not just the
// Web Audio oscillator SFX.
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  if (playing) startPlayback();
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

let activeTrackUrl = DEFAULT_TRACK_URL;
let audioEl = null;
let loadedUrl = null;

function startPlayback() {
  if (!audioEl) audioEl = new Audio();
  // Tracked separately from audioEl.src (which the browser resolves to a
  // full absolute URL) so a relative activeTrackUrl doesn't look "changed"
  // on every single toggle and reset playback position each time.
  if (loadedUrl !== activeTrackUrl) {
    audioEl.src = activeTrackUrl;
    loadedUrl = activeTrackUrl;
  }
  audioEl.loop = true;
  audioEl.volume = 0.6;
  audioEl.play().catch(() => {});
}

function stopPlayback() {
  if (audioEl) audioEl.pause();
}

// Both stop whatever's currently playing before switching, so a world
// change never leaves two tracks briefly overlapping, and never silently
// drops music altogether if the toggle stays "on" across the switch.
export function setCustomTrack(url) {
  const wasPlaying = playing;
  if (wasPlaying) stopPlayback();
  activeTrackUrl = url;
  if (wasPlaying) startPlayback();
}

export function clearCustomTrack() {
  const wasPlaying = playing;
  if (wasPlaying) stopPlayback();
  activeTrackUrl = DEFAULT_TRACK_URL;
  if (wasPlaying) startPlayback();
}

// Silences the background <audio> element without touching the user's
// on/off toggle (`playing`) — used while a pipe bonus room's own
// synthesized track (see playBonusRoomMusic) takes over, so the two never
// play at once and the main track picks back up exactly where it left off.
export function duckBackgroundMusic() {
  stopPlayback();
}

export function unduckBackgroundMusic() {
  if (playing) startPlayback();
}

export function isMusicPlaying() {
  return playing;
}

export function toggleMusic() {
  if (playing) {
    playing = false;
    stopPlayback();
  } else {
    playing = true;
    startPlayback();
  }
  return playing;
}

let sfxEnabled = true;

export function isSfxEnabled() {
  return sfxEnabled;
}

export function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

export function setSfxEnabled(value) {
  sfxEnabled = value;
  return sfxEnabled;
}

// One-shot SFX — share the same lazily-created AudioContext as the music so
// they work whether or not background music is toggled on. These are called
// from real click handlers (quiz answers) or shortly after one (reaching the
// flag), so the context is already unlocked by the time they fire.
export function playCorrectChime() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  playTone(ctx, noteFreq('C6'), t, 0.12, 'square', 0.16);
  playTone(ctx, noteFreq('E6'), t + 0.09, 0.16, 'square', 0.16);
}

export function playWrongBuzz() {
  if (!sfxEnabled) return;
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
  if (!sfxEnabled) return;
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
  if (!sfxEnabled) return;
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

// A bright single bell "ding" — played the instant any mystery box is
// bumped, before the reward-specific feedback (coin pop or power-up pop)
// plays, so every box gives the same immediate "that worked" cue.
export function playMysteryBoxDing() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  playTone(ctx, noteFreq('B5'), t, 0.16, 'sine', 0.22);
  playTone(ctx, noteFreq('B6'), t, 0.16, 'triangle', 0.09);
}

// A quick ascending sparkle — played right after the ding specifically
// when the reward is a power-up (not a coin), so catching one feels like
// a bigger deal than a plain coin.
export function playPowerUpPopSound() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;
  const notes = ['C5', 'E5', 'G5', 'C6'];
  notes.forEach((n, i) => {
    playTone(ctx, noteFreq(n), t0 + i * 0.055, 0.16, 'square', 0.15);
  });
}

// A fast, driving 8-bit loop for the pipe bonus room — deliberately more
// urgent/upbeat than the calm main-level track, since the room is a timed
// dash. Ticks one step at a time on a real setInterval (not pre-scheduled
// on the audio clock) so start/stop are explicit and immediate — the same
// call pattern as the one-shot SFX below, which are already known to work
// reliably, rather than the large up-front batch playStarPowerSound uses.
//
// Gated on `sfxEnabled`, NOT `playing` — `playing` is the toggle for the
// bundled/uploaded <audio> background track (off by default), while this
// is a short synthesized oscillator loop just like the dings/pops below.
// Gating it on `playing` meant it silently never played for anyone who
// hadn't separately opted into background music — this was the actual bug
// behind "the alcove music didn't change" (nothing was audible in EITHER
// room without that toggle on).
let bonusMusicInterval = null;
let bonusMusicStep = 0;
const BONUS_MUSIC_STEP_MS = 150;
const BONUS_MUSIC_BASS = ['C3', 'C3', 'G3', 'C3', 'C3', 'C3', 'A3', 'G3'];
const BONUS_MUSIC_LEAD = ['C5', 'E5', 'G5', 'E5', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5'];

function playBonusMusicStep() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  playTone(ctx, noteFreq(BONUS_MUSIC_BASS[bonusMusicStep % BONUS_MUSIC_BASS.length]), t, 0.13, 'square', 0.22);
  playTone(ctx, noteFreq(BONUS_MUSIC_LEAD[bonusMusicStep % BONUS_MUSIC_LEAD.length]), t, 0.09, 'triangle', 0.18);
  bonusMusicStep += 1;
}

export function startBonusRoomMusic() {
  stopBonusRoomMusic();
  bonusMusicStep = 0;
  playBonusMusicStep();
  bonusMusicInterval = setInterval(playBonusMusicStep, BONUS_MUSIC_STEP_MS);
}

export function stopBonusRoomMusic() {
  if (bonusMusicInterval) {
    clearInterval(bonusMusicInterval);
    bonusMusicInterval = null;
  }
}

// A quick downward "stomp" blip — played whenever an enemy is defeated
// (pound, star touch, fireball, or a correct enemy-quiz answer), separate
// from playCorrectChime so combat has its own distinct feedback.
export function playStompSound() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(340, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

// A short hurt "oof" — for damage sources with no quiz to give feedback of
// their own (piranha plant chomp, koopa shell hit).
export function playHurtSound() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

export function playSuccessFanfare() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  const notes = ['C5', 'C5', 'C5', 'G5'];
  notes.forEach((n, i) => {
    const dur = i === notes.length - 1 ? 0.4 : 0.14;
    playTone(ctx, noteFreq(n), t + i * 0.15, dur, 'square', 0.18);
  });
}

// A cheerful "ding ding ding ding ding" — five quick bell-like chimes on a
// rising little tune, played once the player actually finishes a level
// (after the end-of-level review, not just touching the flag).
export function playLevelCompleteDings() {
  if (!sfxEnabled) return;
  const ctx = ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;
  const notes = ['C6', 'E6', 'G6', 'E6', 'C7'];
  notes.forEach((n, i) => {
    const start = t0 + i * 0.16;
    playTone(ctx, noteFreq(n), start, 0.3, 'sine', 0.2);
    playTone(ctx, noteFreq(n), start, 0.3, 'triangle', 0.1);
  });
}
