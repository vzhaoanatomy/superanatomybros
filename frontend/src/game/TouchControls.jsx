import { useEffect, useState } from 'react';
import { isTouchDevice } from './touch';

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
  fontSize: 'clamp(16px, 4.5vw, 22px)',
  fontWeight: 'bold',
  color: '#fff',
  background: 'rgba(255,255,255,0.16)',
  border: '2px solid rgba(255,255,255,0.4)',
  borderRadius: '50%',
  // 44px is the generally-recommended minimum touch target — the old 34px
  // floor was comfortably below that on the smallest phones.
  width: 'clamp(44px, 11vw, 58px)',
  height: 'clamp(44px, 11vw, 58px)',
  padding: 0,
  cursor: 'pointer',
};

// On-screen action buttons for touch devices. Presses/releases write the
// same key codes the keyboard handlers use directly into keysRef — the
// physics loop already reads that Set every frame, so there's no separate
// input path for it to know about.
//
// The mobile game auto-runs forward on its own (see the `autoRun` const in
// GameCanvas.jsx's updatePhysics) — a dedicated Right button would just
// duplicate what already happens by default, so only a Left ("back") button
// is offered, for backtracking a missed coin or lining up on a bonus pipe.
export default function TouchControls({ keysRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isTouchDevice());
  }, []);

  if (!visible) return null;

  // Without pointer capture, a thumb that drifts even a few px off a
  // button's circular hit area mid-press fires `pointerleave` and drops
  // the key immediately — reads as the game randomly letting go of a held
  // direction or cutting a jump short ("wonky"). Capturing the pointer on
  // press keeps every subsequent move/up event targeted at this button
  // regardless of where the finger wanders, so a held press stays held
  // until it's actually lifted.
  function press(code) {
    return {
      onPointerDown: (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        keysRef.current.add(code);
      },
      onPointerUp: (e) => {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        keysRef.current.delete(code);
      },
      onPointerCancel: () => keysRef.current.delete(code),
    };
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', gap: 10, pointerEvents: 'auto' }}>
        <button type="button" className="touch-btn" style={BTN_BASE} {...press('ArrowLeft')}>
          ◀
        </button>
      </div>
      <div style={{ position: 'absolute', right: 14, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 10, pointerEvents: 'auto' }}>
        <button type="button" className="touch-btn" style={{ ...BTN_BASE, background: 'rgba(255,130,70,0.35)' }} {...press('KeyF')}>
          🔥
        </button>
        <button type="button" className="touch-btn" style={{ ...BTN_BASE, background: 'rgba(120,180,255,0.35)' }} {...press('ArrowDown')}>
          ▼
        </button>
        <button
          type="button"
          className="touch-btn"
          style={{
            ...BTN_BASE,
            width: 'clamp(50px, 13vw, 70px)',
            height: 'clamp(50px, 13vw, 70px)',
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
