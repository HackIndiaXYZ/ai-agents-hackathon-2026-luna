import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingDown, BarChart3, Truck, AlertTriangle, CreditCard, RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import ContractTypeBadge from '../../components/ui/ContractTypeBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import PnLDisplay from '../../components/ui/PnLDisplay';
import AgentBadge from '../../components/ui/AgentBadge';
import IndiaMap from '../../components/ui/IndiaMap';
import { useContractStore } from '../../store/contractStore';
import {
  demoStats, demoMandiPrices, demoOpportunities, demoAgentLog, demoPortfolioHistory, demoDispatches,
} from '../../data/demo';
import { inr, pct } from '../../lib/utils';
import { useLucyStore } from '../../store/lucyStore';

const EXPOSURE = [
  { name: 'Chickpea', value: 35.6, amount: 9900000 },
  { name: 'Cotton', value: 32.8, amount: 9120000 },
  { name: 'Soybean', value: 18.7, amount: 5200000 },
  { name: 'Wheat', value: 12.9, amount: 3600000 },
];
const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac'];

export default function Dashboard() {
  const contracts = useContractStore((s) => s.contracts);
  const openLucy = useLucyStore((s) => s.open);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const sorted = [...contracts].sort((a, b) => a.pnl - b.pnl);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const netMtm = contracts.reduce((s, c) => s + c.pnl, 0);

  const mapRoutes = demoDispatches.map((d) => ({
    from: [d.originLng, d.originLat],
    to: [d.destLng, d.destLat],
    color: d.daysLate > 0 ? '#d97706' : '#16a34a',
    animated: true,
  }));

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Good morning, Ramesh!</h1>
          <p className="text-sm text-gray-500">Here's what's happening with your trading portfolio today.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">Fri, Jun 5, 2026</span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Exposure" value={demoStats.totalExposure} delta="+2.35% ↑" deltaType="positive" icon={DollarSign} color="#16a34a" />
        <StatCard label="Today's P&L" value={demoStats.todayPnL} delta="-3.1% ↓" deltaType="negative" icon={TrendingDown} color="#dc2626" />
        <StatCard label="MTM P&L (Unrealized)" value={demoStats.mtmPnL} delta="-1.8% ↓" deltaType="negative" icon={BarChart3} color="#dc2626" />
        <StatCard label="Dispatches In Transit" value={demoStats.dispatchesInTransit} delta="2 new" deltaType="neutral" icon={Truck} color="#d97706" />
        <StatCard label="Risk Alerts" value={demoStats.riskAlerts} delta="1 critical" deltaType="negative" icon={AlertTriangle} color="#dc2626" />
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Available Credit</span>
            <CreditCard size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{inr(demoStats.availableCredit)}</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(demoStats.availableCredit / demoStats.creditLimit) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">of {inr(demoStats.creditLimit)} limit</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[5fr_3fr_3fr] gap-4">
        <div className="card p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm">Live Mark-to-Market Valuation</h3>
              <p className="text-xs text-gray-500">Contracts sorted by worst unrealized P&L</p>
            </div>
            <Link to="/app/risk" className="text-xs text-green-600 font-medium">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 pr-2">ID</th><th className="pb-2">Type</th><th className="pb-2">Commodity</th>
                  <th className="pb-2">P&L</th><th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 5).map((c) => (
                  <tr key={c.id} className="border-b border-gray-50" style={{ borderLeft: `3px solid ${c.pnl >= 0 ? '#16a34a' : '#dc2626'}` }}>
                    <td className="py-2 pr-2 font-mono">{c.id}</td>
                    <td className="py-2"><ContractTypeBadge type={c.type} /></td>
                    <td className="py-2">{c.commodity}</td>
                    <td className="py-2"><PnLDisplay value={c.pnl} size="sm" /></td>
                    <td className="py-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-700">Worst: {inr(worst?.pnl)}</span>
            <span className="text-[10px] px-2 py-1 rounded bg-green-50 text-green-700">Best: {inr(best?.pnl)}</span>
            <span className="text-[10px] px-2 py-1 rounded bg-gray-50">{contracts.length} Contracts</span>
            <span className="text-[10px] px-2 py-1 rounded bg-gray-50">Net: {inr(netMtm)}</span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-1">Portfolio Exposure</h3>
          <p className="text-xs text-gray-500 mb-3">Value allocation by commodity</p>
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={EXPOSURE} innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {EXPOSURE.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-bold">₹27.82L</p>
              </div>
            </div>
          </div>
          <div className="space-y-1 mt-2">
            {EXPOSURE.map((e, i) => (
              <div key={e.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />{e.name}</span>
                <span>{e.value}% · {inr(e.amount)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2 font-medium">Top: Chickpea 35.6% of portfolio</p>
        </div>

        <div className="card p-4">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold text-sm">Market Snapshot</h3>
            <Link to="/app/markets" className="text-xs text-green-600">View Markets →</Link>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="text-gray-400 border-b"><th className="pb-1 text-left">Commodity</th><th>State</th><th>Price</th><th>Δ</th></tr></thead>
            <tbody>
              {demoMandiPrices.slice(0, 5).map((m) => (
                <tr key={m.mandi} className="border-b border-gray-50">
                  <td className="py-1.5">{m.commodity}</td>
                  <td className="py-1.5">{m.state}</td>
                  <td className="py-1.5">₹{m.modal}</td>
                  <td className={`py-1.5 font-medium ${m.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct(m.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3 text-green-600 font-semibold">Market Sentiment: Bullish ↑</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[4fr_4fr_3fr] gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Trade Opportunities</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {demoOpportunities.slice(0, 2).map((o) => (
              <div key={o.id} className="border rounded-lg p-3 text-xs space-y-2">
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold text-[10px]">{o.type.replace('_', ' ')}</span>
                <p className="font-semibold">{o.commodity}</p>
                <p className="text-gray-500">{o.origin} → {o.destination}</p>
                <p>{o.qty} {o.unit} · Margin: {o.margin}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: `${o.matchScore}%` }} /></div>
                  <span className="text-green-600 font-semibold">{o.matchScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-2">Dispatches Progress</h3>
          <p className="text-3xl font-bold text-center my-2">12 <span className="text-sm font-normal text-gray-500">In Transit</span></p>
          <div className="flex justify-center gap-4 text-[10px] mb-3">
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />2 Loading</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />6 In Transit</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />3 Delivery</span>
          </div>
          <IndiaMap routes={mapRoutes} height={160} markers={demoDispatches.flatMap((d) => [
            { lat: d.originLat, lng: d.originLng, size: 5, color: '#16a34a' },
            { lat: d.destLat, lng: d.destLng, size: 5, color: '#d97706' },
          ])} />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">AI Agent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {demoAgentLog.map((a, i) => (
              <div key={i} className="text-xs border-b border-gray-50 pb-2 cursor-pointer" onClick={() => setExpandedAgent(expandedAgent === i ? null : i)}>
                <div className="flex items-center gap-2 mb-1">
                  <AgentBadge agent={a.agent.split(' ')[0].toUpperCase()} color={a.color} />
                  <span className="text-gray-400">{a.time}</span>
                </div>
                <p className={expandedAgent === i ? '' : 'line-clamp-2'}>{a.summary}</p>
              </div>
            ))}
          </div>
          <Link to="/app/learning" className="text-xs text-green-600 font-medium mt-2 inline-block">View All Activity →</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Portfolio Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={demoPortfolioHistory}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => inr(v)} />
              <Area type="monotone" dataKey="pnl" stroke="#16a34a" fill="url(#pnlGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
            <div><p className="text-gray-500">All Time P&L</p><p className="font-bold text-green-600">+₹2,48,600</p></div>
            <div><p className="text-gray-500">Volume</p><p className="font-bold">970 qtl</p></div>
            <div><p className="text-gray-500">Avg Return</p><p className="font-bold">12.4%</p></div>
            <div><p className="text-gray-500">Win Rate</p><p className="font-bold">62%</p></div>
          </div>
        </div>

        <div className="rounded-xl p-5 text-white relative overflow-hidden" style={{ background: 'var(--green-950)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-xl font-bold">L</div>
            <div>
              <p className="font-semibold">Ask Lucy Anything</p>
              <p className="text-xs text-green-300">Your AI trading assistant</p>
            </div>
          </div>
          <button onClick={openLucy} className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-sm text-left text-green-100 hover:bg-white/20 mb-3">
            Try: "What's my worst losing contract?"
          </button>
          <div className="flex flex-wrap gap-2">
            {['P&L summary', 'Best mandi today', 'Risk alerts'].map((c) => (
              <button key={c} onClick={openLucy} className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] hover:bg-white/20">{c}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
