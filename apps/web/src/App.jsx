import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store';

// Import Pages
import { Dashboard } from './pages/Dashboard';
import { MarketPrices } from './pages/MarketPrices';
import { DispatchIntelligence } from './pages/DispatchIntelligence';
import { Opportunities } from './pages/Opportunities';

// Import Icons
import {
  LayoutDashboard,
  TrendingUp,
  Truck,
  Handshake,
  Loader2,
  Compass,
} from 'lucide-react';

function App() {
  const { isLoading } = useStore();
  const location = useLocation();

  // Sidebar navigation configuration
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/markets', label: 'Markets', icon: TrendingUp },
    { path: '/dispatch', label: 'Dispatch', icon: Truck },
    { path: '/opportunities', label: 'Opportunities', icon: Handshake },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased relative overflow-hidden">
      
      {/* Background radial highlight flares */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* React Toast Toaster */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            borderRadius: '0.75rem',
            fontWeight: 500,
          },
        }}
      />

      {/* Global API Loading Overlay */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-lg animate-fade-in select-none">
          <Loader2 className="w-4.5 h-4.5 animate-spin" />
          TradeNexus Syncing...
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between py-6 relative z-10">
        <div className="space-y-8">
          
          {/* Logo Branding */}
          <div className="px-6 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/20 rounded-xl">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 tracking-tight font-display">
                TradeNexus
              </span>
              <span className="text-[9px] font-extrabold text-emerald-500 tracking-wider block uppercase">
                AI Intelligence v1.0
              </span>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400 transition-colors'
                  }`} />
                  {item.label}
                  
                  {/* Subtle right active dot */}
                  {isActive && (
                    <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="px-6 text-[10px] text-slate-500 font-semibold space-y-1">
          <div>© 2026 TradeNexus Inc.</div>
          <div>All rights reserved.</div>
        </div>
      </aside>

      {/* Main Area Viewport */}
      <main className="flex-grow overflow-y-auto h-screen p-8 relative z-10 custom-scrollbar">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/markets" element={<MarketPrices />} />
          <Route path="/dispatch" element={<DispatchIntelligence />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

    </div>
  );
}

export default App;
