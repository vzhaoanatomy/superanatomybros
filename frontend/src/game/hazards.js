// Piranha plant, spikes, koopa (patrol + shell-throwing), and koopa-shell
// update logic — split out of GameCanvas.jsx to keep the main loop file
// within CLAUDE.md's ~600-line budget. Pure updates over the level/player/
// state objects GameCanvas already owns; `loseLife` is passed in since it
// closes over player/state/respawnPlayer inside GameCanvas's own effect.
import { playStompSound, playHurtSound } from './music';

const SHELL_SPEED = 6;
const SHELL_SIZE = 20;
const SHELL_MAX_TRAVEL = 500;
const SHELL_THROW_MIN_MS = 2500;
const SHELL_THROW_MAX_MS = 4500;
const KOOPA_STOMP_BOUNCE = -9;
const KOOPA_SCORE = 75;
const PIRANHA_SCORE = 100;

function aabbOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function scheduleKoopaThrow() {
  return performance.now() + SHELL_THROW_MIN_MS + Math.random() * (SHELL_THROW_MAX_MS - SHELL_THROW_MIN_MS);
}

// Fireball vs. piranha/koopa — called from GameCanvas's existing fireball
// loop (which already checks level.enemies) right after that per-fireball
// enemy check. Returns true if the fireball was consumed.
export function fireballHitsHazard(fireball, level, state) {
  if (level.piranha && level.piranha.alive && aabbOverlap(fireball, level.piranha)) {
    level.piranha.alive = false;
    fireball.alive = false;
    state.score += PIRANHA_SCORE;
    playStompSound();
    return true;
  }
  if (level.koopa && level.koopa.alive && aabbOverlap(fireball, level.koopa)) {
    level.koopa.alive = false;
    fireball.alive = false;
    state.score += KOOPA_SCORE;
    playStompSound();
    return true;
  }
  return false;
}

export function updateHazards(level, player, state, loseLife) {
  const now = performance.now();
  const starActive = now < player.starUntil;
  const invulnerable = now < player.invulnerableUntil;

  // Piranha plant: stationary, only fire kills it (see fireballHitsHazard).
  // Touching it costs a life automatically — star grants full immunity,
  // power-ups still absorb the hit first via loseLife's shield order.
  if (level.piranha && level.piranha.alive && aabbOverlap(player, level.piranha)) {
    if (!starActive && !invulnerable) {
      playHurtSound();
      loseLife();
    }
  }

  // Spikes: stationary, no HP at all — can't be defeated by anything,
  // only avoided. Same automatic-life-loss-on-touch shape as the piranha.
  if (level.spikes && aabbOverlap(player, level.spikes)) {
    if (!starActive && !invulnerable) {
      playHurtSound();
      loseLife();
    }
  }

  // Koopa: patrols like a ground enemy, periodically lobs a shell, and is
  // only defeated by a head-stomp or ground-pound (or fire) — a side-touch
  // hurts the player instead of opening a quiz.
  const koopa = level.koopa;
  if (koopa && koopa.alive) {
    koopa.x += koopa.vx;
    if (koopa.x < koopa.minX || koopa.x + koopa.width > koopa.maxX) {
      koopa.vx *= -1;
      koopa.x = Math.max(koopa.minX, Math.min(koopa.x, koopa.maxX - koopa.width));
    }

    if (now >= koopa.nextThrowAt) {
      koopa.nextThrowAt = scheduleKoopaThrow();
      const throwDir = player.x < koopa.x ? -1 : 1;
      state.shells.push({
        x: throwDir > 0 ? koopa.x + koopa.width : koopa.x - SHELL_SIZE,
        y: koopa.y + koopa.height - SHELL_SIZE - 4,
        spawnX: koopa.x,
        vx: SHELL_SPEED * throwDir,
        width: SHELL_SIZE,
        height: SHELL_SIZE,
        alive: true,
      });
    }

    if (aabbOverlap(player, koopa)) {
      const stomping = player.vy > 0 && player.y + player.height - koopa.y < koopa.height * 0.5;
      if (stomping || player.pounding) {
        koopa.alive = false;
        state.score += KOOPA_SCORE;
        playStompSound();
        if (stomping && !player.pounding) player.vy = KOOPA_STOMP_BOUNCE;
      } else if (!starActive && !invulnerable) {
        playHurtSound();
        loseLife();
      }
    }
  }

  // Koopa shells: straight-line projectiles. A hit follows the same
  // "power-up absorbs it, else a life" rule as any other damage source.
  for (const shell of state.shells) {
    if (!shell.alive) continue;
    shell.x += shell.vx;
    if (Math.abs(shell.x - shell.spawnX) > SHELL_MAX_TRAVEL || shell.x < 0 || shell.x > level.width) {
      shell.alive = false;
      continue;
    }
    if (aabbOverlap(shell, player)) {
      shell.alive = false;
      if (!starActive && !invulnerable) {
        playHurtSound();
        loseLife();
      }
    }
  }
  if (state.shells.length > 20) {
    state.shells = state.shells.filter((s) => s.alive);
  }
}
