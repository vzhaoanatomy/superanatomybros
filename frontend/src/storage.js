// All localStorage access for the app lives here. Every read is wrapped so a
// missing/corrupted key never throws — callers always get a safe default.
const CUSTOM_WORLDS_KEY = 'anatomia_custom_worlds_v1';
const JOINED_WORLDS_KEY = 'anatomia_joined_worlds_v1';
const SETTINGS_KEY = 'anatomia_settings_v1';
const LOCAL_LEADERBOARD_KEY = 'anatomia_local_leaderboard_v1';
const NICKNAME_KEY = 'anatomia_nickname_v1';
const TEACHER_ONBOARDING_KEY = 'anatomia_teacher_onboarding_dismissed_v1';

const LOCAL_LEADERBOARD_MAX = 20;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — silently no-op.
  }
}

// Shape: { overrides: { [builtInWorldId]: { name, subtitle, defaultDurationMinutes, vocab } },
//          custom: [ { id, name, subtitle, enemyType, palette, defaultDurationMinutes, vocab, classroomCode? } ] }
export function loadCustomWorldData() {
  const data = readJSON(CUSTOM_WORLDS_KEY, {});
  return {
    overrides: data.overrides ?? {},
    custom: Array.isArray(data.custom) ? data.custom : [],
  };
}

export function saveCustomWorldData(data) {
  writeJSON(CUSTOM_WORLDS_KEY, data);
}

// Array of full world objects fetched via GET /api/worlds/{code}, each tagged
// with isClassroom + code by the caller before saving.
export function loadJoinedWorlds() {
  const data = readJSON(JOINED_WORLDS_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function saveJoinedWorlds(list) {
  writeJSON(JOINED_WORLDS_KEY, list);
}

export function loadSettings() {
  const data = readJSON(SETTINGS_KEY, {});
  return {
    musicOn: data.musicOn ?? true,
    sfxOn: data.sfxOn ?? true,
  };
}

export function saveSettings(settings) {
  writeJSON(SETTINGS_KEY, settings);
}

export function loadLocalLeaderboard() {
  const data = readJSON(LOCAL_LEADERBOARD_KEY, []);
  return Array.isArray(data) ? data : [];
}

// entry: { worldId, worldName, characterName, score, date }
export function recordLocalScore(entry) {
  const list = loadLocalLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  writeJSON(LOCAL_LEADERBOARD_KEY, list.slice(0, LOCAL_LEADERBOARD_MAX));
}

// Lets a teacher clear this device's local leaderboard between class
// periods rather than it accumulating across every period indefinitely.
export function clearLocalLeaderboard() {
  writeJSON(LOCAL_LEADERBOARD_KEY, []);
}

// Best score for one specific world across every local play — used to show
// a "Best: N" badge on its deck card before you even click in.
export function getBestLocalScore(worldId) {
  const entries = loadLocalLeaderboard().filter((e) => e.worldId === worldId);
  if (!entries.length) return null;
  return Math.max(...entries.map((e) => e.score));
}

export function getNickname() {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setNickname(name) {
  const trimmed = name.trim().slice(0, 24);
  try {
    localStorage.setItem(NICKNAME_KEY, trimmed);
  } catch {
    // ignore
  }
  return trimmed;
}

// The "Quick Start" banner at the top of Teacher Mode — dismissed once,
// stays dismissed on this device, rather than nagging a teacher who
// already knows the ropes every time they come back.
export function isTeacherOnboardingDismissed() {
  try {
    return localStorage.getItem(TEACHER_ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissTeacherOnboarding() {
  try {
    localStorage.setItem(TEACHER_ONBOARDING_KEY, '1');
  } catch {
    // ignore
  }
}
