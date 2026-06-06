import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import IndiaMap, { priceColor } from '../../components/ui/IndiaMap';
import LucyInsightCard from '../../components/ui/LucyInsightCard';
import PriceForecastChart from '../../components/ui/PriceForecastChart';
import { demoMandiPrices, demoPriceHistory } from '../../data/demo';
import { pct } from '../../lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function Markets() {
  const [commodity, setCommodity] = useState('Cotton');
  const [view, setView] = useState('Prices');
  const [selected, setSelected] = useState(null);

  const filtered = demoMandiPrices.filter((m) => m.commodity === commodity || commodity === 'All');
  const markers = filtered.map((m) => ({
    lat: m.lat, lng: m.lng, size: 6 + Math.abs(m.change), price: m.modal,
    color: priceColor(m.modal), label: m.mandi, change: m.change, isAnomaly: m.isAnomaly, pulse: m.isAnomaly,
    mandi: m.mandi,
  }));

  const avg = filtered.reduce((s, m) => s + m.modal, 0) / filtered.length;
  const highest = Math.max(...filtered.map((m) => m.modal));
  const lowest = Math.min(...filtered.map((m) => m.modal));

  return (
    <div className="space-y-6">
      <PageHeader title="Market Intelligence" subtitle="Real-time mandi prices across India" />

      <div className="flex flex-wrap gap-2">
        <select value={commodity} onChange={(e) => setCommodity(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5">
          <option>All</option><option>Cotton</option><option>Soybean</option><option>Pigeon Pea</option><option>Onion</option><option>Wheat</option>
        </select>
        {['Prices', 'Arrivals', 'Demand'].map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === v ? 'bg-green-600 text-white' : 'border'}`}>{v}</button>
        ))}
        {['Today', 'This Week'].map((d) => (
          <button key={d} className="px-3 py-1.5 rounded-lg text-xs border">{d}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <div className="card p-4">
          <IndiaMap markers={markers} height={380} onMarkerClick={setSelected} />
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Top Mandis Today</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {[...filtered].sort((a, b) => b.modal - a.modal).map((m, i) => (
              <div key={m.mandi} className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer ${selected?.mandi === m.mandi ? 'bg-green-50' : 'hover:bg-gray-50'}`} onClick={() => setSelected(m)}>
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{m.mandi}</p>
                  <p className="text-gray-400">{m.state}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{m.modal}</p>
                  <p className={m.change >= 0 ? 'text-green-600' : 'text-red-600'}>{pct(m.change)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-16">
            <p className="text-xs text-gray-500 mb-1">Price Trend — {commodity}</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demoPriceHistory.Cotton.slice(0, 7)}>
                <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: 'Avg Price', v: `₹${Math.round(avg)}` },
          { l: 'Highest', v: `₹${highest}` },
          { l: 'Lowest', v: `₹${lowest}` },
          { l: 'Total Arrivals', v: '12,400 qtl' },
          { l: 'Active Mandis', v: filtered.length },
          { l: 'Movement', v: 'Upward ↑' },
        ].map((s) => (
          <div key={s.l} className="card p-3 text-center"><p className="text-xs text-gray-500">{s.l}</p><p className="font-bold text-sm">{s.v}</p></div>
        ))}
      </div>

      <LucyInsightCard
        insight="Cotton arrivals are up 18% in Maharashtra while demand is strong in Gujarat. Prices likely to rise in the next 48 hours."
        stats={['18% Increase in Arrivals', 'High Demand Gujarat', '48 hrs Price Rise Probability']}
        cta="Explore Full Insights"
      />

      <div className="card p-4 overflow-x-auto">
        <h3 className="font-semibold text-sm mb-3">Price Table</h3>
        <table className="w-full text-xs">
          <thead className="text-gray-400 border-b"><tr><th className="text-left p-2">Mandi</th><th>State</th><th>Commodity</th><th>Modal</th><th>Change</th><th>Anomaly</th></tr></thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.mandi} className="border-b">
                <td className="p-2 font-medium">{m.mandi}</td>
                <td className="p-2">{m.state}</td>
                <td className="p-2">{m.commodity}</td>
                <td className="p-2">₹{m.modal}</td>
                <td className={`p-2 ${m.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct(m.change)}</td>
                <td className="p-2">{m.isAnomaly ? '⚠' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Price Forecast — Cotton</h3>
        <PriceForecastChart data={demoPriceHistory.Cotton} />
      </div>
    </div>
  );
}
