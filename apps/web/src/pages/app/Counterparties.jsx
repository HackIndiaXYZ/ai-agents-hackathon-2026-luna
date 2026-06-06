import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { demoCounterparties, demoDiscoveredCounterparties } from '../../data/demo';
import { inr } from '../../lib/utils';

export default function Counterparties() {
  const [selected, setSelected] = useState(demoCounterparties[0]);
  const [discovered, setDiscovered] = useState([]);
  const all = [...demoCounterparties, ...discovered];

  const findNew = () => setDiscovered(demoDiscoveredCounterparties);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counterparties"
        subtitle="Relationship intelligence and risk scoring"
        actions={
          <button onClick={findNew} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg">
            Find New Counterparties
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{all.length}</p></div>
        <div className="card p-3"><p className="text-xs text-gray-500">Avg Reliability</p><p className="text-xl font-bold">87%</p></div>
        <div className="card p-3"><p className="text-xs text-gray-500">High Risk</p><p className="text-xl font-bold text-red-600">3</p></div>
        <div className="card p-3"><p className="text-xs text-gray-500">Open Exposure</p><p className="text-xl font-bold">{inr(16175000)}</p></div>
      </div>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left p-3">Name</th><th>Type</th><th>Location</th><th>Reliability</th><th>Exposure</th><th>ML Risk</th></tr></thead>
            <tbody>
              {all.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className={`border-t cursor-pointer hover:bg-green-50 ${selected?.id === c.id ? 'bg-green-50' : ''}`}>
                  <td className="p-3">
                    {c.name}
                    {c.discovered && <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">Discovered by Lucy AI</span>}
                  </td>
                  <td className="p-3 capitalize">{c.type}</td>
                  <td className="p-3">{c.city}, {c.state}</td>
                  <td className="p-3">{Math.round(c.reliability * 100)}%</td>
                  <td className="p-3">{inr(c.openExposure)}</td>
                  <td className="p-3">{Math.round(c.mlRisk * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card p-4 space-y-3">
            <h3 className="font-bold">{selected.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{selected.type} · {selected.city}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Reliability</span><span className="font-semibold text-green-600">{Math.round(selected.reliability * 100)}%</span></div>
              <div className="h-2 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${selected.reliability * 100}%` }} /></div>
              <div className="flex justify-between"><span>ML Risk Score</span><span className={selected.mlRisk > 0.3 ? 'text-red-600' : 'text-green-600'}>{Math.round(selected.mlRisk * 100)}%</span></div>
              <div className="flex justify-between"><span>Trades</span><span>{selected.trades}</span></div>
              <div className="flex justify-between"><span>Open Exposure</span><span>{inr(selected.openExposure)}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          'Ramesh Farm Collective is your most reliable counterparty (95% on-time)',
          '87% of your network maintains on-time deliveries',
          '3 counterparties need attention due to risk signals',
          '7 new high-potential partners identified in 3 states',
        ].map((t) => (
          <div key={t} className="card p-3 text-sm">{t}</div>
        ))}
      </div>
    </div>
  );
}
