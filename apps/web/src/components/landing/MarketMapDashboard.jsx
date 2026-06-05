import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Package,
  FileText,
  Shield,
  TrendingUp,
  BarChart3,
  Settings,
  Search,
  Bell,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const SIDEBAR = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: MapPin, label: 'Markets', active: true },
  { icon: Package, label: 'Mandis' },
  { icon: FileText, label: 'Contracts' },
  { icon: Shield, label: 'Risk' },
  { icon: TrendingUp, label: 'Opportunities' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Settings, label: 'Settings' },
];

const MAP_DOTS = [
  { x: 38, y: 28, color: '#16a34a', size: 5 },
  { x: 32, y: 42, color: '#22c55e', size: 4 },
  { x: 45, y: 48, color: '#f59e0b', size: 4 },
  { x: 28, y: 55, color: '#16a34a', size: 5 },
  { x: 42, y: 62, color: '#ef4444', size: 3 },
  { x: 50, y: 72, color: '#22c55e', size: 4 },
  { x: 55, y: 45, color: '#f59e0b', size: 3 },
  { x: 48, y: 35, color: '#16a34a', size: 4 },
];

const TREND_DATA = [
  { d: 'M', p: 6800 },
  { d: 'T', p: 6920 },
  { d: 'W', p: 7010 },
  { d: 'T', p: 7100 },
  { d: 'F', p: 7180 },
  { d: 'S', p: 7240 },
  { d: 'S', p: 7260 },
];

export const MarketMapDashboard = ({ prices = [], variant = 'full' }) => {
  const topMandis = useMemo(() => {
    const rows = prices?.length ? prices : [
      { mandi_name: 'Indore', state: 'MP', modal_price: 7260, trend_pct: 3.24 },
      { mandi_name: 'Dewas', state: 'MP', modal_price: 7180, trend_pct: 2.85 },
      { mandi_name: 'Nagpur', state: 'MH', modal_price: 7250, trend_pct: 1.92 },
      { mandi_name: 'Rajkot', state: 'GJ', modal_price: 7200, trend_pct: 1.45 },
      { mandi_name: 'Ahmedabad', state: 'GJ', modal_price: 7350, trend_pct: 2.10 },
    ];
    return rows.slice(0, 5);
  }, [prices]);

  const avg = Math.round(topMandis.reduce((s, r) => s + (r.modal_price || 0), 0) / topMandis.length);
  const high = topMandis.reduce((a, b) => ((b.modal_price || 0) > (a.modal_price || 0) ? b : a), topMandis[0]);
  const low = topMandis.reduce((a, b) => ((b.modal_price || 0) < (a.modal_price || 0) ? b : a), topMandis[0]);

  return (
    <div className={`bg-[#f8faf9] rounded-lg overflow-hidden border border-slate-200/80 ${variant === 'hero' ? 'text-[10px]' : 'text-xs'}`}>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-10 sm:w-12 bg-white border-r border-slate-200 py-3 flex flex-col items-center gap-3 flex-shrink-0">
          {SIDEBAR.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              title={label}
              className={`p-1.5 rounded-md ${active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
            <div className="flex-1 flex items-center gap-2 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-400">
              <Search className="w-3 h-3" />
              <span className="truncate">Search mandi, commodity, or location...</span>
            </div>
            <Bell className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex-shrink-0" />
          </div>

          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-[11px] sm:text-xs">Market Map</span>
              <span className="text-[9px] text-emerald-600 font-semibold">LIVE</span>
            </div>

            <div className={`grid ${variant === 'full' ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-3`}>
              {/* Map */}
              <div className={`${variant === 'full' ? 'lg:col-span-2' : ''} relative rounded-lg bg-white border border-slate-100 p-2 min-h-[140px] sm:min-h-[180px]`}>
                <svg viewBox="0 0 100 100" className="w-full h-full min-h-[120px]">
                  <path
                    d="M32 12 L58 10 L76 24 L82 42 L78 58 L70 74 L58 88 L42 82 L30 68 L24 48 L28 28 Z"
                    fill="#f0fdf4"
                    stroke="#bbf7d0"
                    strokeWidth="0.5"
                  />
                  {MAP_DOTS.map((dot, i) => (
                    <circle key={i} cx={dot.x} cy={dot.y} r={dot.size * 0.4} fill={dot.color} opacity={0.85} />
                  ))}
                </svg>
                {variant === 'full' && (
                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                    {[
                      { c: '#16a34a', l: '>7k' },
                      { c: '#22c55e', l: '6-7k' },
                      { c: '#f59e0b', l: '5-6k' },
                      { c: '#ef4444', l: '<5k' },
                    ].map((item) => (
                      <span key={item.l} className="flex items-center gap-0.5 text-[8px] text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.c }} />
                        {item.l}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="space-y-2">
                <div className="rounded-lg bg-white border border-slate-100 p-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Top Mandis Today</p>
                  <div className="space-y-1">
                    {topMandis.map((row, i) => (
                      <div key={i} className="flex items-center justify-between gap-1">
                        <span className="text-slate-600 truncate text-[9px] sm:text-[10px]">
                          {row.mandi_name}, {row.state}
                        </span>
                        <span className="font-bold text-slate-800 tabular-nums text-[9px] sm:text-[10px]">
                          ₹{(row.modal_price || 0).toLocaleString('en-IN')}
                        </span>
                        <span className={`font-semibold tabular-nums text-[9px] ${(row.trend_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {(row.trend_pct ?? 0) >= 0 ? '+' : ''}{(row.trend_pct ?? 1.2).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {variant === 'full' && (
                  <div className="rounded-lg bg-white border border-slate-100 p-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Price Trend (Cotton)</p>
                    <div className="h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={TREND_DATA}>
                          <Area type="monotone" dataKey="p" stroke="#16a34a" fill="#dcfce7" strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom metrics strip */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: 'Avg Price', value: `₹${avg.toLocaleString('en-IN')}`, sub: '+2.35%' },
                { label: 'Highest', value: `₹${(high?.modal_price || 0).toLocaleString('en-IN')}`, sub: high?.mandi_name },
                { label: 'Lowest', value: `₹${(low?.modal_price || 0).toLocaleString('en-IN')}`, sub: low?.mandi_name },
                { label: 'Arrivals', value: '1.85L Qtl', sub: 'Today' },
                { label: 'Active Mandis', value: '2,542', sub: 'Live' },
                { label: 'Movement', value: 'Upward', sub: 'vs yesterday', green: true },
              ].map((m) => (
                <div key={m.label} className="rounded-md bg-white border border-slate-100 px-2 py-1.5">
                  <p className="text-[8px] text-slate-400 font-semibold uppercase">{m.label}</p>
                  <p className={`text-[10px] sm:text-[11px] font-bold tabular-nums ${m.green ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {m.value}
                  </p>
                  <p className="text-[8px] text-slate-400 truncate">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketMapDashboard;
