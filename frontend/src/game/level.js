import { WIDTH_BY_DURATION, DURATION_SECONDS } from './worlds';

export const GROUND_Y = 460;
export const GROUND_HEIGHT = 80;
// Wide plank/staircase platform thickness — thicker than the old 24px so
// they read as substantial brick slabs (see the reference screenshot),
// still well clear of MIN_CLEARANCE (110, sized for the tallest thing a
// step can become) so step-to-step headroom is untouched.
const PLATFORM_HEIGHT = 32;

// Real pathogen names for the floating labels drawn above each virus/
// bacteria enemy (see drawPathogenLabel in spriteRenderer.js) — ambient
// vocabulary exposure beyond whatever's in the deck itself. Genus
// abbreviated after the first letter, the standard scientific-writing
// convention, both for authenticity and to keep the label short at this
// sprite scale. BOSS_NAMES are real multi-drug-resistant organisms,
// fitting the boss's "superbug" design.
const BACTERIA_NAMES = [
  'E. coli',
  'S. aureus',
  'C. difficile',
  'S. pneumoniae',
  'S. pyogenes',
  'M. tuberculosis',
  'H. pylori',
  'N. meningitidis',
  'Salmonella',
  'L. pneumophila',
];
const VIRUS_NAMES = [
  'Influenza',
  'Rhinovirus',
  'Hepatitis A',
  'Hepatitis B',
  'Norovirus',
  'Adenovirus',
  'Herpes simplex',
  'Varicella-zoster',
  'Rotavirus',
  'HPV',
];
const BOSS_NAMES = ['MRSA', 'VRE', 'CRE'];
const PATHOGEN_VARIANT_COUNT = 4;

// Rolls a consistent {type, name, variant} triple for one virus/bacteria
// enemy — shared by every spawn site below (ground, platform, flyer) so
// the "pick a type, then a name from the matching pool, then a shape
// variant" logic lives in exactly one place.
function rollPathogen(rng) {
  const type = rng() < 0.5 ? 'virus' : 'bacteria';
  const pool = type === 'virus' ? VIRUS_NAMES : BACTERIA_NAMES;
  const name = pool[Math.floor(rng() * pool.length)];
  const variant = Math.floor(rng() * PATHOGEN_VARIANT_COUNT);
  return { type, name, variant };
}

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
const MYSTERY_BOX_CHANCE = 0.65;
// High enough that a long, high-difficulty level (many towers x up to 4
// climb steps each) never runs out and silently falls back to plain planks
// partway through — mystery rows should stay dense start to finish.
const MAX_MYSTERY_BOXES = 80;
const MYSTERY_BOX_REWARDS = [
  { type: 'coin10', weight: 5 },
  { type: 'mushroom', weight: 2 },
  { type: 'egg', weight: 2 },
  { type: 'fireFlower', weight: 2 },
  { type: 'star', weight: 2 },
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

// Classic Mario block size — a tower step that rolls into a mystery box
// becomes a row of these touching square tiles (1-3 wide) instead of one
// box centered on a wide plank, matching the reference row-of-blocks look.
const TILE = 40;

function makeMysteryBox(rng, mysteryBoxes, x, y) {
  const box = {
    id: `mysterybox-${mysteryBoxes.length}`,
    x,
    y,
    width: TILE,
    height: TILE,
    type: 'mysteryBox',
    reward: pickMysteryBoxReward(rng),
    used: false,
    bumpUntil: 0,
  };
  mysteryBoxes.push(box);
  return box;
}

// One tile in a mystery-box row: `forceBox` guarantees at least one "?" per
// row (so a single-tile row is always a box, and multi-tile rows always
// have one) while the rest independently roll box-vs-plain, producing rows
// that mix "?" boxes with plain tiles rather than a uniform block of boxes.
function makeRowTile(rng, mysteryBoxes, x, y, forceBox) {
  const wantsBox = forceBox || rng() < 0.5;
  if (wantsBox && mysteryBoxes.length < MAX_MYSTERY_BOXES) {
    return makeMysteryBox(rng, mysteryBoxes, x, y);
  }
  return { x, y, width: TILE, height: TILE, type: 'tile' };
}

// Lays down a row of 1-3 touching square tiles centered within a step's
// [x, x + footprintWidth] span, guaranteeing at least one becomes a mystery
// box. Used in place of a single wide plank whenever a tower step "rolls
// into" a mystery box (see the tower-climb loop in buildLevel).
function makeMysteryRow(rng, mysteryBoxes, x, y, footprintWidth, platforms) {
  const maxTiles = Math.max(1, Math.min(3, Math.floor(footprintWidth / TILE)));
  const roll = rng();
  const tileCount = roll < 0.55 ? 1 : roll < 0.85 ? Math.min(2, maxTiles) : maxTiles;
  const rowX = x + Math.max(0, (footprintWidth - tileCount * TILE) / 2);
  const boxSlot = Math.floor(rng() * tileCount);
  for (let t = 0; t < tileCount; t++) {
    platforms.push(makeRowTile(rng, mysteryBoxes, rowX + t * TILE, y, t === boxSlot));
  }
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

// Guarantees solid ground spans [x1, x2] — used to pin the checkpoint door
// (and its respawn point) to real ground regardless of where the gap
// generator above happened to put a pit. Without this, the door's fixed
// width/2 position could land squarely over a gap purely by chance, and
// dying anywhere after it would respawn the player into that same pit
// (loseLife/lastCheckpoint in GameCanvas.jsx just drop the player at the
// door's x — there's no ground check on the respawn side, so the ground
// itself has to be the guarantee). Merges any segment already touching the
// target range rather than blindly inserting, so it doesn't create a
// separate sliver right next to real ground.
function ensureSolidGround(segments, x1, x2) {
  let start = x1;
  let end = x2;
  const kept = [];
  for (const [s1, s2] of segments) {
    if (s2 >= start && s1 <= end) {
      start = Math.min(start, s1);
      end = Math.max(end, s2);
    } else {
      kept.push([s1, s2]);
    }
  }
  kept.push([start, end]);
  kept.sort((a, b) => a[0] - b[0]);
  return kept;
}

// Builds a full level for a world at a given teacher-set duration. Difficulty
// (gap size/frequency, enemy count/speed, platform count) scales with the
// world's index (1-7) so later worlds are visibly harder, and level size
// (width, coin count, enemy count) scales with duration so a 5-minute level
// is genuinely bigger, not just a longer clock.
export function buildLevel({ world, durationMinutes, seed }) {
  // Defaults to a fresh random component on every call — layout (platforms,
  // enemies, power-ups, coins) is deliberately NOT the same level-to-level
  // so players can't just memorize a fixed path, and every level entry (or
  // restart) starts completely fresh. hashSeed itself still gives a stable,
  // well-distributed PRNG from whatever string it's given; only the string
  // normally changes every time. An explicit `seed` can still be passed to
  // reproduce a specific layout deterministically (e.g. tests).
  const rng = hashSeed(seed ?? `${world.id}-${durationMinutes}-${Math.random()}`);
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

  // Computed early (pure function of `width`, no rng) so the checkpoint's
  // ground can be patched solid before any platform/hazard placement below
  // reads groundSegments — see ensureSolidGround above.
  const DOOR_WIDTH = 24;
  const doorX = width / 2 - DOOR_WIDTH / 2;
  const CHECKPOINT_GROUND_MARGIN = 150;
  const groundSegments = ensureSolidGround(
    buildGroundSegments(rng, width, difficulty),
    doorX - CHECKPOINT_GROUND_MARGIN,
    doorX + DOOR_WIDTH + CHECKPOINT_GROUND_MARGIN
  );
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
    // Only the tower's base step (below) is ever reached by jumping from
    // the ground — every step after that is jumped to from the previous
    // step instead, already covered by the jump-chain math. So only the
    // base needs solid ground under it: find where this slot actually
    // overlaps groundSegments (computed above, before this loop) and skip
    // the whole tower if the slot sits entirely over a gap.
    const slotSolidRanges = groundSegments
      .map(([gx1, gx2]) => [Math.max(gx1, slotStart), Math.min(gx2, slotEnd)])
      .filter(([lo, hi]) => hi - lo > 40);
    if (!slotSolidRanges.length) continue;

    const climbRoll = rng();
    const climbSteps = climbRoll < 0.3 ? 1 : climbRoll < 0.55 ? 2 : climbRoll < 0.85 ? 3 : 4;

    const [baseLo, baseHi] = slotSolidRanges[Math.floor(rng() * slotSolidRanges.length)];
    // Pick the base step's width *before* its x — a step that rolls into a
    // mystery-box row (see makeMysteryRow) centers 1-3 square tiles within
    // this footprint, which can shift them right of cursorX. Validating
    // only cursorX against solid ground let tiles land past the edge of
    // solid ground into a gap; sizing the footprint to fit inside
    // [baseLo, baseHi] up front guarantees the whole step — row or plank —
    // stays over solid ground.
    const baseWidth = Math.min(90 + rng() * 60, Math.max(40, baseHi - baseLo));
    let cursorX = baseLo + rng() * Math.max(0, (baseHi - baseLo) - baseWidth);
    // Base step: always a single safe jump from the ground. The floor here
    // (110, not just "low enough to jump to") is deliberate — a mystery-box
    // row tile is 40px thick (see TILE above), so it keeps the gap between
    // the ground and this step's underside above PLAYER_HEIGHT (54px) plus
    // a margin, see MIN_CLEARANCE below.
    let cursorY = GROUND_Y - (110 + rng() * 70);

    for (let step = 0; step < climbSteps; step++) {
      const pw = step === 0 ? baseWidth : 90 + rng() * 60;
      if (cursorX + pw > slotEnd) break;

      if (mysteryBoxes.length < MAX_MYSTERY_BOXES && rng() < MYSTERY_BOX_CHANCE) {
        makeMysteryRow(rng, mysteryBoxes, cursorX, cursorY, pw, platforms);
      } else {
        platforms.push({ x: cursorX, y: cursorY, width: pw, height: PLATFORM_HEIGHT, type: 'block' });
      }

      // Advance past this step's own footprint first (full pw, not a
      // fraction of it) so the next step's left edge always lands a real
      // gap clear of this one's right edge. The old `pw * 0.3` under-counted
      // wide steps (up to 150px) badly enough that the next step could
      // start before this one even ended — an outright x-overlap that
      // physically blocked jumping past the lower step to reach the one
      // beside it. MIN_STEP_GAP (50) comfortably clears PLAYER_WIDTH (40)
      // so the hero can actually fit through/land in the gap; the random
      // range on top stays inside JUMP_DX_CLIMB's conservative reach.
      const MIN_STEP_GAP = 50;
      cursorX += pw + MIN_STEP_GAP + rng() * (JUMP_DX_CLIMB - MIN_STEP_GAP);
      // MIN_CLEARANCE (110): a step-to-step decrement below this leaves
      // less than PLAYER_HEIGHT (54px) of headroom between the platform
      // below and the one above once a 40px-thick mystery-box row tile
      // (the tallest thing a step can become) is subtracted — literally
      // too tight for the player's own hitbox to fit through, which was
      // trapping enemies/power-ups placed on the lower step.
      const MIN_CLEARANCE = 110;
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
      platforms.push({ x: stepX, y: stepY, width: stepWidth, height: PLATFORM_HEIGHT, type: 'block' });
      if (step === stepCount - 1) {
        bonusCoinSpots.push({ x: stepX + stepWidth / 2 - 10, y: stepY - 40 });
      }
      stepX += stepWidth + 50 + rng() * 30;
      stepY -= 105 + rng() * 20;
    }
  }

  // Crumbling platforms: a single-jump-height detour that gives way a beat
  // after the player lands on it (see GameCanvas.jsx's crumble-trigger
  // check). Always floats over solid ground it can safely dump the player
  // back onto — reusing the same slot/groundSegments-overlap technique as
  // the tower base above — so a mistimed crossing costs nothing worse than
  // a missed coin, never a softlock.
  const CRUMBLE_COUNT = 1 + Math.floor(difficulty / 3);
  const crumbleCoinSpots = [];
  for (let c = 0; c < CRUMBLE_COUNT; c++) {
    const zoneWidth = width / (CRUMBLE_COUNT + 1);
    const zoneCenter = zoneWidth * (c + 1) + rng() * 160 - 80;
    const crumbleWidth = 70;
    const solidRanges = groundSegments
      .map(([gx1, gx2]) => [Math.max(gx1, zoneCenter - 200), Math.min(gx2, zoneCenter + 200)])
      .filter(([lo, hi]) => hi - lo > crumbleWidth + 20);
    if (!solidRanges.length) continue;
    const [lo, hi] = solidRanges[Math.floor(rng() * solidRanges.length)];
    const crumbleX = lo + rng() * Math.max(0, hi - lo - crumbleWidth);
    const crumbleY = GROUND_Y - (120 + rng() * 40);
    platforms.push({
      x: crumbleX,
      y: crumbleY,
      width: crumbleWidth,
      height: PLATFORM_HEIGHT,
      type: 'crumble',
      triggered: false,
      triggerAt: null,
      gone: false,
    });
    crumbleCoinSpots.push({ x: crumbleX + crumbleWidth / 2 - 10, y: crumbleY - 40 });
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
    const blocks = platforms.filter((p) => p.type === 'block' || p.type === 'mysteryBox' || p.type === 'tile' || p.type === 'crumble');
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
  const allBlockPlatforms = platforms.filter((p) => p.type === 'block' || p.type === 'mysteryBox' || p.type === 'tile' || p.type === 'crumble');
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
  coinSpots.push(...crumbleCoinSpots.map((c) => ({ x: c.x, y: clearCoinOfPlatforms(c.x, c.y, allBlockPlatforms) })));

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
  // Slower than the original 1.8 base — enemies now carry a hovering name
  // label (see drawPathogenLabel in spriteRenderer.js) that needs to
  // actually be readable while patrolling, not just glimpsed.
  const baseSpeed = 1.0 + (difficulty - 1) * 0.16;
  // The player always spawns at x: 60 (see `spawn` below) — the first solid
  // ground segment starts at x: 0, so without this an enemy's patrol range
  // could begin just a few dozen pixels from spawn with no time to react.
  // 340px is roughly one second of run-speed room (5.6px/frame * 60fps).
  const SPAWN_SAFE_X = 340;
  // Every ground/platform enemy is a pathogen now — virus or bacteria,
  // each with several distinct shape/color variants (see drawVirus/
  // drawBacteria in spriteRenderer.js) — rather than each world's own
  // themed creature, which all read as interchangeable "goomba-style
  // blobs" regardless of nominal type.
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
      vx: (rng() < 0.5 ? -1 : 1) * (baseSpeed + rng() * 0.35),
      alive: true,
      pending: false,
      termId: null,
      ...rollPathogen(rng),
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
      vx: (rng() < 0.5 ? -1 : 1) * (baseSpeed * 1.1 + rng() * 0.35),
      alive: true,
      pending: false,
      termId: null,
      ...rollPathogen(rng),
    });
    platformEnemyIndex += 1;
  }

  // Flyers (King Boo): hover free of any platform, patrolling horizontally
  // while bobbing on a sine wave (see GameCanvas.jsx's flyer update loop) —
  // the only enemy reachable purely from a well-timed jump rather than a
  // walk-up, and deliberately NOT quiz-gated (see resolveFlyerTouch in
  // GameCanvas.jsx) — no termId/pending needed since it never opens a
  // quiz. Spread across evenly-sized zones like the tower slots above so
  // they don't cluster.
  const FLYER_COUNT = Math.max(1, Math.round(1 + difficulty * 0.4));
  const flyers = [];
  for (let i = 0; i < FLYER_COUNT; i++) {
    const zoneWidth = width / (FLYER_COUNT + 1);
    const zoneCenter = zoneWidth * (i + 1) + rng() * 200 - 100;
    const rangeW = 160 + rng() * 100;
    const minX = Math.max(300, zoneCenter - rangeW / 2);
    const maxX = Math.min(width - 300, zoneCenter + rangeW / 2);
    if (maxX - minX < 80) continue;
    const flyerWidth = 38;
    const flyerHeight = 30;
    flyers.push({
      id: `flyer-${i}`,
      x: minX + rng() * Math.max(1, maxX - minX - flyerWidth),
      baseY: 160 + rng() * 140,
      y: 0,
      minX,
      maxX,
      width: flyerWidth,
      height: flyerHeight,
      vx: (rng() < 0.5 ? -1 : 1) * (0.9 + rng() * 0.5),
      bobAmplitude: 18 + rng() * 14,
      bobSpeed: 0.0016 + rng() * 0.0012,
      bobPhase: rng() * Math.PI * 2,
      alive: true,
      variant: Math.floor(rng() * PATHOGEN_VARIANT_COUNT),
      name: VIRUS_NAMES[Math.floor(rng() * VIRUS_NAMES.length)],
    });
  }

  // DOOR_WIDTH/doorX are computed earlier now (see groundSegments above) so
  // the checkpoint's ground can be patched solid before other placement
  // reads it — DOOR_HEIGHT has no such dependency, so it stays here.
  const DOOR_HEIGHT = 320;
  const door = {
    x: doorX,
    y: GROUND_Y - DOOR_HEIGHT,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    passed: false,
    pending: false,
    termId: null,
  };

  // A functional warp pipe — stand on top and press Down to answer a couple
  // of questions for a bonus coin room (see GameCanvas.jsx's
  // findPipeUnderPlayer/openPipeQuestion). Placed on a wide-enough stretch
  // of solid ground, clear of spawn, the checkpoint door, and the end-of-
  // level boss/piranha cluster so it never reads as blocking the main path.
  const PIPE_WIDTH = 52;
  const PIPE_HEIGHT = 74;
  const pipeCandidates = groundSegments.filter(([gx1, gx2]) => {
    if (gx2 - gx1 < 260) return false;
    if (gx1 < 700 || gx2 > width * 0.8) return false;
    if (gx1 < doorX + 260 && gx2 > doorX - 260) return false;
    return true;
  });
  const bonusPipes = [];
  // Two pipes per level (when the layout has room for them) — each tagged
  // with a different roomVariant so GameCanvas.jsx's enterBonusRoom builds
  // a distinct bonus room per pipe rather than the same one twice.
  const pipeCount = Math.min(pipeCandidates.length, 2);
  for (let i = 0; i < pipeCount; i++) {
    const segIndex = Math.min(
      Math.floor(((i + 0.5) / pipeCount) * pipeCandidates.length),
      pipeCandidates.length - 1
    );
    const [gx1, gx2] = pipeCandidates[segIndex];
    const pipe = {
      id: `pipe-${i}`,
      x: gx1 + (gx2 - gx1) / 2 - PIPE_WIDTH / 2,
      y: GROUND_Y - PIPE_HEIGHT,
      width: PIPE_WIDTH,
      height: PIPE_HEIGHT,
      type: 'pipe',
      used: false,
      pending: false,
      roomVariant: i,
    };
    platforms.push(pipe);
    bonusPipes.push(pipe);
  }

  // Power-ups no longer sit out in the open — they only ever come from
  // bumping a mystery box (see the tower-climb loop above and
  // triggerMysteryBox in GameCanvas.jsx), same as classic Mario. This array
  // stays for GameCanvas.jsx/spriteRenderer.js's existing touch-collection
  // and draw code to iterate — it's just never populated here anymore.
  const powerUps = [];

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
    name: BOSS_NAMES[Math.floor(rng() * BOSS_NAMES.length)],
  };

  // Spikes: stationary ground hazards earlier in the level (the piranha
  // plant already owns the end-game slot) — no HP, can't be defeated,
  // jump over them or eat them. Placed on wide-enough solid stretches clear
  // of spawn and the checkpoint door so they never read as an unfair
  // ambush. Two patches (one per level half) instead of one — a single
  // hazard sitting somewhere across a level thousands of pixels wide was
  // easy to walk an entire playthrough without ever crossing.
  const SPIKE_HEIGHT = 26;
  const SPIKE_WIDTH = 56;
  const spikeCandidates = solidSegments.filter(
    ([sx1, sx2]) => sx2 - sx1 > 220 && sx1 > 500 && (sx1 < doorX - 200 || sx1 > doorX + 200)
  );
  const spikes = [];
  const usedSpikeSegments = new Set();
  const SPIKE_PATCH_COUNT = 2;
  for (let i = 0; i < SPIKE_PATCH_COUNT; i++) {
    // Alternate halves so two patches don't both land close together.
    const remaining = spikeCandidates.filter((seg) => !usedSpikeSegments.has(seg));
    const half = remaining.filter(([sx1]) => (i === 0 ? sx1 < width * 0.55 : sx1 >= width * 0.3));
    const pool = half.length ? half : remaining;
    if (!pool.length) break;
    const picked = pool[Math.floor(rng() * pool.length)];
    usedSpikeSegments.add(picked);
    const [spx1, spx2] = picked;
    const spikeX = Math.max(spx1 + 20, Math.min(spx2 - SPIKE_WIDTH - 20, spx1 + (spx2 - spx1) / 2 - SPIKE_WIDTH / 2));
    spikes.push({ x: spikeX, y: GROUND_Y - SPIKE_HEIGHT, width: SPIKE_WIDTH, height: SPIKE_HEIGHT });
  }

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
    bonusPipes,
    powerUps,
    boss,
    flag,
    piranha,
    koopa,
    spikes,
    flyers,
  };
}

// A small enclosed "coin heaven" room a bonus pipe drops the player into
// (see GameCanvas.jsx's beginPipeEntry/enterBonusRoom) — a wide flat floor
// (an easy baseline tier of coins anyone can walk up) topped with a much
// harder vertical/horizontal gauntlet of narrow platforms and mid-air-only
// coins, sized against the same jump physics the main level's tower-climb
// uses (~150px rise / ~180px reach per jump is about the practical limit —
// see JUMP_RISE/JUMP_DX_CLIMB in buildLevel above) so clearing it takes a
// real, precise jump every time. Two distinct hand-built layouts (see
// ROOM_VARIANTS) so the level's two pipes don't feel like the same room.
export const BONUS_ROOM_WIDTH = 1100;
export const BONUS_ROOM_GROUND_Y = 380;
const BONUS_CEILING_Y = 0;
const BONUS_CEILING_HEIGHT = 20;

function makeCoinFactory() {
  let coinId = 0;
  return (coins, x, y) => coins.push({ id: `bonus-coin-${coinId++}`, x, y, width: 24, height: 24, collected: false });
}

function addFloorCoins(coins, addCoin, width, groundY) {
  for (let x = 30; x <= width - 50; x += 60) addCoin(coins, x, groundY - 40);
}

// "Sky Steps" — a narrow ascending staircase (each step just wide enough
// to land on) climbing up and to the right, a coin waiting on every step,
// then a 3-coin jackpot on the last and highest one. A separate pair of
// coins floats between two platforms further along with nothing under
// them at all — has to be grabbed mid-jump, not landed on.
function buildSkyStepsRoom(fact) {
  const width = BONUS_ROOM_WIDTH;
  const groundY = BONUS_ROOM_GROUND_Y;
  const platforms = [
    { x: 0, y: groundY, width, height: GROUND_HEIGHT, type: 'ground' },
    { x: 0, y: BONUS_CEILING_Y, width, height: BONUS_CEILING_HEIGHT, type: 'block' },
  ];
  const coins = [];
  const addCoin = makeCoinFactory();
  addFloorCoins(coins, addCoin, width, groundY);

  const stepW = 68;
  let stepX = 170;
  let stepY = groundY - 105;
  for (let i = 0; i < 4; i++) {
    platforms.push({ x: stepX, y: stepY, width: stepW, height: 20, type: 'block' });
    addCoin(coins, stepX + stepW / 2 - 12, stepY - 34);
    stepX += 155;
    stepY -= 68;
  }
  // Jackpot cluster on the final (highest, hardest-to-reach) step.
  addCoin(coins, stepX - 155 + stepW / 2 - 30, stepY + 68 - 60);
  addCoin(coins, stepX - 155 + stepW / 2, stepY + 68 - 60);
  addCoin(coins, stepX - 155 + stepW / 2 + 30, stepY + 68 - 60);

  // Two mid-height "catch" platforms with a pair of coins floating in the
  // open gap between them — no platform underneath, so grabbing them means
  // jumping through at the top of the arc, not landing.
  const midY = groundY - 130;
  platforms.push({ x: 700, y: midY, width: 90, height: 20, type: 'block' });
  platforms.push({ x: 940, y: midY, width: 90, height: 20, type: 'block' });
  addCoin(coins, 820, midY - 60);
  addCoin(coins, 860, midY - 60);

  // A rare "lore card" collectible sitting right on the jackpot step — the
  // hardest spot in the room to reach, so finding one feels like a real
  // discovery. Only placed when the world actually has a fact to show (see
  // buildBonusRoom below); custom/teacher worlds without funFacts just get
  // an empty array here, same room otherwise.
  const loreCards = fact
    ? [{ id: 'lore-0', x: stepX - 155 + stepW / 2 - 12, y: stepY + 8 - 46, width: 24, height: 24, collected: false, fact }]
    : [];

  return { width, groundY, platforms, coins, loreCards };
}

// "Zigzag Gauntlet" — a chain of small platforms alternating high/low
// across the full width, each a near-max horizontal jump from the last,
// with coins floating in the gaps between them that can only be grabbed
// mid-air. Ends on an isolated island reachable only by the single longest
// jump in the room, holding the jackpot.
function buildZigzagRoom(fact) {
  const width = BONUS_ROOM_WIDTH;
  const groundY = BONUS_ROOM_GROUND_Y;
  const platforms = [
    { x: 0, y: groundY, width, height: GROUND_HEIGHT, type: 'ground' },
    { x: 0, y: BONUS_CEILING_Y, width, height: BONUS_CEILING_HEIGHT, type: 'block' },
  ];
  const coins = [];
  const addCoin = makeCoinFactory();
  addFloorCoins(coins, addCoin, width, groundY);

  const zigW = 80;
  const highY = groundY - 175;
  const lowY = groundY - 90;
  let zigX = 150;
  for (let i = 0; i < 5; i++) {
    const y = i % 2 === 0 ? lowY : highY;
    platforms.push({ x: zigX, y, width: zigW, height: 20, type: 'block' });
    addCoin(coins, zigX + zigW / 2 - 12, y - 34);
    if (i > 0) {
      // Floats in the open gap this step just jumped across.
      const prevX = zigX - 175;
      addCoin(coins, (prevX + zigX) / 2 + 10, (y + (i % 2 === 0 ? highY : lowY)) / 2 - 20);
    }
    zigX += 175;
  }

  // The island: one last, longest jump (~180px) to a small platform with
  // the jackpot cluster.
  const islandX = zigX + 10;
  const islandY = groundY - 140;
  platforms.push({ x: islandX, y: islandY, width: 100, height: 20, type: 'block' });
  addCoin(coins, islandX + 20, islandY - 34);
  addCoin(coins, islandX + 50, islandY - 34);
  addCoin(coins, islandX + 80, islandY - 34);

  // The lore card rides along on the same hardest-to-reach island as the
  // zigzag room's jackpot (see buildSkyStepsRoom above for why).
  const loreCards = fact
    ? [{ id: 'lore-0', x: islandX + 50 - 12, y: islandY - 68, width: 24, height: 24, collected: false, fact }]
    : [];

  return { width, groundY, platforms, coins, loreCards };
}

const ROOM_VARIANTS = [buildSkyStepsRoom, buildZigzagRoom];

// `variant` picks which hand-built layout to use — GameCanvas passes a
// different one per pipe (see level.js's bonusPipes below) so a level's
// two pipes never lead to the same room. `fact` is an optional string —
// built-in worlds pass one of their hand-written funFacts (see worlds.js),
// custom/teacher decks pass a term+definition pulled from their own vocab
// instead (see enterBonusRoom in GameCanvas.jsx) — either way, when a fact
// is present the room hides exactly one lore-card collectible showing it,
// at its single hardest-to-reach spot.
export function buildBonusRoom(variant = 0, fact = null) {
  const build = ROOM_VARIANTS[variant % ROOM_VARIANTS.length];
  return build(fact);
}
