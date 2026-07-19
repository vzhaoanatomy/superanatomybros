import { useState } from 'react';
import GameCanvas from './game/GameCanvas';
import CharacterSelect from './CharacterSelect';
import WorldSelect from './WorldSelect';
import TeacherMode from './teacher/TeacherMode';
import JoinClassroom from './classroom/JoinClassroom';
import SplashScreen from './SplashScreen';
import './App.css';

function App() {
  const [started, setStarted] = useState(false);
  const [worldId, setWorldId] = useState(null);
  const [characterId, setCharacterId] = useState(null);
  const [showTeacherMode, setShowTeacherMode] = useState(false);
  const [showJoinClassroom, setShowJoinClassroom] = useState(false);

  function quitToMenu() {
    setWorldId(null);
    setCharacterId(null);
  }

  let screen;
  if (!started) {
    screen = <SplashScreen onStart={() => setStarted(true)} />;
  } else if (showTeacherMode) {
    screen = <TeacherMode onExit={() => setShowTeacherMode(false)} />;
  } else if (showJoinClassroom) {
    screen = (
      <JoinClassroom onExit={() => setShowJoinClassroom(false)} onJoined={() => setShowJoinClassroom(false)} />
    );
  } else if (!worldId) {
    screen = (
      <WorldSelect
        onSelect={setWorldId}
        onOpenTeacherMode={() => setShowTeacherMode(true)}
        onOpenJoinClassroom={() => setShowJoinClassroom(true)}
      />
    );
  } else if (!characterId) {
    screen = <CharacterSelect onSelect={setCharacterId} />;
  } else {
    screen = <GameCanvas worldId={worldId} characterId={characterId} onQuit={quitToMenu} />;
  }

  return <div className="app-shell">{screen}</div>;
}

export default App;
