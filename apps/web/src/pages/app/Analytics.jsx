import { useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import { demoPriceHistory } from '../../data/demo';

const MODELS = [
  { name: 'Neural Macro Engine', badge: 'ELITE', score: 9.8, color: 'bg-green-500' },
  { name: 'Sentiment Pulse AI', badge: 'STABLE', score: 8.2, color: 'bg-amber-500' },
  { name: 'Historical Analogue v4', badge: 'LEGACY', score: 6.4, color: 'bg-gray-400' },
];

export default function Analytics() {
  const [range, setRange] = useState('1M');
  const data = demoPriceHistory.Cotton;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Price projections, model credibility, and backtest performance" />

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Price Projection: Cotton (CTN24)</p>
              <p className="text-3xl font-bold mt-1">₹7,110</p>
              <p className="text-sm text-green-600 font-semibold">+2.4% Est. Next 30D</p>
            </div>
            <div className="flex gap-1">
              {['1M', '3M', 'YTD'].map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded text-xs font-medium ${range === r ? 'bg-green-600 text-white' : 'border'}`}>{r}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => [`₹${v}`, '']} />
              <Area dataKey="upper" stroke="none" fill="#e5e7eb" fillOpacity={0.4} />
              <Area dataKey="lower" stroke="none" fill="#fff" fillOpacity={1} />
              <Line dataKey="price" stroke="#0D1F0D" strokeWidth={2} dot={false} connectNulls />
              <Line dataKey="price" stroke="#16a34a" strokeWidth={2} strokeDasharray="6 4" dot={false} data={data.filter((d) => d.forecast)} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-2">Solid: realized · Dashed: LUCY ENSEMBLE FORECAST · Gray: 95% CI</p>
        </div>

        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-sm">Model Credibility Scores</h3>
          {MODELS.map((m) => (
            <div key={m.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{m.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-bold">{m.badge}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded"><div className={`h-full rounded ${m.color}`} style={{ width: `${m.score * 10}%` }} /></div>
                <span className="text-sm font-bold">{m.score}</span>
              </div>
            </div>
          ))}
          <button className="text-xs text-green-600 font-semibold">Compare Full Architecture →</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Backtest Accuracy (Q1-Q2)</p><p className="text-2xl font-bold">94.8%</p><p className="text-xs text-gray-400">Variance ±1.2%</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Mean Absolute Error</p><p className="text-2xl font-bold">₹0.82</p><p className="text-xs text-green-600">-14% vs Prev Period</p></div>
        <div className="card p-4 bg-green-950 text-white">
          <p className="text-xs text-green-300 mb-2">Lucy AI Advisory</p>
          <p className="text-sm leading-relaxed">Models indicate significant bullish divergence in cotton demand from SE Asian textile hubs. Recommend hedging against Q3 freight surges.</p>
          <button className="text-xs text-green-400 mt-2 font-semibold">Execution Protocol Available →</button>
        </div>
      </div>
    </div>
  );
}
