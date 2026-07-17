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
import { getWorld, DURATION_SECONDS } from './worlds';
import { buildQuestion, buildEndOfLevelQuestions, findTerm } from './vocab';
import { drawBackground, drawPlatform, drawCoin, drawDoor, drawFlag, drawEnemy, drawPlayer } from './spriteRenderer';
import { toggleMusic, isMusicPlaying } from './music';
import CoinQuiz from '../overlays/CoinQuiz';
import EnemyEncounter from '../overlays/EnemyEncounter';
import DoorQuiz from '../overlays/DoorQuiz';
import EndOfLevelQuiz from '../overlays/EndOfLevelQuiz';
import ReviewMissedTerms from '../overlays/ReviewMissedTerms';
import LevelComplete from '../overlays/LevelComplete';

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
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

function computeViewportSize() {
  if (typeof window === 'undefined') return { w: 960, h: 480 };
  const w = Math.min(window.innerWidth - 64, 1400);
  const h = Math.round(w * 0.5);
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
    const durationSeconds = DURATION_SECONDS[durationMinutes] ?? DURATION_SECONDS[3];
    const level = buildLevel({ world, durationMinutes });
    const vocab = world.vocab;

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
    };

    let lastFrameTime = performance.now();
    let lastHudPush = 0;

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
      level.door.passed = false;
      level.door.pending = false;
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
        }
      }
    }

    function openQuiz(type, question, onResolve) {
      pausedRef.current = true;
      handlersRef.current._pendingResolve = (isCorrect) => {
        handlersRef.current._pendingResolve = null;
        onResolve(isCorrect);
        pausedRef.current = false;
        setOverlay(null);
      };
      setOverlay({ type, question });
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

      if (!player.pounding) {
        if (left && !right) {
          player.vx = -RUN_SPEED;
          player.facing = -1;
        } else if (right && !left) {
          player.vx = RUN_SPEED;
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

      if (character.ability === 'groundPound' && downHeld && !player.onGround && !player.pounding) {
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
      const solids = [...level.platforms, ...doorSolid];

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

          if (player.pounding) {
            enemy.alive = false;
            state.score += 50;
          } else if (performance.now() >= player.invulnerableUntil) {
            enemy.pending = true;
            const question = buildQuestion(vocab, enemy.termId);
            openQuiz('enemy', question, (isCorrect) => {
              enemy.pending = false;
              if (isCorrect) {
                enemy.alive = false;
                state.score += 50;
              } else {
                recordWrong(enemy.termId);
                loseLife();
              }
            });
          }
        }
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

      if (!pausedRef.current && !state.levelComplete && player.x + player.width >= level.flag.x) {
        state.levelComplete = true;
        const bonus = Math.floor(Math.max(0, state.timeRemaining)) * 10;
        state.score += bonus;
        state.lastTimeBonus = bonus;
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
      for (const enemy of level.enemies) {
        if (enemy.alive) drawEnemy(ctx, enemy, world.enemyType);
      }
      drawDoor(ctx, level.door);
      drawFlag(ctx, level.flag);

      const now = performance.now();
      const flashing = now < player.invulnerableUntil && Math.floor(now / 100) % 2 === 0;
      drawPlayer(ctx, player, characterId, { flashing });

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
        <div className="hud-panel">
          <div className="hud-top">
            <div className="hud-hearts">
              {Array.from({ length: hud?.lives ?? 3 }).map((_, i) => (
                <span key={i}>♥</span>
              ))}
            </div>
            <div className="hud-title">
              <div className="hud-world-name">{world.name}</div>
              <div className="hud-world-sub">
                World {world.index}
                {world.subtitle ? `: ${world.subtitle}` : ''}
              </div>
            </div>
            <div className="hud-stats">
              <span className={timeClass}>⏱ {formatClock(hud?.timeRemaining ?? world.defaultDurationMinutes * 60)}</span>
              <span>
                COINS {hud?.coinsCollected ?? 0}/{hud?.totalCoins ?? 0}
              </span>
              <span>SCORE {String(hud?.score ?? 0).padStart(6, '0')}</span>
            </div>
          </div>
          <div className="hud-divider" />
          <div className="hud-bottom">
            <div className="hud-player">
              PLAYER: <strong>{character.name}</strong> · <span className="hud-ability">{character.abilityName}</span>
              {character.ability === 'coinCombo' && <span className="hud-status"> · Combo {hud?.comboCount ?? 0}/5</span>}
              {character.ability === 'groundPound' && hud?.pounding && <span className="hud-status warn"> · GROUND POUND!</span>}
              {character.ability === 'glide' && hud?.gliding && <span className="hud-status glide"> · Gliding...</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="hud-music"
                onClick={() => setMusicOn(toggleMusic())}
              >
                {musicOn ? '♪ Music On' : '♪ Music Off'}
              </button>
              {onQuit && (
                <button type="button" className="hud-quit" onClick={onQuit}>
                  ⇥ Quit
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="game-viewport" style={{ width: viewportSize.w, height: viewportSize.h }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%', background: '#000', imageRendering: 'pixelated' }}
          />

          {overlay?.type === 'coin' && <CoinQuiz question={overlay.question} onAnswer={h.resolveQuiz} />}
          {overlay?.type === 'enemy' && <EnemyEncounter question={overlay.question} onAnswer={h.resolveQuiz} />}
          {overlay?.type === 'door' && <DoorQuiz question={overlay.question} onAnswer={h.resolveQuiz} />}
          {overlay?.type === 'endOfLevel' && (
            <EndOfLevelQuiz questions={overlay.questions} onFinish={h.finishEndOfLevel} />
          )}
          {overlay?.type === 'complete' && (
            <LevelComplete
              score={h.getScore?.() ?? 0}
              timeBonus={h.getTimeBonus?.() ?? 0}
              hasMissed={h.hasMissed?.() ?? false}
              onReview={h.openReview}
              onPlayAgain={h.playAgain}
              onQuit={onQuit}
            />
          )}
          {overlay?.type === 'review' && (
            <ReviewMissedTerms items={h.getMissedItems?.() ?? []} onClose={h.closeReview} />
          )}
        </div>
        <div className="controls-hint">Arrows/WASD to move · Space/Up to jump · Down for ability</div>
      </div>
    </div>
  );
}
