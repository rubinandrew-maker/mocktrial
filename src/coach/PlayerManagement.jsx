import { useState } from 'react';
import {
  collection, query, orderBy, where, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSnapshot } from '../hooks';

export default function PlayerManagement() {
  const { docs: teams }   = useSnapshot(query(collection(db, 'teams'), orderBy('order')));
  const { docs: allPlayers } = useSnapshot(
    query(collection(db, 'players'), where('active', '==', true))
  );
  const players = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Players</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            players={players.filter((p) => p.teamId === team.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, players }) {
  const [adding,   setAdding]   = useState(false);
  const [newName,  setNewName]  = useState('');
  const [editId,   setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [saving,   setSaving]   = useState(false);

  async function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    await addDoc(collection(db, 'players'), {
      name,
      teamId: team.id,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNewName('');
    setAdding(false);
    setSaving(false);
  }

  async function saveEdit(player) {
    const name = editName.trim();
    if (!name || name === player.name) { setEditId(null); return; }
    await updateDoc(doc(db, 'players', player.id), {
      name,
      updatedAt: serverTimestamp(),
    });
    setEditId(null);
  }

  async function removePlayer(player) {
    if (!confirm(`Remove ${player.name} from ${team.name}?`)) return;
    await updateDoc(doc(db, 'players', player.id), {
      active: false,
      updatedAt: serverTimestamp(),
    });
  }

  function startEdit(player) {
    setEditId(player.id);
    setEditName(player.name);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-semibold">{team.name}</h3>
        <span className="text-slate-400 text-sm">{players.length} / 20</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {players.map((player) => (
          <li key={player.id} className="px-4 py-2.5 flex items-center gap-2">
            {editId === player.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(player);
                    if (e.key === 'Escape') setEditId(null);
                  }}
                  className="flex-1 text-sm border border-indigo-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => saveEdit(player)}
                  className="text-indigo-600 text-sm font-medium hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="text-slate-400 text-sm hover:text-slate-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800">{player.name}</span>
                <button
                  onClick={() => startEdit(player)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  title="Rename"
                >
                  <PencilIcon />
                </button>
                <button
                  onClick={() => removePlayer(player)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  title="Remove"
                >
                  <TrashIcon />
                </button>
              </>
            )}
          </li>
        ))}

        {players.length === 0 && !adding && (
          <li className="px-4 py-6 text-center text-slate-400 text-sm">No players yet.</li>
        )}
      </ul>

      <div className="px-4 py-3 border-t border-slate-100">
        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              placeholder="Player name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPlayer();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addPlayer}
              disabled={saving || !newName.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); }}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            disabled={players.length >= 20}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-lg leading-none">+</span> Add player
          </button>
        )}
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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
