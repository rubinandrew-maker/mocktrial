import { useState } from 'react';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSnapshot } from '../hooks';

export default function StationManagement() {
  const { docs: stations,  loading: stLoading  } = useSnapshot(
    query(collection(db, 'stations'), orderBy('lastSeen', 'desc'))
  );
  const { docs: movements, loading: mvLoading  } = useSnapshot(
    query(collection(db, 'movements'), orderBy('order'))
  );

  const loading = stLoading || mvLoading;

  async function reassign(stationId, movementId) {
    const movement = movements.find((m) => m.id === movementId) ?? null;
    await updateDoc(doc(db, 'stations', stationId), {
      movementId:   movement?.id   ?? null,
      movementName: movement?.name ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  async function relabel(stationId, label) {
    await updateDoc(doc(db, 'stations', stationId), {
      deviceLabel: label,
      updatedAt: serverTimestamp(),
    });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Stations</h2>
      <p className="text-slate-500 text-sm mb-6">
        Each iPad registers itself here on first launch. Reassign movements or rename devices below.
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : stations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-4xl mb-3">📱</p>
          <p className="font-semibold text-slate-700">No stations registered yet</p>
          <p className="text-slate-400 text-sm mt-1">
            iPads will appear here automatically when they first open the app.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              movements={movements}
              onReassign={(movId) => reassign(station.id, movId)}
              onRelabel={(label) => relabel(station.id, label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StationCard({ station, movements, onReassign, onRelabel }) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft,   setLabelDraft]   = useState(station.deviceLabel || '');

  const lastSeen = station.lastSeen?.toDate
    ? station.lastSeen.toDate().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : 'Unknown';

  async function saveLabel() {
    await onRelabel(labelDraft.trim() || station.id);
    setEditingLabel(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      {/* Device label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">📱</span>
        {editingLabel ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveLabel();
                if (e.key === 'Escape') setEditingLabel(false);
              }}
              className="flex-1 text-sm border border-indigo-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={saveLabel} className="text-indigo-600 text-sm font-medium hover:underline">Save</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="font-semibold text-slate-800 truncate">
              {station.deviceLabel || 'Unnamed iPad'}
            </span>
            <button
              onClick={() => { setLabelDraft(station.deviceLabel || ''); setEditingLabel(true); }}
              className="text-slate-400 hover:text-indigo-600 shrink-0"
            >
              <PencilIcon />
            </button>
          </div>
        )}
      </div>

      {/* Movement assignment */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Movement</label>
        <select
          value={station.movementId ?? ''}
          onChange={(e) => onReassign(e.target.value || null)}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">— Unassigned —</option>
          {movements.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400">Last seen: {lastSeen}</p>
      <p className="text-xs text-slate-300 mt-0.5 font-mono truncate" title={station.id}>{station.id}</p>
    </div>
  );
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
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}
