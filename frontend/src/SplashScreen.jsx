import { unlockAudio } from './game/music';

const startButtonStyle = {
  marginTop: 32,
  padding: '18px 44px',
  borderRadius: 10,
  border: '3px solid #1e8449',
  background: '#2ecc71',
  color: '#0a1a0a',
  fontWeight: 800,
  fontSize: 20,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 0 rgba(0,0,0,0.35)',
};

// The very first screen — its one job is to be a real user-gesture tap so
// unlockAudio() can resume the AudioContext before anything else tries to
// play a sound. Mobile Safari/Chrome silently drop audio that isn't kicked
// off inside a gesture handler like this one.
export default function SplashScreen({ onStart }) {
  function handleStart() {
    unlockAudio();
    onStart();
  }

  return (
    <div style={{ textAlign: 'center', padding: '100px 24px', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div className="title-banner">
        <h1>Super Anatomy Bros</h1>
      </div>
      <p className="tagline-ribbon">Anatomy and Physiology Edition</p>
      <div>
        <button type="button" onClick={handleStart} style={startButtonStyle}>
          ▶ Tap to Play
        </button>
      </div>
    </div>
  );
}
