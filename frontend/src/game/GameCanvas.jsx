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
  drawPlayer,
  drawPowerUp,
  drawBoss,
  drawDinoMount,
  drawFireball,
  drawPiranhaPlant,
  drawKoopa,
  drawShell,
  drawTongueFlick,
  drawSolidEgg,
  drawScorePopup,
  SCORE_POPUP_MS,
  drawParticles,
  drawBonusBackground,
  drawBonusHud,
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
  playCorrectChime,
  playLevelCompleteDings,
  setCustomTrack,
  clearCustomTrack,
} from './music';
import { updateHazards, fireballHitsHazard, scheduleKoopaThrow } from './hazards';
import { createTermQueue } from './termQueue';
import { recordLocalScore, getNickname } from '../storage';
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
const POWER_UP_FLASH_MS = 2800;
// What each mystery-box power-up does and, where there's a key for it, how
// to use it — shown as a flash the moment it's caught so the player isn't
// left guessing what they just picked up (see flashPowerUp/triggerMysteryBox).
const POWER_UP_HELP = {
  mushroom: { icon: '🍄', label: 'Mushroom!', hint: "You're Big now — absorbs one hit before you power down." },
  star: { icon: '⭐', label: 'Star Power!', hint: "Invincible for a few seconds — run through enemies!" },
  egg: { icon: '🥚', label: 'Egg caught!', hint: 'Press Down/S to flick your tongue and grab enemies.' },
  fireFlower: { icon: '🌺', label: 'Fire Flower!', hint: 'Press F to throw fireballs.' },
};
const STAR_DURATION_MS = 8000;
const MOUNT_SPEED_MULTIPLIER = 1.5;
const MAX_LIVES = 5;
const BOSS_DEFEAT_SCORE = 1500;
const PIPE_QUESTIONS = 2;
const BONUS_ROOM_SECONDS = 10;
const BONUS_COIN_VALUE = 10;
// How far the player visibly sinks into (or rises out of) the pipe during
// the entry/exit cutscene — see beginPipeEntry/exitBonusRoom.
const PIPE_TRANSITION_MS = 350;
const PIPE_SINK_DEPTH = 46;
const FIREBALL_SPEED = 10;
const FIREBALL_COOLDOWN_MS = 350;
const FIREBALL_MAX_TRAVEL = 650;
const FIREBALL_SIZE = 18;
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
    const level = buildLevel({ world, durationMinutes });
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
      // coins) on every restart — buildLevel is seeded with a fresh random
      // component each call, so replaying doesn't hand back the exact same
      // path to memorize. Mutates the existing `level` object in place
      // (Object.assign, not reassignment) so every closure that already
      // reads `level.xxx` picks up the new layout transparently. Width and
      // durationSeconds are deterministic (not rng-driven), so they stay
      // consistent with state.durationSeconds captured at mount.
      Object.assign(level, buildLevel({ world, durationMinutes }));
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
      mushroom: '🍄 Mushroom!',
      egg: '🥚 Egg!',
      fireFlower: '🌺 Fire Flower!',
      star: '⭐ Star!',
    };
    // Slow enough that the popped sprite is clearly readable before it's
    // gone — the previous 450ms flashed past too fast to tell what it was.
    const POPPED_ITEM_MS = 1100;
    const POPPED_ITEM_SIZE = 30;

    function triggerMysteryBox(box) {
      box.used = true;
      box.bumpUntil = performance.now() + 220;
      playStompSound();
      shake(juice, 4);
      burst(juice, box.x + box.width / 2, box.y, '#ffd23f', 10);
      if (box.reward === 'coin10' || box.reward === 'coin50') {
        const amount = box.reward === 'coin10' ? 10 : 50;
        state.score += amount;
        popup(box.x + box.width / 2, box.y - 10, `+${amount}`, '#7de37b');
      } else {
        // The reward applies right here, same as always — the popped item
        // below is purely a cosmetic "it physically came out of the box"
        // flourish layered on top, not a catch-it-or-lose-it mechanic (the
        // player's jump usually carries them past the box by the time a
        // simulated item would actually land).
        applyPowerUp(box.reward);
        popup(box.x + box.width / 2, box.y - 10, MYSTERY_BOX_REWARD_LABELS[box.reward], '#ffd23f');
        flashPowerUp(box.reward);
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
            beginPipeEntry();
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
    function beginPipeEntry() {
      const returnSpot = { x: player.x, y: player.y };
      player.vx = 0;
      player.vy = 0;
      state.pipeTransition = {
        phase: 'down',
        startedAt: performance.now(),
        startY: player.y,
        onComplete: () => enterBonusRoom(returnSpot),
      };
    }

    function enterBonusRoom(returnSpot) {
      const room = buildBonusRoom();
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
    }

    function exitBonusRoom() {
      const room = state.bonusRoom;
      state.bonusRoom = null;
      player.x = room.returnSpot.x;
      player.y = room.returnSpot.y + PIPE_SINK_DEPTH;
      player.vx = 0;
      player.vy = 0;
      player.invulnerableUntil = performance.now() + INVULN_MS;
      if (room.collected > 0) {
        popup(player.x + player.width / 2, room.returnSpot.y - 10, `🪙 x${room.collected}`, '#ffd23f');
      }
      state.pipeTransition = { phase: 'up', startedAt: performance.now(), startY: player.y, onComplete: () => {} };
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
        const spawnX = player.facing >= 0 ? player.x + player.width : player.x - FIREBALL_SIZE;
        state.fireballs.push({
          x: spawnX,
          y: player.y + player.height * 0.35,
          spawnX,
          vx: FIREBALL_SPEED * player.facing,
          width: FIREBALL_SIZE,
          height: FIREBALL_SIZE,
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
      const solids = [...level.platforms, ...doorSolid, ...bossSolid];

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

          if (enemy.pending || !aabbOverlap(player, enemy)) continue;

          // Big (mushroom) adds a stomp-from-above instant kill, same as
          // pound/star — touching it from the side while big still opens
          // the quiz (loseLife's shield order pops "big" first on a wrong
          // answer, same as any other hit).
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

      if (!inBonusRoom) {
        for (const powerUp of level.powerUps) drawPowerUp(ctx, powerUp);
        for (const enemy of level.enemies) {
          if (enemy.alive || enemy.deadAt) drawEnemy(ctx, enemy, world.enemyType, now);
        }
        if (level.boss) drawBoss(ctx, level.boss);
        if (level.piranha) drawPiranhaPlant(ctx, level.piranha);
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
      if (player.mounted && !inBonusRoom) drawDinoMount(ctx, player);
      drawPlayer(ctx, player, characterId, { flashing, invincible, big: player.big });
      if (player.mounted && !inBonusRoom) drawTongueFlick(ctx, player);

      for (const p of state.scorePopups) drawScorePopup(ctx, p, now);
      if (state.scorePopups.length) {
        state.scorePopups = state.scorePopups.filter((p) => now - p.createdAt < SCORE_POPUP_MS);
      }
      drawParticles(ctx, juice.particles, now, PARTICLE_LIFE_MS);

      // Pop-and-land flourish for a mystery box's power-up reward — rises
      // out of the box for the first 35% of the animation, then falls to
      // settle just below it for the rest. Purely visual; the reward
      // itself already applied the instant the box was bumped.
      if (!inBonusRoom) {
        for (const item of state.poppedItems) {
          const t = Math.min(1, (now - item.createdAt) / POPPED_ITEM_MS);
          const riseT = Math.min(1, t / 0.35);
          const fallT = Math.max(0, (t - 0.35) / 0.65);
          const y = item.boxY - 28 * Math.sin(riseT * (Math.PI / 2)) + fallT * fallT * 68;
          drawPowerUp(ctx, { x: item.x, y, width: POPPED_ITEM_SIZE, height: POPPED_ITEM_SIZE, type: item.type, collected: false });
        }
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, worldId]);

  const h = handlersRef.current;
  const fraction = hud ? hud.timeRemaining / hud.durationSeconds : 1;
  const timeClass = fraction < 0.2 ? 'hud-timer critical' : fraction < 0.5 ? 'hud-timer warn' : 'hud-timer';

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
          onQuit={onQuit}
        />
        <div className="game-viewport" style={{ width: viewportSize.w, height: viewportSize.h }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%', background: '#000', imageRendering: 'pixelated' }}
          />

          <TouchControls keysRef={keysRef} />
          <GameOverlays overlay={overlay} h={h} onQuit={onQuit} world={world} character={character} />
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
        </div>
        <div className="controls-hint">
          Arrows/WASD to move · Space/Up to jump · Down for ability · F to throw fireball (with Fire Flower)
        </div>
      </div>
    </div>
  );
}
