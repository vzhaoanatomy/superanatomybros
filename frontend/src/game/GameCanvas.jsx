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

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const INVULN_MS = 1200;

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
export default function GameCanvas() {
  const canvasRef = useRef(null);
  const pausedRef = useRef(false);
  const keysRef = useRef(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const level = buildPlaceholderLevel();

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
    };

    const state = {
      camera: 0,
      score: 0,
      lives: 3,
      coinsCollected: 0,
      levelComplete: false,
      message: '',
    };

    function respawnPlayer() {
      player.x = level.spawn.x;
      player.y = level.spawn.y;
      player.vx = 0;
      player.vy = 0;
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
      if (JUMP_KEYS.has(e.code) || LEFT_KEYS.has(e.code) || RIGHT_KEYS.has(e.code)) {
        e.preventDefault();
      }
      keysRef.current.add(e.code);
    }
    function handleKeyUp(e) {
      keysRef.current.delete(e.code);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function updatePhysics() {
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
      player.x = Math.max(0, Math.min(player.x, level.width - player.width));
      resolveHorizontal(player, level.platforms);

      player.y += player.vy;
      resolveVertical(player, level.platforms);

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
          if (stomping) {
            enemy.alive = false;
            player.vy = JUMP_VELOCITY * 0.55;
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
          state.score += 10;
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
      ctx.fillStyle = '#1c2b4a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.translate(-state.camera, 0);

      ctx.fillStyle = '#4a3323';
      for (const p of level.platforms) {
        ctx.fillRect(p.x, p.y, p.width, p.height);
      }

      ctx.fillStyle = '#ffd23f';
      for (const coin of level.coins) {
        if (coin.collected) continue;
        ctx.beginPath();
        ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#c1392b';
      for (const enemy of level.enemies) {
        if (!enemy.alive) continue;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }

      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(level.flag.x, level.flag.y, level.flag.width, level.flag.height);

      const flashing = performance.now() < player.invulnerableUntil && Math.floor(performance.now() / 100) % 2 === 0;
      ctx.fillStyle = flashing ? '#89aaff' : '#3355ff';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px monospace';
      ctx.fillText(`Score: ${state.score}`, 16, 30);
      ctx.fillText(`Lives: ${state.lives}`, 16, 56);
      ctx.fillText(`Coins: ${state.coinsCollected}/${level.coins.length}`, 16, 82);
      ctx.font = '14px monospace';
      ctx.fillText('Arrows/WASD to move, Space/Up to jump (tap for a short hop)', 16, CANVAS_HEIGHT - 16);

      if (state.levelComplete) {
        ctx.font = 'bold 40px monospace';
        ctx.fillStyle = '#ffd23f';
        ctx.textAlign = 'center';
        ctx.fillText(state.message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.textAlign = 'left';
      }
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ display: 'block', margin: '0 auto', background: '#000', imageRendering: 'pixelated' }}
    />
  );
}
