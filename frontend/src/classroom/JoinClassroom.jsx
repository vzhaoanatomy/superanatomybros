import { useState } from 'react';
import { fetchWorld, fetchLeaderboard } from '../api';
import { getNickname, setNickname, loadJoinedWorlds, saveJoinedWorlds } from '../storage';
import LeaderboardList from './LeaderboardList';
import * as t from '../teacher/teacherStyles';

export default function JoinClassroom({ onExit, onJoined }) {
  const [nickname, setNicknameState] = useState(getNickname());
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'error'
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState(null);

  function validCode() {
    return code.trim().toUpperCase().length === 6;
  }

  async function handleJoin() {
    const trimmedNickname = nickname.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedNickname || trimmedCode.length !== 6) {
      setStatus('error');
      setError('Enter your nickname and the 6-letter code.');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const world = await fetchWorld(trimmedCode);
      setNickname(trimmedNickname);
      const joined = loadJoinedWorlds().filter((w) => w.code !== trimmedCode);
      joined.push({ ...world, id: `classroom-${trimmedCode}`, isClassroom: true, code: trimmedCode });
      saveJoinedWorlds(joined);
      onJoined();
    } catch (err) {
      setStatus('error');
      setError(err.message.includes('404') || err.message.includes('not found') ? 'Code not found.' : err.message);
    }
  }

  async function handleViewLeaderboard() {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      setStatus('error');
      setError('Enter the 6-letter code first.');
      return;
    }
    setStatus('loading');
    setError('');
    setLeaderboard(null);
    try {
      const entries = await fetchLeaderboard(trimmedCode);
      setLeaderboard(entries);
      setStatus(null);
    } catch (err) {
      setStatus('error');
      setError(err.message.includes('404') || err.message.includes('not found') ? 'Code not found.' : err.message);
    }
  }

  return (
    <div style={t.screen}>
      <div style={t.container}>
        <div style={t.topBar}>
          <h1 style={{ fontSize: 22, margin: 0, color: '#ffd23f' }}>⭐ Join Classroom · Enter Code</h1>
          <button type="button" style={t.button} onClick={onExit}>
            ← Back to Menu
          </button>
        </div>

        <div style={t.panel}>
          <label style={t.label}>Your nickname</label>
          <input
            style={t.input}
            value={nickname}
            onChange={(e) => setNicknameState(e.target.value)}
            placeholder="e.g. Ava"
            maxLength={24}
          />

          <label style={t.label}>Classroom code</label>
          <input
            style={{ ...t.input, textTransform: 'uppercase', letterSpacing: 2 }}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setLeaderboard(null);
            }}
            placeholder="ABCDEF"
            maxLength={6}
          />

          {status === 'error' && <p style={{ color: '#ff8a5c', fontSize: 13, marginTop: 10 }}>{error}</p>}

          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            <button type="button" style={t.buttonPrimary} onClick={handleJoin} disabled={status === 'loading'}>
              {status === 'loading' ? 'Joining…' : 'Join'}
            </button>
            <button
              type="button"
              style={t.button}
              onClick={handleViewLeaderboard}
              disabled={status === 'loading' || !validCode()}
            >
              View Leaderboard
            </button>
          </div>

          {leaderboard && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, color: '#ffd23f', margin: '0 0 4px', textTransform: 'uppercase' }}>
                Leaderboard · {code.trim().toUpperCase()}
              </p>
              <LeaderboardList entries={leaderboard} highlightNickname={nickname.trim()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
