export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const TILE = 40;

// Tuned physics — do not change without being asked (see CLAUDE.md rule 3).
export const RUN_SPEED = 5.6;
export const JUMP_VELOCITY = -15.2;
export const GRAVITY = 0.62;
export const JUMP_CUTOFF_VELOCITY = -4; // releasing jump early clamps vy to this if still rising faster
export const MAX_FALL_SPEED = 18;

export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 54;
