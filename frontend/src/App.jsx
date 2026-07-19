import { useState } from 'react';
import GameCanvas from './game/GameCanvas';
import CharacterSelect from './CharacterSelect';
import WorldSelect from './WorldSelect';
import StudentHome from './StudentHome';
import TeacherMode from './teacher/TeacherMode';
import JoinClassroom from './classroom/JoinClassroom';
import SplashScreen from './SplashScreen';
import './App.css';

// Two separate addresses, no router library needed: the default address is
// the teacher's full authoring menu (unchanged), `/play` is a student-only
// entry point (code entry + their own joined-worlds library, nothing else).
// Vite's dev server already falls back to index.html for unmatched paths;
// see frontend/vercel.json for the equivalent on a static cloud deploy.
const isStudentMode = typeof window !== 'undefined' && window.location.pathname.startsWith('/play');

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
  } else if (worldId && characterId) {
    // Shared terminal states — identical for the teacher and student paths.
    screen = <GameCanvas worldId={worldId} characterId={characterId} onQuit={quitToMenu} />;
  } else if (worldId) {
    screen = <CharacterSelect onSelect={setCharacterId} />;
  } else if (isStudentMode) {
    screen = <StudentHome onSelectWorld={setWorldId} />;
  } else if (showTeacherMode) {
    screen = <TeacherMode onExit={() => setShowTeacherMode(false)} />;
  } else if (showJoinClassroom) {
    screen = (
      <JoinClassroom onExit={() => setShowJoinClassroom(false)} onJoined={() => setShowJoinClassroom(false)} />
    );
  } else {
    screen = (
      <WorldSelect
        onSelect={setWorldId}
        onOpenTeacherMode={() => setShowTeacherMode(true)}
        onOpenJoinClassroom={() => setShowJoinClassroom(true)}
      />
    );
  }

  return <div className="app-shell">{screen}</div>;
}

export default App;
