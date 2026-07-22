import { useEffect, useRef, useState } from 'react';
import {
  RUN_SPEED,
  JUMP_VELOCITY,
  GRAVITY,
  JUMP_CUTOFF_VELOCITY,
  MAX_FALL_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
} from './constants';
import { buildLevel, buildBonusRoom, GROUND_HEIGHT } from './level';
import { getCharacter } from './characters';
import { getWorld } from './worlds';
import { buildQuestion, buildEndOfLevelQuestions, findTerm } from './vocab';
import {
  drawBackground,
  drawPlatform,
  drawCoin,
  drawDoor,
  drawFlag,
  drawEnemy,
  drawPathogenLabel,
  drawPlayer,
  drawPowerUp,
  drawBoss,
  drawDinoMount,
  drawFireball,
  drawPiranhaPlant,
  drawSpikes,
  drawKoopa,
  drawShell,
  drawTongueFlick,
  drawSolidEgg,
  drawScorePopup,
  SCORE_POPUP_MS,
  drawParticles,
  drawBonusBackground,
  drawBonusHud,
  drawLoreCard,
  drawPoppedItem,
  POPPED_ITEM_MS,
  POPPED_ITEM_SIZE,
} from './spriteRenderer';
import {
  createJuiceState,
  shake,
  hitPause,
  isHitPaused,
  burst,
  tick as tickJuice,
  getShakeOffset,
  PARTICLE_LIFE_MS,
} from './juice';
import {
  toggleMusic,
  isMusicPlaying,
  playSuccessFanfare,
  playStarPowerSound,
  playFireballSound,
  playStompSound,
  playHurtSound,
  playCorrectChime,
  playLevelCompleteDings,
  playMysteryBoxDing,
  playPowerUpPopSound,
  startBonusRoomMusic,
  stopBonusRoomMusic,
  duckBackgroundMusic,
  unduckBackgroundMusic,
  setCustomTrack,
  clearCustomTrack,
} from './music';
import { updateHazards, fireballHitsHazard, scheduleKoopaThrow } from './hazards';
import { createTermQueue } from './termQueue';
import { recordLocalScore, getNickname, saveProgress, loadProgress, clearProgress } from '../storage';
import { API_BASE } from '../api';
import { submitScore } from '../api';
import GameHud from './GameHud';
import GameOverlays from './GameOverlays';
import TouchControls from './TouchControls';

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const FIRE_KEYS = new Set(['KeyF']);
const INVULN_MS = 1200;
const COIN_BOUNCE_MS = 800;
const COIN_CORRECT_POINTS = 15;
const COIN_WRONG_PENALTY = 10;
// Skipping the quiz (stomp/pound/star/fireball) is worth less than actually
// answering it (see the quiz-resolved enemy kill below at +50) — still
// rewarding so those abilities stay fun to use, but not the best strategy.
const INSTANT_KILL_SCORE = 10;
const GLIDE_FALL_SPEED = 1.6;
const GROUND_POUND_SPEED = 24;
const GROUND_POUND_RADIUS = 90;
// Peak jump height scales with velocity^2 under constant gravity, so to get a
// jump that's 20% *higher* (not 20% faster launch), scale velocity by sqrt(1.2).
const SUPER_JUMP_MULTIPLIER = Math.sqrt(1.2);
const HUD_PUSH_INTERVAL_MS = 100;
const TERM_FLASH_MS = 2000;
// Long enough to survive being covered by a quiz overlay right after — the
// dismiss timer runs on real wall-clock time regardless of the game's own
// pause state, so a slow answer could otherwise eat the whole flash.
const POWER_UP_FLASH_MS = 6000;
// What each mystery-box power-up does and, where there's a key for it, how
// to use it — shown as a flash the moment it's caught so the player isn't
// left guessing what they just picked up (see flashPowerUp/triggerMysteryBox).
const POWER_UP_HELP = {
  mushroom: { icon: '🥼', label: 'White Coat!', hint: "You're Big now — absorbs one hit before you power down." },
  star: { icon: '⭐', label: 'Immune Boost!', hint: "Invincible for a few seconds — run through enemies!" },
  egg: { icon: '🥚', label: 'Egg caught!', hint: 'Press Down/S to flick your tongue and grab enemies.' },
  fireFlower: { icon: '💊', label: 'Antibiotic Flower!', hint: 'Press F to throw antibiotic capsules.' },
};
const STAR_DURATION_MS = 8000;
const MOUNT_SPEED_MULTIPLIER = 1.5;
const MAX_LIVES = 5;
const BOSS_DEFEAT_SCORE = 1500;
const PIPE_QUESTIONS = 2;
const BONUS_ROOM_SECONDS = 10;
const BONUS_COIN_VALUE = 10;
const LORE_CARD_SCORE = 25;
const LORE_FLASH_MS = 6000;
// How far the player visibly sinks into (or rises out of) the pipe during
// the entry/exit cutscene — see beginPipeEntry/exitBonusRoom. Sink depth is
// deliberately more than PLAYER_HEIGHT so they're fully hidden behind the
// pipe (see the clip in draw()) by the end of the animation, not just
// partway down — otherwise the player never actually disappears.
const PIPE_TRANSITION_MS = 500;
const PIPE_SINK_DEPTH = 62;
// How long a crumbling platform holds after the player lands on it before
// it gives way — long enough to grab the coin above it and step off, short
// enough to feel like a real hazard rather than an ordinary platform.
const CRUMBLE_DELAY_MS = 550;
const FIREBALL_SPEED = 10;
const FIREBALL_COOLDOWN_MS = 350;
const FIREBALL_MAX_TRAVEL = 650;
// An actual oval/pill shape, not a square — wider than tall, matching a
// real antibiotic capsule instead of the round fireball it replaced.
const FIREBALL_WIDTH = 24;
const FIREBALL_HEIGHT = 14;
const TONGUE_COOLDOWN_MS = 500;
const TONGUE_FLICK_MS = 220;
const TONGUE_REACH = 70;

function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function resolveHorizontal(player, solids) {
  for (const p of solids) {
    if (!aabbOverlap(player, p)) continue;
    if (player.vx > 0) {
      player.x = p.x - player.width;
    } else if (player.vx < 0) {
      player.x = p.x + p.width;
    }
  }
}

function resolveVertical(player, solids) {
  player.onGround = false;
  for (const p of solids) {
    if (!aabbOverlap(player, p)) continue;
    if (player.vy > 0) {
      player.y = p.y - player.height;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vy < 0) {
      player.y = p.y + p.height;
      player.vy = 0;
    }
  }
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

// Fits the viewport within both window dimensions at once — HUD panel,
// frame borders, controls hint, and page padding all eat into vertical
// space, so a width-only cap left the ground below the fold on shorter
// screens. Aspect ratio (2:1) is preserved either way.
function computeViewportSize() {
  if (typeof window === 'undefined') return { w: 960, h: 480 };
  const CHROME_HEIGHT = 230; // hud-panel + divider + controls-hint + borders + page padding
  const maxW = Math.min(window.innerWidth - 64, 1300);
  const maxH = Math.max(300, window.innerHeight - CHROME_HEIGHT);
  let w = maxW;
  let h = Math.round(w * 0.5);
  if (h > maxH) {
    h = maxH;
    w = Math.round(h * 2);
  }
  return { w, h };
}

// Game loop mounts once; pause/overlay state is read from refs (not React
// state) so opening a quiz never force a re-mount. See CLAUDE.md rule 1.
// Overlays themselves are separate React components (rule 4) driven by the
// `overlay` state below; `handlersRef` bridges their button clicks back into
// the imperative game state the loop owns. `hud` is a throttled snapshot of
// score/lives/coins/time pushed from the loop purely for the HTML HUD bar to
// render — it never affects the loop's own lifecycle.
export default function GameCanvas({ characterId, worldId, onQuit }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(false);
  const keysRef = useRef(new Set());
  const handlersRef = useRef({});
  const [overlay, setOverlay] = useState(null);
  const [hud, setHud] = useState(null);
  const [viewportSize, setViewportSize] = useState(computeViewportSize);
  const [musicOn, setMusicOn] = useState(isMusicPlaying());
  // Brief term+definition reinforcement shown over live gameplay right
  // after a quiz resolves — non-blocking, purely a review aid.
  const [termFlash, setTermFlash] = useState(null);
  // Brief "what did I just catch, and how do I use it" reminder shown the
  // moment a mystery box pops a power-up — see POWER_UP_HELP/flashPowerUp.
  const [powerUpFlash, setPowerUpFlash] = useState(null);
  // The fact revealed by a bonus-room lore card — see flashLore.
  const [loreFlash, setLoreFlash] = useState(null);

  const world = getWorld(worldId);
  const character = getCharacter(characterId);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let canvasWidth = computeViewportSize().w;
    let canvasHeight = computeViewportSize().h;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const durationMinutes = world.defaultDurationMinutes;
    // Crash recovery: a save persists the exact RNG seed used to generate
    // this level (see level.js's buildLevel), so regenerating with that
    // same seed reproduces an identical layout to reapply saved progress
    // onto — a fresh mount with no save just rolls a new random seed like
    // before, so this is invisible outside of an actual reload/resume.
    const savedProgress = loadProgress(worldId, characterId);
    let levelSeed = savedProgress?.seed ?? `${world.id}-${durationMinutes}-${Math.random()}`;
    const level = buildLevel({ world, durationMinutes, seed: levelSeed });
    const durationSeconds = level.durationSeconds;
    const vocab = world.vocab;
    if (world.musicUrl) {
      setCustomTrack(`${API_BASE}${world.musicUrl}`);
    }
    if (level.koopa) {
      level.koopa.nextThrowAt = scheduleKoopaThrow();
    }

    // Every coin/enemy/door/boss-question draws its term from this shuffled
    // no-repeat queue, rebuilt fresh on mount and on every Play Again so
    // replays don't show the same order twice.
    const termQueue = createTermQueue(vocab);
    const nextTermId = termQueue.next;
    termQueue.assignAll(level);

    const player = {
      x: level.spawn.x,
      y: level.spawn.y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      invulnerableUntil: 0,
      pounding: false,
      starUntil: 0,
      mounted: false,
      big: false,
      hasFire: false,
      tongueUntil: 0,
    };

    const juice = createJuiceState();

    // Where a life loss respawns the player — starts at the level's own
    // spawn point, moves to the checkpoint door once it's actually passed.
    let lastCheckpoint = { x: level.spawn.x, y: level.spawn.y };

    const state = {
      camera: 0,
      score: 0,
      lives: 3,
      coinsCollected: 0,
      levelComplete: false,
      gliding: false,
      pounding: false,
      missedTermIds: new Set(),
      correctTermIds: new Set(),
      correctCount: 0,
      wrongCount: 0,
      durationSeconds,
      timeRemaining: durationSeconds,
      lastTimeBonus: 0,
      fireballs: [],
      shells: [],
      solidEggs: [],
      scorePopups: [],
      poppedItems: [],
      bonusRoom: null,
      pipeTransition: null,
    };

    // Reapply saved progress onto the freshly (identically) regenerated
    // level — same seed means same array order, so restoring by index is
    // safe. Transient mid-transition state (bonus room, pipe sink/rise,
    // crumbling-platform triggers) isn't persisted; see saveProgressNow
    // below for why that's an acceptable simplification, not an oversight.
    if (savedProgress) {
      state.score = savedProgress.score;
      state.lives = savedProgress.lives;
      state.missedTermIds = new Set(savedProgress.missedTermIds);
      state.correctTermIds = new Set(savedProgress.correctTermIds);
      state.correctCount = savedProgress.correctCount;
      state.wrongCount = savedProgress.wrongCount;
      state.timeRemaining = savedProgress.timeRemaining;
      level.door.passed = savedProgress.doorPassed;
      lastCheckpoint = savedProgress.checkpoint;
      player.x = lastCheckpoint.x;
      player.y = lastCheckpoint.y;
      // A short grace period, same as any other respawn — resuming
      // shouldn't be able to land the player directly on a hazard that
      // instantly costs a life before they've even gotten their bearings.
      player.invulnerableUntil = performance.now() + INVULN_MS;
      savedProgress.coinsCollected?.forEach((c, i) => {
        if (level.coins[i]) level.coins[i].collected = c;
      });
      savedProgress.enemiesAlive?.forEach((a, i) => {
        if (level.enemies[i]) level.enemies[i].alive = a;
      });
      savedProgress.flyersAlive?.forEach((a, i) => {
        if (level.flyers[i]) level.flyers[i].alive = a;
      });
      savedProgress.boxesUsed?.forEach((u, i) => {
        if (level.mysteryBoxes[i]) level.mysteryBoxes[i].used = u;
      });
      savedProgress.pipesUsed?.forEach((u, i) => {
        if (level.bonusPipes[i]) level.bonusPipes[i].used = u;
      });
      if (level.koopa && savedProgress.koopaAlive != null) level.koopa.alive = savedProgress.koopaAlive;
      if (level.piranha && savedProgress.piranhaAlive != null) level.piranha.alive = savedProgress.piranhaAlive;
      if (level.boss) {
        if (savedProgress.bossAlive != null) level.boss.alive = savedProgress.bossAlive;
        if (savedProgress.bossHp != null) level.boss.hp = savedProgress.bossHp;
      }
      popup(player.x + player.width / 2, player.y - 20, 'Welcome back!', '#7de37b');
    }

    // Throttled autosave — checkpoint/coin/enemy/etc. mutations happen in
    // many different places across this file, so rather than hook every
    // single one, this just snapshots current progress on a timer from
    // inside the physics loop. Skipped mid-bonus-room or mid-pipe-transition
    // (state.bonusRoom/pipeTransition) so a resume never has to reconstruct
    // that transient state — it just resumes from the last good moment on
    // the main level, a beat before the pipe was entered.
    let lastProgressSaveAt = 0;
    const PROGRESS_SAVE_INTERVAL_MS = 3000;
    function saveProgressNow(force = false) {
      const now = performance.now();
      if (!force && now - lastProgressSaveAt < PROGRESS_SAVE_INTERVAL_MS) return;
      if (state.bonusRoom || state.pipeTransition || state.levelComplete) return;
      lastProgressSaveAt = now;
      saveProgress(worldId, characterId, {
        seed: levelSeed,
        score: state.score,
        lives: state.lives,
        missedTermIds: [...state.missedTermIds],
        correctTermIds: [...state.correctTermIds],
        correctCount: state.correctCount,
        wrongCount: state.wrongCount,
        timeRemaining: state.timeRemaining,
        doorPassed: level.door.passed,
        checkpoint: lastCheckpoint,
        coinsCollected: level.coins.map((c) => c.collected),
        enemiesAlive: level.enemies.map((e) => e.alive),
        flyersAlive: level.flyers.map((f) => f.alive),
        boxesUsed: level.mysteryBoxes.map((b) => b.used),
        pipesUsed: level.bonusPipes.map((p) => p.used),
        koopaAlive: level.koopa ? level.koopa.alive : null,
        piranhaAlive: level.piranha ? level.piranha.alive : null,
        bossAlive: level.boss ? level.boss.alive : null,
        bossHp: level.boss ? level.boss.hp : null,
      });
    }

    let lastFrameTime = performance.now();
    let lastHudPush = 0;
    let lastFireballTime = 0;
    let lastTongueTime = 0;
    let glossaryOpen = false;

    // Toggled by the G key or the HUD button — a plain pause/resume like
    // any quiz overlay, just without a resolve callback. Won't open over an
    // already-active quiz/other overlay, and won't fight one that opens
    // while it's up since those set pausedRef themselves.
    function toggleGlossary() {
      if (glossaryOpen) {
        glossaryOpen = false;
        resume();
        setOverlay(null);
      } else if (!pausedRef.current) {
        glossaryOpen = true;
        pause();
        setOverlay({ type: 'glossary' });
      }
    }

    function recordWrong(termId) {
      state.missedTermIds.add(termId);
      state.wrongCount += 1;
    }

    function recordCorrect(termId) {
      state.correctTermIds.add(termId);
      state.correctCount += 1;
    }

    function popup(x, y, text, color) {
      state.scorePopups.push({ x, y, text, color, createdAt: performance.now() });
    }

    // Every timed buff (star, post-hit invulnerability) is stored as an
    // absolute performance.now() deadline, but quiz overlays freeze the game
    // without freezing that clock — so answering a question mid-star was
    // silently burning down real invincibility time. pause()/resume() are
    // the single choke point every overlay routes through instead of
    // touching pausedRef directly, so the elapsed pause span can be added
    // back onto those deadlines. The pause() no-op guard also means the
    // boss's chained 3-question sequence (each sub-question re-opens a
    // quiz) counts as one continuous pause, not three stacked ones.
    // Edge-triggered (not held) so standing on a pipe with Down held doesn't
    // reopen the quiz every frame — set only on the actual keydown transition
    // in handleKeyDown below, consumed once per press in updatePhysics.
    let pipeEnterRequested = false;
    let pauseStartedAt = null;
    function pause() {
      if (pausedRef.current) return;
      pausedRef.current = true;
      pauseStartedAt = performance.now();
    }
    function resume() {
      if (!pausedRef.current) return;
      pausedRef.current = false;
      if (pauseStartedAt != null) {
        const pausedMs = performance.now() - pauseStartedAt;
        player.starUntil += pausedMs;
        player.invulnerableUntil += pausedMs;
        pauseStartedAt = null;
      }
    }

    let termFlashTimer = null;
    function flashTerm(term, definition, correct) {
      if (!term) return;
      if (termFlashTimer) clearTimeout(termFlashTimer);
      setTermFlash({ id: performance.now(), term, definition, correct });
      termFlashTimer = setTimeout(() => setTermFlash(null), TERM_FLASH_MS);
    }

    let powerUpFlashTimer = null;
    function flashPowerUp(type) {
      const info = POWER_UP_HELP[type];
      if (!info) return;
      if (powerUpFlashTimer) clearTimeout(powerUpFlashTimer);
      setPowerUpFlash({ id: performance.now(), ...info });
      powerUpFlashTimer = setTimeout(() => setPowerUpFlash(null), POWER_UP_FLASH_MS);
    }

    let loreFlashTimer = null;
    function flashLore(fact) {
      if (!fact) return;
      if (loreFlashTimer) clearTimeout(loreFlashTimer);
      setLoreFlash({ id: performance.now(), fact });
      loreFlashTimer = setTimeout(() => setLoreFlash(null), LORE_FLASH_MS);
    }

    function respawnPlayer() {
      player.x = lastCheckpoint.x;
      player.y = lastCheckpoint.y;
      player.vx = 0;
      player.vy = 0;
      player.pounding = false;
      player.invulnerableUntil = performance.now() + INVULN_MS;
    }

    function loseLife() {
      // Any active power-up absorbs one hit before an actual life is lost —
      // mount pops first (biggest shield), then big, then fire — reverting
      // the character to its normal size/state with a brief invulnerability
      // window, same "shield" convention for every damage source (quiz
      // wrong answer, piranha chomp, koopa shell, pit, timeout).
      if (player.mounted) {
        player.mounted = false;
        player.invulnerableUntil = performance.now() + INVULN_MS;
        return;
      }
      if (player.big) {
        player.big = false;
        player.invulnerableUntil = performance.now() + INVULN_MS;
        return;
      }
      if (player.hasFire) {
        player.hasFire = false;
        player.invulnerableUntil = performance.now() + INVULN_MS;
        return;
      }
      state.lives -= 1;
      if (state.lives <= 0) {
        state.lives = 3;
        state.score = 0;
      }
      respawnPlayer();
    }

    function resetRun() {
      // Fully regenerate the level layout (platforms, enemies, power-ups,
      // coins) on every restart — a fresh random seed each call, so
      // replaying doesn't hand back the exact same path to memorize.
      // Mutates the existing `level` object in place (Object.assign, not
      // reassignment) so every closure that already reads `level.xxx`
      // picks up the new layout transparently. Width and durationSeconds
      // are deterministic (not rng-driven), so they stay consistent with
      // state.durationSeconds captured at mount. `levelSeed` is reassigned
      // (not const) so saveProgressNow's next autosave persists THIS new
      // layout's seed, not the one from mount — otherwise a resume after
      // Play Again would rebuild the wrong layout and misapply saved
      // per-index coin/enemy flags onto it. Any old save is cleared
      // outright too, since a restart's progress shouldn't resurrect a
      // previous attempt's checkpoint/score.
      levelSeed = `${world.id}-${durationMinutes}-${Math.random()}`;
      clearProgress(worldId, characterId);
      Object.assign(level, buildLevel({ world, durationMinutes, seed: levelSeed }));
      if (level.koopa) {
        level.koopa.nextThrowAt = scheduleKoopaThrow();
      }
      termQueue.assignAll(level);

      // A fresh run regenerates the door's position too, so any checkpoint
      // progress from the last attempt shouldn't carry over.
      lastCheckpoint = { x: level.spawn.x, y: level.spawn.y };
      respawnPlayer();
      player.invulnerableUntil = 0;
      player.starUntil = 0;
      player.mounted = false;
      player.big = false;
      player.hasFire = false;
      player.tongueUntil = 0;
      state.fireballs = [];
      state.shells = [];
      state.solidEggs = [];
      state.scorePopups = [];
      state.poppedItems = [];
      state.bonusRoom = null;
      state.pipeTransition = null;
      state.score = 0;
      state.lives = 3;
      state.coinsCollected = 0;
      state.levelComplete = false;
      state.gliding = false;
      state.pounding = false;
      state.missedTermIds = new Set();
      state.correctTermIds = new Set();
      state.correctCount = 0;
      state.wrongCount = 0;
      state.timeRemaining = state.durationSeconds;
      state.lastTimeBonus = 0;
      juice.particles = [];
      juice.shakeIntensity = 0;
      juice.hitPauseUntil = 0;
      lastFrameTime = performance.now();
      pausedRef.current = false;
      pauseStartedAt = null;
      setOverlay(null);
    }

    handlersRef.current.resolveQuiz = (isCorrect) => handlersRef.current._pendingResolve?.(isCorrect);
    handlersRef.current.finishEndOfLevel = (results) => {
      // A finished level has nothing left to resume into.
      clearProgress(worldId, characterId);
      for (const r of results) {
        if (r.correct) recordCorrect(r.termId);
        else recordWrong(r.termId);
      }
      recordLocalScore({
        worldId: world.id,
        worldName: world.name,
        characterName: character.name,
        nickname: getNickname(),
        score: state.score,
        date: new Date().toISOString(),
      });
      if (world.isClassroom) {
        const nickname = getNickname();
        if (nickname) {
          submitScore(
            world.code,
            nickname,
            state.score,
            [...state.missedTermIds],
            [...state.correctTermIds],
            state.correctCount,
            state.wrongCount
          ).catch(() => {});
        }
      }
      playLevelCompleteDings();
      setOverlay({ type: 'complete' });
    };
    handlersRef.current.openReview = () => setOverlay({ type: 'review' });
    handlersRef.current.closeReview = () => setOverlay({ type: 'complete' });
    handlersRef.current.playAgain = () => resetRun();
    handlersRef.current.getMissedItems = () =>
      [...state.missedTermIds].map((id) => findTerm(vocab, id)).filter(Boolean);
    handlersRef.current.getScore = () => state.score;
    handlersRef.current.getTimeBonus = () => state.lastTimeBonus;
    handlersRef.current.hasMissed = () => state.missedTermIds.size > 0;
    handlersRef.current.toggleGlossary = toggleGlossary;
    handlersRef.current.getVocab = () => vocab;
    handlersRef.current.closeIntro = () => {
      resume();
      setOverlay(null);
    };

    function handleKeyDown(e) {
      if (JUMP_KEYS.has(e.code) || LEFT_KEYS.has(e.code) || RIGHT_KEYS.has(e.code) || DOWN_KEYS.has(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'KeyG') {
        toggleGlossary();
        return;
      }
      if (DOWN_KEYS.has(e.code) && !keysRef.current.has(e.code)) {
        pipeEnterRequested = true;
      }
      keysRef.current.add(e.code);
    }
    function handleKeyUp(e) {
      keysRef.current.delete(e.code);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function groundPoundImpact() {
      for (const enemy of level.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x + enemy.width / 2 - (player.x + player.width / 2);
        const dy = enemy.y + enemy.height / 2 - (player.y + player.height / 2);
        if (Math.hypot(dx, dy) <= GROUND_POUND_RADIUS) {
          enemy.alive = false;
          enemy.deadAt = performance.now();
          state.score += INSTANT_KILL_SCORE;
          playStompSound();
          popup(enemy.x + enemy.width / 2, enemy.y, `+${INSTANT_KILL_SCORE}`, '#7de37b');
          shake(juice, 6);
          burst(juice, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffd23f', 10);
        }
      }
    }

    // Shared "player touched a live, non-pending quiz-gated enemy" response
    // — used by both the ground-enemy loop and the flyer loop (see
    // updatePhysics), so a stomp/quiz/star kill behaves identically
    // whether the enemy patrols the ground or bobs through the air.
    function resolveEnemyTouch(enemy) {
      if (enemy.pending || !aabbOverlap(player, enemy)) return;
      const bigStomping = player.big && player.vy > 0 && player.y + player.height - enemy.y < enemy.height * 0.5;
      if (player.pounding || bigStomping || performance.now() < player.starUntil) {
        enemy.alive = false;
        enemy.deadAt = performance.now();
        state.score += INSTANT_KILL_SCORE;
        playStompSound();
        popup(enemy.x + enemy.width / 2, enemy.y, `+${INSTANT_KILL_SCORE}`, '#7de37b');
        shake(juice, 5);
        hitPause(juice, 60);
        burst(juice, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffd23f', 8);
      } else if (performance.now() >= player.invulnerableUntil) {
        enemy.pending = true;
        const question = buildQuestion(vocab, enemy.termId);
        openQuiz('enemy', question, (isCorrect) => {
          enemy.pending = false;
          if (isCorrect) {
            enemy.alive = false;
            enemy.deadAt = performance.now();
            state.score += 50;
            playStompSound();
            popup(enemy.x + enemy.width / 2, enemy.y, '+50', '#7de37b');
            burst(juice, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#7de37b', 10);
            recordCorrect(enemy.termId);
          } else {
            recordWrong(enemy.termId);
            loseLife();
            popup(player.x + player.width / 2, player.y, '-1 Life', '#ff6b6b');
          }
        });
      }
    }

    // King Boo (the flying enemy) deliberately skips the quiz-gate every
    // other enemy gets — the harder, non-vocab-based challenge the user
    // asked for. Only three things put it down: a plain jump-stomp (any
    // size, not just big/pounding/star like resolveEnemyTouch requires),
    // a fireball (handled in the fireball loop below), or a big/pounding/
    // star touch same as any other enemy. Anything else — walking into it
    // sideways, getting bumped from below — costs a life immediately, same
    // as a stationary hazard, with no chance to answer out of it.
    const FLYER_STOMP_BOUNCE = -9;
    function resolveFlyerTouch(flyer) {
      if (!aabbOverlap(player, flyer)) return;
      const stomping = player.vy > 0 && player.y + player.height - flyer.y < flyer.height * 0.5;
      if (stomping || player.pounding || performance.now() < player.starUntil) {
        flyer.alive = false;
        flyer.deadAt = performance.now();
        state.score += INSTANT_KILL_SCORE;
        playStompSound();
        popup(flyer.x + flyer.width / 2, flyer.y, `+${INSTANT_KILL_SCORE}`, '#7de37b');
        shake(juice, 5);
        hitPause(juice, 60);
        burst(juice, flyer.x + flyer.width / 2, flyer.y + flyer.height / 2, '#ffd23f', 8);
        if (stomping && !player.pounding) player.vy = FLYER_STOMP_BOUNCE;
      } else if (performance.now() >= player.invulnerableUntil) {
        playHurtSound();
        loseLife();
      }
    }

    // Shared "put the player into this form" logic — ground-collected
    // power-ups and mystery-box rewards both funnel through this, so the
    // two sources can never drift out of sync with each other.
    function applyPowerUp(type) {
      // Big / mounted / fire are mutually exclusive "forms" (Mario-style —
      // you're small, big, riding, or fire, never more than one at once):
      // picking up a new one clears whichever you already had. Star is a
      // separate timed buff layered on top of whatever form you're in, so
      // it's untouched here.
      if (type === 'mushroom') {
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
        player.big = true;
        player.mounted = false;
        player.hasFire = false;
      } else if (type === 'star') {
        player.starUntil = performance.now() + STAR_DURATION_MS;
        playStarPowerSound(STAR_DURATION_MS);
      } else if (type === 'egg') {
        player.mounted = true;
        player.big = false;
        player.hasFire = false;
      } else if (type === 'fireFlower') {
        player.hasFire = true;
        player.big = false;
        player.mounted = false;
      }
    }

    const MYSTERY_BOX_REWARD_LABELS = {
      mushroom: '🥼 White Coat!',
      egg: '🥚 Egg!',
      fireFlower: '💊 Antibiotic Flower!',
      star: '⭐ Immune Boost!',
    };

    function triggerMysteryBox(box) {
      box.used = true;
      box.bumpUntil = performance.now() + 220;
      playMysteryBoxDing();
      shake(juice, 4);
      burst(juice, box.x + box.width / 2, box.y, '#ffd23f', 10);
      if (box.reward === 'coin10' || box.reward === 'coin50') {
        const amount = box.reward === 'coin10' ? 10 : 50;
        state.score += amount;
        // A coin visibly pops out and carries its own point value instead
        // of a plain floating score number — reuses the same pop-and-land
        // flourish as a power-up reward (see drawPoppedItem).
        state.poppedItems.push({
          type: box.reward,
          label: `+${amount}`,
          x: box.x + box.width / 2 - POPPED_ITEM_SIZE / 2,
          boxY: box.y,
          createdAt: performance.now(),
        });
      } else {
        // The reward applies right here, same as always — the popped item
        // below is purely a cosmetic "it physically came out of the box"
        // flourish layered on top, not a catch-it-or-lose-it mechanic (the
        // player's jump usually carries them past the box by the time a
        // simulated item would actually land).
        applyPowerUp(box.reward);
        popup(box.x + box.width / 2, box.y - 10, MYSTERY_BOX_REWARD_LABELS[box.reward], '#ffd23f');
        flashPowerUp(box.reward);
        playPowerUpPopSound();
        state.poppedItems.push({
          type: box.reward,
          x: box.x + box.width / 2 - POPPED_ITEM_SIZE / 2,
          boxY: box.y,
          createdAt: performance.now(),
        });
      }
    }

    function openQuiz(type, question, onResolve) {
      pause();
      handlersRef.current._pendingResolve = (isCorrect) => {
        handlersRef.current._pendingResolve = null;
        onResolve(isCorrect);
        // onResolve may chain straight into another openQuiz call (the boss
        // battle's 3-question sequence) — if it did, a fresh _pendingResolve
        // is already set, so skip the unpause/clear that would stomp it.
        if (!handlersRef.current._pendingResolve) {
          resume();
          setOverlay(null);
          const correctOption = question.options.find((o) => o.id === question.termId);
          flashTerm(correctOption?.term, question.definition, isCorrect);
        }
      };
      setOverlay({ type, question });
    }

    function openBossQuestion(questionNum) {
      const boss = level.boss;
      const termId = nextTermId();
      const question = buildQuestion(vocab, termId);
      openQuiz(
        'boss',
        { ...question, questionNum, hp: boss.hp, maxHp: boss.maxHp },
        (isCorrect) => {
          if (isCorrect) {
            boss.hp -= 1;
            recordCorrect(termId);
            shake(juice, 8);
            hitPause(juice, 70);
            burst(juice, boss.x + boss.width / 2, boss.y + boss.height / 2, '#ff8ac0', 12);
          } else {
            recordWrong(termId);
            loseLife();
          }
          if (boss.hp <= 0) {
            boss.alive = false;
            boss.pending = false;
            state.score += BOSS_DEFEAT_SCORE;
            playSuccessFanfare();
            shake(juice, 16);
            burst(juice, boss.x + boss.width / 2, boss.y + boss.height / 2, '#ffd23f', 32);
          } else if (questionNum < 3) {
            openBossQuestion(questionNum + 1);
          } else {
            boss.pending = false;
          }
        }
      );
    }

    // A wrong answer just closes the quiz without unlocking anything — the
    // pipe stays un-used (see level.js) so the player can climb back on top
    // and try again, same "wrong stays blocked" shape as the checkpoint door.
    function openPipeQuestion(pipe, questionNum) {
      const termId = nextTermId();
      const question = buildQuestion(vocab, termId);
      openQuiz('pipe', { ...question, questionNum, totalQuestions: PIPE_QUESTIONS }, (isCorrect) => {
        if (isCorrect) {
          recordCorrect(termId);
          if (questionNum < PIPE_QUESTIONS) {
            openPipeQuestion(pipe, questionNum + 1);
          } else {
            pipe.used = true;
            pipe.pending = false;
            beginPipeEntry(pipe.roomVariant, pipe.y);
          }
        } else {
          recordWrong(termId);
          pipe.pending = false;
        }
      });
    }

    // Standing on top of (not just touching) a not-yet-used pipe, matching
    // classic Mario's "walk onto the pipe, press Down to enter."
    function findPipeUnderPlayer() {
      if (!player.onGround) return null;
      for (const pipe of level.bonusPipes) {
        if (pipe.used || pipe.pending) continue;
        const withinX = player.x + player.width > pipe.x && player.x < pipe.x + pipe.width;
        const onTop = Math.abs(player.y + player.height - pipe.y) < 4;
        if (withinX && onTop) return pipe;
      }
      return null;
    }

    // The player visibly sinks straight down into the pipe at their current
    // spot (see updatePipeTransition/PIPE_SINK_DEPTH) before the scene cuts
    // to the bonus room — a beat of physical continuity instead of an
    // instant teleport. Runs through the normal physics loop (not paused),
    // it just locks out input for its short duration (see the early-return
    // in updatePhysics).
    function beginPipeEntry(roomVariant, pipeTopY) {
      const returnSpot = { x: player.x, y: player.y };
      player.vx = 0;
      player.vy = 0;
      state.pipeTransition = {
        phase: 'down',
        startedAt: performance.now(),
        startY: player.y,
        pipeTopY,
        onComplete: () => enterBonusRoom(returnSpot, roomVariant),
      };
    }

    function enterBonusRoom(returnSpot, roomVariant) {
      const facts = world.funFacts;
      // Built-in worlds have a couple of hand-written facts; custom/teacher
      // decks don't, so fall back to turning one of the deck's own vocab
      // terms into the "fact" — every deck has vocab, so every deck gets a
      // lore card this way, not just the 7 built-ins.
      let fact = null;
      if (facts && facts.length) {
        fact = facts[Math.floor(Math.random() * facts.length)];
      } else if (vocab.length) {
        const randomTerm = vocab[Math.floor(Math.random() * vocab.length)];
        fact = `${randomTerm.term} — ${randomTerm.definition}`;
      }
      const room = buildBonusRoom(roomVariant, fact);
      state.bonusRoom = { ...room, timeLeft: BONUS_ROOM_SECONDS, collected: 0, returnSpot };
      // Spawns a little above the floor so gravity carries them the rest of
      // the way down — reads as "dropping into" the room rather than
      // appearing already standing.
      player.x = 40;
      player.y = room.groundY - player.height - 60;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      playSuccessFanfare();
      // The room's own fast, rhythmic track takes over from the calm main
      // background music for exactly as long as the room is active — ducked,
      // not stopped, so the main track picks back up right where it left
      // off on exit (see exitBonusRoom).
      duckBackgroundMusic();
      startBonusRoomMusic();
    }

    function exitBonusRoom() {
      const room = state.bonusRoom;
      state.bonusRoom = null;
      player.x = room.returnSpot.x;
      player.y = room.returnSpot.y + PIPE_SINK_DEPTH;
      player.vx = 0;
      player.vy = 0;
      player.invulnerableUntil = performance.now() + INVULN_MS;
      stopBonusRoomMusic();
      unduckBackgroundMusic();
      if (room.collected > 0) {
        popup(player.x + player.width / 2, room.returnSpot.y - 10, `🪙 x${room.collected}`, '#ffd23f');
      }
      state.pipeTransition = {
        phase: 'up',
        startedAt: performance.now(),
        startY: player.y,
        pipeTopY: room.returnSpot.y + player.height,
        onComplete: () => {},
      };
    }

    // Drives the sink/rise cutscene — player.y is the only thing that
    // moves, everything else (camera, other entities) stays frozen since
    // updatePhysics returns right after calling this.
    function updatePipeTransition() {
      const t = state.pipeTransition;
      const progress = Math.min(1, (performance.now() - t.startedAt) / PIPE_TRANSITION_MS);
      player.y = t.phase === 'down' ? t.startY + progress * PIPE_SINK_DEPTH : t.startY - progress * PIPE_SINK_DEPTH;
      if (progress >= 1) {
        const onComplete = t.onComplete;
        state.pipeTransition = null;
        onComplete();
      }
    }

    // A stripped-down movement/collision pass against the bonus room's own
    // tiny platform set instead of the main level — no enemies, quizzes,
    // doors, or fireballs to worry about, just running, jumping, and
    // touch-to-collect coins against a countdown.
    function updateBonusRoomPhysics(dt) {
      const room = state.bonusRoom;
      room.timeLeft -= dt;
      if (room.timeLeft <= 0) {
        exitBonusRoom();
        return;
      }

      const keys = keysRef.current;
      const left = [...LEFT_KEYS].some((k) => keys.has(k));
      const right = [...RIGHT_KEYS].some((k) => keys.has(k));
      const jumpHeld = [...JUMP_KEYS].some((k) => keys.has(k));

      if (left && !right) {
        player.vx = -RUN_SPEED;
        player.facing = -1;
      } else if (right && !left) {
        player.vx = RUN_SPEED;
        player.facing = 1;
      } else {
        player.vx = 0;
      }

      if (jumpHeld && player.onGround) {
        player.vy = JUMP_VELOCITY;
        player.onGround = false;
      }
      if (!jumpHeld && player.vy < JUMP_CUTOFF_VELOCITY) {
        player.vy = JUMP_CUTOFF_VELOCITY;
      }
      player.vy = Math.min(player.vy + GRAVITY, MAX_FALL_SPEED);

      player.x += player.vx;
      player.x = Math.max(0, Math.min(player.x, room.width - player.width));
      resolveHorizontal(player, room.platforms);

      player.y += player.vy;
      resolveVertical(player, room.platforms);

      for (const coin of room.coins) {
        if (coin.collected) continue;
        if (!aabbOverlap(player, coin)) continue;
        coin.collected = true;
        room.collected += 1;
        state.score += BONUS_COIN_VALUE;
        playCorrectChime();
        popup(coin.x + coin.width / 2, coin.y, `+${BONUS_COIN_VALUE}`, '#ffd23f');
      }

      for (const loreCard of room.loreCards) {
        if (loreCard.collected) continue;
        if (!aabbOverlap(player, loreCard)) continue;
        loreCard.collected = true;
        state.score += LORE_CARD_SCORE;
        playMysteryBoxDing();
        popup(loreCard.x + loreCard.width / 2, loreCard.y, `+${LORE_CARD_SCORE}`, '#ffd23f');
        flashLore(loreCard.fact);
      }

      state.camera = Math.max(
        0,
        Math.min(player.x + player.width / 2 - canvasWidth / 2, Math.max(0, room.width - canvasWidth))
      );
    }

    function updatePhysics(dt) {
      // Pipe entry/exit and the bonus room itself run their own stripped-
      // down update instead of the main level's — bypassing the main-level
      // timer, door/boss/enemy/coin checks, etc. entirely while active.
      if (state.pipeTransition) {
        updatePipeTransition();
        return;
      }
      if (state.bonusRoom) {
        updateBonusRoomPhysics(dt);
        return;
      }

      saveProgressNow();

      state.timeRemaining -= dt;
      if (state.timeRemaining <= 0) {
        state.timeRemaining = state.durationSeconds;
        loseLife();
      }

      const keys = keysRef.current;
      const left = [...LEFT_KEYS].some((k) => keys.has(k));
      const right = [...RIGHT_KEYS].some((k) => keys.has(k));
      const jumpHeld = [...JUMP_KEYS].some((k) => keys.has(k));
      const downHeld = [...DOWN_KEYS].some((k) => keys.has(k));
      const fireHeld = [...FIRE_KEYS].some((k) => keys.has(k));

      if (pipeEnterRequested) {
        pipeEnterRequested = false;
        if (!pausedRef.current) {
          const pipe = findPipeUnderPlayer();
          if (pipe) {
            pipe.pending = true;
            openPipeQuestion(pipe, 1);
          }
        }
      }

      if (
        fireHeld &&
        player.hasFire &&
        !pausedRef.current &&
        performance.now() - lastFireballTime > FIREBALL_COOLDOWN_MS
      ) {
        lastFireballTime = performance.now();
        const spawnX = player.facing >= 0 ? player.x + player.width : player.x - FIREBALL_WIDTH;
        state.fireballs.push({
          x: spawnX,
          y: player.y + player.height * 0.35,
          spawnX,
          vx: FIREBALL_SPEED * player.facing,
          width: FIREBALL_WIDTH,
          height: FIREBALL_HEIGHT,
          alive: true,
        });
        playFireballSound();
      }

      // Riding Yoshi overrides the character's own Down ability: flick a
      // tongue at a nearby enemy and swallow it into an (unusable, purely
      // cosmetic) egg instead of the character's ground pound / etc.
      if (
        downHeld &&
        player.mounted &&
        !pausedRef.current &&
        performance.now() - lastTongueTime > TONGUE_COOLDOWN_MS
      ) {
        lastTongueTime = performance.now();
        player.tongueUntil = performance.now() + TONGUE_FLICK_MS;
        const tongueBox = {
          x: player.facing >= 0 ? player.x + player.width : player.x - TONGUE_REACH,
          y: player.y,
          width: TONGUE_REACH,
          height: player.height,
        };
        for (const enemy of level.enemies) {
          if (!enemy.alive || enemy.pending) continue;
          if (aabbOverlap(tongueBox, enemy)) {
            enemy.alive = false;
            enemy.deadAt = performance.now();
            state.score += INSTANT_KILL_SCORE;
            // A solid, permanent egg is left behind exactly where the enemy
            // stood (already resting on the ground/platform it patrolled) —
            // purely decorative, no collision, stays for the rest of the run.
            state.solidEggs.push({ x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height });
            playStompSound();
            popup(enemy.x + enemy.width / 2, enemy.y, `+${INSTANT_KILL_SCORE}`, '#7de37b');
            burst(juice, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#7de37b', 8);
            break;
          }
        }
      }

      if (!player.pounding) {
        const runSpeed = player.mounted ? RUN_SPEED * MOUNT_SPEED_MULTIPLIER : RUN_SPEED;
        if (left && !right) {
          player.vx = -runSpeed;
          player.facing = -1;
        } else if (right && !left) {
          player.vx = runSpeed;
          player.facing = 1;
        } else {
          player.vx = 0;
        }
      }

      const jumpVelocity = character.ability === 'superJump' ? JUMP_VELOCITY * SUPER_JUMP_MULTIPLIER : JUMP_VELOCITY;

      if (jumpHeld && player.onGround && !player.pounding) {
        player.vy = jumpVelocity;
        player.onGround = false;
      }
      if (!jumpHeld && player.vy < JUMP_CUTOFF_VELOCITY) {
        player.vy = JUMP_CUTOFF_VELOCITY;
      }

      if (character.ability === 'groundPound' && downHeld && !player.mounted && !player.onGround && !player.pounding) {
        player.pounding = true;
        player.vx = 0;
        player.vy = GROUND_POUND_SPEED;
      }
      state.pounding = player.pounding;

      player.vy = Math.min(player.vy + GRAVITY, MAX_FALL_SPEED);

      state.gliding = false;
      if (character.ability === 'glide' && jumpHeld && !player.onGround && player.vy > 0 && !player.pounding) {
        player.vy = Math.min(player.vy, GLIDE_FALL_SPEED);
        state.gliding = true;
      }

      const doorSolid = !level.door.passed ? [level.door] : [];
      const bossSolid = level.boss && level.boss.alive ? [level.boss] : [];
      const standingPlatforms = level.platforms.filter((p) => p.type !== 'crumble' || !p.gone);
      const solids = [...standingPlatforms, ...doorSolid, ...bossSolid];

      player.x += player.vx;
      player.x = Math.max(0, Math.min(player.x, level.width - player.width));

      if (!level.door.passed && !level.door.pending && aabbOverlap(player, level.door)) {
        const pushBack = player.vx > 0 ? level.door.x - player.width : level.door.x + level.door.width;
        level.door.pending = true;
        const question = buildQuestion(vocab, level.door.termId);
        openQuiz('door', question, (isCorrect) => {
          level.door.pending = false;
          if (isCorrect) {
            level.door.passed = true;
            recordCorrect(level.door.termId);
            // Mirrors level.spawn's own "GROUND_Y - 200" formula so the
            // player drops in standing safely on the ground just past the
            // door, not inside it.
            lastCheckpoint = { x: level.door.x, y: level.door.y + level.door.height - 200 };
          } else {
            recordWrong(level.door.termId);
          }
        });
        player.x = pushBack;
      }

      if (level.boss && level.boss.alive && !level.boss.pending && aabbOverlap(player, level.boss)) {
        const pushBack = player.vx > 0 ? level.boss.x - player.width : level.boss.x + level.boss.width;
        level.boss.pending = true;
        openBossQuestion(1);
        player.x = pushBack;
      }
      resolveHorizontal(player, solids);

      // Checked at the raw pre-resolution position, not after — resolveVertical
      // (below) snaps the player's top edge to sit exactly on a solid's
      // underside once it stops them, which reads as touching, not
      // overlapping, so a check placed after it would miss every bump.
      const wasMovingUp = player.vy < 0;
      player.y += player.vy;
      if (wasMovingUp && !pausedRef.current) {
        for (const box of level.mysteryBoxes) {
          if (!box.used && aabbOverlap(player, box)) triggerMysteryBox(box);
        }
      }
      resolveVertical(player, solids);

      // Crumbling platforms: start the countdown the instant the player's
      // feet land on one, then drop it from solids (see `standingPlatforms`
      // above) once CRUMBLE_DELAY_MS elapses — a beat of warning (rendered
      // as a shake, see drawCrumblePlatform) before it gives way.
      if (player.onGround) {
        for (const p of level.platforms) {
          if (p.type !== 'crumble' || p.gone || p.triggered) continue;
          const onTop = Math.abs(player.y + player.height - p.y) < 2;
          const withinX = player.x + player.width > p.x && player.x < p.x + p.width;
          if (onTop && withinX) {
            p.triggered = true;
            p.triggerAt = performance.now();
          }
        }
      }
      for (const p of level.platforms) {
        if (p.type === 'crumble' && p.triggered && !p.gone && performance.now() - p.triggerAt > CRUMBLE_DELAY_MS) {
          p.gone = true;
        }
      }

      if (player.pounding && player.onGround) {
        player.pounding = false;
        groundPoundImpact();
      }

      if (player.y > level.groundY + 300) {
        loseLife();
      }

      if (!pausedRef.current) {
        for (const enemy of level.enemies) {
          if (!enemy.alive) continue;
          enemy.x += enemy.vx;
          if (enemy.x < enemy.minX || enemy.x + enemy.width > enemy.maxX) {
            enemy.vx *= -1;
            enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.width));
          }
          resolveEnemyTouch(enemy);
        }
      }

      // Flyers patrol left-right like ground enemies but also bob up and
      // down on a sine wave, floating free of any platform — see
      // resolveFlyerTouch above for why they get their own (harder,
      // non-quiz) resolution instead of resolveEnemyTouch.
      if (!pausedRef.current) {
        for (const flyer of level.flyers) {
          if (!flyer.alive) continue;
          flyer.x += flyer.vx;
          if (flyer.x < flyer.minX || flyer.x + flyer.width > flyer.maxX) {
            flyer.vx *= -1;
            flyer.x = Math.max(flyer.minX, Math.min(flyer.x, flyer.maxX - flyer.width));
          }
          flyer.y = flyer.baseY + Math.sin(performance.now() * flyer.bobSpeed + flyer.bobPhase) * flyer.bobAmplitude;
          resolveFlyerTouch(flyer);
        }
      }

      if (!pausedRef.current) {
        for (const fireball of state.fireballs) {
          if (!fireball.alive) continue;
          fireball.x += fireball.vx;
          if (Math.abs(fireball.x - fireball.spawnX) > FIREBALL_MAX_TRAVEL || fireball.x < 0 || fireball.x > level.width) {
            fireball.alive = false;
            continue;
          }
          for (const enemy of level.enemies) {
            if (!enemy.alive || enemy.pending) continue;
            if (aabbOverlap(fireball, enemy)) {
              enemy.alive = false;
              enemy.deadAt = performance.now();
              fireball.alive = false;
              state.score += INSTANT_KILL_SCORE;
              playStompSound();
              popup(enemy.x + enemy.width / 2, enemy.y, `+${INSTANT_KILL_SCORE}`, '#7de37b');
              burst(juice, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff8a5c', 8);
              break;
            }
          }
          if (fireball.alive) {
            for (const flyer of level.flyers) {
              if (!flyer.alive) continue;
              if (aabbOverlap(fireball, flyer)) {
                flyer.alive = false;
                flyer.deadAt = performance.now();
                fireball.alive = false;
                state.score += INSTANT_KILL_SCORE;
                playStompSound();
                popup(flyer.x + flyer.width / 2, flyer.y, `+${INSTANT_KILL_SCORE}`, '#7de37b');
                burst(juice, flyer.x + flyer.width / 2, flyer.y + flyer.height / 2, '#ff8a5c', 8);
                break;
              }
            }
          }
          if (fireball.alive) fireballHitsHazard(fireball, level, state);
        }
        if (state.fireballs.length > 20) {
          state.fireballs = state.fireballs.filter((f) => f.alive);
        }
      }

      if (!pausedRef.current) {
        updateHazards(level, player, state, loseLife);
      }

      if (!pausedRef.current) {
        for (const coin of level.coins) {
          if (coin.collected || coin.pending) continue;
          if (performance.now() < coin.bounceUntil) continue;
          if (!aabbOverlap(player, coin)) continue;

          coin.pending = true;
          const question = buildQuestion(vocab, coin.termId);
          openQuiz('coin', question, (isCorrect) => {
            coin.pending = false;
            if (isCorrect) {
              coin.collected = true;
              state.coinsCollected += 1;
              const combo = character.ability === 'coinCombo' && state.coinsCollected % 5 === 0;
              const gained = combo ? COIN_CORRECT_POINTS * 2 : COIN_CORRECT_POINTS;
              state.score += gained;
              popup(coin.x + coin.width / 2, coin.y, combo ? `+${gained} Combo!` : `+${gained}`, '#7de37b');
              if (combo) burst(juice, coin.x + coin.width / 2, coin.y, '#ffd23f', 14);
              recordCorrect(coin.termId);
            } else {
              recordWrong(coin.termId);
              state.score -= COIN_WRONG_PENALTY;
              coin.bounceUntil = performance.now() + COIN_BOUNCE_MS;
              popup(coin.x + coin.width / 2, coin.y, `-${COIN_WRONG_PENALTY}`, '#ff6b6b');
            }
          });
        }
      }

      if (!pausedRef.current) {
        for (const p of level.powerUps) {
          if (p.collected) continue;
          if (!aabbOverlap(player, p)) continue;
          p.collected = true;
          applyPowerUp(p.type);
        }
      }

      if (!pausedRef.current && !state.levelComplete && player.x + player.width >= level.flag.x) {
        state.levelComplete = true;
        const bonus = Math.floor(Math.max(0, state.timeRemaining)) * 10;
        state.score += bonus;
        state.lastTimeBonus = bonus;
        playSuccessFanfare();
        const questions = buildEndOfLevelQuestions(vocab, [...state.missedTermIds]);
        pause();
        setOverlay({ type: 'endOfLevel', questions });
      }

      state.camera = Math.max(
        0,
        Math.min(player.x + player.width / 2 - canvasWidth / 2, level.width - canvasWidth)
      );
    }

    function draw() {
      const now = performance.now();
      const inBonusRoom = !!state.bonusRoom;
      const activeGroundY = inBonusRoom ? state.bonusRoom.groundY : level.groundY;
      const activePlatforms = inBonusRoom ? state.bonusRoom.platforms : level.platforms;
      const activeCoins = inBonusRoom ? state.bonusRoom.coins : level.coins;

      const verticalOffset = canvasHeight - (activeGroundY + GROUND_HEIGHT);
      if (inBonusRoom) {
        drawBonusBackground(ctx, canvasWidth, canvasHeight);
      } else {
        drawBackground(ctx, canvasWidth, canvasHeight, world.palette, state.camera, canvasHeight - GROUND_HEIGHT);
      }

      const shakeOffset = getShakeOffset(juice);
      ctx.save();
      ctx.translate(-state.camera + shakeOffset.x, verticalOffset + shakeOffset.y);

      for (const p of activePlatforms) drawPlatform(ctx, p, world.palette);
      for (const coin of activeCoins) drawCoin(ctx, coin);
      if (inBonusRoom) {
        for (const loreCard of state.bonusRoom.loreCards) drawLoreCard(ctx, loreCard);
      }

      if (!inBonusRoom) {
        for (const powerUp of level.powerUps) drawPowerUp(ctx, powerUp);
        for (const enemy of level.enemies) {
          if (enemy.alive || enemy.deadAt) drawEnemy(ctx, enemy, enemy.type ?? world.enemyType, now);
          if (enemy.alive) drawPathogenLabel(ctx, enemy.x, enemy.y, enemy.width, enemy.name);
        }
        for (const flyer of level.flyers) {
          if (flyer.alive || flyer.deadAt) drawEnemy(ctx, flyer, 'flyer', now);
          if (flyer.alive) drawPathogenLabel(ctx, flyer.x, flyer.y, flyer.width, flyer.name);
        }
        if (level.boss) {
          drawBoss(ctx, level.boss);
          if (level.boss.alive) drawPathogenLabel(ctx, level.boss.x, level.boss.y - 22, level.boss.width, level.boss.name);
        }
        if (level.piranha) drawPiranhaPlant(ctx, level.piranha);
        for (const patch of level.spikes) drawSpikes(ctx, patch);
        if (level.koopa && level.koopa.alive) drawKoopa(ctx, level.koopa);
        drawDoor(ctx, level.door);
        drawFlag(ctx, level.flag);
        for (const shell of state.shells) {
          if (shell.alive) drawShell(ctx, shell);
        }
        for (const fireball of state.fireballs) {
          if (fireball.alive) drawFireball(ctx, fireball);
        }
        for (const egg of state.solidEggs) drawSolidEgg(ctx, egg);
      }

      const flashing = now < player.invulnerableUntil && Math.floor(now / 100) % 2 === 0;
      const invincible = now < player.starUntil;
      // Mid pipe-transition, clip the player (and mount/tongue) to
      // everything above the pipe's opening — as player.y crosses that
      // line, they visibly disappear feet-first sinking in, or reappear
      // rising out, instead of just standing lower/higher.
      const pipeClipY = state.pipeTransition ? state.pipeTransition.pipeTopY : null;
      if (pipeClipY != null) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-100000, -100000, 200000, pipeClipY + 100000);
        ctx.clip();
      }
      if (player.mounted && !inBonusRoom) drawDinoMount(ctx, player);
      drawPlayer(ctx, player, characterId, { flashing, invincible, big: player.big });
      if (player.mounted && !inBonusRoom) drawTongueFlick(ctx, player);
      if (pipeClipY != null) {
        ctx.restore();
      }

      for (const p of state.scorePopups) drawScorePopup(ctx, p, now);
      if (state.scorePopups.length) {
        state.scorePopups = state.scorePopups.filter((p) => now - p.createdAt < SCORE_POPUP_MS);
      }
      drawParticles(ctx, juice.particles, now, PARTICLE_LIFE_MS);

      if (!inBonusRoom) {
        for (const item of state.poppedItems) drawPoppedItem(ctx, item, now);
        if (state.poppedItems.length) {
          state.poppedItems = state.poppedItems.filter((item) => now - item.createdAt < POPPED_ITEM_MS);
        }
      }

      ctx.restore();

      if (inBonusRoom) {
        drawBonusHud(ctx, canvasWidth, state.bonusRoom);
      }

      if (now - lastHudPush > HUD_PUSH_INTERVAL_MS) {
        lastHudPush = now;
        setHud({
          score: state.score,
          lives: state.lives,
          coinsCollected: state.coinsCollected,
          totalCoins: level.coins.length,
          timeRemaining: state.timeRemaining,
          durationSeconds: state.durationSeconds,
          comboCount: state.coinsCollected % 5,
          gliding: state.gliding,
          pounding: state.pounding,
          starActive: invincible,
          mounted: player.mounted,
          big: player.big,
          hasFire: player.hasFire,
          bossHp: level.boss ? level.boss.hp : null,
          bossMaxHp: level.boss ? level.boss.maxHp : null,
          bossAlive: level.boss ? level.boss.alive : false,
          progress: Math.min(1, Math.max(0, player.x / level.flag.x)),
        });
      }
    }

    function handleResize() {
      const size = computeViewportSize();
      canvasWidth = size.w;
      canvasHeight = size.h;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      setViewportSize(size);
    }
    window.addEventListener('resize', handleResize);

    // Show the mission-briefing overlay every time a level loads. It used
    // to skip this on a crash-recovery resume, but that made it look
    // broken/inconsistent in practice (silently absent whenever an old
    // localStorage save for that world+character was still around) —
    // showing it unconditionally is simpler and never wrong to see again.
    pause();
    setOverlay({ type: 'intro' });

    let rafId;
    function loop() {
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 1);
      lastFrameTime = now;
      // Hit-pause freezes physics AND the juice sim for a couple frames on
      // a big impact — a real "impact frame," not just a number changing.
      if (!pausedRef.current && !isHitPaused(juice)) {
        updatePhysics(dt);
        tickJuice(juice, dt);
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      clearCustomTrack();
      if (termFlashTimer) clearTimeout(termFlashTimer);
      if (powerUpFlashTimer) clearTimeout(powerUpFlashTimer);
      if (loreFlashTimer) clearTimeout(loreFlashTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, worldId]);

  const h = handlersRef.current;
  const fraction = hud ? hud.timeRemaining / hud.durationSeconds : 1;
  const timeClass = fraction < 0.2 ? 'hud-timer critical' : fraction < 0.5 ? 'hud-timer warn' : 'hud-timer';
  // A deliberate Quit clears the mid-level save rather than leaving it to
  // resume later — shared classroom devices mean the next student to pick
  // this same world+character combo shouldn't silently inherit someone
  // else's score/lives/position. Crash/reload recovery (the actual point
  // of the save) never goes through this path.
  function handleQuit() {
    clearProgress(worldId, characterId);
    onQuit();
  }

  return (
    <div className="game-page">
      <div className="game-frame" style={{ width: viewportSize.w + 8 }}>
        <GameHud
          world={world}
          character={character}
          hud={hud}
          timeClass={timeClass}
          formatClock={formatClock}
          musicOn={musicOn}
          onToggleMusic={() => setMusicOn(toggleMusic())}
          onToggleGlossary={h.toggleGlossary}
          onQuit={handleQuit}
        />
        <div className="game-viewport" style={{ width: viewportSize.w, height: viewportSize.h }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%', background: '#000', imageRendering: 'pixelated' }}
          />

          <TouchControls keysRef={keysRef} />
          <GameOverlays overlay={overlay} h={h} onQuit={handleQuit} world={world} character={character} />
          {termFlash && (
            <div
              key={termFlash.id}
              className="term-flash"
              style={{ borderColor: termFlash.correct ? '#8bd17c' : '#e97c6d' }}
            >
              <strong>
                {termFlash.correct ? '✓' : '✗'} {termFlash.term}
              </strong>
              <span>{termFlash.definition}</span>
            </div>
          )}
          {powerUpFlash && (
            <div key={powerUpFlash.id} className="power-flash">
              <strong>
                {powerUpFlash.icon} {powerUpFlash.label}
              </strong>
              <span>{powerUpFlash.hint}</span>
            </div>
          )}
          {loreFlash && (
            <div key={loreFlash.id} className="lore-flash">
              <strong>💡 Did You Know?</strong>
              <span>{loreFlash.fact}</span>
            </div>
          )}
        </div>
        <div className="controls-hint">
          Arrows/WASD to move · Space/Up to jump · Down for ability · F to throw capsule (with Antibiotic Flower)
        </div>
      </div>
    </div>
  );
}
