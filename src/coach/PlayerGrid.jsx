import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, limit, onSnapshot, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

const STATUS_STYLES = {
  flagged: 'bg-amber-50 text-amber-700 font-semibold',
  held:    'bg-red-50 text-red-700',
  active:  'text-slate-700',
};

export default function PlayerGrid() {
  const [players,     setPlayers]     = useState([]);
  const [movements,   setMovements]   = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [teams,       setTeams]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [history,     setHistory]     = useState(null); // { player, movement }

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, 'teams'), orderBy('order')),
        (s) => setTeams(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, 'players'), where('active', '==', true)),
        (s) => setPlayers(
          s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
        )
      ),
      onSnapshot(
        query(collection(db, 'movements'), orderBy('order')),
        (s) => setMovements(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        collection(db, 'progress'),
        (s) => {
          const map = {};
          s.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
          setProgressMap(map);
          setLoading(false);
        }
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Player Overview</h2>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="sticky left-0 bg-slate-800 px-4 py-3 text-left font-semibold min-w-[140px] z-10">
                  Player
                </th>
                {movements.map((m) => (
                  <th
                    key={m.id}
                    title={m.name}
                    className="px-2 py-3 font-medium text-center min-w-[70px]"
                  >
                    <div className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-xs leading-none py-1">
                      {m.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const teamPlayers = players.filter((p) => p.teamId === team.id);
                if (!teamPlayers.length) return null;
                return [
                  <tr key={`team-${team.id}`} className="bg-slate-100">
                    <td
                      colSpan={movements.length + 1}
                      className="sticky left-0 px-4 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      {team.name}
                    </td>
                  </tr>,
                  ...teamPlayers.map((player) => (
                    <tr key={player.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="sticky left-0 bg-white hover:bg-slate-50 px-4 py-2 font-medium text-slate-800 whitespace-nowrap z-10">
                        {player.name}
                      </td>
                      {movements.map((m) => {
                        const prog = progressMap[`${player.id}_${m.id}`];
                        return (
                          <td
                            key={m.id}
                            onClick={() => setHistory({ player, movement: m })}
                            className={`px-2 py-2 text-center cursor-pointer hover:ring-1 hover:ring-indigo-300 rounded transition-colors ${
                              prog ? STATUS_STYLES[prog.status] || STATUS_STYLES.active : 'text-slate-300'
                            }`}
                          >
                            {prog ? (
                              <>
                                L{prog.currentLevelNumber}
                                {prog.status === 'flagged' && <span className="ml-0.5 text-amber-500">⚑</span>}
                                {prog.status === 'held'    && <span className="ml-0.5 text-red-400">⏸</span>}
                              </>
                            ) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span><span className="text-amber-500 mr-1">⚑</span>Flagged — ready to advance</span>
        <span><span className="text-red-400 mr-1">⏸</span>Held by coach</span>
        <span className="text-slate-400">—&nbsp;&nbsp;Not started</span>
      </div>

      {history && (
        <SessionHistoryModal
          player={history.player}
          movement={history.movement}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
}

function SessionHistoryModal({ player, movement, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getDocs(
      query(
        collection(db, 'sessions'),
        where('playerId',   '==', player.id),
        where('movementId', '==', movement.id),
        limit(50)
      )
    ).then((snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.completedAt?.seconds ?? 0) - (a.completedAt?.seconds ?? 0))
        .slice(0, 10);
      setSessions(sorted);
      setLoading(false);
    });
  }, [player.id, movement.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="font-bold text-slate-900">{player.name}</p>
            <p className="text-sm text-slate-500">{movement.name} — last 10 sessions</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <LoadingSpinner />
          ) : sessions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No sessions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      Level {s.levelNumber}
                      {s.isRegressionSession && (
                        <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          regression
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">
                      {s.completedAt?.toDate
                        ? s.completedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600">
                    <span>{s.totalSets} set{s.totalSets !== 1 ? 's' : ''}</span>
                    <span>{s.totalReps} total reps</span>
                    {s.metTarget && (
                      <span className="text-green-600 font-medium">✓ target met</span>
                    )}
                  </div>
                  {s.sets?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.sets.map((set, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg"
                        >
                          {set.reps} reps
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
