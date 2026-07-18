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
import { buildLevel, GROUND_HEIGHT } from './level';
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
  drawEggPoof,
} from './spriteRenderer';
import {
  toggleMusic,
  isMusicPlaying,
  playSuccessFanfare,
  playStarPowerSound,
  playFireballSound,
  playStompSound,
} from './music';
import { updateHazards, fireballHitsHazard, scheduleKoopaThrow } from './hazards';
import { createTermQueue } from './termQueue';
import { recordLocalScore, getNickname } from '../storage';
import { submitScore } from '../api';
import GameHud from './GameHud';
import GameOverlays from './GameOverlays';

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const FIRE_KEYS = new Set(['KeyF']);
const INVULN_MS = 1200;
const COIN_BOUNCE_MS = 800;
const COIN_CORRECT_POINTS = 15;
const COIN_WRONG_PENALTY = 10;
const GLIDE_FALL_SPEED = 1.6;
const GROUND_POUND_SPEED = 24;
const GROUND_POUND_RADIUS = 90;
// Peak jump height scales with velocity^2 under constant gravity, so to get a
// jump that's 20% *higher* (not 20% faster launch), scale velocity by sqrt(1.2).
const SUPER_JUMP_MULTIPLIER = Math.sqrt(1.2);
const HUD_PUSH_INTERVAL_MS = 100;
const STAR_DURATION_MS = 8000;
const MOUNT_SPEED_MULTIPLIER = 1.5;
const MAX_LIVES = 5;
const BOSS_DEFEAT_SCORE = 1500;
const FIREBALL_SPEED = 10;
const FIREBALL_COOLDOWN_MS = 350;
const FIREBALL_MAX_TRAVEL = 650;
const FIREBALL_SIZE = 18;
const TONGUE_COOLDOWN_MS = 500;
const TONGUE_FLICK_MS = 220;
const TONGUE_REACH = 70;
const EGG_POOF_MS = 400;

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

    const state = {
      camera: 0,
      score: 0,
      lives: 3,
      coinsCollected: 0,
      levelComplete: false,
      gliding: false,
      pounding: false,
      missedTermIds: new Set(),
      durationSeconds,
      timeRemaining: durationSeconds,
      lastTimeBonus: 0,
      fireballs: [],
      shells: [],
      eggPoofs: [],
    };

    let lastFrameTime = performance.now();
    let lastHudPush = 0;
    let lastFireballTime = 0;
    let lastTongueTime = 0;

    function recordWrong(termId) {
      state.missedTermIds.add(termId);
    }

    function respawnPlayer() {
      player.x = level.spawn.x;
      player.y = level.spawn.y;
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
      respawnPlayer();
      player.invulnerableUntil = 0;
      player.starUntil = 0;
      player.mounted = false;
      player.big = false;
      player.hasFire = false;
      player.tongueUntil = 0;
      state.fireballs = [];
      state.shells = [];
      state.eggPoofs = [];
      if (level.piranha) {
        level.piranha.alive = true;
      }
      if (level.koopa) {
        level.koopa.alive = true;
        level.koopa.x = level.koopa.startX;
        level.koopa.nextThrowAt = scheduleKoopaThrow();
      }
      for (const coin of level.coins) {
        coin.collected = false;
        coin.pending = false;
        coin.bounceUntil = 0;
      }
      for (const enemy of level.enemies) {
        enemy.alive = true;
        enemy.pending = false;
        enemy.x = enemy.startX;
      }
      for (const p of level.powerUps) {
        p.collected = false;
      }
      if (level.boss) {
        level.boss.hp = level.boss.maxHp;
        level.boss.alive = true;
        level.boss.pending = false;
      }
      level.door.passed = false;
      level.door.pending = false;
      termQueue.assignAll(level);
      state.score = 0;
      state.lives = 3;
      state.coinsCollected = 0;
      state.levelComplete = false;
      state.gliding = false;
      state.pounding = false;
      state.missedTermIds = new Set();
      state.timeRemaining = state.durationSeconds;
      state.lastTimeBonus = 0;
      lastFrameTime = performance.now();
      pausedRef.current = false;
      setOverlay(null);
    }

    handlersRef.current.resolveQuiz = (isCorrect) => handlersRef.current._pendingResolve?.(isCorrect);
    handlersRef.current.finishEndOfLevel = (results) => {
      for (const r of results) {
        if (!r.correct) recordWrong(r.termId);
      }
      recordLocalScore({
        worldId: world.id,
        worldName: world.name,
        characterName: character.name,
        score: state.score,
        date: new Date().toISOString(),
      });
      if (world.isClassroom) {
        const nickname = getNickname();
        if (nickname) submitScore(world.code, nickname, state.score).catch(() => {});
      }
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

    function handleKeyDown(e) {
      if (JUMP_KEYS.has(e.code) || LEFT_KEYS.has(e.code) || RIGHT_KEYS.has(e.code) || DOWN_KEYS.has(e.code)) {
        e.preventDefault();
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
          state.score += 50;
          playStompSound();
        }
      }
    }

    function openQuiz(type, question, onResolve) {
      pausedRef.current = true;
      handlersRef.current._pendingResolve = (isCorrect) => {
        handlersRef.current._pendingResolve = null;
        onResolve(isCorrect);
        // onResolve may chain straight into another openQuiz call (the boss
        // battle's 3-question sequence) — if it did, a fresh _pendingResolve
        // is already set, so skip the unpause/clear that would stomp it.
        if (!handlersRef.current._pendingResolve) {
          pausedRef.current = false;
          setOverlay(null);
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
          } else {
            recordWrong(termId);
            loseLife();
          }
          if (boss.hp <= 0) {
            boss.alive = false;
            boss.pending = false;
            state.score += BOSS_DEFEAT_SCORE;
            playSuccessFanfare();
          } else if (questionNum < 3) {
            openBossQuestion(questionNum + 1);
          } else {
            boss.pending = false;
          }
        }
      );
    }

    function updatePhysics(dt) {
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
            state.score += 50;
            state.eggPoofs.push({ x: enemy.x, y: enemy.y, createdAt: performance.now() });
            playStompSound();
            break;
          }
        }
      }
      state.eggPoofs = state.eggPoofs.filter((p) => performance.now() - p.createdAt < EGG_POOF_MS);

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

      player.y += player.vy;
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
            state.score += 50;
            playStompSound();
          } else if (performance.now() >= player.invulnerableUntil) {
            enemy.pending = true;
            const question = buildQuestion(vocab, enemy.termId);
            openQuiz('enemy', question, (isCorrect) => {
              enemy.pending = false;
              if (isCorrect) {
                enemy.alive = false;
                state.score += 50;
                playStompSound();
              } else {
                recordWrong(enemy.termId);
                loseLife();
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
              fireball.alive = false;
              state.score += 50;
              playStompSound();
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
              state.score += combo ? COIN_CORRECT_POINTS * 2 : COIN_CORRECT_POINTS;
            } else {
              recordWrong(coin.termId);
              state.score -= COIN_WRONG_PENALTY;
              coin.bounceUntil = performance.now() + COIN_BOUNCE_MS;
            }
          });
        }
      }

      if (!pausedRef.current) {
        for (const p of level.powerUps) {
          if (p.collected) continue;
          if (!aabbOverlap(player, p)) continue;
          p.collected = true;
          if (p.type === 'mushroom') {
            state.lives = Math.min(MAX_LIVES, state.lives + 1);
            player.big = true;
          } else if (p.type === 'star') {
            player.starUntil = performance.now() + STAR_DURATION_MS;
            playStarPowerSound(STAR_DURATION_MS);
          } else if (p.type === 'egg') {
            player.mounted = true;
          } else if (p.type === 'fireFlower') {
            player.hasFire = true;
          }
        }
      }

      if (!pausedRef.current && !state.levelComplete && player.x + player.width >= level.flag.x) {
        state.levelComplete = true;
        const bonus = Math.floor(Math.max(0, state.timeRemaining)) * 10;
        state.score += bonus;
        state.lastTimeBonus = bonus;
        playSuccessFanfare();
        const questions = buildEndOfLevelQuestions(vocab, [...state.missedTermIds]);
        pausedRef.current = true;
        setOverlay({ type: 'endOfLevel', questions });
      }

      state.camera = Math.max(
        0,
        Math.min(player.x + player.width / 2 - canvasWidth / 2, level.width - canvasWidth)
      );
    }

    function draw() {
      const verticalOffset = canvasHeight - (level.groundY + GROUND_HEIGHT);
      drawBackground(ctx, canvasWidth, canvasHeight, world.palette, state.camera, canvasHeight - GROUND_HEIGHT);

      ctx.save();
      ctx.translate(-state.camera, verticalOffset);

      for (const p of level.platforms) drawPlatform(ctx, p, world.palette);
      for (const coin of level.coins) drawCoin(ctx, coin);
      for (const powerUp of level.powerUps) drawPowerUp(ctx, powerUp);
      for (const enemy of level.enemies) {
        if (enemy.alive) drawEnemy(ctx, enemy, world.enemyType);
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
      for (const poof of state.eggPoofs) drawEggPoof(ctx, poof);

      const now = performance.now();
      const flashing = now < player.invulnerableUntil && Math.floor(now / 100) % 2 === 0;
      const invincible = now < player.starUntil;
      if (player.mounted) drawDinoMount(ctx, player);
      drawPlayer(ctx, player, characterId, { flashing, invincible, big: player.big });
      if (player.mounted) drawTongueFlick(ctx, player);

      ctx.restore();

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
      if (!pausedRef.current) {
        updatePhysics(dt);
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
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
          onQuit={onQuit}
        />
        <div className="game-viewport" style={{ width: viewportSize.w, height: viewportSize.h }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%', background: '#000', imageRendering: 'pixelated' }}
          />

          <GameOverlays overlay={overlay} h={h} onQuit={onQuit} world={world} />
        </div>
        <div className="controls-hint">
          Arrows/WASD to move · Space/Up to jump · Down for ability · F to throw fireball (with Fire Flower)
        </div>
      </div>
    </div>
  );
}
