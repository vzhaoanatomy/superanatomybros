import { useEffect, useState } from 'react';

// Sized with vw-relative clamps, not a fixed px, because these only ever
// render on touch devices (any screen size) — without this, two button
// groups both anchored 14px from their own edge can overlap in the middle
// once the game canvas gets narrower than roughly 320px (phone-width).
const BTN_BASE = {
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'clamp(15px, 4.5vw, 22px)',
  fontWeight: 'bold',
  color: '#fff',
  background: 'rgba(255,255,255,0.16)',
  border: '2px solid rgba(255,255,255,0.4)',
  borderRadius: '50%',
  width: 'clamp(34px, 11vw, 56px)',
  height: 'clamp(34px, 11vw, 56px)',
  padding: 0,
  cursor: 'pointer',
};

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// On-screen D-pad + action buttons for touch devices. Presses/releases write
// the same key codes the keyboard handlers use directly into keysRef — the
// physics loop already reads that Set every frame, so there's no separate
// input path for it to know about.
export default function TouchControls({ keysRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isTouchDevice());
  }, []);

  if (!visible) return null;

  function press(code) {
    return {
      onPointerDown: (e) => {
        e.preventDefault();
        keysRef.current.add(code);
      },
      onPointerUp: () => keysRef.current.delete(code),
      onPointerLeave: () => keysRef.current.delete(code),
      onPointerCancel: () => keysRef.current.delete(code),
    };
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', gap: 10, pointerEvents: 'auto' }}>
        <button type="button" style={BTN_BASE} {...press('ArrowLeft')}>
          ◀
        </button>
        <button type="button" style={BTN_BASE} {...press('ArrowRight')}>
          ▶
        </button>
      </div>
      <div style={{ position: 'absolute', right: 14, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 10, pointerEvents: 'auto' }}>
        <button type="button" style={{ ...BTN_BASE, background: 'rgba(255,130,70,0.35)' }} {...press('KeyF')}>
          🔥
        </button>
        <button type="button" style={{ ...BTN_BASE, background: 'rgba(120,180,255,0.35)' }} {...press('ArrowDown')}>
          ▼
        </button>
        <button
          type="button"
          style={{
            ...BTN_BASE,
            width: 'clamp(42px, 13vw, 68px)',
            height: 'clamp(42px, 13vw, 68px)',
            background: 'rgba(120,255,150,0.35)',
          }}
          {...press('Space')}
        >
          ⬆
        </button>
      </div>
    </div>
  );
}
