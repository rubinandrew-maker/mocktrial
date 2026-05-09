import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';

export function useSnapshot(queryRef) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queryRef) return;
    const unsub = onSnapshot(queryRef, (snap) => {
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { docs, loading };
}
