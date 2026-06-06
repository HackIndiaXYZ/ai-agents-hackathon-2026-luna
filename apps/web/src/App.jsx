import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/app/Dashboard';
import Contracts from './pages/app/Contracts';
import ContractNew from './pages/app/ContractNew';
import Risk from './pages/app/Risk';
import Markets from './pages/app/Markets';
import Dispatch from './pages/app/Dispatch';
import Inventory from './pages/app/Inventory';
import Opportunities from './pages/app/Opportunities';
import Counterparties from './pages/app/Counterparties';
import Compliance from './pages/app/Compliance';
import Quality from './pages/app/Quality';
import Network from './pages/app/Network';
import Analytics from './pages/app/Analytics';
import Learning from './pages/app/Learning';
import Settings from './pages/app/Settings';
import LucyButton from './components/lucy/LucyButton';
import LucyPanel from './components/lucy/LucyPanel';
import { useLucyStore } from './store/lucyStore';
import { useAppStore } from './store/appStore';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return children;
}

export default function App() {
  const isOpen = useLucyStore((s) => s.isOpen);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useLucyStore.getState().toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/new" element={<ContractNew />} />
          <Route path="risk" element={<Risk />} />
          <Route path="markets" element={<Markets />} />
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="counterparties" element={<Counterparties />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="quality" element={<Quality />} />
          <Route path="network" element={<Network />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="learning" element={<Learning />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      {isAuthenticated && <LucyButton />}
      <AnimatePresence>{isOpen && <LucyPanel />}</AnimatePresence>
    </BrowserRouter>
  );
}
