import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useContractStore } from '../../store/contractStore';
import { demoContractOverview } from '../../data/demo';
import { inr } from '../../lib/utils';
import { useLucyStore } from '../../store/lucyStore';

const STATUS_MAP = { CONFIRMED: 'Active', DRAFT: 'Pending', IN_TRANSIT: 'Active', DELIVERED: 'Completed' };

export default function Contracts() {
  const contracts = useContractStore((s) => s.contracts);
  const [selected, setSelected] = useState(contracts[0]);
  const [filter, setFilter] = useState('All');
  const openLucy = useLucyStore((s) => s.open);

  const filtered = filter === 'All' ? contracts : contracts.filter((c) => {
    const s = STATUS_MAP[c.status] || c.status;
    return s === filter || (filter === 'Active' && ['CONFIRMED', 'IN_TRANSIT'].includes(c.status));
  });

  return (
    <div>
      <PageHeader
        title="Contracts Overview"
        subtitle="All your contracts at a glance"
        actions={
          <Link to="/app/contracts/new" className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">
            New Contract +
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Contracts', value: demoContractOverview.total, delta: '+18.6%' },
          { label: 'Active Contracts', value: demoContractOverview.active, delta: '+16.4%' },
          { label: 'Total Value Locked', value: '₹1,342 Cr', delta: '+22.7%' },
          { label: 'Expiring Soon', value: demoContractOverview.expiringSoon, delta: 'Next 7 days', warn: true },
        ].map((s) => (
          <div key={s.label} className={`card p-3 ${s.warn ? 'border-amber-200 bg-amber-50/50' : ''}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-green-600">{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['All Status', 'Active', 'Pending', 'Completed', 'Cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f === 'All Status' ? 'All' : f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              (filter === 'All' && f === 'All Status') || filter === f ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-4">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left p-3">Contract ID</th>
                <th className="text-left p-3">Commodity</th>
                <th className="text-left p-3">Counterparty</th>
                <th className="text-left p-3">Value</th>
                <th className="text-left p-3">Valid Till</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`border-t cursor-pointer hover:bg-green-50/50 ${selected?.id === c.id ? 'bg-green-50' : ''}`}
                >
                  <td className="p-3 font-mono text-xs">{c.id}</td>
                  <td className="p-3">{c.commodity}</td>
                  <td className="p-3">{c.counterparty}</td>
                  <td className="p-3">{inr(c.qty * (c.contractPrice || c.marketPrice))}</td>
                  <td className="p-3">{c.deliveryDate}</td>
                  <td className="p-3"><StatusBadge status={STATUS_MAP[c.status] || c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{selected.id}</h3>
              <StatusBadge status={STATUS_MAP[selected.status] || selected.status} />
            </div>
            <p className="text-sm font-medium">{selected.commodity} Supply Contract</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Buyer</p><p>{selected.buyer || selected.counterparty}</p></div>
              <div><p className="text-gray-500 text-xs">Seller</p><p>{selected.seller || 'Ramesh Patil'}</p></div>
              <div><p className="text-gray-500 text-xs">Quantity</p><p>{selected.qty} {selected.unit}</p></div>
              <div><p className="text-gray-500 text-xs">Rate</p><p>₹{selected.contractPrice || selected.marketPrice}/qtl</p></div>
              <div><p className="text-gray-500 text-xs">Total Value</p><p className="font-semibold">{inr(selected.qty * (selected.contractPrice || selected.marketPrice))}</p></div>
              <div><p className="text-gray-500 text-xs">End Date</p><p>{selected.deliveryDate}</p></div>
            </div>
            <button className="w-full py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">View Contract Details →</button>
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-sm">
              <p className="text-gray-700 mb-2">Your contract with Shree Cotton Mills is expiring in 2 days. Would you like me to initiate renewal?</p>
              <div className="flex gap-2">
                <button onClick={openLucy} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg">Renew Contract</button>
                <button className="px-3 py-1.5 border text-xs rounded-lg">View Details</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-6">
        {['100% Document Security', '2.4x Faster Turnaround', 'Zero Manual Errors', 'All Parties Connected'].map((t) => (
          <div key={t} className="card p-4 text-center text-sm font-medium">{t}</div>
        ))}
      </div>
    </div>
  );
}
