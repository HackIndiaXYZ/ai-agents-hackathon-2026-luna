import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import IndiaMap from '../../components/ui/IndiaMap';
import { demoOpportunities, MANDI_COORDS } from '../../data/demo';

export default function Opportunities() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState(null);

  const filtered = demoOpportunities.filter((o) => {
    if (typeFilter !== 'All' && o.type !== typeFilter) return false;
    if (cityFilter && o.origin !== cityFilter && o.destination !== cityFilter) return false;
    return true;
  });

  const cityCounts = {};
  demoOpportunities.forEach((o) => {
    [o.origin, o.destination].forEach((c) => { cityCounts[c] = (cityCounts[c] || 0) + 1; });
  });

  const markers = Object.entries(cityCounts).map(([city, count]) => {
    const coords = MANDI_COORDS[city];
    if (!coords) return null;
    return {
      lat: coords[1], lng: coords[0], size: 6 + count * 3,
      color: count >= 2 ? '#16a34a' : count === 1 ? '#d97706' : '#dc2626',
      label: city, mandi: city,
    };
  }).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title="Trade Opportunities" subtitle="AI-identified high-probability logistics and trade matches" />

      <div className="flex gap-2 flex-wrap">
        {['All', 'FORWARD_LOAD', 'RETURN_LOAD'].map((f) => (
          <button key={f} onClick={() => setTypeFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${typeFilter === f ? 'bg-green-600 text-white' : 'border'}`}>
            {f === 'All' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[2fr_3fr] gap-4">
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="card p-4 text-sm space-y-2">
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">{o.type.replace('_', ' ')}</span>
              <p className="font-semibold">{o.commodity} · {o.origin} → {o.destination}</p>
              <p className="text-gray-500">{o.qty} {o.unit} · Pickup: {o.availableFrom}</p>
              <p>Est. Margin: <span className="font-semibold text-green-600">{o.margin}</span></p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${o.matchScore}%` }} /></div>
                <span className="text-xs font-bold text-green-600">{o.matchScore}%</span>
              </div>
              <button className="text-xs text-green-600 font-semibold">View Details →</button>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-2">Opportunity Discovery Map</h3>
          <IndiaMap markers={markers} height={360} onMarkerClick={(m) => setCityFilter(m.mandi)} />
          {cityFilter && <button onClick={() => setCityFilter(null)} className="text-xs text-green-600 mt-2">Clear filter: {cityFilter}</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left p-3">Route</th><th>Commodity</th><th>Volume</th><th>Margin</th><th>Score</th><th></th></tr></thead>
          <tbody>
            {demoOpportunities.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">{o.origin} → {o.destination}</td>
                <td className="p-3">{o.commodity}</td>
                <td className="p-3">{o.qty} {o.unit}</td>
                <td className="p-3 text-green-600 font-medium">{o.margin}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded"><div className="h-full bg-green-500 rounded" style={{ width: `${o.matchScore}%` }} /></div>
                    <span className="text-xs">{o.matchScore}%</span>
                  </div>
                </td>
                <td className="p-3"><button className="text-xs px-2 py-1 bg-green-600 text-white rounded">Post</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
