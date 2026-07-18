import { WIDTH_BY_DURATION } from './worlds';

export const GROUND_Y = 460;
export const GROUND_HEIGHT = 80;

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
    height: GROUND_HEIGHT,
    type: 'ground',
  }));

  // Platforms are placed into evenly-sized slots along the width, each with
  // bounded jitter — pure random placement let some end up nearly stacked
  // while others were far apart. Slots guarantee a minimum gap between
  // neighbors while still varying position/size within each slot.
  //
  // Every platform must be *scaffolded*: a full jump only reaches ~179px of
  // rise (215px for Vee's super jump), so any platform higher than a single
  // jump from the ground is built as a chain of steps, each within safe
  // jump range of the last, guaranteeing a real path up rather than an
  // isolated block nothing can reach.
  const JUMP_RISE = 140; // conservative vertical reach per jump (base full jump is ~179px)
  const JUMP_DX_CLIMB = 170; // conservative horizontal reach while also climbing
  const platformCount = Math.round(width / 500 + difficulty * 1.2);
  const usableWidth = width - 600;
  const slotWidth = usableWidth / platformCount;
  for (let i = 0; i < platformCount; i++) {
    const slotStart = 250 + i * slotWidth;
    const slotEnd = slotStart + slotWidth - 20;
    const climbSteps = rng() < 0.4 ? (rng() < 0.5 ? 2 : 3) : 1;

    let cursorX = slotStart + 20 + rng() * Math.max(0, slotWidth * 0.15);
    let cursorY = GROUND_Y - (60 + rng() * 75); // base step: always a single safe jump from the ground

    for (let step = 0; step < climbSteps; step++) {
      const pw = 90 + rng() * 60;
      if (cursorX + pw > slotEnd) break;
      platforms.push({ x: cursorX, y: cursorY, width: pw, height: 24, type: 'block' });

      // Occasionally add a same-height bridge platform beside this step —
      // an easy horizontal hop, not a climb, so no reachability risk.
      if (rng() < 0.3 && cursorX + pw + 60 <= slotEnd) {
        const bridgeX = cursorX + pw + 40 + rng() * 20;
        const bridgeW = 80 + rng() * 50;
        if (bridgeX + bridgeW <= slotEnd) {
          platforms.push({ x: bridgeX, y: cursorY, width: bridgeW, height: 24, type: 'block' });
          cursorX = bridgeX;
        }
      }

      cursorX += pw * 0.3 + 60 + rng() * (JUMP_DX_CLIMB - 60);
      cursorY -= 60 + rng() * (JUMP_RISE - 60);
      if (cursorY < 140) break;
    }
  }

  // Staircases: 2-3 ascending platforms a player can climb from lower to
  // higher ground, each step within jump range of the last, with a bonus
  // coin waiting at the top. Purely optional — the main path never requires
  // climbing one.
  const staircaseCount = 1 + Math.floor(difficulty / 3);
  const bonusCoinSpots = [];
  for (let s = 0; s < staircaseCount; s++) {
    const zoneWidth = width / (staircaseCount + 1);
    let stepX = zoneWidth * (s + 1) + rng() * 150 - 75;
    let stepY = GROUND_Y - 90;
    const stepCount = 3;
    for (let step = 0; step < stepCount; step++) {
      const stepWidth = 90;
      platforms.push({ x: stepX, y: stepY, width: stepWidth, height: 24, type: 'block' });
      if (step === stepCount - 1) {
        bonusCoinSpots.push({ x: stepX + stepWidth / 2 - 10, y: stepY - 40 });
      }
      stepX += stepWidth + 50 + rng() * 30;
      stepY -= 105 + rng() * 20;
    }
  }

  // Coins are spaced out for runner-style pacing (not a quiz every second) —
  // enemies stay frequent since dodging/crushing them is the moment-to-moment
  // choice, while coins/checkpoints are the deliberate stops.
  const vocab = world.vocab;
  const coinCount = Math.max(4, Math.round(width / 1000));
  const coinSpots = [];
  for (let i = 0; i < coinCount; i++) {
    const cx = 200 + (i / coinCount) * (width - 400) + rng() * 80;
    const cy = 200 + rng() * 190;
    coinSpots.push({ x: cx, y: cy });
  }
  coinSpots.push(...bonusCoinSpots);

  const coins = coinSpots.map(({ x, y }, i) => ({
    id: `coin-${i}`,
    x,
    y,
    width: 24,
    height: 24,
    collected: false,
    pending: false,
    bounceUntil: 0,
    termId: vocab[i % vocab.length].id,
  }));

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
    const startX = minX + rng() * Math.max(1, maxX - minX - 42);
    enemies.push({
      id: `enemy-${i}`,
      x: startX,
      startX,
      minX,
      maxX,
      y: GROUND_Y - 42,
      width: 42,
      height: 42,
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

  // Power-ups sit directly above a solid ground segment at a low, always-
  // walkable height, so they never carry the reachability risk floating
  // platforms do. The y-range is bounded on both ends: never so low it sinks
  // into the ground, never so high a standing player's bounding box (top at
  // GROUND_Y - PLAYER_HEIGHT) fails to overlap its bottom edge.
  const POWER_UP_SIZE = 28;
  const powerUpTypes = ['mushroom', 'star', 'egg'];
  const powerUpCount = Math.max(1, Math.round(width / 3500));
  const powerUps = [];
  for (let i = 0; i < powerUpCount; i++) {
    const [sx1, sx2] = solidSegments[(i + 1) % solidSegments.length];
    const margin = 80;
    const segSpan = Math.max(40, sx2 - sx1 - margin * 2);
    powerUps.push({
      id: `power-${i}`,
      type: powerUpTypes[i % powerUpTypes.length],
      x: sx1 + margin + rng() * segSpan,
      y: GROUND_Y - (34 + rng() * 38),
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      collected: false,
    });
  }

  // World 7 only: a final boss blocking the way to the flag, tall enough
  // that no jump clears it (same trick as the checkpoint door).
  const flag = { x: width - 100, y: GROUND_Y - 200, width: 20, height: 200 };
  const BOSS_HEIGHT = 240;
  const boss =
    world.index === 7
      ? {
          x: flag.x - 260,
          y: GROUND_Y - BOSS_HEIGHT,
          width: 100,
          height: BOSS_HEIGHT,
          hp: 3,
          maxHp: 3,
          alive: true,
          pending: false,
        }
      : null;

  return {
    width,
    groundY: GROUND_Y,
    spawn: { x: 60, y: GROUND_Y - 200 },
    platforms,
    coins,
    enemies,
    door,
    powerUps,
    boss,
    flag,
  };
}
