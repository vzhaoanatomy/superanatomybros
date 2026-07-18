import { useState } from 'react';
import { getAllWorlds, WORLDS } from '../game/worlds';
import { loadCustomWorldData, saveCustomWorldData, loadJoinedWorlds, saveJoinedWorlds } from '../storage';
import { publishWorld, updateWorld } from '../api';
import WorldBuilderForm from './WorldBuilderForm';
import * as t from './teacherStyles';

export default function TeacherMode({ onExit }) {
  const [, setVersion] = useState(0);
  const [editing, setEditing] = useState(null); // null | 'new' | { world, isBuiltIn }
  const [publishingId, setPublishingId] = useState(null);
  const [publishError, setPublishError] = useState(null); // { id, message }

  const worlds = getAllWorlds();

  function refresh() {
    setVersion((v) => v + 1);
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
    store.overrides[builtInId] = data;
    saveCustomWorldData(store);
    setEditing(null);
    refresh();
  }

  function handleSaveCustom(data) {
    const store = loadCustomWorldData();
    const idx = store.custom.findIndex((w) => w.id === data.id);
    if (idx >= 0) store.custom[idx] = data;
    else store.custom.push(data);
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

  function handleRemoveJoined(code) {
    const joined = loadJoinedWorlds().filter((w) => w.code !== code);
    saveJoinedWorlds(joined);
    refresh();
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

        <button type="button" style={{ ...t.buttonPurple, marginBottom: 16 }} onClick={() => setEditing('new')}>
          + New Custom World
        </button>

        {worlds.map((world) => {
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
                    {world.isClassroom && ` · Code: ${world.code}`}
                    {world.classroomCode && ` · Published: ${world.classroomCode}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {world.isClassroom ? (
                    <button type="button" style={t.buttonDanger} onClick={() => handleRemoveJoined(world.code)}>
                      Remove
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        style={t.button}
                        onClick={() => setEditing({ world, isBuiltIn })}
                      >
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
                    </>
                  )}
                </div>
              </div>
              {!isBuiltIn && !world.isClassroom && world.classroomCode && (
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
                </div>
              )}
              {publishError?.id === world.id && (
                <p style={{ color: '#ff8a5c', fontSize: 13, marginTop: 8 }}>{publishError.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
