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

// A decorative Mario-style pipe — no collision, purely background flavor.
// Spaced far apart in drawBackground below so only a handful ever appear
// across a level.
function drawPipe(ctx, cx, groundY, scale) {
  const bodyW = 46 * scale;
  const bodyH = 70 * scale;
  const capW = 58 * scale;
  const capH = 16 * scale;
  const x = cx - bodyW / 2;
  const bodyY = groundY - bodyH;

  ctx.fillStyle = '#2e9e4f';
  ctx.fillRect(x, bodyY + capH, bodyW, bodyH - capH);
  ctx.fillStyle = '#237a3c';
  ctx.fillRect(x, bodyY + capH, bodyW * 0.22, bodyH - capH);

  ctx.fillStyle = '#33b25a';
  ctx.fillRect(cx - capW / 2, bodyY, capW, capH);
  ctx.fillStyle = '#237a3c';
  ctx.fillRect(cx - capW / 2, bodyY, capW, 4 * scale);

  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - capW / 2, bodyY, capW, capH);
  ctx.strokeRect(x, bodyY + capH, bodyW, bodyH - capH);
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
  tileAcross(ctx, width, camera, 0.3, 1800 * scale, (cx) => drawPipe(ctx, cx, groundY, scale));
}

// Flat, dim, and windowless — reads as "underground" so a pipe bonus room
// feels like somewhere else, not just a recolored outdoor level.
export function drawBonusBackground(ctx, width, height) {
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// Countdown + coin tally pinned to the top of the canvas while a pipe
// bonus room is active — drawn outside the camera-translated group so it
// stays fixed on screen regardless of how far the player wanders.
export function drawBonusHud(ctx, width, room) {
  const label = `⏱ ${Math.max(0, Math.ceil(room.timeLeft))}s   🪙 ${room.collected}/${room.coins.length}`;
  ctx.font = 'bold 18px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  const textWidth = ctx.measureText(label).width;
  const boxW = textWidth + 28;
  const boxX = width / 2 - boxW / 2;
  ctx.fillStyle = 'rgba(10,6,20,0.85)';
  ctx.fillRect(boxX, 10, boxW, 34);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, 10, boxW, 34);
  ctx.fillStyle = '#ffd23f';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, 10 + 17);
  ctx.textBaseline = 'alphabetic';
}

const BRICK_W = 40;
const BRICK_H = 20;

// Lightens (positive amount) or darkens (negative) a #rrggbb color by a
// flat per-channel offset, clamped to a valid byte range.
function shadeHex(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.min(255, Math.max(0, v));
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

// Floating/climbable platforms get a beveled, light-to-dark gradient face
// (the ground itself stays flat via drawGroundStrip below — only these
// count as "the platform" for that treatment).
function drawBlock(ctx, platform, palette) {
  const { x, y, width, height } = platform;
  const base = palette?.ground ?? '#4a3323';
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, shadeHex(base, 35));
  gradient.addColorStop(0.5, base);
  gradient.addColorStop(1, shadeHex(base, -30));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  // Thick, near-black mortar lines — the gradient alone read as flat at a
  // glance; a heavier stroke is what actually sells "separate bricks."
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2.5;
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

const MYSTERY_BOX_BUMP_MS = 220;

// Gold "?" block while unused (bump it from below for a reward — see
// GameCanvas.jsx's triggerMysteryBox); a flat dulled block once spent,
// same as classic Mario's "used block" look. Squishes upward briefly on
// the hit via box.bumpUntil, set by the same trigger.
function drawMysteryBox(ctx, box) {
  const { x, y, width, height } = box;
  const now = performance.now();
  const bumping = now < box.bumpUntil;
  const bumpT = bumping ? 1 - (box.bumpUntil - now) / MYSTERY_BOX_BUMP_MS : 0;
  const drawY = bumping ? y - Math.sin(bumpT * Math.PI) * 6 : y;

  ctx.save();
  if (box.used) {
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x, drawY, width, height);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, drawY + 0.5, width - 1, height - 1);
    ctx.restore();
    return;
  }

  // A slow brightness pulse (not a jarring blink) draws the eye toward
  // unused boxes without being distracting across a level full of them —
  // every box pulses on the same clock, not staggered per box.
  const pulse = (Math.sin(now / 260) + 1) / 2; // 0..1
  ctx.fillStyle = shadeHex('#f2b632', pulse * 45);
  ctx.fillRect(x, drawY, width, height);
  ctx.strokeStyle = '#7a4a10';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, drawY + 1, width - 2, height - 2);

  ctx.fillStyle = '#c98a1a';
  const rivet = 3;
  ctx.fillRect(x + 3, drawY + 3, rivet, rivet);
  ctx.fillRect(x + width - 6, drawY + 3, rivet, rivet);
  ctx.fillRect(x + 3, drawY + height - 6, rivet, rivet);
  ctx.fillRect(x + width - 6, drawY + height - 6, rivet, rivet);

  // The "?" fills almost the whole box now instead of reading as a small
  // label inside it — the box's whole job is "notice me." textBaseline
  // 'middle' centers on the font's em-box, not the glyph's actual ink —
  // at this size that reads visibly high (the "?" curl outweighs its
  // dot). Centering on the glyph's own measured bounding box instead
  // keeps it dead-center in the box regardless of font quirks.
  ctx.fillStyle = '#1a1200';
  ctx.font = `bold ${Math.round(height * 0.82)}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const centerX = x + width / 2;
  const centerY = drawY + height / 2;
  const metrics = ctx.measureText('?');
  const ascent = metrics.actualBoundingBoxAscent ?? height * 0.32;
  const descent = metrics.actualBoundingBoxDescent ?? height * 0.05;
  ctx.fillText('?', centerX, centerY + (ascent - descent) / 2);
  ctx.restore();
}

// The plain tile beside a "?" box in a mystery-box row — same bordered,
// riveted square shape as drawMysteryBox so the two read as one contiguous
// row of classic Mario blocks, just without the gold fill or "?" glyph.
function drawBlockTile(ctx, tile, palette) {
  const { x, y, width, height } = tile;
  const base = palette?.ground ?? '#4a3323';

  // Same light-to-dark gradient as the wide plank platforms (drawBlock)
  // so every platform in the level reads as one consistent brick material.
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, shadeHex(base, 40));
  gradient.addColorStop(0.5, shadeHex(base, 10));
  gradient.addColorStop(1, shadeHex(base, -35));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = shadeHex(base, -45);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  ctx.fillStyle = shadeHex(base, -25);
  const rivet = 3;
  ctx.fillRect(x + 3, y + 3, rivet, rivet);
  ctx.fillRect(x + width - 6, y + 3, rivet, rivet);
  ctx.fillRect(x + 3, y + height - 6, rivet, rivet);
  ctx.fillRect(x + width - 6, y + height - 6, rivet, rivet);
}

// The functional warp pipe (not the decorative background one drawn by
// drawPipe/drawBackground) — solid, standable, and marked with a floating
// coin while its bonus hasn't been claimed yet (see GameCanvas.jsx's
// findPipeUnderPlayer) so it reads as interactive rather than scenery.
function drawFunctionalPipe(ctx, pipe) {
  const { x, y, width, height } = pipe;
  const capH = Math.min(18, height * 0.22);
  const capOverhang = 6;

  ctx.fillStyle = '#2e9e4f';
  ctx.fillRect(x, y + capH, width, height - capH);
  ctx.fillStyle = '#237a3c';
  ctx.fillRect(x, y + capH, width * 0.22, height - capH);

  ctx.fillStyle = '#33b25a';
  ctx.fillRect(x - capOverhang, y, width + capOverhang * 2, capH);
  ctx.fillStyle = '#237a3c';
  ctx.fillRect(x - capOverhang, y, width + capOverhang * 2, capH * 0.3);

  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - capOverhang, y, width + capOverhang * 2, capH);
  ctx.strokeRect(x, y + capH, width, height - capH);

  if (!pipe.used) {
    ctx.font = '16px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('🪙', x + width / 2, y - 34);

    // A bouncing down-arrow directly over the opening — the coin alone
    // read as "something's here" but not "here's what to do about it."
    const bob = Math.sin(performance.now() / 260) * 4;
    const cx = x + width / 2;
    const arrowY = y - 12 + bob;
    ctx.fillStyle = '#fff8dc';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 8, arrowY - 6);
    ctx.lineTo(cx + 8, arrowY - 6);
    ctx.lineTo(cx + 8, arrowY);
    ctx.lineTo(cx + 14, arrowY);
    ctx.lineTo(cx, arrowY + 12);
    ctx.lineTo(cx - 14, arrowY);
    ctx.lineTo(cx - 8, arrowY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Same beveled brick face as drawBlock, but once triggered it shakes harder
// the closer it gets to giving way and cracks with dark fissure lines —
// visible warning before it drops out of solids (see GameCanvas.jsx's
// CRUMBLE_DELAY_MS). Renders nothing at all once gone.
const CRUMBLE_DELAY_MS = 550;
// Deliberately ignores the world palette — a fixed ashen grey-stone reads
// as "this is not a normal brick platform" at a glance from anywhere in the
// level, rather than blending in and only revealing itself once it's
// already shaking apart underfoot.
const CRUMBLE_BASE_COLOR = '#8c8172';
function drawCrumblePlatform(ctx, platform) {
  if (platform.gone) return;
  const { x, y, width, height, triggered, triggerAt } = platform;
  const t = triggered ? Math.min(1, (performance.now() - triggerAt) / CRUMBLE_DELAY_MS) : 0;
  const shake = triggered ? (1 - Math.cos(performance.now() / 30)) * 2 * t : 0;
  const dx = triggered ? shake * (Math.random() - 0.5) : 0;

  ctx.save();
  ctx.translate(dx, 0);
  drawBlock(ctx, { x, y, width, height }, { ground: CRUMBLE_BASE_COLOR });

  // Faint hairline cracks are always visible (not just once triggered) so
  // the platform reads as fragile before the player ever steps on it.
  ctx.strokeStyle = `rgba(20,10,0,${triggered ? 0.4 + t * 0.4 : 0.22})`;
  ctx.lineWidth = triggered ? 2 : 1.3;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.2, y);
  ctx.lineTo(x + width * 0.45, y + height * 0.55);
  ctx.lineTo(x + width * 0.35, y + height);
  ctx.moveTo(x + width * 0.7, y);
  ctx.lineTo(x + width * 0.55, y + height * 0.5);
  ctx.lineTo(x + width * 0.75, y + height);
  ctx.stroke();
  ctx.restore();
}

export function drawPlatform(ctx, platform, palette) {
  if (platform.type === 'ground') {
    drawGroundStrip(ctx, platform, palette);
  } else if (platform.type === 'mysteryBox') {
    drawMysteryBox(ctx, platform);
  } else if (platform.type === 'tile') {
    drawBlockTile(ctx, platform, palette);
  } else if (platform.type === 'pipe') {
    drawFunctionalPipe(ctx, platform);
  } else if (platform.type === 'crumble') {
    drawCrumblePlatform(ctx, platform);
  } else {
    drawBlock(ctx, platform, palette);
  }
}

// A shiny 3D-look gold coin — gradient face, a darker offset "edge" for
// thickness, an embossed rim, a vertical slot mark, and a glint highlight.
export function drawCoin(ctx, coin) {
  if (coin.collected) return;
  const cx = coin.x + coin.width / 2;
  const cy = coin.y + coin.height / 2;
  const r = coin.width / 2;

  ctx.fillStyle = '#c9861a';
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.12, cy + r * 0.08, r * 0.92, r, 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#fff6c8');
  grad.addColorStop(0.35, '#ffd23f');
  grad.addColorStop(0.75, '#f0a92e');
  grad.addColorStop(1, '#c9861a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.92, r * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(180,110,10,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.68, r * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(150,90,10,0.5)';
  ctx.fillRect(cx - r * 0.13, cy - r * 0.42, r * 0.26, r * 0.84);
  ctx.fillStyle = 'rgba(255,240,180,0.6)';
  ctx.fillRect(cx - r * 0.09, cy - r * 0.38, r * 0.1, r * 0.76);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.32, cy - r * 0.4, r * 0.16, r * 0.09, -0.5, 0, Math.PI * 2);
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

// The "Antibiotic Flower" — same stem/leaves/four-petal layout as the
// original fire flower, but the petals are red/blue antibiotic capsules
// instead of flame-colored lobes, and a white cross sits at the center
// instead of a plain dot, so it reads as medicine rather than fire.
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
  [0, 1, 2, 3].forEach((i) => {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    const px = cx + Math.cos(angle) * w * 0.2;
    const py = cy + Math.sin(angle) * h * 0.2;
    ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#2255cc';
    ctx.beginPath();
    ctx.ellipse(px, py, w * 0.2, h * 0.2, angle, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.15, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.07, cy);
  ctx.lineTo(cx + w * 0.07, cy);
  ctx.moveTo(cx, cy - h * 0.07);
  ctx.lineTo(cx, cy + h * 0.07);
  ctx.stroke();
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

// A spinning red/blue antibiotic capsule the player lobs after picking up
// an Antibiotic Flower — an actual oval pill/capsule shape (stadium
// outline: two rounded ends joined by straight sides), not the round
// two-tone circle this used to be. Same collision box behavior as the old
// fireball, just wider than tall now (see FIREBALL_WIDTH/HEIGHT in
// GameCanvas.jsx) and reskinned as medicine instead of fire.
export function drawFireball(ctx, fireball) {
  const { x, y, width: w, height: h } = fireball;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const spin = performance.now() / 90;
  const r = h / 2;
  const half = Math.max(0, w / 2 - r);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);

  ctx.beginPath();
  ctx.moveTo(-half, -r);
  ctx.lineTo(half, -r);
  ctx.arc(half, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-half, r);
  ctx.arc(-half, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#2255cc';
  ctx.fillRect(-w / 2, -h / 2, w / 2, h);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(0, -h / 2, w / 2, h);
  ctx.restore();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(1, h * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-half * 0.3, -r * 0.4, Math.max(half * 0.5, 1), r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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

// Yoshi's tongue flick — a brief triangular extend-then-retract envelope
// timed against player.tongueUntil (must match GameCanvas's TONGUE_FLICK_MS).
const TONGUE_FLICK_MS = 220;
const TONGUE_REACH_PX = 70;
export function drawTongueFlick(ctx, player) {
  const now = performance.now();
  if (now >= player.tongueUntil) return;
  const elapsed = TONGUE_FLICK_MS - (player.tongueUntil - now);
  const t = elapsed / TONGUE_FLICK_MS;
  const extend = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
  const reach = TONGUE_REACH_PX * extend;
  const faceDir = player.facing >= 0 ? 1 : -1;
  const startX = player.facing >= 0 ? player.x + player.width : player.x;
  const y = player.y + player.height * 0.4;

  ctx.strokeStyle = '#e0455a';
  ctx.lineWidth = Math.max(3, player.width * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(startX + faceDir * reach, y);
  ctx.stroke();

  ctx.fillStyle = '#ff8aa0';
  ctx.beginPath();
  ctx.ellipse(startX + faceDir * reach, y, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A solid, permanent egg left behind wherever Yoshi's tongue grabbed an
// enemy — purely decorative (no collision), stays for the rest of the run.
export function drawSolidEgg(ctx, egg) {
  const { x, y, width: w, height: h } = egg;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, y + h, w * 0.38, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eaf6e8';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9d9c4';
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.stroke();

  ctx.fillStyle = '#4caf7d';
  [
    [0.35, 0.35],
    [0.62, 0.5],
    [0.4, 0.68],
  ].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(x + w * px, y + h * py, w * 0.09, h * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// The door's *collision box* stays tall (door.height spans from near the
// screen top down to the ground) so the player can't just jump over the
// checkpoint — but a human-proportioned door alone wouldn't read as a wall
// you can't get past. So the visible door is drawn at realistic proportions
// (roughly 2x player height, sitting on the ground) set into a stone wall
// that fills the rest of the collision box above it — reads as "a locked
// door in a wall," not an oversized door. Reaching it and answering
// correctly moves the player's respawn point here for the rest of the run
// (see GameCanvas.jsx's lastCheckpoint).
export function drawDoor(ctx, door) {
  if (door.passed) return;
  const { x, y, width, height } = door;
  const cx = x + width / 2;
  const groundLevel = y + height;

  const doorW = 52;
  const doorH = 108;
  const doorX = cx - doorW / 2;
  const doorY = groundLevel - doorH;

  const wallW = doorW + 24;
  const wallX = cx - wallW / 2;
  const wallH = doorY - y;

  if (wallH > 0) {
    ctx.fillStyle = '#7a8088';
    ctx.fillRect(wallX, y, wallW, wallH);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    const brickH = 18;
    let row = 0;
    for (let ry = y; ry < doorY; ry += brickH, row++) {
      const rowH = Math.min(brickH, doorY - ry);
      ctx.beginPath();
      ctx.moveTo(wallX, ry);
      ctx.lineTo(wallX + wallW, ry);
      ctx.stroke();
      const offset = row % 2 === 0 ? 0 : 18;
      for (let bx = wallX + offset; bx < wallX + wallW; bx += 36) {
        ctx.beginPath();
        ctx.moveTo(bx, ry);
        ctx.lineTo(bx, ry + rowH);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#565b62';
    ctx.lineWidth = 2;
    ctx.strokeRect(wallX, y, wallW, wallH);
  }

  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(doorX - 4, doorY - 4, doorW + 8, doorH + 8);

  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(doorX, doorY, doorW, doorH);

  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX + 6, doorY + doorH * 0.08, doorW - 12, doorH * 0.38);
  ctx.strokeRect(doorX + 6, doorY + doorH * 0.54, doorW - 12, doorH * 0.38);

  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(doorX + doorW - 10, doorY + doorH / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  const labelText = 'CHECKPOINT';
  ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  const textWidth = ctx.measureText(labelText).width;
  const labelY = y - 14;
  ctx.fillStyle = 'rgba(15, 10, 5, 0.85)';
  ctx.fillRect(cx - textWidth / 2 - 8, labelY - 14, textWidth + 16, 20);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - textWidth / 2 - 8, labelY - 14, textWidth + 16, 20);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(labelText, cx, labelY);
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

// A tiny angry face — reused across every bacteria/virus variant below so
// each still reads as "alive and hostile" regardless of body shape.
function drawGermFace(ctx, w, h, eyeX, eyeY, mouthY, ink) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-eyeX, eyeY, w * 0.055, h * 0.075, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeX, eyeY, w * 0.055, h * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(-eyeX, eyeY, w * 0.028, h * 0.045, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeX, eyeY, w * 0.028, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(-w * 0.16, mouthY);
  for (let i = 0; i <= 4; i++) {
    ctx.lineTo(-w * 0.16 + (w * 0.32 * i) / 4, mouthY + (i % 2 === 0 ? 0 : h * 0.06));
  }
  ctx.stroke();
}

// Variant 0 — the original rod-shaped bacillus, green, trailing flagella
// off both ends.
function drawBacteriaRod(ctx, w, h, now) {
  const tailT = now / 140;
  ctx.strokeStyle = '#7a9c3a';
  ctx.lineWidth = Math.max(1, w * 0.045);
  ctx.lineCap = 'round';
  for (const dy of [-0.16, 0.16]) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, h * dy);
    ctx.quadraticCurveTo(-w * 0.72, h * dy + Math.sin(tailT) * 4, -w * 0.92, h * dy - Math.sin(tailT) * 4);
    ctx.stroke();
  }
  const bodyGrad = ctx.createLinearGradient(0, -h * 0.32, 0, h * 0.32);
  bodyGrad.addColorStop(0, '#a8c95a');
  bodyGrad.addColorStop(0.5, '#8bb23f');
  bodyGrad.addColorStop(1, '#6c9330');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.46, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4c6e1e';
  ctx.lineWidth = Math.max(1, w * 0.035);
  ctx.stroke();
  ctx.strokeStyle = '#6c9330';
  ctx.lineWidth = Math.max(1, w * 0.025);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const px = Math.cos(angle) * w * 0.44;
    const py = Math.sin(angle) * h * 0.3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(angle) * w * 0.12, py + Math.sin(angle) * h * 0.12);
    ctx.stroke();
  }
  drawGermFace(ctx, w, h, w * 0.14, -h * 0.04, h * 0.14, '#1f2e0d');
}

// Variant 1 — a staph-style cluster of round cocci bunched together,
// magenta/purple, each with its own thin cell-wall outline.
function drawBacteriaCluster(ctx, w, h) {
  const spots = [
    [-0.2, -0.12, 0.24],
    [0.18, -0.16, 0.22],
    [0, 0.06, 0.28],
    [-0.22, 0.2, 0.2],
    [0.24, 0.16, 0.2],
  ];
  ctx.fillStyle = '#8a3fa0';
  for (const [sx, sy, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(w * sx, h * sy, w * r, h * r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#5c2470';
  ctx.lineWidth = Math.max(1, w * 0.03);
  for (const [sx, sy, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(w * sx, h * sy, w * r, h * r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#c988e0';
  for (const [sx, sy, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(w * sx - r * w * 0.3, h * sy - r * h * 0.3, w * r * 0.3, h * r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawGermFace(ctx, w, h, w * 0.14, h * 0.02, h * 0.2, '#2a0a38');
}

// Variant 2 — a strep-style chain of cocci strung out in a row, orange.
function drawBacteriaChain(ctx, w, h) {
  const count = 4;
  ctx.strokeStyle = '#c9761a';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, 0);
  ctx.lineTo(w * 0.42, 0);
  ctx.stroke();
  for (let i = 0; i < count; i++) {
    const cx = -w * 0.36 + (w * 0.72 * i) / (count - 1);
    const grad = ctx.createRadialGradient(cx - w * 0.03, -h * 0.03, w * 0.02, cx, 0, w * 0.17);
    grad.addColorStop(0, '#ffb35c');
    grad.addColorStop(1, '#e8871e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, 0, w * 0.17, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a85c10';
    ctx.lineWidth = Math.max(1, w * 0.025);
    ctx.stroke();
  }
  drawGermFace(ctx, w, h, w * 0.36, -h * 0.02, h * 0.12, '#5c3208');
}

// Variant 3 — a spirochete-style wavy spiral body, olive/yellow, thin.
function drawBacteriaSpiral(ctx, w, h, now) {
  const t = now / 300;
  ctx.strokeStyle = '#a89a2a';
  ctx.lineWidth = Math.max(2, w * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const px = -w * 0.46 + (w * 0.92 * i) / 20;
    const py = Math.sin(i * 0.9 + t) * h * 0.26;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = '#7c7018';
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const px = -w * 0.46 + (w * 0.92 * i) / 20;
    const py = Math.sin(i * 0.9 + t) * h * 0.26;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  const faceX = -w * 0.46 + (w * 0.92 * 18) / 20;
  const faceY = Math.sin(18 * 0.9 + t) * h * 0.26;
  ctx.save();
  ctx.translate(faceX, faceY);
  drawGermFace(ctx, w * 0.6, h * 0.6, w * 0.1, -h * 0.02, h * 0.09, '#4a4310');
  ctx.restore();
}

const BACTERIA_VARIANTS = [drawBacteriaRod, drawBacteriaCluster, drawBacteriaChain, drawBacteriaSpiral];

// A shared ground enemy — a bacterium, in one of several distinct
// shapes/colors (see BACTERIA_VARIANTS above), rolled per-enemy at level
// generation (see level.js). Distinct from any single world's own themed
// creature (skeleton, muscle-brawler, etc.); one of the two universal
// pathogen looks used everywhere now, alongside drawVirus below.
export function drawBacteria(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const now = performance.now();
  const wobble = Math.sin(now / 180) * 0.06;
  const variant = BACTERIA_VARIANTS[(enemy.variant ?? 0) % BACTERIA_VARIANTS.length];

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  variant(ctx, w, h, now);
  ctx.restore();
}

// Angry slanted eyes + jagged mouth, reused across every virus variant
// below (only the capsid shape/spikes/color change per variant).
function drawVirusFace(ctx, w, h, facing, ink) {
  const eyeY = -h * 0.06;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-w * 0.15, eyeY, w * 0.1, h * 0.11, -facing * 0.25, 0, Math.PI * 2);
  ctx.ellipse(w * 0.15, eyeY, w * 0.1, h * 0.11, -facing * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(-w * 0.15 + facing * w * 0.03, eyeY, w * 0.045, h * 0.07, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.15 + facing * w * 0.03, eyeY, w * 0.045, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 0.25, eyeY - h * 0.18);
  ctx.lineTo(-w * 0.06, eyeY - h * 0.24);
  ctx.moveTo(w * 0.25, eyeY - h * 0.18);
  ctx.lineTo(w * 0.06, eyeY - h * 0.24);
  ctx.stroke();
  const mouthY = h * 0.14;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, mouthY);
  for (let i = 0; i <= 4; i++) {
    ctx.lineTo(-w * 0.18 + (w * 0.36 * i) / 4, mouthY + (i % 2 === 0 ? 0 : h * 0.08));
  }
  ctx.lineTo(w * 0.18, mouthY + h * 0.06);
  ctx.lineTo(-w * 0.18, mouthY + h * 0.06);
  ctx.closePath();
  ctx.fill();
}

// Variant 0 — round capsid, round-tipped club spikes, magenta/pink — the
// classic coronavirus silhouette.
function drawVirusSpiky(ctx, w, h, now, facing) {
  const spikeCount = 12;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (Math.PI * 2 * i) / spikeCount + now / 3000;
    const baseX = Math.cos(angle) * w * 0.32;
    const baseY = Math.sin(angle) * h * 0.36;
    const tipX = Math.cos(angle) * w * 0.56;
    const tipY = Math.sin(angle) * h * 0.62;
    ctx.lineWidth = Math.max(1, w * 0.045);
    ctx.strokeStyle = '#c2477a';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = '#c2477a';
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, w * 0.07, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const bodyGrad = ctx.createRadialGradient(-w * 0.12, -h * 0.14, w * 0.05, 0, 0, w * 0.4);
  bodyGrad.addColorStop(0, '#f08fb0');
  bodyGrad.addColorStop(0.55, '#e0568f');
  bodyGrad.addColorStop(1, '#b03566');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.4, h * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a2247';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
  drawVirusFace(ctx, w, h, facing, '#2a0a18');
}

// Variant 1 — round capsid, thin needle-fine spikes (many more, no round
// tip), orange/red.
function drawVirusCrown(ctx, w, h, now, facing) {
  const spikeCount = 20;
  ctx.strokeStyle = '#d8481f';
  ctx.lineWidth = Math.max(1, w * 0.025);
  ctx.lineCap = 'round';
  for (let i = 0; i < spikeCount; i++) {
    const angle = (Math.PI * 2 * i) / spikeCount + now / 2500;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * w * 0.34, Math.sin(angle) * h * 0.38);
    ctx.lineTo(Math.cos(angle) * w * 0.58, Math.sin(angle) * h * 0.64);
    ctx.stroke();
  }
  const bodyGrad = ctx.createRadialGradient(-w * 0.1, -h * 0.12, w * 0.05, 0, 0, w * 0.36);
  bodyGrad.addColorStop(0, '#ffb877');
  bodyGrad.addColorStop(0.55, '#f2803a');
  bodyGrad.addColorStop(1, '#c25a1a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.36, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a3d0f';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
  drawVirusFace(ctx, w, h, facing, '#4a1f08');
}

// Variant 2 — smoother, more elongated envelope with a few short bumps
// instead of long spikes — an influenza-style look, purple/blue.
function drawVirusSmooth(ctx, w, h, now, facing) {
  const bumpCount = 8;
  ctx.fillStyle = '#7a6fd0';
  for (let i = 0; i < bumpCount; i++) {
    const angle = (Math.PI * 2 * i) / bumpCount + now / 2000;
    const bx = Math.cos(angle) * w * 0.4;
    const by = Math.sin(angle) * h * 0.44;
    ctx.beginPath();
    ctx.ellipse(bx, by, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const bodyGrad = ctx.createRadialGradient(-w * 0.1, -h * 0.12, w * 0.05, 0, 0, w * 0.44);
  bodyGrad.addColorStop(0, '#b0a6f0');
  bodyGrad.addColorStop(0.55, '#8a7ce0');
  bodyGrad.addColorStop(1, '#5847ad');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.46, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d3080';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
  drawVirusFace(ctx, w, h, facing, '#241a5c');
}

// Variant 3 — an angular, faceted icosahedral capsid with pointed
// corners — an adenovirus-style look, teal/green.
function drawVirusAngular(ctx, w, h, now, facing) {
  const sides = 7;
  ctx.fillStyle = '#2e9e88';
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2 + Math.sin(now / 700) * 0.05;
    const r = i % 2 === 0 ? 0.46 : 0.36;
    const px = Math.cos(angle) * w * r;
    const py = Math.sin(angle) * h * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#155c4e';
  ctx.lineWidth = Math.max(1, w * 0.035);
  ctx.stroke();
  ctx.fillStyle = '#7fe0c8';
  ctx.beginPath();
  ctx.ellipse(-w * 0.14, -h * 0.16, w * 0.14, h * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();
  drawVirusFace(ctx, w, h, facing, '#0e3a30');
}

const VIRUS_VARIANTS = [drawVirusSpiky, drawVirusCrown, drawVirusSmooth, drawVirusAngular];

// The flying enemy (and, per level.js, sometimes a ground/platform enemy
// too) — a mutating virus in one of several distinct shapes/colors (see
// VIRUS_VARIANTS above), rolled per-enemy at level generation. Hovers/bobs
// on a sine wave when it's the flyer (see GameCanvas.jsx), and is
// deliberately harder to read as "quiz-able" than the other enemies — no
// question mark, no friendly cartoon face, since resolveFlyerTouch skips
// the quiz gate entirely for it. Fits that mechanic thematically too: a
// virus can't be reasoned with via a vocab question, only physically
// eliminated.
function drawVirus(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  const now = performance.now();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const facing = enemy.vx >= 0 ? 1 : -1;
  const pulse = Math.sin(now / 240) * 0.04;
  const variant = VIRUS_VARIANTS[(enemy.variant ?? 0) % VIRUS_VARIANTS.length];

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(now / 500) * 0.08);
  ctx.scale(1 + pulse, 1 - pulse);
  variant(ctx, w, h, now, facing);
  ctx.restore();
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
  flyer: drawVirus,
  virus: drawVirus,
  bacteria: drawBacteria,
};

const SQUISH_MS = 700;

// A small floating name tag above a live virus/bacteria/boss — a real
// pathogen name (see level.js's BACTERIA_NAMES/VIRUS_NAMES/BOSS_NAMES)
// rather than a generic "enemy," adding ambient vocabulary exposure beyond
// the deck's own quiz terms. Skipped entirely if the enemy has no name
// (defeated/squishing enemies, or anything that predates this feature).
export function drawPathogenLabel(ctx, x, y, width, name) {
  if (!name) return;
  const cx = x + width / 2;
  ctx.font = 'italic bold 10px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const boxW = ctx.measureText(name).width + 8;
  const boxH = 14;
  const boxY = y - 10 - boxH;
  ctx.fillStyle = 'rgba(15,10,8,0.6)';
  ctx.fillRect(cx - boxW / 2, boxY, boxW, boxH);
  ctx.fillStyle = '#f5f0e8';
  ctx.fillText(name, cx, boxY + boxH - 4);
}

// A defeated enemy briefly flattens toward the ground instead of just
// vanishing — the transform squashes vertically and bulges horizontally
// around the sprite's own bottom-center, so every enemy renderer gets the
// effect for free without knowing about it. `now` defaults to a fresh call
// so existing call sites (still passing only 2 args) keep working.
export function drawEnemy(ctx, enemy, enemyType, now = performance.now()) {
  const renderer = ENEMY_RENDERERS[enemyType] ?? drawGoomba;
  if (enemy.alive) {
    renderer(ctx, enemy);
    return;
  }
  if (!enemy.deadAt || now - enemy.deadAt >= SQUISH_MS) return;
  const t = (now - enemy.deadAt) / SQUISH_MS;
  const cx = enemy.x + enemy.width / 2;
  const bottom = enemy.y + enemy.height;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t * 0.7);
  ctx.translate(cx, bottom);
  ctx.scale(1 + t * 0.35, Math.max(0.08, 1 - t));
  ctx.translate(-cx, -bottom);
  renderer(ctx, enemy);
  ctx.restore();
}

// The end-of-level boss — a towering drug-resistant "superbug," reusing
// the same bacterium visual language as drawBacteria above (rod body,
// trailing flagella) but oriented vertically to fill the boss's tall
// bounding box, with a spiked resistance shell and glowing eyes so it
// reads as clearly more dangerous than a regular enemy.
function drawPathogenBoss(ctx, boss) {
  const { x, y, width: w, height: h } = boss;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const now = performance.now();
  const wobble = Math.sin(now / 260) * 0.04;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);

  ctx.strokeStyle = '#8a3fa0';
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.lineCap = 'round';
  const tailT = now / 160;
  for (const dx of [-0.22, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(w * dx, -h * 0.42);
    ctx.quadraticCurveTo(w * dx + Math.sin(tailT) * 8, -h * 0.58, w * dx - Math.sin(tailT) * 6, -h * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * dx, h * 0.42);
    ctx.quadraticCurveTo(w * dx - Math.sin(tailT) * 8, h * 0.58, w * dx + Math.sin(tailT) * 6, h * 0.7);
    ctx.stroke();
  }

  const bodyGrad = ctx.createLinearGradient(-w * 0.4, 0, w * 0.4, 0);
  bodyGrad.addColorStop(0, '#6b2a80');
  bodyGrad.addColorStop(0.5, '#9645b5');
  bodyGrad.addColorStop(1, '#6b2a80');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.36, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d1750';
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.stroke();

  ctx.fillStyle = '#c760e0';
  const spikeCount = 14;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (Math.PI * 2 * i) / spikeCount;
    const bx = Math.cos(angle) * w * 0.34;
    const by = Math.sin(angle) * h * 0.4;
    const tipX = Math.cos(angle) * w * 0.5;
    const tipY = Math.sin(angle) * h * 0.55;
    const perpX = -Math.sin(angle) * w * 0.05;
    const perpY = Math.cos(angle) * h * 0.05;
    ctx.beginPath();
    ctx.moveTo(bx - perpX, by - perpY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx + perpX, by + perpY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath();
  ctx.ellipse(-w * 0.12, -h * 0.06, w * 0.07, h * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.12, -h * 0.06, w * 0.07, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0520';
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();

  ctx.strokeStyle = '#1a0520';
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, h * 0.14);
  for (let i = 0; i <= 5; i++) {
    ctx.lineTo(-w * 0.18 + (w * 0.36 * i) / 5, h * 0.14 + (i % 2 === 0 ? 0 : h * 0.05));
  }
  ctx.stroke();

  ctx.restore();
}

// The end-of-level boss encounter — a giant pathogen with an HP bar
// hovering above (see drawPathogenBoss above).
export function drawBoss(ctx, boss) {
  if (!boss.alive) return;
  drawPathogenBoss(ctx, boss);

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

// A stationary row of sharp spikes jutting up from the ground — no HP, no
// animation, nothing to defeat. The only "tell" is the shape itself: jump
// over it or eat it (see hazards.js's updateHazards).
export function drawSpikes(ctx, spikes) {
  const { x, y, width, height } = spikes;
  const count = Math.max(2, Math.round(width / 18));
  const spikeW = width / count;

  // A dull steel-grey used to blend in with the ground; a hazard needs to
  // read as dangerous at a glance, so the tips run red-hot and the base
  // sits on a black-and-yellow warning strip instead.
  ctx.fillStyle = 'rgba(20,15,10,0.7)';
  ctx.fillRect(x - 3, y + height - 4, width + 6, 6);
  ctx.fillStyle = '#f2b632';
  for (let i = 0; i < Math.ceil(width / 10); i++) {
    if (i % 2 === 0) ctx.fillRect(x - 3 + i * 10, y + height - 4, 5, 6);
  }

  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, '#ff5a3c');
  grad.addColorStop(0.45, '#c0392b');
  grad.addColorStop(1, '#4a4d57');
  ctx.fillStyle = grad;
  for (let i = 0; i < count; i++) {
    const sx = x + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(sx, y + height);
    ctx.lineTo(sx + spikeW / 2, y);
    ctx.lineTo(sx + spikeW, y + height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < count; i++) {
    const sx = x + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(sx, y + height);
    ctx.lineTo(sx + spikeW / 2, y);
    ctx.lineTo(sx + spikeW, y + height);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < count; i++) {
    const sx = x + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(sx + spikeW / 2, y);
    ctx.lineTo(sx + spikeW / 2 + 2, y + height * 0.3);
    ctx.lineTo(sx + spikeW / 2 - 2, y + height * 0.3);
    ctx.closePath();
    ctx.fill();
  }
}

// Stationary end-of-level hazard — a potted plant with a huge toothy head,
// modeled after the classic pot-and-leaves piranha plant rather than a pipe.
// The mouth animation is purely time-driven (performance.now()).
export function drawPiranhaPlant(ctx, piranha) {
  if (!piranha.alive) return;
  const { x, y, width: w, height: h } = piranha;

  const potH = h * 0.22;
  const potY = y + h - potH;
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, potY);
  ctx.lineTo(x + w * 0.8, potY);
  ctx.lineTo(x + w * 0.72, potY + potH);
  ctx.lineTo(x + w * 0.28, potY + potH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6b4326';
  ctx.fillRect(x + w * 0.15, potY - potH * 0.18, w * 0.7, potH * 0.24);

  const stemTopY = y + h * 0.36;
  ctx.strokeStyle = '#2f9e4f';
  ctx.lineWidth = Math.max(3, w * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, potY);
  ctx.quadraticCurveTo(x + w * 0.4, y + h * 0.58, x + w / 2, stemTopY);
  ctx.stroke();

  ctx.fillStyle = '#2f9e4f';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.46, y + h * 0.62);
  ctx.quadraticCurveTo(x - w * 0.2, y + h * 0.56, x + w * 0.08, y + h * 0.78);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.7, x + w * 0.46, y + h * 0.64);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.54, y + h * 0.6);
  ctx.quadraticCurveTo(x + w * 1.2, y + h * 0.52, x + w * 0.94, y + h * 0.76);
  ctx.quadraticCurveTo(x + w * 0.72, y + h * 0.66, x + w * 0.54, y + h * 0.62);
  ctx.closePath();
  ctx.fill();

  const headCY = stemTopY - h * 0.02;
  const headRX = w * 0.52;
  const headRY = h * 0.34;

  ctx.fillStyle = '#e0453a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, headCY, headRX, headRY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  [
    [-0.24, -0.32],
    [0.26, -0.16],
    [-0.06, 0.24],
    [0.3, 0.2],
  ].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + dx * w, headCY + dy * h, w * 0.065, w * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Chomp cycle: mouth opens and closes on a continuous time-based loop.
  const chomp = (Math.sin(performance.now() / 260) + 1) / 2;
  const openAmt = 0.45 + chomp * 0.55;
  const mouthTop = headCY + headRY * 0.1 - headRY * 0.55 * openAmt;
  const mouthBottom = headCY + headRY * 0.1 + headRY * 0.55 * openAmt;
  const mouthLeft = x + w / 2 - headRX * 0.72;
  const mouthRight = x + w / 2 + headRX * 0.72;

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, (mouthTop + mouthBottom) / 2, headRX * 0.72, (mouthBottom - mouthTop) / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a0a08';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, (mouthTop + mouthBottom) / 2, headRX * 0.48, (mouthBottom - mouthTop) * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Two zigzag rows of teeth along the top/bottom of the mouth opening.
  ctx.fillStyle = '#fff';
  const toothCount = 5;
  for (let i = 0; i < toothCount; i++) {
    const tx = mouthLeft + ((mouthRight - mouthLeft) * (i + 0.5)) / toothCount;
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.05, mouthTop);
    ctx.lineTo(tx + w * 0.05, mouthTop);
    ctx.lineTo(tx, mouthTop + h * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.05, mouthBottom);
    ctx.lineTo(tx + w * 0.05, mouthBottom);
    ctx.lineTo(tx, mouthBottom - h * 0.09);
    ctx.closePath();
    ctx.fill();
  }
}

// Bipedal turtle enemy — defeated by a head-stomp or a fireball, not the
// usual quiz gate. Faces the direction it's currently patrolling.
export function drawKoopa(ctx, enemy) {
  const { x, y, width: w, height: h } = enemy;
  const faceDir = (enemy.vx ?? 1) >= 0 ? 1 : -1;
  const headX = faceDir >= 0 ? x + w * 0.76 : x + w * 0.24;
  const snoutX = headX + faceDir * w * 0.16;
  const tailX = faceDir >= 0 ? x + w * 0.06 : x + w * 0.94;

  // legs
  ctx.fillStyle = '#f0d080';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.32, y + h * 0.88, w * 0.14, h * 0.13, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.68, y + h * 0.88, w * 0.14, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // tail
  ctx.fillStyle = '#f0d080';
  ctx.beginPath();
  ctx.moveTo(tailX, y + h * 0.6);
  ctx.lineTo(tailX - faceDir * w * 0.12, y + h * 0.68);
  ctx.lineTo(tailX, y + h * 0.74);
  ctx.closePath();
  ctx.fill();

  // belly
  ctx.fillStyle = '#fbe6a8';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.68, w * 0.34, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // domed, segmented shell
  ctx.fillStyle = '#3aa65a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.42, w * 0.46, h * 0.38, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#2f8a4a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.48, w * 0.46, h * 0.2, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#1e6b38';
  ctx.lineWidth = Math.max(1, w * 0.035);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + h * 0.46);
  ctx.lineTo(x + w * 0.82, y + h * 0.46);
  ctx.moveTo(x + w * 0.34, y + h * 0.2);
  ctx.lineTo(x + w * 0.34, y + h * 0.48);
  ctx.moveTo(x + w * 0.5, y + h * 0.14);
  ctx.lineTo(x + w * 0.5, y + h * 0.48);
  ctx.moveTo(x + w * 0.66, y + h * 0.2);
  ctx.lineTo(x + w * 0.66, y + h * 0.48);
  ctx.stroke();
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.48, w * 0.46, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // head + snout
  ctx.fillStyle = '#f0d080';
  ctx.beginPath();
  ctx.ellipse(headX, y + h * 0.36, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbe6a8';
  ctx.beginPath();
  ctx.ellipse(snoutX, y + h * 0.4, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(headX - faceDir * w * 0.02, y + h * 0.3, w * 0.035, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A thrown koopa shell — spins continuously via a time-based rotation angle.
export function drawShell(ctx, shell) {
  const { x, y, width: w, height: h } = shell;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const angle = (performance.now() / 80) % (Math.PI * 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e8449';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, 0);
  ctx.lineTo(w * 0.3, 0);
  ctx.moveTo(0, -h * 0.3);
  ctx.lineTo(0, h * 0.3);
  ctx.stroke();
  ctx.restore();
}

function rectPct(ctx, x, y, w, h, px, py, pw, ph, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + px * w, y + py * h, pw * w, ph * h);
}

// A V-neck notch cut into a torso block plus a small breast pocket — the
// shared visual shorthand for "this is a scrub top," reused (at slightly
// different placement) across all four heroes below so the base/small
// form always reads as medical scrubs, not a generic shirt.
function drawScrubDetails(ctx, x, y, w, h, skin, accent, cx, topY, size, bodyBottom) {
  // A deliberately larger V-neck than before — the earlier version read
  // as a small notch on a colored shirt rather than unmistakably a scrub
  // top, even at this sprite's small size.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(x + w * (cx - size * 1.3), y + h * topY);
  ctx.lineTo(x + w * cx, y + h * (topY + size * 1.9));
  ctx.lineTo(x + w * (cx + size * 1.3), y + h * topY);
  ctx.closePath();
  ctx.fill();
  // Breast pocket.
  rectPct(ctx, x, y, w, h, cx + size * 1.5, topY + size * 2.1, size * 1.1, size * 0.8, accent);
  // Waist drawstring tie — two short crossed strokes low on the torso
  // (positioned relative to the actual body block height, not a fixed
  // multiple of the V-neck size, so it lands on the waist rather than
  // drifting into the legs on shorter torsos), the classic scrub-pants
  // visual cue.
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.lineCap = 'round';
  const tieY = topY + (bodyBottom - topY) * 0.82;
  ctx.beginPath();
  ctx.moveTo(x + w * (cx - size * 0.6), y + h * (tieY - size * 0.5));
  ctx.lineTo(x + w * (cx + size * 0.6), y + h * (tieY + size * 0.5));
  ctx.moveTo(x + w * (cx + size * 0.6), y + h * (tieY - size * 0.5));
  ctx.lineTo(x + w * (cx - size * 0.6), y + h * (tieY + size * 0.5));
  ctx.stroke();
}

// A stethoscope draped around the neck — drawn on every hero's base
// scrubs form (not just the "big" white coat state, which no longer
// duplicates it) so "medical professional" reads from the very first
// frame of play, not just after a power-up.
function drawStethoscope(ctx, x, y, w, h, neckY) {
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.4, y + h * neckY);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * (neckY + 0.1), x + w * 0.58, y + h * neckY);
  ctx.stroke();
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * (neckY + 0.1), w * 0.035, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A small white patch with a red cross — the universal medic symbol —
// added to headwear that has room for it. drawBloom keeps her crown
// intact instead of a cross (it's her "Chief" identity marker) and relies
// on the stethoscope + scrubs alone to read as medical.
function drawCrossPatch(ctx, x, y, w, h, cx, cy, size) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + w * (cx - size), y + h * (cy - size), w * size * 2, h * size * 2);
  ctx.fillStyle = '#d3202f';
  ctx.fillRect(x + w * (cx - size * 0.35), y + h * (cy - size * 0.75), w * size * 0.7, h * size * 1.5);
  ctx.fillRect(x + w * (cx - size * 0.75), y + h * (cy - size * 0.35), w * size * 1.5, h * size * 0.7);
}

function drawPlumberBody(ctx, x, y, w, h, colors, facing) {
  rectPct(ctx, x, y, w, h, 0.08, 0.0, 0.84, 0.16, colors.brim);
  rectPct(ctx, x, y, w, h, 0.16, -0.03, 0.68, 0.16, colors.cap);
  drawCrossPatch(ctx, x, y, w, h, 0.5, 0.05, 0.07);
  rectPct(ctx, x, y, w, h, 0.18, 0.14, 0.64, 0.28, colors.skin);
  if (colors.mustache) {
    rectPct(ctx, x, y, w, h, 0.24, 0.34, 0.52, 0.07, colors.mustache);
  }
  rectPct(ctx, x, y, w, h, 0.14, 0.42, 0.72, 0.36, colors.body);
  rectPct(ctx, x, y, w, h, 0.14, 0.42, 0.72, 0.08, colors.bodyDark);
  drawScrubDetails(ctx, x, y, w, h, colors.skin, colors.bodyDark, 0.5, 0.42, 0.1, 0.78);
  drawStethoscope(ctx, x, y, w, h, 0.44);
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
  drawScrubDetails(ctx, x, y, w, h, colors.skin, colors.bodyDark, 0.5, 0.36, 0.09, 0.8);
  drawStethoscope(ctx, x, y, w, h, 0.38);
  rectPct(ctx, x, y, w, h, 0.2, 0.86, 0.2, 0.14, colors.shoe);
  rectPct(ctx, x, y, w, h, 0.6, 0.86, 0.2, 0.14, colors.shoe);
  const eyeX = facing >= 0 ? 0.56 : 0.28;
  rectPct(ctx, x, y, w, h, eyeX, 0.24, 0.1, 0.08, '#1a1a1a');
}

function drawRex(ctx, x, y, w, h, colors, facing) {
  rectPct(ctx, x, y, w, h, 0.14, 0.02, 0.72, 0.2, colors.hair);
  drawCrossPatch(ctx, x, y, w, h, 0.5, 0.11, 0.07);
  rectPct(ctx, x, y, w, h, 0.16, -0.1, 0.12, 0.16, colors.horn);
  rectPct(ctx, x, y, w, h, 0.72, -0.1, 0.12, 0.16, colors.horn);
  rectPct(ctx, x, y, w, h, 0.2, 0.18, 0.6, 0.24, colors.skin);
  rectPct(ctx, x, y, w, h, 0.1, 0.4, 0.8, 0.4, colors.body);
  rectPct(ctx, x, y, w, h, 0.1, 0.4, 0.8, 0.09, colors.bodyDark);
  drawScrubDetails(ctx, x, y, w, h, colors.skin, colors.bodyDark, 0.5, 0.4, 0.1, 0.8);
  drawStethoscope(ctx, x, y, w, h, 0.42);
  rectPct(ctx, x, y, w, h, 0.3, 0.52, 0.16, 0.16, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.54, 0.52, 0.16, 0.16, colors.bodyDark);
  rectPct(ctx, x, y, w, h, 0.16, 0.8, 0.28, 0.2, colors.shoe);
  rectPct(ctx, x, y, w, h, 0.56, 0.8, 0.28, 0.2, colors.shoe);
  const eyeX = facing >= 0 ? 0.58 : 0.24;
  rectPct(ctx, x, y, w, h, eyeX, 0.26, 0.1, 0.08, '#1a1a1a');
}

// A white coat worn open over scrubs — drawn as an overlay after the
// character's own body shape, using the same percentage-of-bounding-box
// system so it fits all four hero silhouettes without each needing its
// own big-form variant. This is what actually distinguishes the "big"
// (mushroom-equivalent) form from the base scrubs-only look, since scale
// alone read too subtly to tell apart at a glance during play. The
// stethoscope lives on the base body now (see drawStethoscope above), so
// it isn't redrawn here.
function drawWhiteCoat(ctx, x, y, w, h) {
  const coat = '#f7f7f4';
  const coatShadow = '#d9d9d3';
  const collar = '#ececE7';
  rectPct(ctx, x, y, w, h, 0.04, 0.38, 0.22, 0.44, coat);
  rectPct(ctx, x, y, w, h, 0.74, 0.38, 0.22, 0.44, coat);
  rectPct(ctx, x, y, w, h, 0.04, 0.74, 0.22, 0.08, coatShadow);
  rectPct(ctx, x, y, w, h, 0.74, 0.74, 0.22, 0.08, coatShadow);
  rectPct(ctx, x, y, w, h, 0.28, 0.36, 0.18, 0.1, collar);
  rectPct(ctx, x, y, w, h, 0.54, 0.36, 0.18, 0.1, collar);
  rectPct(ctx, x, y, w, h, 0.1, 0.5, 0.03, 0.03, '#8a8a80');
  rectPct(ctx, x, y, w, h, 0.1, 0.58, 0.03, 0.03, '#8a8a80');
  rectPct(ctx, x, y, w, h, 0.08, 0.44, 0.1, 0.07, '#2255cc');
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

  // Star power reads as an "immune boost" — a warm gold-white pulsing
  // aura and a gentle brightness lift, instead of the old rainbow
  // hue-cycle (which read as a generic arcade power-up, not medical).
  if (opts.invincible) {
    ctx.save();
    const t = performance.now() / 500;
    const pulse = (Math.sin(t) + 1) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const glow = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 1.15);
    glow.addColorStop(0, `rgba(255, 244, 200, ${0.35 + pulse * 0.25})`);
    glow.addColorStop(0.6, 'rgba(255, 220, 130, 0.25)');
    glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 1.15, h * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = `brightness(${1.08 + pulse * 0.1}) saturate(1.05)`;
  }

  if (character.id === 'doc' || character.id === 'vee') {
    drawPlumberBody(ctx, x, y, w, h, character.colors, facing);
  } else if (character.id === 'bloom') {
    drawBloom(ctx, x, y, w, h, character.colors, facing);
  } else if (character.id === 'rex') {
    drawRex(ctx, x, y, w, h, character.colors, facing);
  }

  if (opts.big) {
    drawWhiteCoat(ctx, x, y, w, h);
  }

  if (opts.invincible) {
    ctx.restore();
  }

  if (opts.flashing) {
    ctx.restore();
  }
}

// Slow enough that the popped sprite is clearly readable before it's gone
// — an earlier 450ms flashed past too fast to tell what it was.
export const POPPED_ITEM_MS = 1100;
export const POPPED_ITEM_SIZE = 30;

// Pop-and-land flourish for whatever a mystery box produced — rises out of
// the box for the first 35% of its life, then falls to settle just below
// it for the rest. The reward itself already applied the instant the box
// was bumped (see GameCanvas.jsx's triggerMysteryBox), so this is purely
// cosmetic. Coin rewards show their point value riding along with the
// coin; power-up rewards just show the item itself.
export function drawPoppedItem(ctx, item, now) {
  const t = Math.min(1, (now - item.createdAt) / POPPED_ITEM_MS);
  const riseT = Math.min(1, t / 0.35);
  const fallT = Math.max(0, (t - 0.35) / 0.65);
  const y = item.boxY - 28 * Math.sin(riseT * (Math.PI / 2)) + fallT * fallT * 68;
  const { x } = item;
  const size = POPPED_ITEM_SIZE;

  if (item.type === 'coin10' || item.type === 'coin50') {
    drawCoin(ctx, { x, y, width: size, height: size, collected: false });
    ctx.font = 'bold 14px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(item.label, x + size / 2 + 1, y - 5);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(item.label, x + size / 2, y - 6);
  } else {
    drawPowerUp(ctx, { x, y, width: size, height: size, type: item.type, collected: false });
  }
}

export const SCORE_POPUP_MS = 900;

// A "+15" / "-10" / "+50" callout that rises and fades at the spot a quiz
// was resolved — the immediate payoff cue for a coin/enemy/door answer.
export function drawScorePopup(ctx, popup, now) {
  const t = Math.min(1, (now - popup.createdAt) / SCORE_POPUP_MS);
  const riseY = popup.y - t * 46;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.font = 'bold 19px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillText(popup.text, popup.x + 1, riseY + 1);
  ctx.fillStyle = popup.color;
  ctx.fillText(popup.text, popup.x, riseY);
  ctx.restore();
}

// A small colored dot scatter for a kill/hit — game/juice.js owns the
// particle physics (position, velocity, lifetime), this just fades each
// one out over its remaining life.
export function drawParticles(ctx, particles, now, lifeMs) {
  ctx.save();
  for (const p of particles) {
    const t = Math.min(1, (now - p.createdAt) / lifeMs);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = p.color;
    const size = 5 * (1 - t * 0.6);
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }
  ctx.restore();
}

