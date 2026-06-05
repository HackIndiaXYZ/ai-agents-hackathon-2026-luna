import React from 'react';
import { TrendingUp, MapPin, Activity } from 'lucide-react';
import { formatINR } from '../../utils/format';

const MANDI_NODES = [
  { name: 'Nagpur', x: 42, y: 52, active: true },
  { name: 'Mumbai', x: 28, y: 68, active: false },
  { name: 'Ahmedabad', x: 22, y: 48, active: true },
  { name: 'Indore', x: 38, y: 42, active: false },
  { name: 'Delhi', x: 40, y: 28, active: true },
  { name: 'Rajkot', x: 18, y: 44, active: false },
  { name: 'Guntur', x: 48, y: 78, active: false },
  { name: 'Chennai', x: 52, y: 82, active: false },
];

export const DashboardPreview = ({ portfolio, prices, compact = false }) => {
  const totalValue = portfolio?.total_portfolio_value ?? portfolio?.total_open_value ?? portfolio?.total_value ?? 5242000;
  const pnl = portfolio?.total_unrealized_pnl ?? portfolio?.unrealized_pnl ?? 147800;
  const pnlPct = portfolio?.pnl_pct ?? portfolio?.basis_spread_pct ?? 4.15;
  const topPrices = (prices || []).slice(0, compact ? 4 : 5);

  return (
    <div className="bg-slate-950 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-white/5">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-[10px] text-slate-500 font-medium ml-2 tracking-wide">tradenexus.app — command center</span>
      </div>

      <div className={`p-4 ${compact ? 'space-y-3' : 'p-5 space-y-4'}`}>
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-white/5 border border-white/5 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Portfolio MtM</p>
            <p className="text-sm font-bold text-white tabular-nums">{formatINR(totalValue)}</p>
          </div>
          <div className="rounded-md bg-white/5 border border-white/5 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Unrealized P&L</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatINR(pnl)}</p>
          </div>
          <div className="rounded-md bg-white/5 border border-white/5 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Basis Spread</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">+{pnlPct}%</p>
          </div>
        </div>

        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-5'} gap-3`}>
          {/* Map panel */}
          <div className={`${compact ? '' : 'col-span-2'} rounded-md bg-slate-900/60 border border-white/5 p-3 relative min-h-[140px]`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500" /> Mandi Network
              </span>
              <span className="text-[9px] text-emerald-500/80 font-medium">LIVE</span>
            </div>
            <svg viewBox="0 0 100 100" className="w-full h-28">
              <path
                d="M35 15 L55 12 L72 22 L78 38 L75 55 L68 72 L52 85 L38 78 L28 62 L22 45 L28 28 Z"
                fill="rgba(34,197,94,0.06)"
                stroke="rgba(34,197,94,0.2)"
                strokeWidth="0.5"
              />
              {MANDI_NODES.map((node) => (
                <g key={node.name}>
                  {node.active && (
                    <circle cx={node.x} cy={node.y} r="6" fill="rgba(34,197,94,0.15)" />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.active ? 2.5 : 1.8}
                    fill={node.active ? '#22c55e' : 'rgba(148,163,184,0.5)'}
                  />
                </g>
              ))}
              <line x1="42" y1="52" x2="22" y2="48" stroke="rgba(34,197,94,0.25)" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="42" y1="52" x2="40" y2="28" stroke="rgba(34,197,94,0.25)" strokeWidth="0.5" strokeDasharray="2 2" />
            </svg>
          </div>

          {/* Price table */}
          <div className={`${compact ? '' : 'col-span-3'} rounded-md bg-slate-900/60 border border-white/5 p-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" /> Live Mandi Prices — Cotton
              </span>
            </div>
            <div className="space-y-1">
              {topPrices.map((row, i) => (
                <div key={row.id || i} className="flex items-center justify-between text-[10px] py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-400 truncate max-w-[45%]">
                    {row.mandi_name}, {row.state}
                  </span>
                  <span className="text-white font-semibold tabular-nums">
                    ₹{(row.modal_price || 0).toLocaleString('en-IN')}
                  </span>
                  <span className={`font-medium tabular-nums ${(row.trend_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(row.trend_pct ?? 0) >= 0 ? '+' : ''}{(row.trend_pct ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mini trend chart */}
        {!compact && (
          <div className="rounded-md bg-slate-900/60 border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" /> 7-Day Price Trend
              </span>
            </div>
            <svg viewBox="0 0 200 40" className="w-full h-10">
              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.5"
                points="0,32 28,28 56,30 84,22 112,18 140,14 168,10 200,8"
              />
              <polyline
                fill="url(#trend-fill)"
                stroke="none"
                points="0,40 0,32 28,28 56,30 84,22 112,18 140,14 168,10 200,8 200,40"
              />
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.25)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPreview;
