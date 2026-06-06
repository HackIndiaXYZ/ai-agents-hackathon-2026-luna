import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import ResolutionBadge from '../../components/ui/ResolutionBadge';
import PriceForecastChart from '../../components/ui/PriceForecastChart';
import { ModelCredibilityBadge } from '../../components/ui/ModelCredibilityBadge';
import { useContractStore } from '../../store/contractStore';
import { useLucyStore } from '../../store/lucyStore';
import { COMMODITY_ALIASES, demoCounterparties, demoPriceHistory, demoMLModels } from '../../data/demo';
import { inr } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function ContractNew() {
  const navigate = useNavigate();
  const addContract = useContractStore((s) => s.addContract);
  const prefill = useLucyStore((s) => s.pendingFormPrefill);
  const setPrefill = useLucyStore((s) => s.setPendingFormPrefill);

  const [type, setType] = useState('BUY');
  const [commodityInput, setCommodityInput] = useState('');
  const [resolved, setResolved] = useState(null);
  const [counterparty, setCounterparty] = useState('');
  const [qty, setQty] = useState(100);
  const [unit, setUnit] = useState('qtl');
  const [priceType, setPriceType] = useState('Fixed');
  const [price, setPrice] = useState(6820);
  const [deliveryDate, setDeliveryDate] = useState('2026-06-15');
  const [location, setLocation] = useState('Amravati');

  useEffect(() => {
    if (prefill) {
      setType(prefill.type || 'BUY');
      setCommodityInput(prefill.commodity || '');
      setResolved({ commodity: prefill.commodity, tier: 'embedding', confidence: 94 });
      setCounterparty(prefill.counterparty || '');
      setQty(prefill.qty || 100);
      setPrice(prefill.contractPrice || 6820);
      setLocation(prefill.location || 'Amravati');
      setDeliveryDate(prefill.deliveryDate || '2026-06-15');
      setPrefill(null);
    }
  }, [prefill]);

  const resolveCommodity = (val) => {
    setCommodityInput(val);
    const key = val.toLowerCase().trim();
    const alias = COMMODITY_ALIASES[key];
    if (alias) setResolved(alias);
    else if (val.length > 2) setResolved({ commodity: val, tier: 'embedding', confidence: 78 });
    else setResolved(null);
  };

  const cp = demoCounterparties.find((c) => c.name === counterparty);
  const estValue = qty * price;
  const model = resolved ? demoMLModels[resolved.commodity.replace(' ', '')] || demoMLModels.Cotton : null;

  const submit = (status) => {
    const contract = {
      type, commodity: resolved?.commodity || commodityInput, qty, unit,
      contractPrice: price, marketPrice: 7018, pnl: 0, status: status === 'draft' ? 'DRAFT' : 'CONFIRMED',
      counterparty, deliveryDate, location,
      buyer: type === 'BUY' ? 'Ramesh Patil' : counterparty,
      seller: type === 'SELL' ? 'Ramesh Patil' : counterparty,
    };
    addContract(contract);
    toast.success(status === 'draft' ? 'Saved as draft' : 'Contract created');
    navigate('/app/contracts');
  };

  return (
    <div>
      <PageHeader title="New Contract" subtitle="AI-assisted contract creation with live risk preview" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <div className="flex gap-2">
            {['BUY', 'SELL'].map((t) => (
              <button key={t} onClick={() => setType(t)} className={`flex-1 py-3 rounded-lg font-bold text-sm ${type === t ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>{t}</button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium">Commodity</label>
            <input value={commodityInput} onChange={(e) => resolveCommodity(e.target.value)} placeholder="Try 'Kapas'" className="w-full mt-1 px-3 py-2 border rounded-lg" />
            {resolved && <div className="mt-2"><ResolutionBadge commodity={resolved.commodity} tier={resolved.tier} confidence={resolved.confidence} /></div>}
          </div>
          <div>
            <label className="text-sm font-medium">Counterparty</label>
            <select value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg">
              <option value="">Select counterparty</option>
              {demoCounterparties.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <input type="number" value={qty} onChange={(e) => setQty(+e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg">
                <option>qtl</option><option>kg</option><option>tonne</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            {['Fixed', 'Formula'].map((p) => (
              <button key={p} onClick={() => setPriceType(p)} className={`px-4 py-2 rounded-lg text-sm ${priceType === p ? 'bg-green-100 text-green-700 font-semibold' : 'bg-gray-50'}`}>{p}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Price (₹/qtl)</label>
              <input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium">Delivery Date</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Delivery Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => submit('draft')} className="flex-1 py-2.5 border rounded-lg font-medium">Save as Draft</button>
            <button onClick={() => submit('confirm')} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-semibold">Create & Confirm</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Live Contract Preview</h3>
            <p className="text-sm">{type} {qty} {unit} {resolved?.commodity || commodityInput} @ ₹{price}/qtl</p>
            <p className="text-2xl font-bold mt-2">{inr(estValue)}</p>
            <p className="text-xs text-gray-500 mt-1">TN-2026-XXXX (auto-assigned)</p>
          </div>
          {cp && (
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-2">Counterparty Risk Assessment</h3>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${cp.mlRisk < 0.3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                Reliability: {Math.round(cp.reliability * 100)}% {cp.mlRisk < 0.3 ? '✓ Low Risk' : '⚠ Elevated Risk'}
              </span>
              <p className="text-xs text-gray-500 mt-2">ML Default Risk: {Math.round(cp.mlRisk * 100)}%</p>
              <p className="text-xs text-gray-500">{cp.trades} completed trades, {Math.round(cp.onTime * 100)}% on-time delivery</p>
            </div>
          )}
          {resolved && (
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-2">ML Price Forecast</h3>
              <p className="text-sm">Current market: ₹6,820/qtl (Nagpur)</p>
              <p className="text-sm text-green-600 font-medium">7-day forecast: ₹7,150 (+4.8%)</p>
              <PriceForecastChart data={demoPriceHistory.Cotton} height={140} />
              {model && <div className="mt-2"><ModelCredibilityBadge model={model} /></div>}
            </div>
          )}
          <div className="card p-4 text-sm">
            <h3 className="font-semibold mb-2">Contract Risk Preview</h3>
            {type === 'SELL' ? (
              <p className="text-green-600">Market is ₹420 above your price — favorable</p>
            ) : (
              <p className="text-amber-600">Buying above market — exposure risk elevated</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
