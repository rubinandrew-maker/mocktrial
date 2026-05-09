import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, where, onSnapshot,
  doc, getDoc, setDoc, serverTimestamp,
  writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import PlayerSelect from './PlayerSelect';
import SessionView from './SessionView';

export default function StationMain({ stationId, movementId, movementName, onReassign }) {
  const [players,       setPlayers]       = useState([]);
  const [levels,        setLevels]        = useState([]);
  const [activePlayer,  setActivePlayer]  = useState(null);   // full player object
  const [activeProgress,setActiveProgress]= useState(null);   // progress doc for active player
  const [pendingSessions, setPendingSessions] = useState({}); // playerId → { levelNumber, isRegression, sets, startedAt }
  const [finishing,     setFinishing]     = useState(false);

  // Real-time players + levels
  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, 'players'), where('active', '==', true)),
      s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name)))
    );
    const u2 = onSnapshot(
      query(collection(db, 'movements', movementId, 'levels'), orderBy('levelNumber')),
      s => setLevels(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [movementId]);

  async function handleSelectPlayer(player) {
    const progressRef = doc(db, 'progress', `${player.id}_${movementId}`);
    const snap = await getDoc(progressRef);
    const progress = snap.exists()
      ? { id: snap.id, ...snap.data() }
      : { playerId: player.id, movementId, currentLevelNumber: 1, status: 'active', consecutiveSessions: 0 };

    setActiveProgress(progress);
    setActivePlayer(player);

    // Initialise session draft if not already in progress
    if (!pendingSessions[player.id]) {
      setPendingSessions(prev => ({
        ...prev,
        [player.id]: {
          levelNumber: progress.currentLevelNumber,
          isRegressionSession: false,
          sets: [],
          startedAt: new Date(),
        },
      }));
    }
  }

  function handleSwitch() {
    // Return to player select while keeping session draft alive
    setActivePlayer(null);
    setActiveProgress(null);
  }

  async function handleFinish(playerId, sessionDraft) {
    if (sessionDraft.sets.length === 0) {
      // Nothing logged — discard quietly
      setPendingSessions(prev => { const n = { ...prev }; delete n[playerId]; return n; });
      setActivePlayer(null);
      setActiveProgress(null);
      return;
    }

    setFinishing(true);
    try {
      const player   = players.find(p => p.id === playerId);
      const progress = activeProgress;
      const lvlNum   = sessionDraft.levelNumber;
      const level    = levels.find(l => l.levelNumber === progress.currentLevelNumber);
      const targetSets     = level?.targetSets     ?? 2;
      const targetReps     = level?.targetReps     ?? 10;
      const targetSessions = level?.targetSessions ?? 3;

      const totalSets = sessionDraft.sets.length;
      const totalReps = sessionDraft.sets.reduce((s, x) => s + x.reps, 0);
      const metTarget = !sessionDraft.isRegressionSession
        && totalSets >= targetSets
        && totalReps >= targetSets * targetReps;

      const batch = writeBatch(db);

      // Session document
      batch.set(doc(collection(db, 'sessions')), {
        playerId,
        playerName:          player.name,
        movementId,
        movementName,
        levelNumber:         lvlNum,
        isRegressionSession: sessionDraft.isRegressionSession,
        sets:                sessionDraft.sets.map(s => ({ reps: s.reps, loggedAt: Timestamp.fromDate(s.loggedAt) })),
        totalSets,
        totalReps,
        metTarget,
        startedAt:    Timestamp.fromDate(sessionDraft.startedAt),
        completedAt:  serverTimestamp(),
      });

      // Progress update (skip for regression sessions)
      if (!sessionDraft.isRegressionSession) {
        const progressRef = doc(db, 'progress', `${playerId}_${movementId}`);
        const prevConsec  = progress.consecutiveSessions ?? 0;
        const prevStatus  = progress.status ?? 'active';

        if (metTarget) {
          const newConsec  = prevConsec + 1;
          const nowFlagged = newConsec >= targetSessions && prevStatus !== 'flagged';
          const newStatus  = (prevStatus === 'flagged' || nowFlagged) ? 'flagged' : prevStatus;

          batch.set(progressRef, {
            playerId, movementId,
            currentLevelNumber:  progress.currentLevelNumber,
            status:              newStatus,
            consecutiveSessions: newConsec,
            lastSessionAt:       serverTimestamp(),
            updatedAt:           serverTimestamp(),
          }, { merge: true });

          if (nowFlagged) {
            batch.set(doc(collection(db, 'approvals')), {
              playerId,
              playerName:      player.name,
              movementId,
              movementName,
              fromLevelNumber: progress.currentLevelNumber,
              toLevelNumber:   progress.currentLevelNumber + 1,
              flaggedAt:       serverTimestamp(),
              status:          'pending',
              reviewedAt:      null,
            });
          }
        } else {
          batch.set(progressRef, {
            playerId, movementId,
            currentLevelNumber:  progress.currentLevelNumber,
            status:              prevStatus,
            consecutiveSessions: 0,
            lastSessionAt:       serverTimestamp(),
            updatedAt:           serverTimestamp(),
          }, { merge: true });
        }
      }

      await batch.commit();
    } finally {
      setFinishing(false);
      setPendingSessions(prev => { const n = { ...prev }; delete n[playerId]; return n; });
      setActivePlayer(null);
      setActiveProgress(null);
    }
  }

  function handleIdleTimeout() {
    // 30 s elapsed on player-select with no interaction — clear all drafts
    setPendingSessions({});
  }

  if (activePlayer && activeProgress) {
    return (
      <SessionView
        player={activePlayer}
        progress={activeProgress}
        levels={levels}
        movementName={movementName}
        session={pendingSessions[activePlayer.id]}
        finishing={finishing}
        onSessionChange={draft =>
          setPendingSessions(prev => ({ ...prev, [activePlayer.id]: draft }))
        }
        onSwitch={handleSwitch}
        onFinish={draft => handleFinish(activePlayer.id, draft)}
        onReassign={onReassign}
      />
    );
  }

  return (
    <PlayerSelect
      players={players}
      movementName={movementName}
      pendingSessions={pendingSessions}
      onSelect={handleSelectPlayer}
      onIdleTimeout={handleIdleTimeout}
      onReassign={onReassign}
      stationId={stationId}
    />
  );
}
