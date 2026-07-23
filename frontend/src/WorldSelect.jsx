import { useEffect, useState } from 'react';
import { getGroupedWorlds } from './game/worlds';
import WorldCard from './game/WorldCard';
import { toggleMusic, isMusicPlaying, toggleSfx, isSfxEnabled, setSfxEnabled } from './game/music';
import { loadSettings, saveSettings } from './storage';
import HowToPlay from './overlays/HowToPlay';
import LocalLeaderboard from './classroom/LocalLeaderboard';
import FieldNotes from './overlays/FieldNotes';

const sectionHeaderStyle = {
  width: '100%',
  fontSize: 13,
  fontWeight: 'bold',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#9fb0d0',
  textAlign: 'left',
  margin: '4px 0 0',
};

const sectionSubtextStyle = {
  width: '100%',
  fontSize: 12.5,
  color: '#6d7ea3',
  textAlign: 'left',
  margin: '2px 0 8px',
};

const myDecksWrapStyle = {
  width: '100%',
  border: '2px solid #3a2f5c',
  background: 'rgba(125, 63, 214, 0.08)',
  borderRadius: 12,
  padding: '14px 14px 4px',
  marginBottom: 4,
};

const panelButtonStyle = {
  padding: '14px 18px',
  borderRadius: 8,
  border: '2px solid #1a2a4a',
  background: '#22304f',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: 15,
  width: '100%',
  textAlign: 'left',
};

const pillButtonStyle = {
  flex: 1,
  padding: '12px 10px',
  borderRadius: 8,
  border: '2px solid #1a2a4a',
  background: '#0e1526',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: 13,
  textAlign: 'center',
};

export default function WorldSelect({ onSelect, onOpenTeacherMode }) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFieldNotes, setShowFieldNotes] = useState(false);
  const [musicOn, setMusicOn] = useState(isMusicPlaying());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());
  const { myDecks, templates } = getGroupedWorlds();

  useEffect(() => {
    // SFX preference restores safely on load (it's just a boolean gate, no
    // audio call involved). Music intentionally does NOT auto-resume here —
    // browsers block AudioContext playback without a user gesture, so
    // forcing it on at mount would silently fail and leave the toggle
    // reading "On" while nothing plays. Starting music stays a real click.
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

  return (
    <div style={{ textAlign: 'center', color: '#1a2a4a', padding: 24 }}>
      <div className="title-banner">
        <h1>Super Anatomy Bros</h1>
      </div>
      <p className="tagline-ribbon">Anatomy and Physiology Edition — customize a deck or jump into one below.</p>
      <div
        style={{
          display: 'flex',
          gap: 24,
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: 1200,
          margin: '24px auto 0',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 480px', minWidth: 320 }}>
          {myDecks.length > 0 && (
            <div style={myDecksWrapStyle}>
              <p style={sectionHeaderStyle}>⭐ My Decks</p>
              <p style={sectionSubtextStyle}>Decks you've customized — jump back in.</p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-start', flexWrap: 'wrap', paddingBottom: 14 }}>
                {myDecks.map((world) => (
                  <WorldCard key={world.id} world={world} onSelect={onSelect} />
                ))}
              </div>
            </div>
          )}
          <p style={sectionHeaderStyle}>Templates</p>
          <p style={sectionSubtextStyle}>Starting points — pick one to customize.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            {templates.map((world) => (
              <WorldCard key={world.id} world={world} onSelect={onSelect} />
            ))}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flex: '1 1 380px',
            minWidth: 300,
            maxWidth: 460,
            background: '#0e1526',
            border: '2px solid #22304f',
            borderRadius: 10,
            padding: 20,
          }}
        >
          <button
            type="button"
            style={{ ...panelButtonStyle, background: '#7d3fd6', border: '2px solid #5a2ba0', fontSize: 17, padding: '18px 20px' }}
            onClick={onOpenTeacherMode}
          >
            🎓 Teacher Mode · Custom Vocab
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
          <button
            type="button"
            style={{ ...panelButtonStyle, background: '#3a2f5c', border: '2px solid #5a2ba0' }}
            onClick={() => setShowFieldNotes(true)}
          >
            📓 Field Notes
          </button>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" style={pillButtonStyle} onClick={handleToggleSfx}>
              {sfxOn ? '🔊 SFX: On' : '🔇 SFX: Off'}
            </button>
            <button type="button" style={pillButtonStyle} onClick={handleToggleMusic}>
              {musicOn ? '♪ Music: On' : '♪ Music: Off'}
            </button>
          </div>
        </div>
      </div>
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
      {showLeaderboard && <LocalLeaderboard onClose={() => setShowLeaderboard(false)} />}
      {showFieldNotes && <FieldNotes onClose={() => setShowFieldNotes(false)} />}
    </div>
  );
}
