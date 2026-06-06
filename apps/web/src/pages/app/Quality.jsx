import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import toast from 'react-hot-toast';

export default function Quality() {
  const [moisture, setMoisture] = useState(12);
  const [impurity, setImpurity] = useState(3);
  const [basePrice] = useState(6820);
  const [location, setLocation] = useState(null);

  const moistureDeduction = Math.max(0, (moisture - 10) * 50);
  const impurityDeduction = Math.max(0, (impurity - 2) * 80);
  const adjustedPrice = basePrice - moistureDeduction - impurityDeduction;

  const useGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) });
        toast.success('Location captured');
      },
      () => toast.error('Could not get location')
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Lots" subtitle="Grade assessment, price adjustment, and lot traceability" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Lot Assessment — Cotton Lot #QL-2026-018</h3>
          <div>
            <label className="text-sm font-medium">Moisture Content: {moisture}%</label>
            <input type="range" min={8} max={18} value={moisture} onChange={(e) => setMoisture(+e.target.value)} className="w-full mt-2" />
            <p className="text-xs text-gray-500">Standard: ≤10%</p>
          </div>
          <div>
            <label className="text-sm font-medium">Impurity: {impurity}%</label>
            <input type="range" min={0} max={8} value={impurity} onChange={(e) => setImpurity(+e.target.value)} className="w-full mt-2" />
            <p className="text-xs text-gray-500">Standard: ≤2%</p>
          </div>
          <div>
            <label className="text-sm font-medium">Grade</label>
            <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
              <option>FAQ (Fair Average Quality)</option>
              <option>Grade A</option>
              <option>Grade B</option>
            </select>
          </div>
          <button onClick={useGPS} className="px-4 py-2 border rounded-lg text-sm font-medium">
            Use Current Location
          </button>
          {location && <p className="text-xs text-green-600">GPS: {location.lat}, {location.lng}</p>}
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Price Adjustment Calculator</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Base Price</span><span>₹{basePrice}/qtl</span></div>
            <div className="flex justify-between text-red-600"><span>Moisture Deduction</span><span>-₹{moistureDeduction}</span></div>
            <div className="flex justify-between text-red-600"><span>Impurity Deduction</span><span>-₹{impurityDeduction}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Adjusted Price</span>
              <span className="text-green-600">₹{adjustedPrice}/qtl</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
            {moisture > 12 || impurity > 4
              ? 'Quality below standard — recommend re-grading or price negotiation.'
              : 'Quality within acceptable range for FAQ grade cotton.'}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left p-3">Lot ID</th><th>Commodity</th><th>Qty</th><th>Grade</th><th>Moisture</th><th>Adjusted Price</th><th>Status</th></tr></thead>
          <tbody>
            {[
              { id: 'QL-2026-018', commodity: 'Cotton', qty: 100, grade: 'FAQ', moisture: '12%', price: adjustedPrice, status: 'Pending' },
              { id: 'QL-2026-015', commodity: 'Soybean', qty: 80, grade: 'Grade A', moisture: '9%', price: 4820, status: 'Approved' },
              { id: 'QL-2026-012', commodity: 'Wheat', qty: 150, grade: 'FAQ', moisture: '11%', price: 2280, status: 'Approved' },
            ].map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-mono text-xs">{l.id}</td>
                <td className="p-3">{l.commodity}</td>
                <td className="p-3">{l.qty} qtl</td>
                <td className="p-3">{l.grade}</td>
                <td className="p-3">{l.moisture}</td>
                <td className="p-3 font-semibold">₹{l.price}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
