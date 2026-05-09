import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitPin(pinValue) {
    setLoading(true);
    setError(false);
    try {
      const snap = await getDoc(doc(db, 'config', 'app'));
      const stored = snap.data()?.coachPin ?? '0000';
      if (pinValue === stored) {
        sessionStorage.setItem('coachUnlocked', '1');
        onUnlock();
      } else {
        setError(true);
        setPin('');
      }
    } catch {
      setError(true);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function pressDigit(d) {
    if (loading || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  function pressDelete() {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-72 shadow-2xl">
        <div className="flex justify-center mb-2">
          <img src="/rtd-logo.png" alt="RTD" className="w-12 h-12 object-contain" />
        </div>
        <h1 className="text-xl font-bold text-center text-slate-800 mb-1">Coach Dashboard</h1>
        <p className="text-slate-400 text-center text-sm mb-6">Enter PIN to continue</p>

        <div className="flex justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                pin.length > i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-center text-sm mb-4">Incorrect PIN. Try again.</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button
              key={d}
              onClick={() => pressDigit(String(d))}
              disabled={loading}
              className="py-3.5 text-xl font-medium rounded-xl bg-slate-100 hover:bg-indigo-50 active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <button
            onClick={pressDelete}
            disabled={loading}
            className="py-3.5 text-lg rounded-xl bg-slate-100 hover:bg-red-50 active:scale-95 transition-all"
          >
            ⌫
          </button>
          <button
            onClick={() => pressDigit('0')}
            disabled={loading}
            className="py-3.5 text-xl font-medium rounded-xl bg-slate-100 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            0
          </button>
          <div />
        </div>
      </div>
    </div>
  );
}
