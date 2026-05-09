import { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import StationSetup from './StationSetup';
import StationMain from './StationMain';

const KEY_ID   = 'emileStation_id';
const KEY_MID  = 'emileStation_movementId';
const KEY_MNAME = 'emileStation_movementName';
const KEY_LABEL = 'emileStation_label';

export default function StationApp() {
  const [stationId] = useState(() => {
    let id = localStorage.getItem(KEY_ID);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY_ID, id); }
    return id;
  });

  const [movementId,   setMovementId]   = useState(() => localStorage.getItem(KEY_MID));
  const [movementName, setMovementName] = useState(() => localStorage.getItem(KEY_MNAME));

  // Heartbeat — keeps station doc current in Firestore
  useEffect(() => {
    setDoc(doc(db, 'stations', stationId), {
      movementId:   movementId   ?? null,
      movementName: movementName ?? null,
      deviceLabel:  localStorage.getItem(KEY_LABEL) || 'Unnamed iPad',
      lastSeen:     serverTimestamp(),
    }, { merge: true });
  }, [stationId, movementId, movementName]);

  function handleAssign(mId, mName) {
    localStorage.setItem(KEY_MID,   mId);
    localStorage.setItem(KEY_MNAME, mName);
    setMovementId(mId);
    setMovementName(mName);
  }

  if (!movementId) {
    return <StationSetup stationId={stationId} onAssign={handleAssign} />;
  }

  return (
    <StationMain
      stationId={stationId}
      movementId={movementId}
      movementName={movementName}
      onReassign={handleAssign}
    />
  );
}
