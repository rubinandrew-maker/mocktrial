import { useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function PinSettings({ onLock }) {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [status,   setStatus]   = useState(null); // 'success' | 'error'
  const [message,  setMessage]  = useState('');
  const [saving,   setSaving]   = useState(false);

  async function handleChange(e) {
    e.preventDefault();
    if (next.length !== 4 || !/^\d{4}$/.test(next)) {
      setStatus('error'); setMessage('New PIN must be exactly 4 digits.'); return;
    }
    if (next !== confirm) {
      setStatus('error'); setMessage('PINs do not match.'); return;
    }

    setSaving(true);
    try {
      const snap = await getDoc(doc(db, 'config', 'app'));
      const stored = snap.data()?.coachPin ?? '0000';
      if (current !== stored) {
        setStatus('error'); setMessage('Current PIN is incorrect.');
        setSaving(false); return;
      }
      await updateDoc(doc(db, 'config', 'app'), {
        coachPin: next,
        updatedAt: serverTimestamp(),
      });
      setStatus('success'); setMessage('PIN updated successfully.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch {
      setStatus('error'); setMessage('Failed to update PIN. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Settings</h2>

      <div className="max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Change Coach PIN</h3>

          <form onSubmit={handleChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={current}
                onChange={(e) => { setCurrent(e.target.value); setStatus(null); }}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={next}
                onChange={(e) => { setNext(e.target.value); setStatus(null); }}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Confirm New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setStatus(null); }}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••"
              />
            </div>

            {status && (
              <p className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !current || !next || !confirm}
              className="w-full py-3 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating…' : 'Update PIN'}
            </button>
          </form>
        </div>

        <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Lock Dashboard</h3>
          <p className="text-sm text-slate-500 mb-4">
            Returns to the PIN entry screen. The session is cleared from this device.
          </p>
          <button
            onClick={onLock}
            className="w-full py-3 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Lock &amp; Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
