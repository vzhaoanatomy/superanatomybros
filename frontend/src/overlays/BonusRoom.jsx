import { useEffect, useMemo, useState } from 'react';
import { backdrop, card } from './overlayStyles';

const COIN_COUNT = 18;
const TALLY_MS = 1400;

const buttonStyle = {
  padding: '12px 16px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#22304f',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 15,
  fontFamily: 'inherit',
};

// A shower of falling coin emoji behind the card — pure CSS animation, no
// canvas/render-loop needed, same technique as LevelComplete's Fireworks.
function CoinShower() {
  const coins = useMemo(
    () =>
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        delay: Math.random() * 1.4,
        duration: 1.5 + Math.random() * 0.9,
      })),
    []
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes coin-fall {
          0% { transform: translateY(-30px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(360px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {coins.map((c) => (
        <span
          key={c.id}
          style={{
            position: 'absolute',
            left: `${c.left}%`,
            top: 0,
            fontSize: 22,
            animation: `coin-fall ${c.duration}s ease-in ${c.delay}s infinite`,
          }}
        >
          🪙
        </span>
      ))}
    </div>
  );
}

// The reward already landed in state.score the instant this opened (see
// openBonusRoom in GameCanvas.jsx) — the count-up here is purely a
// celebratory readout of that already-final number, not a live meter.
export default function BonusRoom({ coins, onContinue }) {
  const [tally, setTally] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf;
    function tick(now) {
      const t = Math.min(1, (now - start) / TALLY_MS);
      setTally(Math.round(t * coins));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [coins]);

  return (
    <div style={backdrop}>
      <CoinShower />
      <div style={{ ...card, position: 'relative' }}>
        <h2 style={{ color: '#ffd23f', margin: '0 0 8px' }}>🪙 Bonus Room!</h2>
        <p style={{ fontSize: 14, color: '#9fb0d0', margin: '0 0 16px' }}>
          Nice work — the pipe led to a coin cache.
        </p>
        <p style={{ fontSize: 32, fontWeight: 'bold', color: '#ffd23f', margin: '0 0 20px' }}>+{tally}</p>
        <button type="button" onClick={onContinue} style={buttonStyle}>
          Continue
        </button>
      </div>
    </div>
  );
}
