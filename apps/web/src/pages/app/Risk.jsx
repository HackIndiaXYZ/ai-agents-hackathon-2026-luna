import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import PnLDisplay from '../../components/ui/PnLDisplay';
import ContractTypeBadge from '../../components/ui/ContractTypeBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import PriceForecastChart from '../../components/ui/PriceForecastChart';
import { ModelCredibilityCard } from '../../components/ui/ModelCredibilityBadge';
import { useContractStore } from '../../store/contractStore';
import { demoAlerts, demoMacroSignals, demoCounterparties, demoPriceHistory, demoMLModels } from '../../data/demo';
import { inr, exportCSV } from '../../lib/utils';

export default function Risk() {
  const contracts = useContractStore((s) => s.contracts);
  const [sortKey, setSortKey] = useState('pnl');
  const [commodity, setCommodity] = useState('Cotton');
  const sorted = [...contracts].sort((a, b) => sortKey === 'pnl' ? a.pnl - b.pnl : a[sortKey]?.localeCompare?.(b[sortKey]) || 0);
  const worst = sorted[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Risk & P&L" subtitle="Mark-to-market, forecasts, and counterparty exposure" />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase">Total Unrealized P&L</p>
          <PnLDisplay value={-713450} size="lg" />
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase">Portfolio Concentration</p>
          <p className="text-lg font-bold text-amber-600">Chickpea 35.6% ⚠</p>
          <p className="text-xs text-gray-500">Concentration Risk</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase">Worst Performer</p>
          <p className="font-bold">{worst?.id}</p>
          <PnLDisplay value={worst?.pnl} size="md" />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-between mb-3">
          <h3 className="font-semibold">Full MtM Table</h3>
          <button onClick={() => exportCSV(sorted, 'mtm-contracts.csv')} className="text-xs px-3 py-1.5 border rounded-lg">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-400 border-b">
              <tr>
                {['id', 'type', 'commodity', 'qty', 'contractPrice', 'marketPrice', 'pnl', 'location', 'deliveryDate', 'status'].map((k) => (
                  <th key={k} className="text-left p-2 cursor-pointer hover:text-gray-600" onClick={() => setSortKey(k)}>{k.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-b" style={{ borderLeft: `3px solid ${c.pnl >= 0 ? '#16a34a' : '#dc2626'}` }}>
                  <td className="p-2 font-mono">{c.id}</td>
                  <td className="p-2"><ContractTypeBadge type={c.type} /></td>
                  <td className="p-2">{c.commodity}</td>
                  <td className="p-2">{c.qty}</td>
                  <td className="p-2">₹{c.contractPrice}</td>
                  <td className="p-2">₹{c.marketPrice}</td>
                  <td className="p-2"><PnLDisplay value={c.pnl} size="sm" /></td>
                  <td className="p-2">{c.location}</td>
                  <td className="p-2">{c.deliveryDate}</td>
                  <td className="p-2"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold">Price Forecast</h3>
          <select value={commodity} onChange={(e) => setCommodity(e.target.value)} className="text-sm border rounded-lg px-2 py-1">
            {Object.keys(demoPriceHistory).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <PriceForecastChart data={demoPriceHistory[commodity] || demoPriceHistory.Cotton} />
        <div className="mt-4"><ModelCredibilityCard model={demoMLModels.Cotton} commodity={commodity} /></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Weather Signals</h3>
          {demoAlerts.filter((a) => a.type === 'weather_risk').map((a) => (
            <div key={a.id} className="p-3 border rounded-lg mb-2 text-sm">
              <p>{a.message}</p>
              <button className="text-xs text-green-600 mt-1">Click to see 7-day forecast →</button>
            </div>
          ))}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Market Sentiment</h3>
          {demoMacroSignals.map((s) => (
            <div key={s.commodity} className="flex items-start gap-3 p-2 border-b text-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${s.sentiment === 'bullish' ? 'bg-green-500' : s.sentiment === 'bearish' ? 'bg-red-500' : 'bg-gray-400'}`}>
                {s.sentiment === 'bullish' ? '↑' : s.sentiment === 'bearish' ? '↓' : '→'}
              </span>
              <div className="flex-1">
                <p className="font-medium">{s.commodity}</p>
                <p className="text-xs text-gray-500">{s.keySignal}</p>
                <div className="flex gap-2 mt-1">
                  <div className="h-1 flex-1 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${s.confidence * 100}%` }} /></div>
                  <span className="text-[10px] text-amber-600 uppercase">{s.urgency.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Counterparty Risk</h3>
        <table className="w-full text-xs">
          <thead className="text-gray-400"><tr><th className="text-left p-2">Name</th><th>Type</th><th>Trades</th><th>On-Time</th><th>Reliability</th><th>Exposure</th><th>ML Risk</th></tr></thead>
          <tbody>
            {demoCounterparties.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2 capitalize">{c.type}</td>
                <td className="p-2">{c.trades}</td>
                <td className="p-2">{Math.round(c.onTime * 100)}%</td>
                <td className="p-2"><div className="w-20 h-1.5 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${c.reliability * 100}%` }} /></div></td>
                <td className="p-2">{inr(c.openExposure)}</td>
                <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.mlRisk > 0.3 ? 'bg-red-100 text-red-700' : c.mlRisk > 0.2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{Math.round(c.mlRisk * 100)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Training Data Integrity</h3>
        {Object.entries(demoMLModels).map(([name, m]) => (
          <div key={name} className="mb-2 text-sm">
            <div className="flex justify-between mb-1"><span>{name}</span><span className="text-green-600">{m.realDataPct}% real</span></div>
            <div className="h-2 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${m.realDataPct}%` }} /></div>
          </div>
        ))}
        <button className="text-xs text-green-600 mt-2">View full data report →</button>
      </div>
    </div>
  );
}
