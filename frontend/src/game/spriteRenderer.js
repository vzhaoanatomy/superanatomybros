import { getCharacter } from './characters';

// All pixel-art / canvas drawing lives here (CLAUDE.md rule 2). GameCanvas.jsx
// only calls into this module — it never issues its own fill/stroke calls.

const CLOUDS = [
  { x: 0.06, y: 0.14, s: 1 },
  { x: 0.24, y: 0.22, s: 0.7 },
  { x: 0.42, y: 0.1, s: 0.85 },
  { x: 0.62, y: 0.2, s: 0.6 },
  { x: 0.82, y: 0.12, s: 1.1 },
  { x: 0.95, y: 0.24, s: 0.7 },
];

function drawCloud(ctx, cx, cy, scale) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 34 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - 24 * scale, cy + 5 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 24 * scale, cy + 5 * scale, 20 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBackground(ctx, width, height, palette) {
  ctx.fillStyle = palette?.sky ?? '#5fa8e8';
  ctx.fillRect(0, 0, width, height);

  for (const c of CLOUDS) {
    drawCloud(ctx, c.x * width, c.y * height, c.s);
  }

  ctx.fillStyle = palette?.hills ?? '#3aa65a';
  const hillCount = 4;
  const hillWidth = width / hillCount;
  for (let i = 0; i < hillCount; i++) {
    const cx = hillWidth * (i + 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, height * 0.85, hillWidth * 0.62, 95, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlatform(ctx, platform, palette) {
  ctx.fillStyle = palette?.ground ?? '#4a3323';
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(platform.x, platform.y, platform.width, 4);
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

export function drawDoor(ctx, door) {
  if (door.passed) return;
  ctx.fillStyle = '#5b3fa0';
  ctx.fillRect(door.x, door.y, door.width, door.height);
  ctx.fillStyle = '#8e6bff';
  ctx.fillRect(door.x + 4, door.y + 4, door.width - 8, door.height - 8);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(door.x + door.width / 2, door.y + door.height / 2, 4, 0, Math.PI * 2);
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

// World 7 enemy: a small dragonling.
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

const ENEMY_RENDERERS = {
  goomba: drawGoomba,
  skinBlob: drawSkinBlob,
  skeleton: drawSkeleton,
  muscleBrawler: drawMuscleBrawler,
  neuron: drawNeuron,
  labCat: drawLabCat,
  dragonling: drawDragonling,
};

export function drawEnemy(ctx, enemy, enemyType) {
  (ENEMY_RENDERERS[enemyType] ?? drawGoomba)(ctx, enemy);
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
  const { x, y, width: w, height: h, facing } = player;

  if (opts.flashing) {
    ctx.save();
    ctx.globalAlpha = 0.55;
  }

  if (character.id === 'doc' || character.id === 'vee') {
    drawPlumberBody(ctx, x, y, w, h, character.colors, facing);
  } else if (character.id === 'bloom') {
    drawBloom(ctx, x, y, w, h, character.colors, facing);
  } else if (character.id === 'rex') {
    drawRex(ctx, x, y, w, h, character.colors, facing);
  }

  if (opts.invincible) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }

  if (opts.flashing) {
    ctx.restore();
  }
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function drawHUD(ctx, { state, level, character, world, canvasWidth, canvasHeight }) {
  ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
  ctx.fillRect(0, 0, canvasWidth, 138);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`Score: ${state.score}`, 16, 30);
  ctx.fillText(`Lives: ${state.lives}`, 16, 56);
  ctx.fillText(`Coins: ${state.coinsCollected}/${level.coins.length}`, 16, 82);

  const fraction = state.timeRemaining / state.durationSeconds;
  let timeColor = '#2ecc71';
  if (fraction < 0.2) {
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
    timeColor = `rgba(231, 76, 60, ${pulse.toFixed(2)})`;
  } else if (fraction < 0.5) {
    timeColor = '#f1c40f';
  }
  ctx.fillStyle = timeColor;
  ctx.fillText(`Time: ${formatClock(state.timeRemaining)}`, 200, 30);

  ctx.fillStyle = '#aab4cc';
  ctx.font = '14px monospace';
  ctx.fillText(world.name, 200, 52);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${character.name} — ${character.abilityName}`, 16, 106);
  if (character.ability === 'coinCombo') {
    ctx.fillText(`Combo: ${state.coinsCollected % 5}/5`, 16, 124);
  } else if (character.ability === 'groundPound' && state.pounding) {
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('GROUND POUND!', 16, 124);
  } else if (character.ability === 'glide' && state.gliding) {
    ctx.fillStyle = '#89e0ff';
    ctx.fillText('Gliding...', 16, 124);
  }

  ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
  ctx.fillRect(0, canvasHeight - 34, canvasWidth, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.fillText('Arrows/WASD to move, Space/Up to jump, Down for ability', 16, canvasHeight - 16);

  if (state.levelComplete) {
    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, canvasWidth / 2, canvasHeight / 2);
    ctx.textAlign = 'left';
  }
}
