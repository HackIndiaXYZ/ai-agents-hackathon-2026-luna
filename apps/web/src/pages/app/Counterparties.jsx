import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Plus, RefreshCw, Shield, AlertTriangle } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

import { getCounterparties, getCounterpartyRisk, createCounterparty } from '../../lib/api';

export const Counterparties = () => {
  const [counterparties, setCounterparties] = useState([]);
  const [riskMap, setRiskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', city: 'Nagpur', state: 'Maharashtra', type: 'both' });

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getCounterparties();
      setCounterparties(list || []);
      const risks = {};
      await Promise.all(
        (list || []).slice(0, 20).map(async (cp) => {
          try {
            risks[cp.id] = await getCounterpartyRisk(cp.id);
          } catch {
            risks[cp.id] = cp;
          }
        })
      );
      setRiskMap(risks);
    } catch (e) {
      toast.error('Failed to load counterparties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      await createCounterparty(form);
      toast.success('Counterparty added');
      setShowForm(false);
      setForm({ name: '', city: 'Nagpur', state: 'Maharashtra', type: 'both' });
      loadData();
    } catch {
      toast.error('Could not create counterparty');
    }
  };

  const riskVariant = (level) => {
    const l = String(level || '').toLowerCase();
    if (l.includes('high')) return 'danger';
    if (l.includes('medium')) return 'warning';
    return 'success';
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Counterparty CRM"
        subtitle="Buyer and seller relationships with ML default-risk scoring"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        }
      />

      {showForm && (
        <Card className="p-5">
          <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-4">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <Button type="submit">Save Counterparty</Button>
          </form>
        </Card>
      )}

      <Card className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reliability</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Late Deliveries</th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp) => {
                  const risk = riskMap[cp.id] || cp;
                  return (
                    <tr key={cp.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{cp.name}</td>
                      <td className="py-3 px-4 capitalize">{cp.type || 'both'}</td>
                      <td className="py-3 px-4 text-slate-600">{cp.city}, {cp.state}</td>
                      <td className="py-3 px-4">{risk.reliability ?? risk.payment_history_score ?? '—'}%</td>
                      <td className="py-3 px-4">
                        <Badge variant={riskVariant(risk.risk_level)}>
                          {risk.risk_level || 'Low Risk'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{risk.late_deliveries ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 flex items-start gap-3 bg-emerald-50 border-emerald-100">
        <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-slate-800">XGBoost Counterparty Risk</p>
          <p className="text-xs text-slate-600 mt-1">
            Default probability is trained on delivery history, payment delays, and open exposure.
            Scores refresh when contracts or dispatches change.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Counterparties;
