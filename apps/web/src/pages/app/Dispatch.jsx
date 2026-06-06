import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import IndiaMap from '../../components/ui/IndiaMap';
import ConfidenceGauge from '../../components/ui/ConfidenceGauge';
import StatusBadge from '../../components/ui/StatusBadge';
import { demoDispatches, demoCorridors } from '../../data/demo';

export default function Dispatch() {
  const [from, setFrom] = useState('Amravati');
  const [to, setTo] = useState('Nagpur');
  const [scored, setScored] = useState(null);

  const routes = demoDispatches.map((d) => ({
    from: [d.originLng, d.originLat],
    to: [d.destLng, d.destLat],
    color: d.daysLate > 0 ? '#d97706' : d.daysLate > 2 ? '#dc2626' : '#16a34a',
    animated: true,
    width: 1 + d.qty / 100,
  }));

  const scoreRoute = () => {
    setScored({ confidence: 0.87, distance: '142 km', hours: '4.2 hrs', delay: 'Low', weather: 'Clear skies' });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dispatch Intelligence" subtitle="Real-time shipment tracking and route optimization" />

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div><label className="text-xs text-gray-500">From</label><input value={from} onChange={(e) => setFrom(e.target.value)} className="block mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="text-xs text-gray-500">To</label><input value={to} onChange={(e) => setTo(e.target.value)} className="block mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <button onClick={scoreRoute} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg">Score Route</button>
        {scored && (
          <div className="flex items-center gap-4 ml-4">
            <ConfidenceGauge score={scored.confidence} label="Route Score" size={100} />
            <div className="text-sm space-y-1">
              <p>{scored.distance} · {scored.hours}</p>
              <p>Delay risk: {scored.delay}</p>
              <p className="text-green-600">{scored.weather}</p>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4">
        <IndiaMap routes={routes} height={400} markers={demoDispatches.flatMap((d) => [
          { lat: d.originLat, lng: d.originLng, size: 6, color: '#16a34a', label: d.origin },
          { lat: d.destLat, lng: d.destLng, size: 6, color: '#d97706', label: d.destination },
        ])} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {['12 In Transit', '3 Delivered Today', '2 Delayed', '1 Loading'].map((s) => (
          <div key={s} className="card p-3 text-center text-sm font-semibold">{s}</div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left p-3">ID</th><th>Contract</th><th>Route</th><th>Qty</th><th>Vehicle</th><th>ETA</th><th>Confidence</th><th>Status</th></tr></thead>
          <tbody>
            {demoDispatches.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3 font-mono text-xs">{d.id}</td>
                <td className="p-3">{d.contractId}</td>
                <td className="p-3">{d.origin} → {d.destination}</td>
                <td className="p-3">{d.qty} qtl</td>
                <td className="p-3">{d.vehicle}</td>
                <td className="p-3">{d.eta}</td>
                <td className="p-3">{Math.round(d.confidence * 100)}%</td>
                <td className="p-3"><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Corridor Intelligence</h3>
        <div className="space-y-3">
          {demoCorridors.map((c) => (
            <div key={c.route} className="flex items-center gap-4 text-sm">
              <span className="w-40 font-medium">{c.route}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${c.reliability * 100}%` }} /></div>
              <span className="text-xs text-gray-500 w-24">{c.weather}</span>
              <span className="text-xs w-16">{c.volume} qtl</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
