import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoachApp from './coach/CoachApp';
import StationApp from './station/StationApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/coach/*" element={<CoachApp />} />
        <Route path="*" element={<StationApp />} />
      </Routes>
    </BrowserRouter>
  );
}
