import { useEffect, useRef, useState } from 'react';
import { getAllWorlds } from './game/worlds';
import { CHARACTERS } from './game/characters';
import { drawBackground, drawPlayer } from './game/spriteRenderer';
import { toggleMusic, isMusicPlaying, toggleSfx, isSfxEnabled, setSfxEnabled } from './game/music';
import { loadSettings, saveSettings } from './storage';
import HowToPlay from './overlays/HowToPlay';
import LocalLeaderboard from './classroom/LocalLeaderboard';
import Settings from './Settings';

const ENEMY_LABELS = {
  goomba: 'Goomba-style blob',
  skinBlob: 'Skin-disease blob',
  skeleton: 'Skeleton',
  muscleBrawler: 'Muscle-brawler',
  neuron: 'Neuron',
  clot: 'Blood clot',
  labCat: 'Lab cat',
  dragonling: 'Dragonlings',
};

const PREVIEW_W = 190;
const PREVIEW_H = 96;

function WorldCard({ world, onSelect }) {
  const canvasRef = useRef(null);
  const heroId = CHARACTERS[(world.index - 1) % CHARACTERS.length].id;

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    drawBackground(ctx, PREVIEW_W, PREVIEW_H, world.palette);
    ctx.fillStyle = world.palette.ground;
    ctx.fillRect(0, PREVIEW_H - 20, PREVIEW_W, 20);
    drawPlayer(
      ctx,
      { x: PREVIEW_W / 2 - 15, y: PREVIEW_H - 20 - 46, width: 30, height: 46, facing: 1 },
      heroId,
      {}
    );
  }, [world.id, heroId]);

  return (
    <button
      type="button"
      onClick={() => onSelect(world.id)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        background: '#16213a',
        border: `3px solid ${world.palette.accent}`,
        borderRadius: 10,
        boxShadow: '0 4px 0 rgba(0,0,0,0.35)',
        color: '#fff',
        cursor: 'pointer',
        width: 190,
      }}
    >
      {world.custom && (
        <span style={{ position: 'absolute', top: -10, right: -6, fontSize: 20 }} title="Custom world">
          ⭐
        </span>
      )}
      <canvas
        ref={canvasRef}
        width={PREVIEW_W}
        height={PREVIEW_H}
        style={{ borderRadius: 6, imageRendering: 'pixelated', display: 'block' }}
      />
      <strong style={{ fontSize: 14 }}>
        World {world.index}: {world.name}
      </strong>
      <span style={{ fontSize: 12, color: world.palette.accent }}>{ENEMY_LABELS[world.enemyType] ?? world.enemyType}</span>
      {world.isClassroom && <span style={{ fontSize: 11, color: '#9fb0d0' }}>Code: {world.code}</span>}
    </button>
  );
}

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

export default function WorldSelect({ onSelect, onOpenTeacherMode, onOpenJoinClassroom }) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicOn, setMusicOn] = useState(isMusicPlaying());
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());
  const worlds = getAllWorlds();

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
      <p className="tagline-ribbon">
        Anatomy and Physiology Edition — Collect as many coins as you can. Highest score wins!
      </p>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start', maxWidth: 1100, margin: '24px auto 0', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 820 }}>
          {worlds.map((world) => (
            <WorldCard key={world.id} world={world} onSelect={onSelect} />
          ))}
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
            style={{ ...panelButtonStyle, background: '#7d3fd6', border: '2px solid #5a2ba0' }}
            onClick={onOpenTeacherMode}
          >
            🎓 Teacher Mode · Custom Vocab
          </button>
          <button
            type="button"
            style={{ ...panelButtonStyle, background: '#c9932a', border: '2px solid #8a651c', color: '#1a1200' }}
            onClick={onOpenJoinClassroom}
          >
            ⭐ Join Classroom · Enter Code
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
