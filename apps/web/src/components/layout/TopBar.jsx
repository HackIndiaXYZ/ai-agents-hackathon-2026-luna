import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Search, Bell, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { alerts, demoUser } = useStore();
  const [searchVal, setSearchVal] = useState('');
  const [lang, setLang] = useState('EN');

  // Derive route title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/markets')) return 'Markets Index';
    if (path.includes('/dispatch')) return 'Dispatch & Logistics';
    if (path.includes('/opportunities')) return 'Opportunities Market';
    if (path.includes('/compliance')) return 'Compliance Assistant';
    if (path.includes('/advisor')) return 'AI Trade Advisor';
    if (path.includes('/settings')) return 'Settings';
    return 'TradeNexus';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    navigate(`/app/advisor?commodity=${encodeURIComponent(searchVal.trim())}`);
    setSearchVal('');
  };

  const handleLangToggle = () => {
    const nextLang = lang === 'EN' ? 'HI' : 'EN';
    setLang(nextLang);
    toast.success(`Language set to ${nextLang === 'EN' ? 'English' : 'Hindi (हिंदी)'}`);
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[240px] left-16 h-16 bg-white border-b flex items-center justify-between px-6 z-20" style={{ borderColor: 'var(--border)' }}>
      {/* Title */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-extrabold text-slate-800 tracking-tight font-display">
          {getPageTitle()}
        </h2>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative w-72 md:w-96">
        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search Cotton, Kapas, कपास..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        
        {/* Language Switcher */}
        <button
          onClick={handleLangToggle}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'EN' ? 'EN' : 'हिं'}</span>
        </button>

        {/* Alerts Bell notification */}
        <div className="relative">
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors relative">
            <Bell className="w-4 h-4" />
            {alerts?.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </button>
        </div>

        {/* User initials circle */}
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-extrabold text-xs select-none">
          {demoUser.name.split(' ').map(n => n.charAt(0)).join('')}
        </div>

      </div>
    </header>
  );
};

export default TopBar;
