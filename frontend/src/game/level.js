import { WIDTH_BY_DURATION, DURATION_SECONDS } from './worlds';

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

// Keeps a coin from ending up embedded inside (or blocked from below by) a
// floating platform whose x-span it falls within — pushes it up clear of
// every conflicting platform in that column, checking again after each push
// in case that lands it inside a still-higher one (stacked climb steps).
// `cx`/`cy` are the coin's top-left corner, matching the {x, y, width: 24,
// height: 24} shape it's ultimately stored as.
function clearCoinOfPlatforms(cx, cy, blockPlatforms) {
  const COIN_SIZE = 24;
  let y = cy;
  for (let guard = 0; guard < 8; guard++) {
    let changed = false;
    for (const p of blockPlatforms) {
      if (cx + COIN_SIZE < p.x || cx > p.x + p.width) continue;
      if (y + COIN_SIZE > p.y - 8 && y < p.y + p.height + 8) {
        y = p.y - COIN_SIZE - 10;
        changed = true;
      }
    }
    if (!changed) break;
  }
  // Platforms themselves never generate above y≈140 (see the climb-chain
  // ceiling below), so a floor well under that is just a sanity backstop —
  // it must never be higher than what the clearing loop above already
  // computed, or it would clamp the coin straight back into a platform.
  return Math.max(40, y);
}

// Mystery boxes take the place of an occasional climbing step (see the
// tower-climb loop in buildLevel) — coin bonuses are the common case,
// power-ups less so, and the +50 "jackpot" coin is rarest.
const MYSTERY_BOX_CHANCE = 0.18;
const MAX_MYSTERY_BOXES = 5;
const MYSTERY_BOX_REWARDS = [
  { type: 'coin10', weight: 5 },
  { type: 'mushroom', weight: 2 },
  { type: 'egg', weight: 2 },
  { type: 'fireFlower', weight: 2 },
  { type: 'coin50', weight: 1 },
];
const MYSTERY_BOX_REWARD_TOTAL = MYSTERY_BOX_REWARDS.reduce((sum, r) => sum + r.weight, 0);

function pickMysteryBoxReward(rng) {
  let roll = rng() * MYSTERY_BOX_REWARD_TOTAL;
  for (const r of MYSTERY_BOX_REWARDS) {
    if (roll < r.weight) return r.type;
    roll -= r.weight;
  }
  return MYSTERY_BOX_REWARDS[0].type;
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
  // Seeded with a fresh random component on every call — layout (platforms,
  // enemies, power-ups, coins) is deliberately NOT the same level-to-level
  // so players can't just memorize a fixed path. hashSeed itself still gives
  // a stable, well-distributed PRNG from whatever string it's given; only
  // the string now changes every time.
  const rng = hashSeed(`${world.id}-${durationMinutes}-${Math.random()}`);
  // A teacher's own custom deck carries an explicit `difficulty` they picked
  // in the builder (see WorldBuilderForm.jsx). Built-ins and classroom-
  // joined worlds fall back to `index` (World 1-7's built-in scaling), and
  // classroom worlds joined by code have neither — mid-range is the sane
  // default rather than propagating undefined into NaN math.
  const difficulty = world.difficulty ?? world.index ?? 4;
  const vocab = world.vocab;

  // A level must be long enough to seed at least one coin per vocab term
  // (see coinCount below) — for a big list that means growing past the
  // teacher-set duration's normal width, with the timer budget growing to
  // match (~40px of level per second keeps the same pace as the built-in
  // duration presets: 4800/120, 7400/180, 12000/300 all land on ~40).
  const baseWidth = WIDTH_BY_DURATION[durationMinutes] ?? WIDTH_BY_DURATION[3];
  const COIN_SPACING_FOR_VOCAB = 260;
  const vocabDrivenWidth = 500 + vocab.length * COIN_SPACING_FOR_VOCAB;
  const width = Math.max(baseWidth, vocabDrivenWidth);
  const baseDurationSeconds = DURATION_SECONDS[durationMinutes] ?? DURATION_SECONDS[3];
  const durationSeconds = Math.max(baseDurationSeconds, Math.ceil(width / 40));

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
  const JUMP_RISE = 155; // conservative vertical reach per jump (base full jump is ~179px)
  const JUMP_DX_CLIMB = 170; // conservative horizontal reach while also climbing
  const platformCount = Math.round(width / 500 + difficulty * 1.2);
  const usableWidth = width - 600;
  const slotWidth = usableWidth / platformCount;
  const mysteryBoxes = [];
  for (let i = 0; i < platformCount; i++) {
    const slotStart = 250 + i * slotWidth;
    const slotEnd = slotStart + slotWidth - 20;
    // Multi-step "towers" (platforms stacked above platforms) are now the
    // common case rather than the exception, biased toward taller stacks,
    // so the level reads as real vertical climbing instead of one low
    // platform floating above the ground.
    const climbRoll = rng();
    const climbSteps = climbRoll < 0.3 ? 1 : climbRoll < 0.55 ? 2 : climbRoll < 0.85 ? 3 : 4;

    let cursorX = slotStart + 20 + rng() * Math.max(0, slotWidth * 0.15);
    // Base step: always a single safe jump from the ground. The floor here
    // (95, not just "low enough to jump to") is deliberate — it keeps the
    // gap between the ground and this platform's underside above
    // PLAYER_HEIGHT (54px) plus a margin, see MIN_CLEARANCE below.
    let cursorY = GROUND_Y - (95 + rng() * 70);

    for (let step = 0; step < climbSteps; step++) {
      const pw = 90 + rng() * 60;
      if (cursorX + pw > slotEnd) break;

      // A mystery box takes this step's spot instead of a plain platform —
      // centered in the same footprint pw reserved, so the cursor-advance
      // math right below stays keyed to pw regardless of which one got
      // placed, and reachability tuning is untouched either way.
      if (mysteryBoxes.length < MAX_MYSTERY_BOXES && rng() < MYSTERY_BOX_CHANCE) {
        const boxWidth = 40;
        const box = {
          id: `mysterybox-${mysteryBoxes.length}`,
          x: cursorX + (pw - boxWidth) / 2,
          y: cursorY,
          width: boxWidth,
          height: 24,
          type: 'mysteryBox',
          reward: pickMysteryBoxReward(rng),
          used: false,
          bumpUntil: 0,
        };
        platforms.push(box);
        mysteryBoxes.push(box);
      } else {
        platforms.push({ x: cursorX, y: cursorY, width: pw, height: 24, type: 'block' });
      }

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
      // MIN_CLEARANCE (95): a step-to-step decrement below this leaves less
      // than PLAYER_HEIGHT (54px) of headroom between the platform below
      // and the one above once the 24px platform thickness is subtracted —
      // literally too tight for the player's own hitbox to fit through,
      // which was trapping enemies/power-ups placed on the lower step.
      const MIN_CLEARANCE = 95;
      cursorY -= MIN_CLEARANCE + rng() * (JUMP_RISE - MIN_CLEARANCE);
      if (cursorY < 140) break;
    }
  }

  // Staircases: 2-3 ascending platforms a player can climb from lower to
  // higher ground, each step within jump range of the last, with a bonus
  // coin waiting at the top. Purely optional — the main path never requires
  // climbing one.
  const staircaseCount = 2 + Math.floor(difficulty / 3);
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

  // The tower loop and the staircase loop above each keep their own steps
  // spaced apart, but neither knows about the other (or about a neighboring
  // tower's slot) — two platforms from different generation branches can
  // still land with overlapping x-spans and end up coincidentally almost
  // touching in y. This global pass catches that: for any x-overlapping
  // pair, nudge the higher one further up until every pair clears
  // PLAYER_HEIGHT (54px) with margin. Bounded/iterative like
  // clearCoinOfPlatforms above, since closing one gap can open another
  // against a still-higher platform.
  const MIN_TOWER_CLEARANCE = 70;
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    const blocks = platforms.filter((p) => p.type === 'block' || p.type === 'mysteryBox');
    for (const upper of blocks) {
      for (const lower of blocks) {
        if (upper === lower || upper.y >= lower.y) continue;
        const xOverlap = upper.x < lower.x + lower.width && upper.x + upper.width > lower.x;
        if (!xOverlap) continue;
        const clearance = lower.y - (upper.y + upper.height);
        if (clearance < MIN_TOWER_CLEARANCE) {
          upper.y = Math.max(40, upper.y - (MIN_TOWER_CLEARANCE - clearance));
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Every floating "block" platform, any width — used to keep coins clear
  // of solid geometry below. `blockPlatforms` (width >= 90) is a narrower
  // subset used later for enemy-patrol eligibility and highest-platform
  // power-up placement; the odd narrower "bridge" platform is still solid
  // ground a coin can end up embedded in, so the coin check can't use that
  // same filtered list.
  // Mystery boxes count as "solid floating things a coin shouldn't overlap"
  // for clearCoinOfPlatforms below, same as any other block, even though
  // they're excluded from blockPlatforms (too narrow at 40px for the
  // width>=90 patrol/power-up eligibility filter that reads from it).
  const allBlockPlatforms = platforms.filter((p) => p.type === 'block' || p.type === 'mysteryBox');
  const blockPlatforms = allBlockPlatforms.filter((p) => p.width >= 90);

  // Coins are spaced out for runner-style pacing (not a quiz every second) —
  // enemies stay frequent since dodging/crushing them is the moment-to-moment
  // choice, while coins/checkpoints are the deliberate stops. Coin count is
  // also floored at vocab.length so a full pass through the level touches
  // every term at least once (GameCanvas assigns termId at runtime from a
  // shuffled no-repeat queue — see buildTermQueue in GameCanvas.jsx).
  const coinCount = Math.max(4, Math.round(width / 1000), vocab.length);
  const coinSpots = [];
  for (let i = 0; i < coinCount; i++) {
    const cx = 200 + (i / coinCount) * (width - 400) + rng() * 80;
    const cy = clearCoinOfPlatforms(cx, 200 + rng() * 190, allBlockPlatforms);
    coinSpots.push({ x: cx, y: cy });
  }
  coinSpots.push(...bonusCoinSpots.map((c) => ({ x: c.x, y: clearCoinOfPlatforms(c.x, c.y, allBlockPlatforms) })));

  const coins = coinSpots.map(({ x, y }, i) => ({
    id: `coin-${i}`,
    x,
    y,
    width: 24,
    height: 24,
    collected: false,
    pending: false,
    bounceUntil: 0,
    termId: null,
  }));

  const solidSegments = groundSegments.filter(([x1, x2]) => x2 - x1 > 160);
  const enemyCount = Math.max(2, Math.round(width / 700 + difficulty * 0.8));
  const baseSpeed = 1.8 + (difficulty - 1) * 0.3;
  // The player always spawns at x: 60 (see `spawn` below) — the first solid
  // ground segment starts at x: 0, so without this an enemy's patrol range
  // could begin just a few dozen pixels from spawn with no time to react.
  // 340px is roughly one second of run-speed room (5.6px/frame * 60fps).
  const SPAWN_SAFE_X = 340;
  const enemies = [];
  for (let i = 0; i < enemyCount; i++) {
    const [sx1, sx2] = solidSegments[i % solidSegments.length];
    const segWidth = sx2 - sx1;
    const patrolMargin = Math.min(60, segWidth * 0.2);
    const minX = sx1 + patrolMargin;
    const maxX = Math.max(minX + 80, sx2 - patrolMargin);
    // A segment whose whole viable range sits inside the safe zone (only
    // ever the very first segment, which starts at x: 0) gets skipped
    // rather than clamped in place — clamping minX up to SPAWN_SAFE_X while
    // leaving maxX derived from a short segment's own sx2 could push the
    // patrol past that segment's actual ground into open air.
    if (maxX <= SPAWN_SAFE_X) continue;
    const clampedMinX = Math.max(minX, SPAWN_SAFE_X);
    const startX = clampedMinX + rng() * Math.max(1, maxX - clampedMinX - 42);
    enemies.push({
      id: `enemy-${i}`,
      x: startX,
      startX,
      minX: clampedMinX,
      maxX,
      y: GROUND_Y - 42,
      width: 42,
      height: 42,
      vx: (rng() < 0.5 ? -1 : 1) * (baseSpeed + rng() * 0.6),
      alive: true,
      pending: false,
      termId: null,
    });
  }

  // Some floating platforms get a patrolling enemy too, not just the ground —
  // scales with difficulty so later worlds feel busier up top. Reuses the
  // exact same fixed-y patrol shape as ground enemies (no gravity/collision
  // needed for enemies at all); only the x-span source differs (the
  // platform's own width instead of a ground segment).
  // Only platforms with enough room for a real back-and-forth patrol get an
  // enemy (narrower ones gave 20-40px of range — too small to visibly read
  // as "moving" rather than a stationary wobble).
  const patrolBlockPlatforms = blockPlatforms.filter((p) => p.width >= 130);
  const platformSpawnChance = 0.35 + difficulty * 0.06;
  let platformEnemyIndex = 0;
  for (const platform of patrolBlockPlatforms) {
    if (rng() >= platformSpawnChance) continue;
    const patrolMargin = 10;
    const minX = platform.x + patrolMargin;
    const maxX = platform.x + platform.width - patrolMargin - 42;
    const startX = minX + rng() * Math.max(1, maxX - minX);
    enemies.push({
      id: `platform-enemy-${platformEnemyIndex}`,
      x: startX,
      startX,
      minX,
      maxX,
      y: platform.y - 42,
      width: 42,
      height: 42,
      vx: (rng() < 0.5 ? -1 : 1) * (baseSpeed * 1.15 + rng() * 0.6),
      alive: true,
      pending: false,
      termId: null,
    });
    platformEnemyIndex += 1;
  }

  const DOOR_HEIGHT = 320;
  const DOOR_WIDTH = 24;
  // Exact middle of the track — a real halfway checkpoint, not just some
  // fraction of the way in.
  const doorX = width / 2 - DOOR_WIDTH / 2;
  const door = {
    x: doorX,
    y: GROUND_Y - DOOR_HEIGHT,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    passed: false,
    pending: false,
    termId: null,
  };

  // Mushroom + egg sit directly above a solid ground segment at a low,
  // always-walkable height, so they never carry the reachability risk
  // floating platforms do. The y-range is bounded on both ends: never so
  // low it sinks into the ground, never so high a standing player's
  // bounding box (top at GROUND_Y - PLAYER_HEIGHT) fails to overlap its
  // bottom edge.
  const POWER_UP_SIZE = 28;
  const groundPowerUpTypes = ['mushroom', 'egg'];
  const groundPowerUpCount = Math.max(groundPowerUpTypes.length, Math.round(width / 3000));
  const powerUps = [];
  for (let i = 0; i < groundPowerUpCount; i++) {
    const [sx1, sx2] = solidSegments[(i + 1) % solidSegments.length];
    const margin = 80;
    const segSpan = Math.max(40, sx2 - sx1 - margin * 2);
    powerUps.push({
      id: `power-ground-${i}`,
      type: groundPowerUpTypes[i % groundPowerUpTypes.length],
      x: sx1 + margin + rng() * segSpan,
      y: GROUND_Y - (34 + rng() * 38),
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      collected: false,
    });
  }

  // Star and fire flower sit on the highest floating platforms instead —
  // grabbing the strongest power-ups takes real platforming skill rather
  // than just walking down the ground path.
  const platformPowerUpTypes = ['star', 'fireFlower'];
  const highestPlatforms = [...blockPlatforms].sort((a, b) => a.y - b.y);
  const platformPowerUpCount = Math.min(
    highestPlatforms.length,
    Math.max(platformPowerUpTypes.length, Math.round(width / 3500))
  );
  for (let i = 0; i < platformPowerUpCount; i++) {
    const platform = highestPlatforms[i];
    powerUps.push({
      id: `power-platform-${i}`,
      type: platformPowerUpTypes[i % platformPowerUpTypes.length],
      x: platform.x + platform.width / 2 - POWER_UP_SIZE / 2,
      y: platform.y - POWER_UP_SIZE - 6,
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      collected: false,
    });
  }

  // Every level ends in a boss blocking the way to the flag, tall enough
  // that no jump clears it (same trick as the checkpoint door). Used to be
  // World 7 only, but that index is meaningless for teacher-authored decks
  // (never 7), which made the game's biggest set-piece invisible to almost
  // every real play session.
  const flag = { x: width - 100, y: GROUND_Y - 200, width: 20, height: 200 };
  const BOSS_HEIGHT = 240;
  const boss = {
    x: flag.x - 260,
    y: GROUND_Y - BOSS_HEIGHT,
    width: 100,
    height: BOSS_HEIGHT,
    hp: 3,
    maxHp: 3,
    alive: true,
    pending: false,
  };

  // Piranha plant: a stationary hazard near the end of the level (before
  // the boss/flag, not blocking the path — it's a threat you have to
  // navigate around or burn a fireball on, not a gate). Only fire defeats
  // it; touching it costs a life automatically (see loseLife in
  // GameCanvas.jsx for how power-ups absorb that hit first).
  const PIRANHA_HEIGHT = 70;
  const piranhaX = Math.max(width * 0.6, boss ? boss.x - 220 : Math.min(width - 260, flag.x - 220));
  const piranha = {
    x: piranhaX,
    y: GROUND_Y - PIRANHA_HEIGHT,
    width: 44,
    height: PIRANHA_HEIGHT,
    alive: true,
  };

  // Koopa Troopa: patrols like a normal ground enemy but isn't quiz-gated —
  // it's a skill enemy, defeated only by stomping its head or a fireball,
  // and periodically lobs a shell at the player (GameCanvas owns the actual
  // throw timer since it needs a runtime clock, not level-gen-time data).
  const koopaCandidates = solidSegments.filter(([x1]) => x1 > width * 0.4 && x1 < piranhaX - 300);
  const koopaSegments = koopaCandidates.length ? koopaCandidates : solidSegments;
  const [ksx1, ksx2] = koopaSegments[Math.floor(koopaSegments.length / 2)];
  const koopaSegWidth = ksx2 - ksx1;
  const koopaMargin = Math.min(60, koopaSegWidth * 0.2);
  const koopaMinX = ksx1 + koopaMargin;
  const koopaMaxX = Math.max(koopaMinX + 80, ksx2 - koopaMargin);
  const koopaStartX = koopaMinX + rng() * Math.max(1, koopaMaxX - koopaMinX - 40);
  const koopa = {
    id: 'koopa-0',
    x: koopaStartX,
    startX: koopaStartX,
    minX: koopaMinX,
    maxX: koopaMaxX,
    y: GROUND_Y - 46,
    width: 40,
    height: 46,
    vx: (rng() < 0.5 ? -1 : 1) * (baseSpeed * 0.8 + 0.4),
    alive: true,
    nextThrowAt: 0,
  };

  return {
    width,
    durationSeconds,
    groundY: GROUND_Y,
    spawn: { x: 60, y: GROUND_Y - 200 },
    platforms,
    mysteryBoxes,
    coins,
    enemies,
    door,
    powerUps,
    boss,
    flag,
    piranha,
    koopa,
  };
}
