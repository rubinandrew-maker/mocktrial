import { useState } from 'react';

export default function SessionView({
  player, progress, levels, movementName,
  session, finishing,
  onSessionChange, onSwitch, onFinish,
}) {
  const [repModal,    setRepModal]    = useState(false);
  const [videoUrl,    setVideoUrl]    = useState(null);

  const currentLvlNum   = progress.currentLevelNumber;
  const currentLevel    = levels.find(l => l.levelNumber === currentLvlNum);
  const regressionLevel = levels.find(l => l.levelNumber === currentLvlNum - 1);
  const nextLevel       = levels.find(l => l.levelNumber === currentLvlNum + 1);

  const draft = session ?? { levelNumber: currentLvlNum, isRegressionSession: false, sets: [], startedAt: new Date() };

  const totalSets = draft.sets.length;
  const totalReps = draft.sets.reduce((s, x) => s + x.reps, 0);

  function setRegression(useRegression) {
    onSessionChange({
      ...draft,
      levelNumber: useRegression ? currentLvlNum - 1 : currentLvlNum,
      isRegressionSession: useRegression,
    });
  }

  function addSet(reps) {
    onSessionChange({
      ...draft,
      sets: [...draft.sets, { reps, loggedAt: new Date() }],
    });
  }

  const targetSets = currentLevel?.targetSets ?? 2;
  const targetReps = currentLevel?.targetReps ?? 10;
  const metTarget  = !draft.isRegressionSession
    && totalSets >= targetSets
    && totalReps >= targetSets * targetReps;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <button
          onClick={onSwitch}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="text-sm">All players</span>
        </button>

        <div className="text-center">
          <p className="text-white font-bold text-lg leading-tight">{player.name}</p>
          <p className="text-slate-400 text-xs">{movementName}</p>
        </div>

        <div className="text-right">
          <p className="text-white font-bold text-lg leading-tight">{totalSets} set{totalSets !== 1 ? 's' : ''}</p>
          <p className="text-slate-400 text-xs">{totalReps} total reps</p>
        </div>
      </div>

      {/* Level cards */}
      <div className="flex gap-3 px-5 pt-5 pb-3">
        {/* Regression */}
        {regressionLevel ? (
          <LevelCard
            level={regressionLevel}
            variant="regression"
            isLogging={draft.isRegressionSession}
            onLog={() => setRegression(true)}
            onVideo={() => setVideoUrl(regressionLevel.youtubeUrl)}
          />
        ) : <div className="w-full" />}

        {/* Current */}
        {currentLevel && (
          <LevelCard
            level={currentLevel}
            variant="current"
            isLogging={!draft.isRegressionSession}
            onLog={() => setRegression(false)}
            onVideo={() => setVideoUrl(currentLevel.youtubeUrl)}
          />
        )}

        {/* Next */}
        {nextLevel ? (
          <LevelCard
            level={nextLevel}
            variant="next"
            isLogging={false}
            onLog={null}
            onVideo={() => setVideoUrl(nextLevel.youtubeUrl)}
          />
        ) : <div className="w-full" />}
      </div>

      {/* Logging strip */}
      <div className="flex-1 flex flex-col px-5 pt-2 pb-6 gap-4">
        {/* Current log target label */}
        <p className="text-slate-400 text-sm text-center">
          Logging against{' '}
          <span className="text-white font-semibold">
            {draft.isRegressionSession
              ? `Level ${regressionLevel?.levelNumber} — ${regressionLevel?.name}`
              : `Level ${currentLevel?.levelNumber} — ${currentLevel?.name}`}
          </span>
          {draft.isRegressionSession && (
            <span className="ml-2 text-xs text-slate-500">(regression — won't count toward progression)</span>
          )}
        </p>

        {/* Sets logged */}
        {draft.sets.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {draft.sets.map((s, i) => (
              <div key={i} className="bg-slate-800 rounded-xl px-4 py-2 text-center min-w-[70px]">
                <p className="text-slate-400 text-xs">Set {i + 1}</p>
                <p className="text-white font-bold text-lg">{s.reps}</p>
                <p className="text-slate-500 text-xs">reps</p>
              </div>
            ))}
          </div>
        )}

        {/* Target progress */}
        {!draft.isRegressionSession && (
          <div className="flex justify-center gap-6 text-sm">
            <span className={totalSets >= targetSets ? 'text-green-400' : 'text-slate-400'}>
              {totalSets}/{targetSets} sets {totalSets >= targetSets ? '✓' : ''}
            </span>
            <span className={totalReps >= targetSets * targetReps ? 'text-green-400' : 'text-slate-400'}>
              {totalReps}/{targetSets * targetReps} reps {totalReps >= targetSets * targetReps ? '✓' : ''}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={() => setRepModal(true)}
          className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xl transition-all"
        >
          + Add Set
        </button>

        <button
          onClick={() => onFinish(draft)}
          disabled={finishing}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
            metTarget
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          } disabled:opacity-60`}
        >
          {finishing ? 'Saving…' : totalSets === 0 ? 'Cancel / Go back' : metTarget ? 'Finish Session ✓ Target met!' : 'Finish Session'}
        </button>
      </div>

      {/* Rep count modal */}
      {repModal && (
        <RepCountModal
          onConfirm={reps => { addSet(reps); setRepModal(false); }}
          onCancel={() => setRepModal(false)}
        />
      )}

      {/* YouTube modal */}
      {videoUrl && (
        <YoutubeModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level card
// ---------------------------------------------------------------------------

function LevelCard({ level, variant, isLogging, onLog, onVideo }) {
  const styles = {
    current:    'bg-slate-800 ring-2 ring-indigo-500',
    regression: 'bg-slate-900 border border-slate-700 opacity-80',
    next:       'bg-slate-900 border border-slate-700 opacity-60',
  };
  const labelStyles = {
    current:    'bg-indigo-600 text-white',
    regression: 'bg-slate-700 text-slate-300',
    next:       'bg-slate-700 text-slate-400',
  };
  const labels = { current: 'Current', regression: 'Regression', next: 'Next level' };

  return (
    <div className={`flex-1 rounded-2xl p-4 flex flex-col gap-2 ${styles[variant]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${labelStyles[variant]}`}>
            {labels[variant]}
          </span>
          <p className="text-white font-bold text-sm leading-snug">{level.name}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{level.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-auto pt-1">
        {level.youtubeUrl && (
          <button
            onClick={onVideo}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-medium transition-colors py-1"
          >
            <YoutubeIcon /> Video
          </button>
        )}
        {onLog && !isLogging && variant === 'regression' && (
          <button
            onClick={onLog}
            className="ml-auto text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg px-2 py-1 transition-colors"
          >
            Log this
          </button>
        )}
        {onLog && isLogging && variant === 'regression' && (
          <span className="ml-auto text-xs text-indigo-400 font-medium">Logging ✓</span>
        )}
        {variant === 'current' && !isLogging && (
          <button
            onClick={onLog}
            className="ml-auto text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg px-2 py-1 transition-colors"
          >
            Log this
          </button>
        )}
        {variant === 'current' && isLogging && (
          <span className="ml-auto text-xs text-indigo-400 font-medium">Logging ✓</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rep count modal — large touch-friendly numpad
// ---------------------------------------------------------------------------

function RepCountModal({ onConfirm, onCancel }) {
  const [reps, setReps] = useState('');

  function press(d) {
    if (reps.length >= 3) return;
    setReps(r => r + d);
  }

  function confirm() {
    const n = parseInt(reps, 10);
    if (!n || n < 1) return;
    onConfirm(n);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-3xl p-8 w-full max-w-xs shadow-2xl">
        <p className="text-white text-2xl font-bold text-center mb-2">How many reps?</p>
        <div className="text-center mb-6">
          <span className="text-6xl font-bold text-white tabular-nums">
            {reps || '—'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => press(String(d))}
              className="py-5 text-2xl font-bold text-white bg-slate-700 rounded-2xl active:scale-95 hover:bg-slate-600 transition-all">
              {d}
            </button>
          ))}
          <button onClick={() => setReps(r => r.slice(0,-1))}
            className="py-5 text-xl text-white bg-slate-700 rounded-2xl active:scale-95 hover:bg-red-900 transition-all">
            ⌫
          </button>
          <button onClick={() => press('0')}
            className="py-5 text-2xl font-bold text-white bg-slate-700 rounded-2xl active:scale-95 hover:bg-slate-600 transition-all">
            0
          </button>
          <button onClick={onCancel}
            className="py-5 text-sm text-slate-400 bg-slate-700 rounded-2xl active:scale-95 hover:bg-slate-600 transition-all">
            Cancel
          </button>
        </div>

        <button
          onClick={confirm}
          disabled={!reps || parseInt(reps,10) < 1}
          className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xl active:scale-95 transition-all"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// YouTube embed modal
// ---------------------------------------------------------------------------

function YoutubeModal({ url, onClose }) {
  const videoId = extractYoutubeId(url);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-white text-4xl leading-none hover:text-slate-300 px-2">×</button>
        </div>
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
          {videoId
            ? <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media" allowFullScreen
                className="absolute inset-0 w-full h-full" />
            : <div className="flex items-center justify-center h-full text-white text-sm">Invalid YouTube URL</div>
          }
        </div>
      </div>
    </div>
  );
}

function extractYoutubeId(url) {
  if (!url) return null;
  for (const p of [/youtu\.be\/([A-Za-z0-9_-]{11})/, /[?&]v=([A-Za-z0-9_-]{11})/, /embed\/([A-Za-z0-9_-]{11})/]) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YoutubeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
