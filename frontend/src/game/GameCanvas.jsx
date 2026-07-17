import { useEffect, useRef, useState } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  RUN_SPEED,
  JUMP_VELOCITY,
  GRAVITY,
  JUMP_CUTOFF_VELOCITY,
  MAX_FALL_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
} from './constants';
import { buildPlaceholderLevel } from './level';
import { getCharacter } from './characters';
import { WORLD1_VOCAB, buildQuestion, buildEndOfLevelQuestions, findTerm } from './vocab';
import {
  drawBackground,
  drawPlatform,
  drawCoin,
  drawDoor,
  drawFlag,
  drawGoomba,
  drawPlayer,
  drawHUD,
} from './spriteRenderer';
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
const GLIDE_FALL_SPEED = 1.6;
const GROUND_POUND_SPEED = 24;
const GROUND_POUND_RADIUS = 90;
// Peak jump height scales with velocity^2 under constant gravity, so to get a
// jump that's 20% *higher* (not 20% faster launch), scale velocity by sqrt(1.2).
const SUPER_JUMP_MULTIPLIER = Math.sqrt(1.2);

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

// Game loop mounts once; pause/overlay state is read from refs (not React
// state) so opening a quiz never force a re-mount. See CLAUDE.md rule 1.
// Overlays themselves are separate React components (rule 4) driven by the
// `overlay` state below; `handlersRef` bridges their button clicks back into
// the imperative game state the loop owns.
export default function GameCanvas({ characterId, onQuit }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(false);
  const keysRef = useRef(new Set());
  const handlersRef = useRef({});
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const level = buildPlaceholderLevel();
    const character = getCharacter(characterId);
    const vocab = WORLD1_VOCAB;

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
    };

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

    function updatePhysics() {
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

      if (player.y > CANVAS_HEIGHT + 300) {
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
              state.score += combo ? 20 : 10;
            } else {
              recordWrong(coin.termId);
              state.score -= 50;
              coin.bounceUntil = performance.now() + COIN_BOUNCE_MS;
            }
          });
        }
      }

      if (!pausedRef.current && !state.levelComplete && player.x + player.width >= level.flag.x) {
        state.levelComplete = true;
        const questions = buildEndOfLevelQuestions(vocab, [...state.missedTermIds]);
        pausedRef.current = true;
        setOverlay({ type: 'endOfLevel', questions });
      }

      state.camera = Math.max(
        0,
        Math.min(player.x + player.width / 2 - CANVAS_WIDTH / 2, level.width - CANVAS_WIDTH)
      );
    }

    function draw() {
      drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.translate(-state.camera, 0);

      for (const p of level.platforms) drawPlatform(ctx, p);
      for (const coin of level.coins) drawCoin(ctx, coin);
      for (const enemy of level.enemies) {
        if (enemy.alive) drawGoomba(ctx, enemy);
      }
      drawDoor(ctx, level.door);
      drawFlag(ctx, level.flag);

      const now = performance.now();
      const flashing = now < player.invulnerableUntil && Math.floor(now / 100) % 2 === 0;
      drawPlayer(ctx, player, characterId, { flashing });

      ctx.restore();

      drawHUD(ctx, {
        state,
        level,
        character,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
      });
    }

    let rafId;
    function loop() {
      if (!pausedRef.current) {
        updatePhysics();
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [characterId]);

  const h = handlersRef.current;

  return (
    <div style={{ position: 'relative', width: CANVAS_WIDTH, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block', margin: '0 auto', background: '#000', imageRendering: 'pixelated' }}
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
          hasMissed={h.hasMissed?.() ?? false}
          onReview={h.openReview}
          onPlayAgain={h.playAgain}
          onQuit={onQuit}
        />
      )}
      {overlay?.type === 'review' && (
        <ReviewMissedTerms items={h.getMissedItems?.() ?? []} onClose={h.closeReview} />
      )}

      {onQuit && (
        <button type="button" onClick={onQuit} style={{ marginTop: 12 }}>
          ◀ Change Character
        </button>
      )}
    </div>
  );
}
