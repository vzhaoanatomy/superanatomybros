import { TILE } from './constants';

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

  const coins = [
    340, 640, 980, 1180, 1640, 1880, 2340, 2590, 2890, 3050,
  ].map((x, i) => ({
    id: `coin-${i}`,
    x,
    y: 300 - (i % 3) * 40,
    width: 20,
    height: 20,
    collected: false,
  }));

  const enemies = [
    { id: 'enemy-0', x: 900, minX: 850, maxX: 1350, y: GROUND_Y - 34, width: 34, height: 34, vx: -2.2, alive: true },
    { id: 'enemy-1', x: 1700, minX: 1550, maxX: 1950, y: GROUND_Y - 34, width: 34, height: 34, vx: 2.2, alive: true },
    { id: 'enemy-2', x: 2500, minX: 2160, maxX: 3150, y: GROUND_Y - 34, width: 34, height: 34, vx: -2.2, alive: true },
  ];

  const width = 3200;

  return {
    width,
    groundY: GROUND_Y,
    spawn: { x: 60, y: GROUND_Y - 200 },
    platforms,
    coins,
    enemies,
    flag: { x: width - 100, y: GROUND_Y - 200, width: 20, height: 200 },
  };
}
