import { useState } from 'react';
import PinGate from './PinGate';
import CoachDashboard from './CoachDashboard';

export default function CoachApp() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('coachUnlocked') === '1'
  );

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return <CoachDashboard onLock={() => { sessionStorage.removeItem('coachUnlocked'); setUnlocked(false); }} />;
}
