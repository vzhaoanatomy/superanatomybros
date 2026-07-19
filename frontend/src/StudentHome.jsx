import { useEffect, useState } from 'react';
import { loadJoinedWorlds, loadSettings, saveSettings } from './storage';
import { toggleMusic, isMusicPlaying, toggleSfx, isSfxEnabled, setSfxEnabled } from './game/music';
import WorldCard from './game/WorldCard';
import JoinClassroom from './classroom/JoinClassroom';
import HowToPlay from './overlays/HowToPlay';
import LocalLeaderboard from './classroom/LocalLeaderboard';
import Settings from './Settings';

const sectionHeaderStyle = {
  width: '100%',
  fontSize: 13,
  fontWeight: 'bold',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#9fb0d0',
  textAlign: 'left',
  margin: '4px 0 2px',
};

const panelButtonStyle = {
  padding: '12px 16px',
  borderRadius: 8,
  border: '2px solid #1a2a4a',
  background: '#22304f',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: 14,
  width: '100%',
  textAlign: 'left',
};

// The student-only entry point (served at /play) — a code-entry screen plus
// whatever's already in this device's library (storage.loadJoinedWorlds()),
// never the teacher's full authoring menu. A world played once stays in the
// library and can be replayed any number of times; joining a second code
// (a new unit, a different class) just adds to it.
export default function StudentHome({ onSelectWorld }) {
  const [joined, setJoined] = useState(loadJoinedWorlds());
  const [showJoin, setShowJoin] = useState(joined.length === 0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicOn, setMusicOn] = useState(isMusicPlaying());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());

  useEffect(() => {
    const settings = loadSettings();
    setSfxOn(setSfxEnabled(settings.sfxOn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggleMusic() {
    const next = toggleMusic();
    setMusicOn(next);
    saveSettings({ musicOn: next, sfxOn });
  }

  function handleToggleSfx() {
    const next = toggleSfx();
    setSfxOn(next);
    saveSettings({ musicOn, sfxOn: next });
  }

  if (showJoin) {
    return (
      <JoinClassroom
        onExit={() => setShowJoin(false)}
        onJoined={() => {
          setJoined(loadJoinedWorlds());
          setShowJoin(false);
        }}
      />
    );
  }

  return (
    <div style={{ textAlign: 'center', color: '#1a2a4a', padding: 24 }}>
      <div className="title-banner">
        <h1>Super Anatomy Bros</h1>
      </div>
      <p className="tagline-ribbon">Enter your teacher's code to play. Highest score wins!</p>
      <div
        style={{
          display: 'flex',
          gap: 24,
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: 1100,
          margin: '24px auto 0',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 820 }}>
          <p style={sectionHeaderStyle}>📚 Your Classes</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            {joined.map((world) => (
              <WorldCard key={world.id} world={world} onSelect={onSelectWorld} />
            ))}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: 220,
            background: '#0e1526',
            border: '2px solid #22304f',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <button
            type="button"
            style={{ ...panelButtonStyle, background: '#c9932a', border: '2px solid #8a651c', color: '#1a1200' }}
            onClick={() => setShowJoin(true)}
          >
            ⭐ Join Another Class
          </button>
          <button
            type="button"
            style={{ ...panelButtonStyle, background: '#2ecc71', border: '2px solid #1e8449', color: '#0a1a0a' }}
            onClick={() => setShowLeaderboard(true)}
          >
            🏆 Local Leaderboard
          </button>
          <button type="button" style={panelButtonStyle} onClick={() => setShowHowToPlay(true)}>
            ❓ How to Play
          </button>
          <button type="button" style={panelButtonStyle} onClick={() => setShowSettings(true)}>
            ⚙️ Settings
          </button>
        </div>
      </div>
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
      {showLeaderboard && <LocalLeaderboard onClose={() => setShowLeaderboard(false)} />}
      {showSettings && (
        <Settings
          musicOn={musicOn}
          sfxOn={sfxOn}
          onToggleMusic={handleToggleMusic}
          onToggleSfx={handleToggleSfx}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
