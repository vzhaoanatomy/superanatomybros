import { useEffect, useRef } from 'react';
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
import {
  drawBackground,
  drawPlatform,
  drawCoin,
  drawFlag,
  drawGoomba,
  drawPlayer,
  drawHUD,
} from './spriteRenderer';

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const INVULN_MS = 1200;
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

function resolveHorizontal(player, platforms) {
  for (const p of platforms) {
    if (!aabbOverlap(player, p)) continue;
    if (player.vx > 0) {
      player.x = p.x - player.width;
    } else if (player.vx < 0) {
      player.x = p.x + p.width;
    }
  }
}

function resolveVertical(player, platforms) {
  player.onGround = false;
  for (const p of platforms) {
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
// state) so future quiz overlays never force a re-mount. See CLAUDE.md rule 1.
export default function GameCanvas({ characterId, onQuit }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(false);
  const keysRef = useRef(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const level = buildPlaceholderLevel();
    const character = getCharacter(characterId);

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
      message: '',
      gliding: false,
      pounding: false,
    };

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

      if (
        character.ability === 'groundPound' &&
        downHeld &&
        !player.onGround &&
        !player.pounding
      ) {
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

      player.x += player.vx;
      player.x = Math.max(0, Math.min(player.x, level.width - player.width));
      resolveHorizontal(player, level.platforms);

      player.y += player.vy;
      resolveVertical(player, level.platforms);

      if (player.pounding && player.onGround) {
        player.pounding = false;
        groundPoundImpact();
      }

      if (player.y > CANVAS_HEIGHT + 300) {
        loseLife();
      }

      for (const enemy of level.enemies) {
        if (!enemy.alive) continue;
        enemy.x += enemy.vx;
        if (enemy.x < enemy.minX || enemy.x + enemy.width > enemy.maxX) {
          enemy.vx *= -1;
          enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.width));
        }

        if (aabbOverlap(player, enemy)) {
          const stomping = player.vy > 0 && player.y + player.height - player.vy <= enemy.y + 12;
          if (player.pounding || stomping) {
            enemy.alive = false;
            if (!player.pounding) player.vy = JUMP_VELOCITY * 0.55;
            state.score += 50;
          } else if (performance.now() > player.invulnerableUntil) {
            loseLife();
          }
        }
      }

      for (const coin of level.coins) {
        if (coin.collected) continue;
        if (aabbOverlap(player, coin)) {
          coin.collected = true;
          state.coinsCollected += 1;
          const combo = character.ability === 'coinCombo' && state.coinsCollected % 5 === 0;
          state.score += combo ? 20 : 10;
        }
      }

      if (!state.levelComplete && player.x + player.width >= level.flag.x) {
        state.levelComplete = true;
        state.message = 'LEVEL COMPLETE (placeholder)';
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

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block', margin: '0 auto', background: '#000', imageRendering: 'pixelated' }}
      />
      {onQuit && (
        <button type="button" onClick={onQuit} style={{ marginTop: 12 }}>
          ◀ Change Character
        </button>
      )}
    </div>
  );
}
