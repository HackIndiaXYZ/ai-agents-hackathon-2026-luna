import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, MessageCircle, Search } from 'lucide-react';
import { demoAlerts } from '../../data/demo';
import { useLucyStore } from '../../store/lucyStore';
import { useAppStore } from '../../store/appStore';

const pageNames = {
  dashboard: 'Dashboard', contracts: 'Contracts', 'contracts/new': 'New Contract',
  risk: 'Risk & P&L', markets: 'Markets', dispatch: 'Dispatch', inventory: 'Inventory',
  opportunities: 'Opportunities', counterparties: 'Counterparties', compliance: 'Compliance',
  quality: 'Quality Lots', network: 'Supply Network', analytics: 'Analytics',
  learning: 'Adaptive Learning', settings: 'Settings',
};

export default function TopBar() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const { open, setPendingQuery } = useLucyStore();
  const demoUser = useAppStore((s) => s.demoUser);
  const segment = location.pathname.split('/').pop();
  const pageName = pageNames[segment] || 'TradeNexus';

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setPendingQuery(query.trim());
      open();
    }
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center gap-4 px-6 border-b"
      style={{
        left: 'var(--sidebar-width)',
        height: 'var(--topbar-height)',
        background: 'var(--topbar-bg)',
        borderColor: 'var(--card-border)',
      }}
    >
      <span className="text-sm text-[var(--text-muted)] shrink-0">{pageName}</span>

      <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contracts, mandis, commodities..."
          className="w-full pl-9 pr-16 py-2 text-sm rounded-lg border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-white border px-1.5 py-0.5 rounded">⌘K</kbd>
      </form>

      <div className="flex items-center gap-3 shrink-0">
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {demoAlerts.length}
          </span>
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100"><MessageCircle size={18} /></button>
        <button
          onClick={open}
          className="px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
        >
          Lucy AI ›
        </button>
        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
            {demoUser.name[0]}
          </div>
          <span className="text-sm font-medium hidden lg:block">{demoUser.name.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
}
