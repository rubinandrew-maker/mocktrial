import { useState, useEffect, useRef, useCallback } from 'react';
import StationSetup from './StationSetup';

const IDLE_SECONDS = 30;

export default function PlayerSelect({
  players, movementName, pendingSessions,
  onSelect, onIdleTimeout, onReassign, stationId,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [idleSecsLeft, setIdleSecsLeft] = useState(null); // null = no active sessions pending
  const timerRef = useRef(null);

  const hasPending = Object.keys(pendingSessions).some(
    id => pendingSessions[id]?.sets?.length > 0
  );

  const resetTimer = useCallback(() => {
    if (!hasPending) return;
    clearInterval(timerRef.current);
    setIdleSecsLeft(IDLE_SECONDS);
    timerRef.current = setInterval(() => {
      setIdleSecsLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); onIdleTimeout(); return null; }
        return prev - 1;
      });
    }, 1000);
  }, [hasPending, onIdleTimeout]);

  useEffect(() => {
    if (hasPending) resetTimer();
    else { clearInterval(timerRef.current); setIdleSecsLeft(null); }
    return () => clearInterval(timerRef.current);
  }, [hasPending]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTap(player) {
    clearInterval(timerRef.current);
    setIdleSecsLeft(null);
    onSelect(player);
  }

  if (showSettings) {
    return (
      <StationSetup
        stationId={stationId}
        onAssign={(mId, mName) => { onReassign(mId, mName); setShowSettings(false); }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-900 flex flex-col select-none"
      onClick={hasPending ? resetTimer : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <img src="/rtd-logo.png" alt="RTD" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-white text-2xl font-bold leading-tight">{movementName}</p>
            <p className="text-slate-400 text-sm">Tap your name to begin</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {idleSecsLeft !== null && (
            <div className="flex items-center gap-2 bg-amber-900/50 border border-amber-700 rounded-xl px-3 py-1.5">
              <span className="text-amber-400 text-sm">Session in progress</span>
              <span className="text-amber-300 font-mono font-bold text-sm w-6 text-right">
                {idleSecsLeft}s
              </span>
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="text-slate-600 hover:text-slate-400 transition-colors p-2"
            title="Station settings"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Player grid */}
      <div className="flex-1 px-6 pb-8">
        {players.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-lg">No players added yet. Ask your coach.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {players.map(player => {
              const pending = pendingSessions[player.id];
              const hasSets = pending?.sets?.length > 0;
              return (
                <button
                  key={player.id}
                  onClick={() => handleTap(player)}
                  className={`relative rounded-2xl py-6 px-3 text-center font-semibold text-lg transition-all active:scale-95 ${
                    hasSets
                      ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {player.name}
                  {hasSets && (
                    <span className="absolute top-2 right-2 text-xs bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {pending.sets.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
