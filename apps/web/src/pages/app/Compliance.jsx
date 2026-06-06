import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';

const STEPS = ['Upload document', 'OCR extraction', 'Entity resolution', 'Compliance check'];

export default function Compliance() {
  const [tab, setTab] = useState('extraction');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);

  const startExtraction = () => {
    setProcessing(true);
    setStep(0);
    setDone(false);
    STEPS.forEach((_, i) => {
      setTimeout(() => setStep(i), (i + 1) * 800);
      if (i === STEPS.length - 1) setTimeout(() => { setDone(true); setProcessing(false); }, (i + 2) * 800);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Compliance" subtitle="Document extraction, e-invoicing, and regulatory checks" />

      <div className="flex gap-2">
        {[
          { id: 'extraction', label: 'Document Extraction' },
          { id: 'invoice', label: 'Invoice Generator' },
          { id: 'checks', label: 'Compliance Checks' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-green-600 text-white' : 'border'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'extraction' && (
        <div className="card p-6">
          <button onClick={startExtraction} disabled={processing} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg mb-6">
            {processing ? 'Processing...' : 'Upload & Extract Sample Contract'}
          </button>
          {step >= 0 && (
            <div className="space-y-3 mb-6">
              {STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-2 text-sm ${i <= step ? 'text-green-600' : 'text-gray-400'}`}>
                  {i <= step ? '✓' : '○'} {s}
                </div>
              ))}
            </div>
          )}
          {done && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 text-sm space-y-2">
                <h4 className="font-semibold">Extracted Fields</h4>
                <p>Buyer: Nagpur Cotton Mills</p>
                <p>Seller: Ramesh Patil</p>
                <p>Commodity: Cotton (Kapas resolved)</p>
                <p>Quantity: 100 qtl</p>
                <p>Rate: ₹6,800/qtl</p>
                <p>Delivery: Nagpur, 15 Jun 2026</p>
              </div>
              <div className="border rounded-lg p-4 text-sm space-y-2">
                <h4 className="font-semibold">Compliance Flags</h4>
                <p className="text-green-600">✓ GSTIN verified</p>
                <p className="text-green-600">✓ e-NAM format compatible</p>
                <p className="text-amber-600">⚠ Delivery clause needs review</p>
                <button className="mt-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg">Create Contract from Extraction</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'invoice' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card p-4 space-y-3 text-sm">
            <h3 className="font-semibold">Invoice Details</h3>
            <input placeholder="Buyer name" defaultValue="Nagpur Cotton Mills" className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="Amount" defaultValue="680000" className="w-full px-3 py-2 border rounded-lg" />
            <input placeholder="GST %" defaultValue="5" className="w-full px-3 py-2 border rounded-lg" />
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Generate Invoice</button>
          </div>
          <div className="card p-6 print-only border-2" id="invoice-preview">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">TAX INVOICE</h2>
              <p className="text-xs text-gray-500">Ramesh Cotton Traders · GSTIN: 27AAAAA0000A1Z5</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><p className="font-semibold">Bill To</p><p>Nagpur Cotton Mills</p></div>
              <div className="text-right"><p>Invoice # INV-2026-0042</p><p>Date: 05 Jun 2026</p></div>
            </div>
            <table className="w-full text-sm border mb-4">
              <thead><tr className="border-b bg-gray-50"><th className="p-2 text-left">Item</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Amount</th></tr></thead>
              <tbody><tr className="border-b"><td className="p-2">Cotton</td><td className="p-2 text-center">100 qtl</td><td className="p-2 text-center">₹6,800</td><td className="p-2 text-right">₹6,80,000</td></tr></tbody>
            </table>
            <div className="text-right text-sm space-y-1">
              <p>Subtotal: ₹6,80,000</p>
              <p>GST (5%): ₹34,000</p>
              <p className="font-bold text-lg">Total: ₹7,14,000</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'checks' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'GST Compliance', status: 'Pass', detail: 'All active contracts have valid GSTIN' },
            { title: 'e-NAM Registration', status: 'Pass', detail: 'Trader registered on e-NAM platform' },
            { title: 'APMC License', status: 'Warning', detail: 'License expires in 45 days' },
            { title: 'Warehouse Receipts', status: 'Pass', detail: '3 WDRA receipts on file' },
          ].map((c) => (
            <div key={c.title} className="card p-4">
              <div className="flex justify-between mb-2">
                <h4 className="font-semibold text-sm">{c.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${c.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              </div>
              <p className="text-sm text-gray-500">{c.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
