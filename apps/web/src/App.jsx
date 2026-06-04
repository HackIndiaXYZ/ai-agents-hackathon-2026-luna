import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Lucy (Global Autonomous Operations OS)
import LucyButton from './components/lucy/LucyButton';
import LucyMode from './components/lucy/LucyMode';

// Pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/app/Dashboard';
import Contracts from './pages/app/Contracts';
import ContractForm from './pages/app/ContractForm';
import MarketPrices from './pages/MarketPrices';
import DispatchIntelligence from './pages/DispatchIntelligence';
import Opportunities from './pages/Opportunities';
import Advisor from './pages/Advisor';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
};

// Page Transition Wrapper
const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export const App = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen text-slate-700 font-sans antialiased relative">
      
      {/* Toast Alert Provider */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            fontWeight: 500,
            fontSize: '13px',
          },
        }}
      />

      {/* Page Transitions router wrappers */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          
          {/* Public Views */}
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/auth/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/auth/signup" element={<PageTransition><Signup /></PageTransition>} />

          {/* Protected Views */}
          <Route 
            path="/app/dashboard" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/contracts" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Contracts />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/contracts/new" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ContractForm />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/markets" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <MarketPrices />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/dispatch" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <DispatchIntelligence />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/opportunities" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Opportunities />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/advisor" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Advisor />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/compliance" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Compliance />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/settings" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Settings />
                </PageTransition>
              </ProtectedRoute>
            } 
          />

          {/* Redirect fallbacks */}
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {/* Global AI Lucy OS Layer */}
      <LucyButton />
      <LucyMode />

    </div>
  );
};

export default App;
