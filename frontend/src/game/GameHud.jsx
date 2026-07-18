// The HTML HUD bar overlaying the canvas — hearts, world name, timer/coins/
// score, player ability status, music toggle, quit. Pure presentation over
// the throttled `hud` snapshot GameCanvas pushes each frame; no game state
// of its own.
export default function GameHud({ world, character, hud, timeClass, formatClock, musicOn, onToggleMusic, onQuit }) {
  return (
    <div className="hud-panel">
      <div className="hud-top">
        <div className="hud-hearts">
          {Array.from({ length: hud?.lives ?? 3 }).map((_, i) => (
            <span key={i}>♥</span>
          ))}
        </div>
        <div className="hud-title">
          <div className="hud-world-name">{world.name}</div>
          <div className="hud-world-sub">
            World {world.index}
            {world.subtitle ? `: ${world.subtitle}` : ''}
          </div>
        </div>
        <div className="hud-stats">
          <span className={timeClass}>⏱ {formatClock(hud?.timeRemaining ?? world.defaultDurationMinutes * 60)}</span>
          <span>
            COINS {hud?.coinsCollected ?? 0}/{hud?.totalCoins ?? 0}
          </span>
          <span>SCORE {String(hud?.score ?? 0).padStart(6, '0')}</span>
        </div>
      </div>
      <div className="hud-divider" />
      <div className="hud-bottom">
        <div className="hud-player">
          PLAYER: <strong>{character.name}</strong> · <span className="hud-ability">{character.abilityName}</span>
          {character.ability === 'coinCombo' && <span className="hud-status"> · Combo {hud?.comboCount ?? 0}/5</span>}
          {character.ability === 'groundPound' && hud?.pounding && <span className="hud-status warn"> · GROUND POUND!</span>}
          {character.ability === 'glide' && hud?.gliding && <span className="hud-status glide"> · Gliding...</span>}
          {hud?.starActive && <span className="hud-status warn"> · ⭐ STAR POWER!</span>}
          {hud?.mounted && <span className="hud-status"> · 🥚 Mounted</span>}
          {hud?.bossAlive && (
            <span className="hud-status warn">
              {' '}
              · Dragon HP {hud.bossHp}/{hud.bossMaxHp}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="hud-music" onClick={onToggleMusic}>
            {musicOn ? '♪ Music On' : '♪ Music Off'}
          </button>
          {onQuit && (
            <button type="button" className="hud-quit" onClick={onQuit}>
              ⇥ Quit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
