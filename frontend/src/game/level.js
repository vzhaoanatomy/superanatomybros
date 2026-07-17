import { TILE } from './constants';
import { WORLD1_VOCAB } from './vocab';

const GROUND_Y = 460;

// Ground is a list of solid segments [xStart, xEnd] at GROUND_Y — gaps between
// segments are pits. Platforms are floating rects players can stand on.
export function buildPlaceholderLevel() {
  const groundSegments = [
    [0, 700],
    [820, 1400],
    [1520, 2000],
    [2140, 3200],
  ];

  const platforms = groundSegments.map(([x1, x2]) => ({
    x: x1,
    y: GROUND_Y,
    width: x2 - x1,
    height: 80,
  }));

  platforms.push(
    { x: 300, y: 340, width: 160, height: TILE * 0.6 },
    { x: 600, y: 260, width: 120, height: TILE * 0.6 },
    { x: 950, y: 360, width: 140, height: TILE * 0.6 },
    { x: 1150, y: 260, width: 120, height: TILE * 0.6 },
    { x: 1600, y: 340, width: 160, height: TILE * 0.6 },
    { x: 1850, y: 240, width: 120, height: TILE * 0.6 },
    { x: 2300, y: 360, width: 140, height: TILE * 0.6 },
    { x: 2550, y: 260, width: 160, height: TILE * 0.6 },
    { x: 2850, y: 340, width: 140, height: TILE * 0.6 },
  );

  // Each coin floats ~24px above the platform (or ground) it sits near, so a
  // standing player's body genuinely overlaps it — flush with a platform's
  // surface means zero real AABB overlap for a standing player.
  const coins = [
    { x: 340, y: 316 },
    { x: 640, y: 236 },
    { x: 980, y: 336 },
    { x: 1180, y: 236 },
    { x: 1640, y: 316 },
    { x: 1880, y: 216 },
    { x: 2340, y: 336 },
    { x: 2590, y: 236 },
    { x: 2890, y: 316 },
    { x: 3050, y: 430 },
  ].map(({ x, y }, i) => ({
    id: `coin-${i}`,
    x,
    y,
    width: 20,
    height: 20,
    collected: false,
    termId: WORLD1_VOCAB[i % WORLD1_VOCAB.length].id,
    pending: false,
    bounceUntil: 0,
  }));

  const enemies = [
    { id: 'enemy-0', x: 900, minX: 850, maxX: 1350, y: GROUND_Y - 34, width: 34, height: 34, vx: -2.2, alive: true },
    { id: 'enemy-1', x: 1700, minX: 1550, maxX: 1950, y: GROUND_Y - 34, width: 34, height: 34, vx: 2.2, alive: true },
    { id: 'enemy-2', x: 2500, minX: 2160, maxX: 3150, y: GROUND_Y - 34, width: 34, height: 34, vx: -2.2, alive: true },
  ].map((enemy, i) => ({
    ...enemy,
    startX: enemy.x,
    termId: WORLD1_VOCAB[(i * 3 + 1) % WORLD1_VOCAB.length].id,
    pending: false,
  }));

  // Tall enough that no jump (including Vee's super jump) can clear it —
  // it's a real gate, not a hop-over obstacle. Height is removed from the
  // solid-collision list once passed.
  const DOOR_HEIGHT = 320;
  const door = {
    x: 1300,
    y: GROUND_Y - DOOR_HEIGHT,
    width: 24,
    height: DOOR_HEIGHT,
    passed: false,
    pending: false,
    termId: WORLD1_VOCAB[5].id,
  };

  const width = 3200;

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
