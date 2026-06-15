import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/store/authStore';
import { Toasts } from '@/components/Toasts';
import Home from '@/pages/Home';
import SettingsPage from '@/pages/SettingsPage';
import Game from '@/pages/Game';
import Results from '@/pages/Results';
import StatisticsPage from '@/pages/StatisticsPage';

export default function App() {
  // Activate theme syncing for the whole app.
  useTheme();
  const location = useLocation();

  // Initialize auth (session restore + change subscription) on startup.
  const initialize = useAuth((s) => s.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/play" element={<Game />} />
          <Route path="/results" element={<Results />} />
          <Route path="/stats" element={<StatisticsPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </AnimatePresence>
      <Toasts />
    </div>
  );
}
