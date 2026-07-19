import { useEffect, useState } from 'react';
import GameCanvas from './game/GameCanvas';
import CharacterSelect from './CharacterSelect';
import WorldSelect from './WorldSelect';
import StudentHome from './StudentHome';
import TeacherMode from './teacher/TeacherMode';
import { unlockAudio } from './game/music';
import './App.css';

// Two separate addresses, no router library needed: the default address is
// the teacher's full authoring menu (unchanged), `/play` is a student-only
// entry point (code entry + their own joined-worlds library, nothing else).
// Vite's dev server already falls back to index.html for unmatched paths;
// see frontend/vercel.json for the equivalent on a static cloud deploy.
const isStudentMode = typeof window !== 'undefined' && window.location.pathname.startsWith('/play');

function App() {
  const [worldId, setWorldId] = useState(null);
  const [characterId, setCharacterId] = useState(null);
  const [showTeacherMode, setShowTeacherMode] = useState(false);

  // There's no splash-tap gesture anymore to hang unlockAudio() off of — the
  // landing page IS the deck grid now. This listens for the very first
  // tap/click anywhere in the app instead, still synchronously inside that
  // trusted event, which is all mobile browsers require to allow audio.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  function quitToMenu() {
    setWorldId(null);
    setCharacterId(null);
  }

  let screen;
  if (worldId && characterId) {
    // Shared terminal states — identical for the teacher and student paths.
    screen = <GameCanvas worldId={worldId} characterId={characterId} onQuit={quitToMenu} />;
  } else if (worldId) {
    screen = <CharacterSelect onSelect={setCharacterId} onBack={() => setWorldId(null)} />;
  } else if (isStudentMode) {
    screen = <StudentHome onSelectWorld={setWorldId} />;
  } else if (showTeacherMode) {
    screen = <TeacherMode onExit={() => setShowTeacherMode(false)} />;
  } else {
    screen = <WorldSelect onSelect={setWorldId} onOpenTeacherMode={() => setShowTeacherMode(true)} />;
  }

  return <div className="app-shell">{screen}</div>;
}

export default App;
