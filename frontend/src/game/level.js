import { WIDTH_BY_DURATION } from './worlds';

const GROUND_Y = 460;

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function buildGroundSegments(rng, width, difficulty) {
  const minSeg = Math.max(260, 520 - difficulty * 30);
  const maxSeg = minSeg + 280;
  const minGap = 70 + difficulty * 8;
  const maxGap = Math.min(190, minGap + 60);
  const segments = [];
  let x = 0;
  while (x < width - 500) {
    const segLen = minSeg + rng() * (maxSeg - minSeg);
    const segEnd = Math.min(x + segLen, width - 420);
    segments.push([x, segEnd]);
    const gap = minGap + rng() * (maxGap - minGap);
    x = segEnd + gap;
  }
  segments.push([Math.min(x, width - 420), width]);
  return segments;
}

// Builds a full level for a world at a given teacher-set duration. Difficulty
// (gap size/frequency, enemy count/speed, platform count) scales with the
// world's index (1-7) so later worlds are visibly harder, and level size
// (width, coin count, enemy count) scales with duration so a 5-minute level
// is genuinely bigger, not just a longer clock.
export function buildLevel({ world, durationMinutes }) {
  const rng = hashSeed(`${world.id}-${durationMinutes}`);
  const difficulty = world.index;
  const width = WIDTH_BY_DURATION[durationMinutes] ?? WIDTH_BY_DURATION[3];

  const groundSegments = buildGroundSegments(rng, width, difficulty);
  const platforms = groundSegments.map(([x1, x2]) => ({
    x: x1,
    y: GROUND_Y,
    width: x2 - x1,
    height: 80,
  }));

  const platformCount = Math.round(width / 500 + difficulty * 1.2);
  for (let i = 0; i < platformCount; i++) {
    const px = 250 + rng() * (width - 600);
    const py = 220 + rng() * 170;
    const pw = 100 + rng() * 80;
    platforms.push({ x: px, y: py, width: pw, height: 24 });
  }

  const vocab = world.vocab;
  const coinCount = Math.max(8, Math.round(width / 320));
  const coins = [];
  for (let i = 0; i < coinCount; i++) {
    const cx = 120 + (i / coinCount) * (width - 300) + rng() * 60;
    const cy = 200 + rng() * 190;
    coins.push({
      id: `coin-${i}`,
      x: cx,
      y: cy,
      width: 20,
      height: 20,
      collected: false,
      pending: false,
      bounceUntil: 0,
      termId: vocab[i % vocab.length].id,
    });
  }

  const solidSegments = groundSegments.filter(([x1, x2]) => x2 - x1 > 160);
  const enemyCount = Math.max(2, Math.round(width / 700 + difficulty * 0.8));
  const baseSpeed = 1.8 + (difficulty - 1) * 0.3;
  const enemies = [];
  for (let i = 0; i < enemyCount; i++) {
    const [sx1, sx2] = solidSegments[i % solidSegments.length];
    const segWidth = sx2 - sx1;
    const patrolMargin = Math.min(60, segWidth * 0.2);
    const minX = sx1 + patrolMargin;
    const maxX = Math.max(minX + 80, sx2 - patrolMargin);
    const startX = minX + rng() * Math.max(1, maxX - minX - 34);
    enemies.push({
      id: `enemy-${i}`,
      x: startX,
      startX,
      minX,
      maxX,
      y: GROUND_Y - 34,
      width: 34,
      height: 34,
      vx: (rng() < 0.5 ? -1 : 1) * (baseSpeed + rng() * 0.6),
      alive: true,
      pending: false,
      termId: vocab[(i * 3 + 1) % vocab.length].id,
    });
  }

  const DOOR_HEIGHT = 320;
  const doorX = Math.min(width * 0.35, width - 600);
  const door = {
    x: doorX,
    y: GROUND_Y - DOOR_HEIGHT,
    width: 24,
    height: DOOR_HEIGHT,
    passed: false,
    pending: false,
    termId: vocab[Math.floor(vocab.length / 2)].id,
  };

  return {
    width,
    groundY: GROUND_Y,
    spawn: { x: 60, y: GROUND_Y - 200 },
    platforms,
    coins,
    enemies,
    door,
    flag: { x: width - 100, y: GROUND_Y - 200, width: 20, height: 200 },
  };
}
