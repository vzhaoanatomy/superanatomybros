import { getCharacter } from './characters';

// All pixel-art / canvas drawing lives here (CLAUDE.md rule 2). GameCanvas.jsx
// only calls into this module — it never issues its own fill/stroke calls.

function drawCloud(ctx, cx, cy, scale) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 34 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - 24 * scale, cy + 5 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 24 * scale, cy + 5 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx, cx, groundY, scale, color) {
  ctx.fillStyle = 'rgba(74, 51, 35, 0.9)';
  ctx.fillRect(cx - 4 * scale, groundY - 28 * scale, 8 * scale, 28 * scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - 48 * scale, 26 * scale, 24 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - 16 * scale, groundY - 32 * scale, 19 * scale, 17 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 16 * scale, groundY - 32 * scale, 19 * scale, 17 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Tiles `drawOne(screenX)` endlessly across the visible width with a slow
// parallax offset, so the skyline never runs out no matter how far the
// level scrolls.
function tileAcross(ctx, width, camera, parallax, spacing, drawOne) {
  const offset = (((camera * parallax) % spacing) + spacing) % spacing;
  const count = Math.ceil(width / spacing) + 2;
  for (let i = -1; i < count; i++) {
    drawOne(i * spacing - offset + spacing / 2);
  }
}

// groundY defaults to a fraction of height so this also works for small
// scale previews (World Select cards) where there's no real level.groundY —
// GameCanvas passes the actual level.groundY explicitly.
export function drawBackground(ctx, width, height, palette, camera = 0, groundY = height * 0.82) {
  ctx.fillStyle = palette?.sky ?? '#5fa8e8';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(1, height / 540);
  tileAcross(ctx, width, camera, 0.05, 420 * scale, (cx) => drawCloud(ctx, cx, height * 0.12, scale));
  tileAcross(ctx, width, camera, 0.08, 560 * scale, (cx) => drawCloud(ctx, cx, height * 0.22, 0.7 * scale));
  tileAcross(ctx, width, camera, 0.3, 170 * scale, (cx) => drawTree(ctx, cx, groundY, scale, palette?.hills ?? '#2e7d46'));
}

const BRICK_W = 40;
const BRICK_H = 20;

function drawBlock(ctx, platform, palette) {
  const { x, y, width, height } = platform;
  ctx.fillStyle = palette?.ground ?? '#4a3323';
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  let row = 0;
  for (let ry = y; ry < y + height; ry += BRICK_H, row++) {
    const rowH = Math.min(BRICK_H, y + height - ry);
    ctx.beginPath();
    ctx.moveTo(x, ry);
    ctx.lineTo(x + width, ry);
    ctx.stroke();
    const offset = row % 2 === 0 ? 0 : BRICK_W / 2;
    for (let bx = x + offset; bx < x + width; bx += BRICK_W) {
      ctx.beginPath();
      ctx.moveTo(bx, ry);
      ctx.lineTo(bx, ry + rowH);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x, y, width, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x, y + height - 3, width, 3);
}

// Solid ground — the lowest point in the scene. Deliberately untextured
// (just a grass cap over a flat fill) so it reads as bedrock, distinct from
// the brick-textured floating platforms.
function drawGroundStrip(ctx, platform, palette) {
  const { x, y, width, height } = platform;
  ctx.fillStyle = palette?.ground ?? '#6b4a2b';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = palette?.hills ?? '#3aa65a';
  ctx.fillRect(x, y, width, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x, y + 10, width, 3);
}

export function drawPlatform(ctx, platform, palette) {
  if (platform.type === 'ground') {
    drawGroundStrip(ctx, platform, palette);
  } else {
    drawBlock(ctx, platform, palette);
  }
}

export function drawCoin(ctx, coin) {
  if (coin.collected) return;
  const cx = coin.x + coin.width / 2;
  const cy = coin.y + coin.height / 2;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(cx, cy, coin.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9932a';
  ctx.beginPath();
  ctx.arc(cx, cy, coin.width / 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMushroom(ctx, x, y, w, h) {
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.35, w / 2, h * 0.35, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#fff';
  [[0.28, 0.22], [0.5, 0.14], [0.72, 0.22]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(x + w * px, y + h * py, w * 0.1, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#f4d9b0';
  ctx.fillRect(x + w * 0.3, y + h * 0.42, w * 0.4, h * 0.5);
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.42, y + h * 0.6, w * 0.05, h * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.58, y + h * 0.6, w * 0.05, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarPowerUp(ctx, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerR = w / 2;
  const innerR = outerR * 0.45;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.12, cy - h * 0.02, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.12, cy - h * 0.02, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEggPowerUp(ctx, x, y, w, h) {
  ctx.fillStyle = '#eaf6e8';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.42, h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4caf7d';
  [[0.35, 0.35], [0.62, 0.5], [0.4, 0.68]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(x + w * px, y + h * py, w * 0.09, h * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFireFlowerPowerUp(ctx, x, y, w, h) {
  ctx.strokeStyle = '#3f9d5c';
  ctx.lineWidth = Math.max(1, w * 0.08);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h);
  ctx.lineTo(x + w / 2, y + h * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#3f9d5c';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.28, y + h * 0.82, w * 0.14, h * 0.09, 0.5, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.72, y + h * 0.82, w * 0.14, h * 0.09, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const cx = x + w / 2;
  const cy = y + h * 0.36;
  ctx.fillStyle = '#e74c3c';
  [0, 1, 2, 3].forEach((i) => {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(angle) * w * 0.2, cy + Math.sin(angle) * h * 0.2, w * 0.2, h * 0.2, angle, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.16, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8871e';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.05, cy - h * 0.02, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.05, cy - h * 0.02, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

const POWER_UP_RENDERERS = {
  mushroom: drawMushroom,
  star: drawStarPowerUp,
  egg: drawEggPowerUp,
  fireFlower: drawFireFlowerPowerUp,
};

export function drawPowerUp(ctx, powerUp) {
  if (powerUp.collected) return;
  const renderer = POWER_UP_RENDERERS[powerUp.type];
  if (renderer) renderer(ctx, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
}

// A small flame the player lobs after picking up a fire flower — flickers
// via a couple of pulsing lobes so it doesn't read as a flat static circle.
export function drawFireball(ctx, fireball) {
  const { x, y, width: w, height: h } = fireball;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const t = performance.now() / 60;
  const flicker = 1 + Math.sin(t) * 0.12;
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.ellipse(cx, cy, (w / 2) * flicker, (h / 2) * flicker, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.ellipse(cx, cy, (w / 2) * 0.6, (h / 2) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe89e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, (w / 2) * 0.28, (h / 2) * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The Yoshi-style dino the player rides while the egg mount is active,
// drawn behind (and slightly larger than) the player so it reads as
// something they're standing on rather than a badge floating nearby.
export function drawDinoMount(ctx, player) {
  const { x, y, width: w, height: h, facing } = player;
  const dw = w * 2.1;
  // Taller than the rider and anchored so its feet land on the same ground
  // line as the player's own feet (y + h) — the player's body then overlaps
  // the dino's upper back/neck instead of floating above or sinking into it.
  const dh = h * 1.55;
  const dx = x + w / 2 - dw / 2;
  const dy = y + h - dh;
  const faceDir = facing >= 0 ? 1 : -1;

  ctx.fillStyle = '#3f9d5c';
  ctx.beginPath();
  ctx.moveTo(dx + dw * (faceDir >= 0 ? 0.06 : 0.94), dy + dh * 0.55);
  ctx.quadraticCurveTo(
    dx + dw * (faceDir >= 0 ? -0.16 : 1.16),
    dy + dh * 0.32,
    dx + dw * (faceDir >= 0 ? -0.02 : 1.02),
    dy + dh * 0.12
  );
  ctx.lineTo(dx + dw * (faceDir >= 0 ? 0.14 : 0.86), dy + dh * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3f9d5c';
  ctx.fillRect(dx + dw * 0.22, dy + dh * 0.78, dw * 0.14, dh * 0.22);
  ctx.fillRect(dx + dw * 0.64, dy + dh * 0.78, dw * 0.14, dh * 0.22);

  ctx.fillStyle = '#4caf7d';
  ctx.beginPath();
  ctx.ellipse(dx + dw * 0.5, dy + dh * 0.52, dw * 0.46, dh * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eaf6e8';
  ctx.beginPath();
  ctx.ellipse(dx + dw * 0.5, dy + dh * 0.72, dw * 0.3, dh * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb84d';
  for (let i = 0; i < 3; i++) {
    const sx = dx + dw * (0.36 + i * 0.1);
    ctx.beginPath();
    ctx.moveTo(sx, dy + dh * 0.26);
    ctx.lineTo(sx + dw * 0.03, dy + dh * 0.1);
    ctx.lineTo(sx + dw * 0.06, dy + dh * 0.26);
    ctx.closePath();
    ctx.fill();
  }

  const headX = faceDir >= 0 ? dx + dw * 0.88 : dx + dw * 0.12;
  ctx.fillStyle = '#4caf7d';
  ctx.beginPath();
  ctx.ellipse(headX, dy + dh * 0.4, dw * 0.15, dh * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eaf6e8';
  ctx.beginPath();
  ctx.ellipse(headX + faceDir * dw * 0.13, dy + dh * 0.44, dw * 0.08, dh * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(headX + faceDir * dw * 0.02, dy + dh * 0.33, dw * 0.025, dh * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c9932a';
  ctx.fillRect(dx + dw * 0.34, dy + dh * 0.24, dw * 0.28, dh * 0.09);
}

// A shimmering portal rather than a plain pole — the visible oval is wider
// than the (narrower) collision box, which is fine since it's pure flourish;
// the invisible hitbox stays exactly door.width/height for jump-over blocking.
export function drawDoor(ctx, door) {
  if (door.passed) return;
  const { x, y, width, height } = door;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const visualW = 60;
  const t = performance.now() / 500;

  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, visualW * 2);
  glow.addColorStop(0, 'rgba(190, 140, 255, 0.45)');
  glow.addColorStop(1, 'rgba(190, 140, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, visualW * 2, height / 2 + 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, visualW / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(110, 60, 200, 0.4)';
  ctx.fillRect(cx - visualW, y, visualW * 2, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const phase = (t + i * 0.9) % 2.7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(Math.sin(phase)) * visualW * 0.45 + 4, height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = '#d8bfff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, visualW / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  const sparkleY = cy + Math.sin(t * 2.4) * height * 0.35;
  ctx.beginPath();
  ctx.ellipse(cx, sparkleY, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFlag(ctx, flag) {
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(flag.x, flag.y, 6, flag.height);
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.moveTo(flag.x + 6, flag.y);
  ctx.lineTo(flag.x + flag.width + 6, flag.y + 14);
  ctx.lineTo(flag.x + 6, flag.y + 28);
  ctx.closePath();
  ctx.fill();
}

// Goomba-style blob enemy (World 1 placeholder enemy).
export function drawGoomba(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#8b4a2b';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.45, w / 2, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c2f1a';
  ctx.fillRect(x + w * 0.1, y + h * 0.78, w * 0.3, h * 0.22);
  ctx.fillRect(x + w * 0.6, y + h * 0.78, w * 0.3, h * 0.22);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.32, y + h * 0.42, w * 0.14, h * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.68, y + h * 0.42, w * 0.14, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.34, y + h * 0.44, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.7, y + h * 0.44, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y + h * 0.22);
  ctx.lineTo(x + w * 0.4, y + h * 0.3);
  ctx.moveTo(x + w * 0.8, y + h * 0.22);
  ctx.lineTo(x + w * 0.6, y + h * 0.3);
  ctx.stroke();
}

// World 2 enemy: a blotchy pink/red skin-disease blob.
export function drawSkinBlob(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#d97a9c';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.5, w / 2, h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a83f63';
  [[0.28, 0.32], [0.65, 0.28], [0.42, 0.6], [0.72, 0.62]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(x + w * px, y + h * py, w * 0.09, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h * 0.45, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.65, y + h * 0.45, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h * 0.46, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.65, y + h * 0.46, w * 0.04, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

// World 3 enemy: a simple bone-white skeleton.
export function drawSkeleton(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#f2ead3';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.2, w * 0.24, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.38, y + h * 0.18, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.62, y + h * 0.18, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f2ead3';
  ctx.lineWidth = Math.max(2, w * 0.08);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.38);
  ctx.lineTo(x + w * 0.5, y + h * 0.82);
  for (let i = 0; i < 3; i++) {
    const ry = y + h * (0.44 + i * 0.12);
    ctx.moveTo(x + w * 0.24, ry);
    ctx.lineTo(x + w * 0.76, ry);
  }
  ctx.moveTo(x + w * 0.5, y + h * 0.82);
  ctx.lineTo(x + w * 0.28, y + h);
  ctx.moveTo(x + w * 0.5, y + h * 0.82);
  ctx.lineTo(x + w * 0.72, y + h);
  ctx.stroke();
}

// World 4 enemy: a bulky red muscle-brawler.
export function drawMuscleBrawler(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.42, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e05a45';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.16, y + h * 0.5, w * 0.18, h * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.84, y + h * 0.5, w * 0.18, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a1f16';
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.34, y + h * 0.4);
  ctx.lineTo(x + w * 0.34, y + h * 0.75);
  ctx.moveTo(x + w * 0.5, y + h * 0.36);
  ctx.lineTo(x + w * 0.5, y + h * 0.78);
  ctx.moveTo(x + w * 0.66, y + h * 0.4);
  ctx.lineTo(x + w * 0.66, y + h * 0.75);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.fillRect(x + w * 0.3, y + h * 0.24, w * 0.12, h * 0.08);
  ctx.fillRect(x + w * 0.58, y + h * 0.24, w * 0.12, h * 0.08);
}

// World 5 enemy: a glowing neuron with dendrite branches.
export function drawNeuron(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  const cx = x + w / 2;
  const cy = y + h * 0.5;
  ctx.strokeStyle = '#7de3ff';
  ctx.lineWidth = Math.max(1, w * 0.05);
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * w * 0.55, cy + Math.sin(angle) * h * 0.55);
    ctx.stroke();
  }
  ctx.fillStyle = '#3355aa';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.32, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7de3ff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.14, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

// World 6 enemy: a small lab cat.
export function drawLabCat(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#3c3c3c';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.45, y + h * 0.6, w * 0.42, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.78, y + h * 0.4, w * 0.24, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.62, y + h * 0.24);
  ctx.lineTo(x + w * 0.7, y);
  ctx.lineTo(x + w * 0.78, y + h * 0.22);
  ctx.moveTo(x + w * 0.86, y + h * 0.22);
  ctx.lineTo(x + w * 0.94, y);
  ctx.lineTo(x + w * 0.98, y + h * 0.24);
  ctx.fill();
  ctx.strokeStyle = '#3c3c3c';
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.7);
  ctx.quadraticCurveTo(x - w * 0.15, y + h * 0.4, x + w * 0.05, y + h * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#b6ff9e';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.72, y + h * 0.38, w * 0.05, h * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.87, y + h * 0.38, w * 0.05, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Not currently assigned to a world's regular patrol enemies — reserved for
// the Phase 5 final boss (World 7), per the "boss fight moves to World 7"
// decision.
export function drawDragonling(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#8a2f2f';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.15);
  ctx.lineTo(x + w * 0.95, y + h * 0.5);
  ctx.lineTo(x + w * 0.5, y + h * 0.5);
  ctx.closePath();
  ctx.moveTo(x + w * 0.5, y + h * 0.15);
  ctx.lineTo(x + w * 0.05, y + h * 0.5);
  ctx.lineTo(x + w * 0.5, y + h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff4a4a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.62, w * 0.34, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.36, y + h * 0.32);
  ctx.lineTo(x + w * 0.42, y + h * 0.1);
  ctx.lineTo(x + w * 0.46, y + h * 0.32);
  ctx.moveTo(x + w * 0.54, y + h * 0.32);
  ctx.lineTo(x + w * 0.58, y + h * 0.1);
  ctx.lineTo(x + w * 0.64, y + h * 0.32);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.4, y + h * 0.58, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.6, y + h * 0.58, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

// World 6 enemy: a dark red blood clot.
export function drawClot(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  ctx.fillStyle = '#6b1a1a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.5, w / 2, h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8f2a2a';
  [[0.3, 0.3], [0.68, 0.32], [0.5, 0.62], [0.75, 0.6]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(x + w * px, y + h * py, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h * 0.42, w * 0.09, h * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.65, y + h * 0.42, w * 0.09, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h * 0.43, w * 0.035, h * 0.035, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.65, y + h * 0.43, w * 0.035, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
}

const ENEMY_RENDERERS = {
  goomba: drawGoomba,
  skinBlob: drawSkinBlob,
  skeleton: drawSkeleton,
  muscleBrawler: drawMuscleBrawler,
  neuron: drawNeuron,
  labCat: drawLabCat,
  clot: drawClot,
  dragonling: drawDragonling,
};

export function drawEnemy(ctx, enemy, enemyType) {
  (ENEMY_RENDERERS[enemyType] ?? drawGoomba)(ctx, enemy);
}

// World 7 final boss — a scaled-up dragonling with an HP bar hovering above.
export function drawBoss(ctx, boss) {
  if (!boss.alive) return;
  drawDragonling(ctx, boss);

  const barW = boss.width;
  const barX = boss.x;
  const barY = boss.y - 22;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, barY, barW, 10);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f1c40f' : '#e74c3c';
  ctx.fillRect(barX, barY, barW * pct, 10);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, 10);
}

function rectPct(ctx, x, y, w, h, px, py, pw, ph, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + px * w, y + py * h, pw * w, ph * h);
}

function drawPlumberBody(ctx, x, y, w, h, colors, facing) {
  rectPct(ctx, x, y, w, h, 0.08, 0.0, 0.84, 0.16, colors.brim);
  rectPct(ctx, x, y, w, h, 0.16, -0.03, 0.68, 0.16, colors.cap);
  rectPct(ctx, x, y, w, h, 0.18, 0.14, 0.64, 0.28, colors.skin);
  if (colors.mustache) {
    rectPct(ctx, x, y, w, h, 0.24, 0.34, 0.52, 0.07, colors.mustache);
  }
  rectPct(ctx, x, y, w, h, 0.14, 0.42, 0.72, 0.36, colors.body);
  rectPct(ctx, x, y, w, h, 0.14, 0.42, 0.72, 0.08, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.04, 0.46, 0.14, 0.2, colors.skin);
  rectPct(ctx, x, y, w, h, 0.82, 0.46, 0.14, 0.2, colors.skin);
  rectPct(ctx, x, y, w, h, 0.16, 0.78, 0.28, 0.22, colors.shoe);
  rectPct(ctx, x, y, w, h, 0.56, 0.78, 0.28, 0.22, colors.shoe);
  const eyeX = facing >= 0 ? 0.58 : 0.24;
  rectPct(ctx, x, y, w, h, eyeX, 0.22, 0.1, 0.08, '#1a1a1a');
}

function drawBloom(ctx, x, y, w, h, colors, facing) {
  rectPct(ctx, x, y, w, h, 0.1, 0.1, 0.8, 0.24, colors.hair);
  rectPct(ctx, x, y, w, h, 0.22, 0.16, 0.56, 0.22, colors.skin);
  rectPct(ctx, x, y, w, h, 0.3, -0.06, 0.1, 0.12, colors.crown);
  rectPct(ctx, x, y, w, h, 0.45, -0.1, 0.1, 0.16, colors.crown);
  rectPct(ctx, x, y, w, h, 0.6, -0.06, 0.1, 0.12, colors.crown);
  rectPct(ctx, x, y, w, h, 0.26, 0.36, 0.48, 0.2, colors.body);
  rectPct(ctx, x, y, w, h, 0.12, 0.54, 0.76, 0.3, colors.body);
  rectPct(ctx, x, y, w, h, 0.12, 0.8, 0.76, 0.06, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.2, 0.86, 0.2, 0.14, colors.shoe);
  rectPct(ctx, x, y, w, h, 0.6, 0.86, 0.2, 0.14, colors.shoe);
  const eyeX = facing >= 0 ? 0.56 : 0.28;
  rectPct(ctx, x, y, w, h, eyeX, 0.24, 0.1, 0.08, '#1a1a1a');
}

function drawRex(ctx, x, y, w, h, colors, facing) {
  rectPct(ctx, x, y, w, h, 0.14, 0.02, 0.72, 0.2, colors.hair);
  rectPct(ctx, x, y, w, h, 0.16, -0.1, 0.12, 0.16, colors.horn);
  rectPct(ctx, x, y, w, h, 0.72, -0.1, 0.12, 0.16, colors.horn);
  rectPct(ctx, x, y, w, h, 0.2, 0.18, 0.6, 0.24, colors.skin);
  rectPct(ctx, x, y, w, h, 0.1, 0.4, 0.8, 0.4, colors.body);
  rectPct(ctx, x, y, w, h, 0.1, 0.4, 0.8, 0.09, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.3, 0.52, 0.16, 0.16, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.54, 0.52, 0.16, 0.16, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.16, 0.8, 0.28, 0.2, colors.shoe);
  rectPct(ctx, x, y, w, h, 0.56, 0.8, 0.28, 0.2, colors.shoe);
  const eyeX = facing >= 0 ? 0.58 : 0.24;
  rectPct(ctx, x, y, w, h, eyeX, 0.26, 0.1, 0.08, '#1a1a1a');
}

export function drawPlayer(ctx, player, characterId, opts = {}) {
  const character = getCharacter(characterId);
  let { x, y, width: w, height: h } = player;
  const { facing } = player;

  // The mushroom's "big" state only scales what's drawn, not the physics
  // box (growing the real hitbox mid-run risks clipping into platforms) —
  // anchored at bottom-center so the character still looks grounded.
  if (opts.big) {
    const scale = 1.35;
    const nw = w * scale;
    const nh = h * scale;
    x = x + w / 2 - nw / 2;
    y = y + h - nh;
    w = nw;
    h = nh;
  }

  if (opts.flashing) {
    ctx.save();
    ctx.globalAlpha = 0.55;
  }

  if (opts.invincible) {
    ctx.save();
    const t = performance.now() / 6;
    ctx.filter = `hue-rotate(${t % 360}deg) saturate(2.4) brightness(1.15)`;

    const glowHue = t % 360;
    ctx.save();
    ctx.filter = 'none';
    const cx = x + w / 2;
    const cy = y + h / 2;
    const glow = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 1.1);
    glow.addColorStop(0, `hsla(${glowHue}, 100%, 65%, 0.55)`);
    glow.addColorStop(1, 'hsla(0, 100%, 65%, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 1.1, h * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (character.id === 'doc' || character.id === 'vee') {
    drawPlumberBody(ctx, x, y, w, h, character.colors, facing);
  } else if (character.id === 'bloom') {
    drawBloom(ctx, x, y, w, h, character.colors, facing);
  } else if (character.id === 'rex') {
    drawRex(ctx, x, y, w, h, character.colors, facing);
  }

  if (opts.invincible) {
    ctx.restore();
  }

  if (opts.flashing) {
    ctx.restore();
  }
}

