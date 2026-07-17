import { useState } from 'react';
import GameCanvas from './game/GameCanvas';
import CharacterSelect from './CharacterSelect';
import './App.css';

function App() {
  const [characterId, setCharacterId] = useState(null);

  return (
    <div className="app-shell">
      {characterId ? (
        <GameCanvas characterId={characterId} onQuit={() => setCharacterId(null)} />
      ) : (
        <CharacterSelect onSelect={setCharacterId} />
      )}
    </div>
  );
}

export default App;
