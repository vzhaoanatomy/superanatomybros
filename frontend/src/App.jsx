import { useState } from 'react';
import GameCanvas from './game/GameCanvas';
import CharacterSelect from './CharacterSelect';
import WorldSelect from './WorldSelect';
import './App.css';

function App() {
  const [worldId, setWorldId] = useState(null);
  const [characterId, setCharacterId] = useState(null);

  function quitToMenu() {
    setWorldId(null);
    setCharacterId(null);
  }

  let screen;
  if (!worldId) {
    screen = <WorldSelect onSelect={setWorldId} />;
  } else if (!characterId) {
    screen = <CharacterSelect onSelect={setCharacterId} />;
  } else {
    screen = <GameCanvas worldId={worldId} characterId={characterId} onQuit={quitToMenu} />;
  }

  return <div className="app-shell">{screen}</div>;
}

export default App;
