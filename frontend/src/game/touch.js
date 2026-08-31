// Shared by GameCanvas.jsx (viewport sizing, auto-run) and TouchControls.jsx
// (whether to render at all) — kept in one place so the two can never
// disagree about what counts as a touch device.
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
