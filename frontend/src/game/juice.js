// Screen shake, hit-pause, and particle bursts — split out of GameCanvas.jsx
// per CLAUDE.md rule 2 (keep the loop file itself under budget). Pure state
// + pure functions: the loop owns calling tick()/getShakeOffset() each
// frame and checking isHitPaused() to decide whether to skip a physics
// step, same "freeze frame" trick a lot of platformers use to make a hit
// actually read as an impact rather than a number just changing.

const SHAKE_DECAY_PER_SEC = 6;
export const PARTICLE_LIFE_MS = 450;
const PARTICLE_GRAVITY = 0.15;

export function createJuiceState() {
  return {
    shakeIntensity: 0,
    hitPauseUntil: 0,
    particles: [],
  };
}

export function shake(juice, intensity) {
  juice.shakeIntensity = Math.max(juice.shakeIntensity, intensity);
}

export function hitPause(juice, ms) {
  juice.hitPauseUntil = Math.max(juice.hitPauseUntil, performance.now() + ms);
}

export function isHitPaused(juice) {
  return performance.now() < juice.hitPauseUntil;
}

export function burst(juice, x, y, color, count = 10) {
  const now = performance.now();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    juice.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      color,
      createdAt: now,
    });
  }
}

// Skipped entirely while hit-paused, same as physics, so the freeze frame
// actually freezes everything rather than just the player/enemies.
export function tick(juice, dt) {
  juice.shakeIntensity = Math.max(0, juice.shakeIntensity - SHAKE_DECAY_PER_SEC * dt);
  for (const p of juice.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += PARTICLE_GRAVITY;
  }
  if (juice.particles.length) {
    const now = performance.now();
    juice.particles = juice.particles.filter((p) => now - p.createdAt < PARTICLE_LIFE_MS);
  }
}

export function getShakeOffset(juice) {
  if (juice.shakeIntensity <= 0) return { x: 0, y: 0 };
  const mag = juice.shakeIntensity;
  return {
    x: (Math.random() * 2 - 1) * mag,
    y: (Math.random() * 2 - 1) * mag,
  };
}
