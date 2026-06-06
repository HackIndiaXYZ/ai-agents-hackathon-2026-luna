import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import { useInventoryStore } from '../../store/inventoryStore';
import { demoInventoryChanges } from '../../data/demo';
import { inr, pct } from '../../lib/utils';
import toast from 'react-hot-toast';

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
const TREND = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, Cotton: 550 + Math.sin(i / 3) * 30, Soybean: 100 + i * 0.5 }));

export default function Inventory() {
  const { items, updateItem, changes, getTotal } = useInventoryStore();
  const [tab, setTab] = useState('physical');
  const [form, setForm] = useState({ commodity: 'Cotton', qty: 50, op: 'add' });

  const totalValue = getTotal();
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const topItem = [...items].sort((a, b) => b.qty * b.marketPrice - a.qty * a.marketPrice)[0];
  const pieData = items.map((i) => ({ name: i.commodity, value: i.qty * i.marketPrice }));

  const handleUpdate = () => {
    updateItem(form.commodity, form.qty, form.op);
    toast.success('Inventory updated');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory & Positions" subtitle="Physical stock and open trading positions" />

      <div className="flex gap-2">
        {['physical', 'positions'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-green-600 text-white' : 'border'}`}>
            {t === 'physical' ? 'Physical Inventory' : 'Open Positions'}
          </button>
        ))}
      </div>

      {tab === 'physical' ? (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4"><p className="text-xs text-gray-500">Total Inventory Value</p><p className="text-2xl font-bold">{inr(totalValue)}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">Total Quantity</p><p className="text-2xl font-bold">{totalQty.toLocaleString()} qtl</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">Most Valuable</p><p className="text-2xl font-bold">{topItem?.commodity}</p></div>
          </div>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left p-3">Commodity</th><th>Qty</th><th>Market Price</th><th>Market Value</th><th>Change</th><th></th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.commodity} className="border-t">
                      <td className="p-3 font-medium">{i.commodity}</td>
                      <td className="p-3">{i.qty} qtl</td>
                      <td className="p-3">₹{i.marketPrice.toLocaleString()}</td>
                      <td className="p-3 font-semibold">{inr(i.qty * i.marketPrice)}</td>
                      <td className="p-3 text-green-600">+2.17% ↑</td>
                      <td className="p-3"><button className="text-xs text-green-600">Update</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Quick Update</h3>
              <select value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} className="w-full mb-2 px-3 py-2 border rounded-lg text-sm">
                {items.map((i) => <option key={i.commodity}>{i.commodity}</option>)}
              </select>
              <input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} className="w-full mb-2 px-3 py-2 border rounded-lg text-sm" />
              <select value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })} className="w-full mb-3 px-3 py-2 border rounded-lg text-sm">
                <option value="add">Add</option><option value="subtract">Remove</option><option value="set">Set</option>
              </select>
              <button onClick={handleUpdate} className="w-full py-2 bg-green-600 text-white text-sm font-semibold rounded-lg">Update Inventory</button>
              <p className="text-xs text-gray-400 mt-2 text-center">Or ask Lucy: "50 quintal kapas add kar de"</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Portfolio Composition</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Recent Changes</h3>
              {[...changes, ...demoInventoryChanges].map((c, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b"><span>{c.text}</span><span className="text-gray-400 text-xs">{c.time}</span></div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Inventory Trend (30 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={TREND}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Cotton" stroke="#16a34a" fill="#dcfce7" />
                <Area type="monotone" dataKey="Soybean" stroke="#2563eb" fill="#dbeafe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500"><tr><th className="text-left p-2">Commodity</th><th>Long</th><th>Short</th><th>Net</th><th>MTM P&L</th></tr></thead>
            <tbody>
              {items.slice(0, 3).map((i) => (
                <tr key={i.commodity} className="border-t">
                  <td className="p-2">{i.commodity}</td>
                  <td className="p-2">{i.qty} qtl</td>
                  <td className="p-2">0</td>
                  <td className="p-2">{i.qty} qtl</td>
                  <td className="p-2 text-green-600">+₹12,400</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
