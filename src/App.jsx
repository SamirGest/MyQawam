import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Objectifs from './pages/Objectifs';
import ObjectifDetail from './pages/ObjectifDetail';
import Planning from './pages/Planning';
import Parametres from './pages/Parametres';
import Sync from './pages/Sync';
import { autoResetHabitudes, getPlanning } from './data/store';

// Sync planning to server on app load
function syncPlanning() {
  const data = getPlanning();
  fetch('/api/planning', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocs: data.blocs }),
  }).catch(() => {});
}

export default function App() {
  useEffect(() => {
    autoResetHabitudes();
    syncPlanning();
  }, []);

  return (
    <>
      <Sidebar />
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/objectifs" element={<Objectifs />} />
          <Route path="/objectifs/:id" element={<ObjectifDetail />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/sync" element={<Sync />} />
        </Routes>
      </main>
    </>
  );
}

const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

const styles = {
  main: {
    flex: 1,
    padding: isMobile ? '20px 16px' : '32px 40px',
    overflowY: 'auto',
    maxHeight: isMobile ? 'none' : '100vh',
  },
};
