import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc,
  writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSnapshot } from '../hooks';

export default function LevelEditor() {
  const { docs: movements } = useSnapshot(
    query(collection(db, 'movements'), orderBy('order'))
  );
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!selectedId && movements.length > 0) setSelectedId(movements[0].id);
  }, [movements, selectedId]);

  const selectedMovement = movements.find((m) => m.id === selectedId);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Level Editor</h2>
      <div className="flex gap-6 min-h-[500px]">
        {/* Movement list */}
        <div className="w-52 shrink-0 space-y-1">
          {movements.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                m.id === selectedId
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="block truncate">{m.name}</span>
              <span className={`text-xs ${m.id === selectedId ? 'text-indigo-200' : 'text-slate-400'}`}>
                {m.levelCount} level{m.levelCount !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>

        {/* Level editor panel */}
        <div className="flex-1 min-w-0">
          {selectedMovement ? (
            <LevelList movement={selectedMovement} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a movement to edit its levels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LevelList({ movement }) {
  const [levels,  setLevels]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'movements', movement.id, 'levels'), orderBy('levelNumber')),
      (snap) => {
        setLevels(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return unsub;
  }, [movement.id]);

  async function addLevel() {
    const levelNumber = levels.length > 0 ? levels[levels.length - 1].levelNumber + 1 : 1;
    await addDoc(collection(db, 'movements', movement.id, 'levels'), {
      levelNumber,
      name: `Level ${levelNumber}`,
      description: '',
      youtubeUrl: '',
      targetSets: 2,
      targetReps: 10,
      targetSessions: 3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'movements', movement.id), { levelCount: levelNumber });
  }

  async function deleteLevel(level) {
    if (!confirm(`Delete Level ${level.levelNumber}: ${level.name}? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'movements', movement.id, 'levels', level.id));
    const newCount = levels.length - 1;
    await updateDoc(doc(db, 'movements', movement.id), { levelCount: newCount });
  }

  async function moveLevel(index, direction) {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= levels.length) return;
    const a = levels[index];
    const b = levels[swapIndex];
    const batch = writeBatch(db);
    batch.update(doc(db, 'movements', movement.id, 'levels', a.id), {
      levelNumber: b.levelNumber, updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'movements', movement.id, 'levels', b.id), {
      levelNumber: a.levelNumber, updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">{movement.name}</h3>
        <button
          onClick={addLevel}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          + Add Level
        </button>
      </div>

      {levels.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-sm">
          No levels yet. Click &quot;Add Level&quot; to create the first one.
        </div>
      ) : (
        <div className="space-y-3">
          {levels.map((level, i) => (
            <LevelRow
              key={level.id}
              level={level}
              movementId={movement.id}
              isFirst={i === 0}
              isLast={i === levels.length - 1}
              onMoveUp={() => moveLevel(i, -1)}
              onMoveDown={() => moveLevel(i, 1)}
              onDelete={() => deleteLevel(level)}
              onPreviewVideo={() => setVideoModal(level.youtubeUrl)}
            />
          ))}
        </div>
      )}

      {videoModal && (
        <YoutubeModal url={videoModal} onClose={() => setVideoModal(null)} />
      )}
    </div>
  );
}

function LevelRow({ level, movementId, isFirst, isLast, onMoveUp, onMoveDown, onDelete, onPreviewVideo }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:           level.name,
    description:    level.description,
    youtubeUrl:     level.youtubeUrl,
    targetSets:     level.targetSets,
    targetReps:     level.targetReps,
    targetSessions: level.targetSessions,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateDoc(doc(db, 'movements', movementId, 'levels', level.id), {
      ...form,
      targetSets:     Number(form.targetSets),
      targetReps:     Number(form.targetReps),
      targetSessions: Number(form.targetSessions),
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-400 w-6 text-center">
          L{level.levelNumber}
        </span>
        <span className="flex-1 font-medium text-slate-800 text-sm">{level.name}</span>
        <div className="flex items-center gap-1">
          {level.youtubeUrl && (
            <button
              onClick={onPreviewVideo}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Preview video"
            >
              <YoutubeIcon />
            </button>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon />
          </button>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {editing && (
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">YouTube URL</label>
            <input
              type="url"
              placeholder="https://youtu.be/..."
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Sets</label>
              <input
                type="number" min="1" max="10"
                value={form.targetSets}
                onChange={(e) => setForm((f) => ({ ...f, targetSets: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Reps</label>
              <input
                type="number" min="1" max="100"
                value={form.targetReps}
                onChange={(e) => setForm((f) => ({ ...f, targetReps: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Qualifying Sessions</label>
              <input
                type="number" min="1" max="10"
                value={form.targetSessions}
                onChange={(e) => setForm((f) => ({ ...f, targetSessions: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function YoutubeModal({ url, onClose }) {
  const videoId = extractYoutubeId(url);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-white text-3xl leading-none hover:text-slate-300"
          >
            ×
          </button>
        </div>
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white text-sm">
              Invalid YouTube URL
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
