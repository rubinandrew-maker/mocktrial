import { useState } from 'react';
import { collection, query, orderBy, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function StationSetup({ stationId, onAssign }) {
  const [step,       setStep]       = useState('pin');   // 'pin' | 'choose'
  const [pin,        setPin]        = useState('');
  const [pinError,   setPinError]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [movements,  setMovements]  = useState([]);

  async function submitPin(pinValue) {
    setLoading(true);
    setPinError(false);
    try {
      const snap = await getDoc(doc(db, 'config', 'app'));
      const stored = snap.data()?.coachPin ?? '0000';
      if (pinValue !== stored) { setPinError(true); setPin(''); setLoading(false); return; }
      const mSnap = await getDocs(query(collection(db, 'movements'), orderBy('order')));
      setMovements(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStep('choose');
    } catch { setPinError(true); setPin(''); }
    finally { setLoading(false); }
  }

  function pressDigit(d) {
    if (loading || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center">
          <p className="text-white text-2xl font-bold mb-1">Assign Station</p>
          <p className="text-slate-400 text-sm">Which movement category does this iPad cover?</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xl">
          {movements.map(m => (
            <button
              key={m.id}
              onClick={() => onAssign(m.id, m.name)}
              className="bg-slate-800 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl px-4 py-5 text-sm font-medium transition-all text-center leading-snug"
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-72 shadow-2xl">
        <div className="flex justify-center mb-2">
          <img src="/rtd-logo.png" alt="RTD" className="w-12 h-12 object-contain" />
        </div>
        <p className="text-xl font-bold text-center text-slate-800 mb-1">Station Setup</p>
        <p className="text-slate-400 text-center text-sm mb-6">Enter coach PIN to configure</p>

        <div className="flex justify-center gap-3 mb-5">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
              pin.length > i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
            }`} />
          ))}
        </div>

        {pinError && <p className="text-red-500 text-center text-sm mb-4">Incorrect PIN.</p>}

        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => pressDigit(String(d))} disabled={loading}
              className="py-3.5 text-xl font-medium rounded-xl bg-slate-100 hover:bg-indigo-50 active:scale-95 transition-all">
              {d}
            </button>
          ))}
          <button onClick={() => { setPin(p => p.slice(0,-1)); setPinError(false); }}
            className="py-3.5 text-lg rounded-xl bg-slate-100 hover:bg-red-50 active:scale-95 transition-all">⌫</button>
          <button onClick={() => pressDigit('0')} disabled={loading}
            className="py-3.5 text-xl font-medium rounded-xl bg-slate-100 hover:bg-indigo-50 active:scale-95 transition-all">0</button>
          <div />
        </div>
      </div>
    </div>
  );
}
