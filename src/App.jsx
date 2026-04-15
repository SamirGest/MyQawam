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
import { toISODate } from './data/helpers';

function schedulePlanningNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  const today = toISODate(new Date());
  const blocs = getPlanning().blocs.filter((b) => b.date === today);
  const now = new Date();

  blocs.forEach((bloc) => {
    const [h, m] = bloc.heureDebut.split(':').map(Number);
    const eventTime = new Date();
    eventTime.setHours(h, m, 0, 0);

    // 30 minutes before
    const notifTime = new Date(eventTime.getTime() - 30 * 60 * 1000);
    const delay = notifTime.getTime() - now.getTime();

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification('MyQawam — Rappel planning', {
            body: `Dans 30 min → ${bloc.titre} (${bloc.heureDebut} - ${bloc.heureFin})`,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [200, 100, 200],
            data: { url: '/planning' },
          });
        });
      }, delay);
    }
  });
}

export default function App() {
  useEffect(() => {
    autoResetHabitudes();
    schedulePlanningNotifications();
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
