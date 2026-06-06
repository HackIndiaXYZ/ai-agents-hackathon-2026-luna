import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import ForceGraph from '../../components/network/ForceGraph';
import IndiaMap from '../../components/ui/IndiaMap';
import { demoContracts, demoDispatches, demoCounterparties, demoNetworkEvents, demoOpportunities, MANDI_COORDS } from '../../data/demo';

export default function Network() {
  const navigate = useNavigate();

  const { nodes, links } = useMemo(() => {
    const nodes = [];
    const links = [];
    const seen = new Set();

    demoCounterparties.forEach((cp) => {
      if (!seen.has(cp.id)) {
        nodes.push({ id: cp.id, label: cp.name, shape: 'diamond', color: '#2563eb' });
        seen.add(cp.id);
      }
    });

    ['Amravati', 'Nagpur', 'Indore', 'Bhopal', 'Mumbai'].forEach((city) => {
      const id = `loc-${city}`;
      if (!seen.has(id)) {
        nodes.push({ id, label: city, shape: 'circle', color: '#16a34a' });
        seen.add(id);
      }
    });

    ['Nagpur', 'Indore', 'Akola'].forEach((city) => {
      const id = `mandi-${city}`;
      if (!seen.has(id)) {
        nodes.push({ id, label: city, shape: 'square', color: '#d97706' });
        seen.add(id);
      }
    });

    demoContracts.forEach((c, i) => {
      const cpId = demoCounterparties.find((x) => x.name === c.counterparty)?.id || 'cp-1';
      const locId = `loc-${c.location}`;
      links.push({
        source: c.type === 'BUY' ? cpId : 'loc-Amravati',
        target: c.type === 'BUY' ? 'loc-Amravati' : cpId,
        color: c.pnl >= 0 ? '#16a34a' : '#dc2626',
        width: 2,
      });
    });

    demoDispatches.forEach((d) => {
      links.push({
        source: `loc-${d.origin}`, target: `loc-${d.destination}`,
        color: '#0891b2', dashed: true, width: 1.5,
      });
    });

    return { nodes, links };
  }, []);

  const oppMarkers = demoOpportunities.map((o) => {
    const coords = MANDI_COORDS[o.origin];
    if (!coords) return null;
    return { lat: coords[1], lng: coords[0], size: 8, color: '#16a34a', label: o.origin };
  }).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title="Supply Chain Network" subtitle="Interactive relationship graph and activity feed" />

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <div className="card p-4">
          <ForceGraph nodes={nodes} links={links} height={420} onNodeClick={(n) => {
            if (n.label?.includes('Mills') || n.label?.includes('Agro')) navigate('/app/counterparties');
          }} />
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>● Location</span><span>◆ Counterparty</span><span>■ Mandi</span>
            <span>— Contract</span><span>- - Dispatch</span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Network Activity Feed</h3>
          <div className="space-y-3">
            {demoNetworkEvents.map((e, i) => (
              <div key={i} className="text-sm border-l-2 border-green-500 pl-3">
                <p>{e.text}</p>
                <p className="text-xs text-gray-400">{e.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {['24 Total Relationships', '14 Profitable Links', '3 At Risk Links', '7 Opportunity Links'].map((s) => (
          <div key={s} className="card p-3 text-center text-sm font-semibold">{s}</div>
        ))}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-2">Opportunity Discovery Map</h3>
        <IndiaMap markers={oppMarkers} height={280} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left p-3">Name</th><th>Type</th><th>Location</th><th>Reliability</th><th>Risk</th><th>Contracts</th></tr></thead>
          <tbody>
            {demoCounterparties.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3 capitalize">{c.type}</td>
                <td className="p-3">{c.city}</td>
                <td className="p-3">{Math.round(c.reliability * 100)}%</td>
                <td className="p-3">{c.mlRisk < 0.2 ? 'Low' : 'Medium'}</td>
                <td className="p-3">{Math.floor(c.trades / 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
