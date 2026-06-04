import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import {
  LayoutDashboard,
  TrendingUp,
  Truck,
  Handshake,
  FileText,
  Brain,
  Settings,
  LogOut,
  Compass,
  ClipboardCheck,
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticated, demoUser } = useStore();

  const navItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/app/markets', label: 'Markets', icon: TrendingUp },
    { path: '/app/dispatch', label: 'Dispatch', icon: Truck },
    { path: '/app/opportunities', label: 'Opportunities', icon: Handshake },
    { path: '/app/compliance', label: 'Compliance', icon: FileText },
    { path: '/app/quality', label: 'Quality Lots', icon: ClipboardCheck },
    { path: '/app/advisor', label: 'Trade Advisor', icon: Brain },
  ];

  const handleLogout = () => {
    setAuthenticated(false);
    navigate('/');
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 z-30 w-16 md:w-[240px] bg-white border-r flex flex-col justify-between py-6 transition-all duration-300" style={{ borderColor: 'var(--border)' }}>
      <div className="space-y-8">
        {/* Brand Logo Header */}
        <div className="px-3 md:px-6 flex items-center gap-2.5">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--brand-green-light)' }}>
            <Compass className="w-5 h-5" style={{ color: 'var(--brand-green)' }} />
          </div>
          <span className="hidden md:inline text-lg font-extrabold tracking-tight text-slate-900 font-display">
            TradeNexus
          </span>
        </div>

        {/* Links Navigation */}
        <nav className="px-2 md:px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-3 md:px-4 py-3 rounded-lg text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                style={isActive ? { backgroundColor: 'var(--brand-green-light)' } : {}}
              >
                <Icon className="w-5 h-5 shrink-0" style={isActive ? { color: 'var(--brand-green)' } : {}} />
                <span className="hidden md:inline">{item.label}</span>
                
                {/* Left Active border indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md" style={{ backgroundColor: 'var(--brand-green)' }} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area with profile info */}
      <div className="px-2 md:px-4 space-y-4">
        {/* Profile Card */}
        <div className="hidden md:flex items-center gap-3 p-3 bg-slate-50 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {demoUser.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate leading-none">
              {demoUser.name}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {demoUser.email}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {/* Settings Link */}
          <Link
            to="/app/settings"
            className={`flex items-center gap-3.5 px-3 md:px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
              location.pathname === '/app/settings'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            style={location.pathname === '/app/settings' ? { backgroundColor: 'var(--brand-green-light)' } : {}}
          >
            <Settings className="w-4.5 h-4.5 shrink-0" />
            <span className="hidden md:inline">Settings</span>
          </Link>

          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3 md:px-4 py-2.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
