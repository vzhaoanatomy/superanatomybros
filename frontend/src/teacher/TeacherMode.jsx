import { useRef, useState } from 'react';
import { getGroupedWorlds, WORLDS } from '../game/worlds';
import {
  loadCustomWorldData,
  saveCustomWorldData,
  isTeacherOnboardingDismissed,
  dismissTeacherOnboarding,
} from '../storage';
import { publishWorld, updateWorld, uploadWorldMusic } from '../api';
import WorldBuilderForm from './WorldBuilderForm';
import MissedTermsPanel from './MissedTermsPanel';
import StudentAttemptsPanel from './StudentAttemptsPanel';
import QuickStartBanner from './QuickStartBanner';
import * as t from './teacherStyles';

export default function TeacherMode({ onExit }) {
  const [, setVersion] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(isTeacherOnboardingDismissed);
  const [editing, setEditing] = useState(null); // null | 'new' | { world, isBuiltIn }
  const [publishingId, setPublishingId] = useState(null);
  const [publishError, setPublishError] = useState(null); // { id, message }
  const [statsForId, setStatsForId] = useState(null);
  const [attemptsForId, setAttemptsForId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null); // { id, text, isError }
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  const { myDecks, templates } = getGroupedWorlds();

  function refresh() {
    setVersion((v) => v + 1);
  }

  function triggerUpload(world) {
    uploadTargetRef.current = world;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    const world = uploadTargetRef.current;
    e.target.value = '';
    if (!file || !world) return;
    setUploadingId(world.id);
    setUploadMessage(null);
    try {
      await uploadWorldMusic(world.classroomCode, file);
      setUploadMessage({ id: world.id, text: '🎵 Music uploaded!', isError: false });
    } catch (err) {
      setUploadMessage({ id: world.id, text: err.message, isError: true });
    } finally {
      setUploadingId(null);
    }
  }

  async function handlePublish(world) {
    setPublishingId(world.id);
    setPublishError(null);
    try {
      if (world.classroomCode) {
        await updateWorld(world.classroomCode, world);
      } else {
        const { code } = await publishWorld(world);
        const store = loadCustomWorldData();
        const idx = store.custom.findIndex((w) => w.id === world.id);
        if (idx >= 0) {
          store.custom[idx] = { ...store.custom[idx], classroomCode: code };
          saveCustomWorldData(store);
        }
      }
      refresh();
    } catch (err) {
      setPublishError({ id: world.id, message: err.message });
    } finally {
      setPublishingId(null);
    }
  }

  function handleSaveBuiltInOverride(builtInId, data) {
    const store = loadCustomWorldData();
    store.overrides[builtInId] = { ...data, updatedAt: Date.now() };
    saveCustomWorldData(store);
    setEditing(null);
    refresh();
  }

  function handleSaveCustom(data) {
    const store = loadCustomWorldData();
    const stamped = { ...data, updatedAt: Date.now() };
    const idx = store.custom.findIndex((w) => w.id === data.id);
    if (idx >= 0) store.custom[idx] = stamped;
    else store.custom.push(stamped);
    saveCustomWorldData(store);
    setEditing(null);
    refresh();
  }

  function handleResetToDefaults(builtInId) {
    const store = loadCustomWorldData();
    delete store.overrides[builtInId];
    saveCustomWorldData(store);
    refresh();
  }

  function handleDeleteCustom(id) {
    const store = loadCustomWorldData();
    store.custom = store.custom.filter((w) => w.id !== id);
    saveCustomWorldData(store);
    refresh();
  }

  // Shared row renderer for both the "My Decks" and "Templates" sections
  // below — every world in this list is one the teacher owns (edited or
  // authored); joined classroom worlds never reach this screen anymore
  // (getGroupedWorlds() excludes them — see StudentHome.jsx for those).
  function renderWorldRow(world) {
    const isBuiltIn = WORLDS.some((w) => w.id === world.id);
    return (
      <div key={world.id} style={t.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: 16 }}>
              {world.custom && '⭐ '}
              {world.name}
            </strong>
            <div style={{ fontSize: 12, color: '#9fb0d0' }}>
              {world.subtitle} · {world.vocab.length} terms
              {world.classroomCode && ` · Published: ${world.classroomCode}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={t.button} onClick={() => setEditing({ world, isBuiltIn })}>
              Edit
            </button>
            {isBuiltIn && world.customized && (
              <button type="button" style={t.buttonDanger} onClick={() => handleResetToDefaults(world.id)}>
                Reset to Defaults
              </button>
            )}
            {!isBuiltIn && (
              <>
                <button
                  type="button"
                  style={{ ...t.button, background: '#c9932a', border: '2px solid #8a651c', color: '#1a1200' }}
                  onClick={() => handlePublish(world)}
                  disabled={publishingId === world.id}
                >
                  {publishingId === world.id
                    ? 'Publishing…'
                    : world.classroomCode
                      ? 'Republish'
                      : 'Publish with Classroom Code'}
                </button>
                <button type="button" style={t.buttonDanger} onClick={() => handleDeleteCustom(world.id)}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        {!isBuiltIn && world.classroomCode && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: '#0e1526',
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 13, color: '#9fb0d0' }}>Classroom code:</span>
            <strong style={{ fontSize: 20, letterSpacing: 4, color: '#ffd23f' }}>{world.classroomCode}</strong>
            <button
              type="button"
              style={{ ...t.button, padding: '6px 10px', fontSize: 12 }}
              onClick={() => navigator.clipboard?.writeText(world.classroomCode)}
            >
              Copy
            </button>
            <button
              type="button"
              style={{ ...t.button, padding: '6px 10px', fontSize: 12 }}
              onClick={() => setStatsForId(statsForId === world.id ? null : world.id)}
            >
              📊 Missed Terms
            </button>
            <button
              type="button"
              style={{ ...t.button, padding: '6px 10px', fontSize: 12 }}
              onClick={() => setAttemptsForId(attemptsForId === world.id ? null : world.id)}
            >
              🧑‍🎓 Student Attempts
            </button>
            <button
              type="button"
              style={{ ...t.button, padding: '6px 10px', fontSize: 12 }}
              onClick={() => triggerUpload(world)}
              disabled={uploadingId === world.id}
            >
              {uploadingId === world.id ? 'Uploading…' : '🎵 Upload Music'}
            </button>
          </div>
        )}
        {statsForId === world.id && world.classroomCode && (
          <MissedTermsPanel code={world.classroomCode} vocab={world.vocab} onClose={() => setStatsForId(null)} />
        )}
        {attemptsForId === world.id && world.classroomCode && (
          <StudentAttemptsPanel
            code={world.classroomCode}
            vocab={world.vocab}
            onClose={() => setAttemptsForId(null)}
          />
        )}
        {publishError?.id === world.id && (
          <p style={{ color: '#ff8a5c', fontSize: 13, marginTop: 8 }}>{publishError.message}</p>
        )}
        {uploadMessage?.id === world.id && (
          <p style={{ color: uploadMessage.isError ? '#ff8a5c' : '#7de37b', fontSize: 13, marginTop: 8 }}>
            {uploadMessage.text}
          </p>
        )}
      </div>
    );
  }

  if (editing) {
    const initialWorld = editing === 'new' ? null : editing.world;
    const isBuiltIn = editing !== 'new' && editing.isBuiltIn;
    return (
      <div style={t.screen}>
        <div style={t.container}>
          <div style={t.topBar}>
            <h1 style={{ fontSize: 20, margin: 0 }}>
              {editing === 'new' ? 'New Custom World' : isBuiltIn ? `Edit ${initialWorld.name}` : `Edit ${initialWorld.name}`}
            </h1>
            <button type="button" style={t.button} onClick={() => setEditing(null)}>
              ← Back
            </button>
          </div>
          <WorldBuilderForm
            initialWorld={initialWorld}
            isBuiltIn={isBuiltIn}
            onCancel={() => setEditing(null)}
            onSave={(data) => (isBuiltIn ? handleSaveBuiltInOverride(initialWorld.id, data) : handleSaveCustom(data))}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={t.screen}>
      <div style={t.container}>
        <div style={t.topBar}>
          <h1 style={{ fontSize: 22, margin: 0, color: '#c9a3ff' }}>🎓 Teacher Mode · Custom Vocab</h1>
          <button type="button" style={t.button} onClick={onExit}>
            ← Back to Menu
          </button>
        </div>

        {!onboardingDismissed && (
          <QuickStartBanner
            onDismiss={() => {
              dismissTeacherOnboarding();
              setOnboardingDismissed(true);
            }}
          />
        )}

        <button type="button" style={{ ...t.buttonPurple, marginBottom: 16 }} onClick={() => setEditing('new')}>
          + New Custom World
        </button>

        {myDecks.length > 0 && (
          <>
            <p style={t.sectionHeader}>⭐ My Decks</p>
            <p style={t.sectionSubtext}>Decks you've customized — jump back in.</p>
            {myDecks.map((world) => renderWorldRow(world))}
          </>
        )}
        <p style={t.sectionHeader}>Templates</p>
        <p style={t.sectionSubtext}>Starting points — pick one to customize.</p>
        {templates.map((world) => renderWorldRow(world))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
