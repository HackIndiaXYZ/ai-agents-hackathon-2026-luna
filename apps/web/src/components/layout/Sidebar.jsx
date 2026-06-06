import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Truck, Package, TrendingUp, BarChart2,
  Handshake, Users, FileCheck, Star, Network, PieChart, Sparkles, Settings,
} from 'lucide-react';
import { useLucyStore } from '../../store/lucyStore';

const groups = [
  {
    label: 'Operations',
    items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/app/contracts', icon: FileText, label: 'Contracts' },
      { to: '/app/dispatch', icon: Truck, label: 'Dispatch' },
      { to: '/app/inventory', icon: Package, label: 'Inventory' },
    ],
  },
  {
    label: 'Risk & P&L',
    items: [
      { to: '/app/risk', icon: TrendingUp, label: 'Risk & P&L' },
      { to: '/app/markets', icon: BarChart2, label: 'Markets' },
    ],
  },
  {
    label: 'Relationships',
    items: [
      { to: '/app/opportunities', icon: Handshake, label: 'Opportunities' },
      { to: '/app/counterparties', icon: Users, label: 'Counterparties' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/app/compliance', icon: FileCheck, label: 'Compliance' },
      { to: '/app/quality', icon: Star, label: 'Quality Lots' },
    ],
  },
  {
    label: 'AI Intelligence',
    items: [
      { to: '/app/network', icon: Network, label: 'Supply Network' },
      { to: '/app/analytics', icon: PieChart, label: 'Analytics' },
      { to: '/app/learning', icon: Sparkles, label: 'Adaptive Learning' },
    ],
  },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-[3px] ${
    isActive
      ? 'bg-green-500/15 border-green-500 text-green-400'
      : 'border-transparent text-green-50/80 hover:bg-white/5'
  }`;

export default function Sidebar() {
  const open = useLucyStore((s) => s.open);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)' }}
    >
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-md bg-green-600 flex items-center justify-center font-bold text-white text-sm">N</div>
        <span className="text-white font-semibold text-lg tracking-tight">TradeNexus</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-[10px] font-semibold tracking-widest uppercase px-5 pt-4 pb-1.5 text-white/35">
              {g.label}
            </p>
            {g.items.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button
        onClick={open}
        className="mx-4 mb-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">L</div>
          <div>
            <p className="text-sm text-white font-medium flex items-center gap-1.5">
              Lucy AI <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
            </p>
            <p className="text-[11px] text-white/50">Your Trading Assistant</p>
          </div>
        </div>
      </button>

      <NavLink to="/app/settings" className={linkClass}>
        <Settings size={18} />
        Settings
      </NavLink>
    </aside>
  );
}
