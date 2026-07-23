import { useEffect, useState } from 'react';
import { getNickname, setNickname, loadJoinedWorlds, loadSettings, saveSettings } from './storage';
import { toggleMusic, isMusicPlaying, toggleSfx, isSfxEnabled, setSfxEnabled } from './game/music';
import WorldCard from './game/WorldCard';
import JoinClassroom from './classroom/JoinClassroom';
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
  margin: '4px 0 2px',
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

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 6,
  border: '2px solid #3a4a6c',
  background: '#0e1526',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
};

// One of a student's own joined decks, deterministically featured for the
// whole day — same pick for everyone on the same day (day-of-year modulo
// deck count), no randomness/storage needed. Only meaningful once a
// student has joined more than one class; with just one deck there's no
// real "which one today" choice to nudge them toward.
function pickCaseOfTheDay(joined) {
  if (joined.length < 2) return null;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return joined[dayOfYear % joined.length];
}

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
  const [showFieldNotes, setShowFieldNotes] = useState(false);
  const [musicOn, setMusicOn] = useState(isMusicPlaying());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());
  const [nickname, setNicknameState] = useState(getNickname());
  const caseOfTheDay = pickCaseOfTheDay(joined);

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

  function handleNicknameBlur() {
    setNicknameState(setNickname(nickname));
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
          maxWidth: 1200,
          margin: '24px auto 0',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 480px', minWidth: 320 }}>
          {caseOfTheDay && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
                background: 'linear-gradient(135deg, #3a2a0e, #1a1200)',
                border: '2px solid #c9932a',
                borderRadius: 10,
                padding: '12px 16px',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#ffd85a' }}>
                  🎯 Case of the Day
                </div>
                <div style={{ fontSize: 15, fontWeight: 'bold', color: '#fff' }}>{caseOfTheDay.name}</div>
                <div style={{ fontSize: 12.5, color: '#c9b98a' }}>{caseOfTheDay.subtitle}</div>
              </div>
              <button
                type="button"
                style={{ ...panelButtonStyle, width: 'auto', background: '#c9932a', border: '2px solid #8a651c', color: '#1a1200' }}
                onClick={() => onSelectWorld(caseOfTheDay.id)}
              >
                Play Now ▶
              </button>
            </div>
          )}
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
            style={{ ...panelButtonStyle, background: '#c9932a', border: '2px solid #8a651c', color: '#1a1200', fontSize: 17, padding: '18px 20px' }}
            onClick={() => setShowJoin(true)}
          >
            ⭐ Join Class with Code
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
          <div style={{ textAlign: 'left', marginTop: 8 }}>
            <label style={{ display: 'block', fontSize: 12, textTransform: 'uppercase', color: '#9fb0d0', marginBottom: 6 }}>
              Nickname (shown on classroom leaderboards)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNicknameState(e.target.value)}
              onBlur={handleNicknameBlur}
              maxLength={24}
              placeholder="Enter a nickname"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
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
