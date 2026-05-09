import { collection, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSnapshot } from '../hooks';

export default function ApprovalsQueue() {
  const { docs: rawApprovals, loading } = useSnapshot(
    query(collection(db, 'approvals'), where('status', '==', 'pending'))
  );
  const approvals = [...rawApprovals].sort(
    (a, b) => (a.flaggedAt?.seconds ?? 0) - (b.flaggedAt?.seconds ?? 0)
  );

  async function handleApprove(approval) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'progress', `${approval.playerId}_${approval.movementId}`), {
      currentLevelNumber: approval.toLevelNumber,
      status: 'active',
      consecutiveSessions: 0,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'approvals', approval.id), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  async function handleHold(approval) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'progress', `${approval.playerId}_${approval.movementId}`), {
      status: 'held',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'approvals', approval.id), {
      status: 'held',
      reviewedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Approvals Queue</h2>
      <p className="text-slate-500 text-sm mb-6">
        Players flagged as ready to advance. Approve to move them up, or hold to keep them at their current level.
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">✓</p>
          <p className="font-semibold text-slate-700">No pending approvals</p>
          <p className="text-slate-400 text-sm mt-1">Players will appear here when they hit their progression target.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <ApprovalCard
              key={a.id}
              approval={a}
              onApprove={() => handleApprove(a)}
              onHold={() => handleHold(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ approval, onApprove, onHold }) {
  const flaggedDate = approval.flaggedAt?.toDate
    ? approval.flaggedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 flex items-center gap-4">
      <div className="w-2 h-12 rounded-full bg-amber-400 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">{approval.playerName}</p>
        <p className="text-sm text-slate-500">{approval.movementName}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Level {approval.fromLevelNumber} → Level {approval.toLevelNumber} &middot; flagged {flaggedDate}
        </p>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={onHold}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Hold
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Approve ✓
        </button>
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
