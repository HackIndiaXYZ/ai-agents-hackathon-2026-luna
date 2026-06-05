import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import {
  Leaf,
  Droplets,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  XCircle,
  Plus,
  RotateCw,
  ClipboardCheck,
  Wheat,
  Info,
  Minus,
  Star,
  Download,
  TrendingDown,
  Thermometer,
  Search,
  Eye,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

import { formatINR } from '../../utils/format';
import { getContracts, getQualityLots } from '../../lib/api';

// ─── DEMO DATA ────────────────────────────────────────────
const MOISTURE_THRESHOLDS = {
  Cotton:    { ideal: 8,  warn: 12, reject: 18 },
  Soybean:   { ideal: 10, warn: 13, reject: 17 },
  Wheat:     { ideal: 10, warn: 12, reject: 16 },
  Onion:     { ideal: 5,  warn: 8,  reject: 14 },
  'Pigeon Pea': { ideal: 9, warn: 12, reject: 16 },
  Groundnut: { ideal: 7,  warn: 10, reject: 15 },
  Mustard:   { ideal: 6,  warn: 9,  reject: 14 },
  Chilli:    { ideal: 8,  warn: 11, reject: 16 },
};

const GRADE_LABELS = {
  A: { label: 'Premium (A)', color: 'success', penalty: 0 },
  B: { label: 'Standard (B)', color: 'info', penalty: 3 },
  C: { label: 'Below Avg (C)', color: 'warning', penalty: 7 },
  Mixed: { label: 'Mixed Lot', color: 'danger', penalty: 10 },
};

const DEMO_QUALITY_LOTS = [
  {
    id: 'QL-001',
    contract_id: 'CTR-2026-01',
    commodity: 'Cotton',
    quantity: 120,
    moisture: 9.2,
    broken_pct: 1.5,
    foreign_matter: 0.8,
    grade: 'A',
    base_price: 7250,
    adjusted_price: 7250,
    penalty_pct: 0,
    gps_lat: '21.1458',
    gps_lng: '79.0882',
    location_name: 'Nagpur Mandi Gate 3',
    agent_name: 'Suresh Pawar',
    agent_remarks: 'Premium lot. Clean fibers, well dried. Acceptable for export grade.',
    inspected_at: '2026-06-01T09:30:00Z',
    status: 'approved',
  },
  {
    id: 'QL-002',
    contract_id: 'CTR-2026-02',
    commodity: 'Soybean',
    quantity: 80,
    moisture: 14.1,
    broken_pct: 4.2,
    foreign_matter: 3.1,
    grade: 'C',
    base_price: 4800,
    adjusted_price: 4128,
    penalty_pct: 14,
    gps_lat: '22.7196',
    gps_lng: '75.8577',
    location_name: 'Indore APMC Yard 7',
    agent_name: 'Manoj Thakur',
    agent_remarks: 'High moisture, needs re-drying. Foreign matter exceeds threshold — price reduced.',
    inspected_at: '2026-06-02T14:15:00Z',
    status: 'needs_review',
  },
  {
    id: 'QL-003',
    contract_id: 'CTR-2026-04',
    commodity: 'Wheat',
    quantity: 200,
    moisture: 11.5,
    broken_pct: 2.8,
    foreign_matter: 1.2,
    grade: 'B',
    base_price: 2450,
    adjusted_price: 2377,
    penalty_pct: 3,
    gps_lat: '26.8467',
    gps_lng: '80.9462',
    location_name: 'Lucknow Grain Hub',
    agent_name: 'Rajiv Kumar',
    agent_remarks: 'Standard quality. Minor broken grains within acceptable range for B grade.',
    inspected_at: '2026-06-03T11:00:00Z',
    status: 'approved',
  },
  {
    id: 'QL-004',
    contract_id: 'CTR-2026-05',
    commodity: 'Groundnut',
    quantity: 60,
    moisture: 12.8,
    broken_pct: 6.1,
    foreign_matter: 4.5,
    grade: 'Mixed',
    base_price: 6900,
    adjusted_price: 5727,
    penalty_pct: 17,
    gps_lat: '23.0225',
    gps_lng: '72.5714',
    location_name: 'Ahmedabad Oil Seeds Market',
    agent_name: 'Priya Shah',
    agent_remarks: 'Mixed quality lot. High foreign matter, broken shells. Recommend partial rejection.',
    inspected_at: '2026-06-03T16:45:00Z',
    status: 'rejected',
  },
];

// ─── UTILITY FUNCTIONS ────────────────────────────────────

const calculatePenalty = (commodity, moisture, brokenPct, foreignMatter, grade) => {
  let totalPenalty = 0;
  const thresholds = MOISTURE_THRESHOLDS[commodity] || MOISTURE_THRESHOLDS['Cotton'];

  // Moisture penalty
  if (moisture > thresholds.reject) {
    totalPenalty += 15;
  } else if (moisture > thresholds.warn) {
    totalPenalty += Math.round((moisture - thresholds.warn) * 2);
  }

  // Foreign matter penalty (>2% triggers penalty)
  if (foreignMatter > 2) {
    totalPenalty += Math.round((foreignMatter - 2) * 3);
  }

  // Broken grains penalty (>5% triggers penalty)
  if (brokenPct > 5) {
    totalPenalty += Math.round((brokenPct - 5) * 1.5);
  }

  // Grade penalty
  totalPenalty += GRADE_LABELS[grade]?.penalty || 0;

  return Math.min(totalPenalty, 25); // Cap at 25%
};

const getMoistureColor = (moisture, commodity) => {
  const thresholds = MOISTURE_THRESHOLDS[commodity] || MOISTURE_THRESHOLDS['Cotton'];
  if (moisture <= thresholds.ideal) return '#10b981'; // green
  if (moisture <= thresholds.warn) return '#f59e0b';  // amber
  return '#ef4444';                                    // red
};

const getGradeBadge = (grade) => {
  const info = GRADE_LABELS[grade] || GRADE_LABELS['C'];
  return <Badge variant={info.color}>{info.label}</Badge>;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
    case 'rejected':
      return <Badge variant="danger" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
    case 'needs_review':
      return <Badge variant="warning" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Needs Review</Badge>;
    default:
      return <Badge variant="neutral">Pending</Badge>;
  }
};


// ─── MAIN COMPONENT ───────────────────────────────────────

export const Quality = () => {
  const [contracts, setContracts] = useState([]);
  const [qualityLots, setQualityLots] = useState(DEMO_QUALITY_LOTS);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedLot, setExpandedLot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formContractId, setFormContractId] = useState('');
  const [formMoisture, setFormMoisture] = useState(10);
  const [formBrokenPct, setFormBrokenPct] = useState(2);
  const [formForeignMatter, setFormForeignMatter] = useState(1);
  const [formGrade, setFormGrade] = useState('A');
  const [formGpsLat, setFormGpsLat] = useState('');
  const [formGpsLng, setFormGpsLng] = useState('');
  const [formLocationName, setFormLocationName] = useState('');
  const [formAgentName, setFormAgentName] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [contractList, lots] = await Promise.all([
          getContracts(),
          getQualityLots(),
        ]);
        setContracts(contractList || []);
        if (lots && lots.length > 0) {
          setQualityLots(lots);
        } else {
          console.warn('No live quality lots from backend; using seeded demo lots.');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Selected contract details
  const selectedContract = useMemo(() => {
    return contracts.find(c => c.id === formContractId || c.contract_number === formContractId);
  }, [formContractId, contracts]);

  const formCommodity = selectedContract?.commodity || 'Cotton';
  const formBasePrice = selectedContract?.contract_price || 5000;

  // Live penalty calculations
  const livePenaltyPct = useMemo(() => {
    return calculatePenalty(formCommodity, formMoisture, formBrokenPct, formForeignMatter, formGrade);
  }, [formCommodity, formMoisture, formBrokenPct, formForeignMatter, formGrade]);

  const liveAdjustedPrice = useMemo(() => {
    return Math.round(formBasePrice * (1 - livePenaltyPct / 100));
  }, [formBasePrice, livePenaltyPct]);

  const livePriceDelta = formBasePrice - liveAdjustedPrice;

  // GPS Capture
  const captureGPS = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormGpsLat(position.coords.latitude.toFixed(4));
          setFormGpsLng(position.coords.longitude.toFixed(4));
          toast.success('GPS coordinates captured');
        },
        () => {
          // Fallback demo coordinates
          setFormGpsLat('21.1458');
          setFormGpsLng('79.0882');
          toast('Using demo GPS coordinates', { icon: '📍' });
        }
      );
    } else {
      setFormGpsLat('21.1458');
      setFormGpsLng('79.0882');
      toast('Geolocation not supported — using demo coordinates', { icon: '📍' });
    }
  }, []);

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formContractId) {
      toast.error('Please select a contract.');
      return;
    }

    setSubmitting(true);

    // Simulate a short delay for submission
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newLot = {
      id: `QL-${String(qualityLots.length + 1).padStart(3, '0')}`,
      contract_id: formContractId,
      commodity: formCommodity,
      quantity: selectedContract?.quantity || 100,
      moisture: formMoisture,
      broken_pct: formBrokenPct,
      foreign_matter: formForeignMatter,
      grade: formGrade,
      base_price: formBasePrice,
      adjusted_price: liveAdjustedPrice,
      penalty_pct: livePenaltyPct,
      gps_lat: formGpsLat || '21.1458',
      gps_lng: formGpsLng || '79.0882',
      location_name: formLocationName || 'Mandi Inspection Point',
      agent_name: formAgentName || 'Field Agent',
      agent_remarks: formRemarks || 'Standard lot inspection.',
      inspected_at: new Date().toISOString(),
      status: livePenaltyPct > 15 ? 'needs_review' : 'approved',
    };

    setQualityLots((prev) => [newLot, ...prev]);
    toast.success(`Quality lot ${newLot.id} recorded successfully`);

    // Reset form
    setFormContractId('');
    setFormMoisture(10);
    setFormBrokenPct(2);
    setFormForeignMatter(1);
    setFormGrade('A');
    setFormGpsLat('');
    setFormGpsLng('');
    setFormLocationName('');
    setFormAgentName('');
    setFormRemarks('');
    setShowForm(false);
    setSubmitting(false);
  };

  // Filter lots by search
  const filteredLots = useMemo(() => {
    if (!searchTerm) return qualityLots;
    const lower = searchTerm.toLowerCase();
    return qualityLots.filter(
      (lot) =>
        lot.id.toLowerCase().includes(lower) ||
        lot.contract_id.toLowerCase().includes(lower) ||
        lot.commodity.toLowerCase().includes(lower) ||
        lot.agent_name.toLowerCase().includes(lower) ||
        lot.location_name.toLowerCase().includes(lower)
    );
  }, [qualityLots, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const total = qualityLots.length;
    const approved = qualityLots.filter((l) => l.status === 'approved').length;
    const avgPenalty =
      total > 0 ? (qualityLots.reduce((sum, l) => sum + l.penalty_pct, 0) / total).toFixed(1) : 0;
    const premiumCount = qualityLots.filter((l) => l.grade === 'A').length;
    return { total, approved, avgPenalty, premiumCount };
  }, [qualityLots]);

  // CSV Export
  const exportCSV = () => {
    const headers = ['Lot ID', 'Contract', 'Commodity', 'Qty', 'Moisture%', 'Broken%', 'Foreign%', 'Grade', 'Base Price', 'Adjusted Price', 'Penalty%', 'Location', 'Agent', 'Status', 'Inspected'];
    const rows = qualityLots.map((l) => [
      l.id, l.contract_id, l.commodity, l.quantity, l.moisture, l.broken_pct, l.foreign_matter, l.grade,
      l.base_price, l.adjusted_price, l.penalty_pct, l.location_name, l.agent_name, l.status,
      new Date(l.inspected_at).toLocaleDateString('en-IN')
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quality-lots-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const moistureThresholds = MOISTURE_THRESHOLDS[formCommodity] || MOISTURE_THRESHOLDS['Cotton'];

  return (
    <div className="space-y-6 pb-12 text-slate-700">
      <PageHeader
        title="Quality Lots Tracking"
        subtitle="First-mile grain quality inspection, grading & automated price adjustments"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportCSV}
              className="flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5"
            >
              {showForm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Close Form' : 'New Inspection'}
            </Button>
          </div>
        }
      />

      {/* ─── EDUCATIONAL BANNER ─────────────────────────────── */}
      <Card>
        <div className="p-5 flex items-start gap-4">
          <div
            className="p-3 rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--brand-green-light)' }}
          >
            <Leaf className="w-6 h-6" style={{ color: 'var(--brand-green)' }} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-slate-900 font-display">
              First-Mile Quality & ESG Tracking
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              Record quality inspections at the first point of procurement. Moisture levels, broken
              grain percentages, and foreign matter are measured against FSSAI and AGMARKNET
              standards. Price adjustments are calculated automatically using commodity-specific
              thresholds. GPS tagging enables full traceability for ESG compliance and audit trails.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: Droplets, text: 'Moisture Control', detail: 'Auto-penalty >12%' },
                { icon: Thermometer, text: 'Foreign Matter', detail: 'Auto-penalty >2%' },
                { icon: ClipboardCheck, text: 'Grade Classification', detail: 'A/B/C/Mixed' },
                { icon: MapPin, text: 'GPS Traceability', detail: 'ESG audit compliant' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <item.icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600">{item.text}</span>
                  <span className="text-[10px] text-slate-400">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── STATS SUMMARY ROW ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Lots Tracked',
            value: stats.total,
            icon: ClipboardCheck,
            color: 'var(--brand-green)',
          },
          {
            label: 'Approved Lots',
            value: `${stats.approved}/${stats.total}`,
            icon: CheckCircle2,
            color: '#10b981',
          },
          {
            label: 'Avg Penalty Applied',
            value: `${stats.avgPenalty}%`,
            icon: TrendingDown,
            color: stats.avgPenalty > 5 ? '#ef4444' : '#f59e0b',
          },
          {
            label: 'Premium Grade (A)',
            value: stats.premiumCount,
            icon: Star,
            color: '#f59e0b',
          },
        ].map((stat, i) => (
          <Card key={i}>
            <div className="p-4 flex items-center gap-3.5">
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-xl font-black text-slate-900 font-display">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── QUALITY LOT FORM (COLLAPSIBLE) ─────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div
                className="p-4 border-b bg-slate-50 flex items-center justify-between"
                style={{ borderColor: 'var(--border)' }}
              >
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  New Quality Inspection
                </h3>
                <Badge variant="info" className="flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> Live Price Engine
                </Badge>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-6">
                {/* Row 1: Contract selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Select Contract
                    </label>
                    <select
                      value={formContractId}
                      onChange={(e) => setFormContractId(e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green bg-white text-xs font-semibold"
                      style={{ borderColor: 'var(--border)' }}
                      required
                    >
                      <option value="">— Select a contract —</option>
                      {contracts
                        .filter((c) => c.status !== 'settled' && c.status !== 'cancelled')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.contract_number || c.id} — {c.commodity} ({c.quantity} q @ {formatINR(c.contract_price)})
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedContract && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Commodity
                        </label>
                        <div className="px-3 py-2.5 border rounded-lg bg-slate-50 text-xs font-bold text-slate-700" style={{ borderColor: 'var(--border)' }}>
                          {formCommodity}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Base Contract Price
                        </label>
                        <div className="px-3 py-2.5 border rounded-lg bg-slate-50 text-xs font-bold text-slate-700" style={{ borderColor: 'var(--border)' }}>
                          {formatINR(formBasePrice)} / quintal
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Row 2: Quality Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Moisture Slider */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3" /> Moisture Level
                      </span>
                      <span
                        className="text-sm font-black px-2 py-0.5 rounded"
                        style={{
                          color: getMoistureColor(formMoisture, formCommodity),
                          backgroundColor: getMoistureColor(formMoisture, formCommodity) + '15',
                        }}
                      >
                        {formMoisture}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.1"
                      value={formMoisture}
                      onChange={(e) => setFormMoisture(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${(moistureThresholds.ideal / 30) * 100}%, #f59e0b ${(moistureThresholds.warn / 30) * 100}%, #ef4444 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                      <span>0% (Dry)</span>
                      <span className="text-green-500">≤{moistureThresholds.ideal}% Ideal</span>
                      <span className="text-amber-500">{moistureThresholds.warn}% Warn</span>
                      <span className="text-red-500">{moistureThresholds.reject}%+ Reject</span>
                    </div>
                  </div>

                  {/* Broken Grains */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wheat className="w-3 h-3" /> Broken Grains
                      </span>
                      <span
                        className="text-sm font-black px-2 py-0.5 rounded"
                        style={{
                          color: formBrokenPct > 5 ? '#ef4444' : formBrokenPct > 3 ? '#f59e0b' : '#10b981',
                          backgroundColor: (formBrokenPct > 5 ? '#ef4444' : formBrokenPct > 3 ? '#f59e0b' : '#10b981') + '15',
                        }}
                      >
                        {formBrokenPct}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.1"
                      value={formBrokenPct}
                      onChange={(e) => setFormBrokenPct(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 33%, #f59e0b 55%, #ef4444 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                      <span>0%</span>
                      <span className="text-green-500">≤3% Good</span>
                      <span className="text-amber-500">5% Warn</span>
                      <span className="text-red-500">10%+ Critical</span>
                    </div>
                  </div>

                  {/* Foreign Matter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Foreign Matter
                      </span>
                      <span
                        className="text-sm font-black px-2 py-0.5 rounded"
                        style={{
                          color: formForeignMatter > 2 ? '#ef4444' : formForeignMatter > 1 ? '#f59e0b' : '#10b981',
                          backgroundColor: (formForeignMatter > 2 ? '#ef4444' : formForeignMatter > 1 ? '#f59e0b' : '#10b981') + '15',
                        }}
                      >
                        {formForeignMatter}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formForeignMatter}
                      onChange={(e) => setFormForeignMatter(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 20%, #f59e0b 35%, #ef4444 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                      <span>0%</span>
                      <span className="text-green-500">≤1% Clean</span>
                      <span className="text-amber-500">2% Threshold</span>
                      <span className="text-red-500">5%+ Reject</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Grade selector + Live Price Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Grade Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Quality Grade Classification
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(GRADE_LABELS).map(([key, info]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormGrade(key)}
                          className={`py-2.5 px-3 border rounded-lg text-center font-bold text-xs transition-all ${
                            formGrade === key
                              ? key === 'A'
                                ? 'bg-green-50 text-green-700 border-green-400 ring-1 ring-green-300'
                                : key === 'B'
                                ? 'bg-blue-50 text-blue-700 border-blue-400 ring-1 ring-blue-300'
                                : key === 'C'
                                ? 'bg-amber-50 text-amber-700 border-amber-400 ring-1 ring-amber-300'
                                : 'bg-rose-50 text-rose-700 border-rose-400 ring-1 ring-rose-300'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-lg font-black">{key}</div>
                          <div className="text-[9px] mt-0.5 opacity-70">{info.label.split('(')[0].trim()}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Price Adjustment Panel */}
                  <div
                    className="border rounded-xl p-4 space-y-3"
                    style={{
                      borderColor: livePenaltyPct > 0 ? '#fbbf2430' : 'var(--border)',
                      backgroundColor: livePenaltyPct > 10 ? '#fef2f215' : livePenaltyPct > 0 ? '#fffbeb10' : '#f0fdf410',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Auto Price Adjustment
                      </h4>
                      <Badge
                        variant={livePenaltyPct === 0 ? 'success' : livePenaltyPct > 10 ? 'danger' : 'warning'}
                      >
                        {livePenaltyPct === 0 ? 'No Penalty' : `−${livePenaltyPct}% Penalty`}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Base Price</p>
                        <p className="text-sm font-bold text-slate-500 line-through">
                          {formatINR(formBasePrice)}
                        </p>
                      </div>
                      <div className="text-lg text-slate-300">→</div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Adjusted Price</p>
                        <p
                          className="text-xl font-black font-display"
                          style={{ color: livePenaltyPct > 0 ? '#ef4444' : 'var(--brand-green)' }}
                        >
                          {formatINR(liveAdjustedPrice)}
                        </p>
                      </div>
                    </div>
                    {livePriceDelta > 0 && (
                      <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Price reduced by {formatINR(livePriceDelta)}/quintal due to quality deductions
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 4: GPS + Agent Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      GPS Coordinates
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Latitude"
                        value={formGpsLat}
                        onChange={(e) => setFormGpsLat(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        style={{ borderColor: 'var(--border)' }}
                      />
                      <input
                        type="text"
                        placeholder="Longitude"
                        value={formGpsLng}
                        onChange={(e) => setFormGpsLng(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                        style={{ borderColor: 'var(--border)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={captureGPS}
                      className="text-[10px] font-bold flex items-center gap-1 mt-1 hover:underline"
                      style={{ color: 'var(--brand-green)' }}
                    >
                      <MapPin className="w-3 h-3" /> Auto-capture from device
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Location Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nagpur Mandi Gate 3"
                      value={formLocationName}
                      onChange={(e) => setFormLocationName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Inspector / Agent Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suresh Pawar"
                      value={formAgentName}
                      onChange={(e) => setFormAgentName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-green"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Inspection Remarks
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Notes about lot quality, observations..."
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-brand-green"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>

                {/* Submit row */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={submitting}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Record Quality Lot
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── QUALITY LOTS TABLE ──────────────────────────────── */}
      <Card>
        <div
          className="p-4 border-b bg-slate-50 flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
            Tracked Quality Lots
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search lots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green w-48"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              {filteredLots.length} lot{filteredLots.length !== 1 && 's'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr
                className="bg-slate-50 border-b text-slate-400 font-bold uppercase tracking-wider"
                style={{ borderColor: 'var(--border)' }}
              >
                <th className="p-4">Lot ID</th>
                <th className="p-4">Contract</th>
                <th className="p-4">Commodity</th>
                <th className="p-4 text-center">Moisture</th>
                <th className="p-4 text-center">Grade</th>
                <th className="p-4 text-right">Base Price</th>
                <th className="p-4 text-right">Adjusted Price</th>
                <th className="p-4 text-center">Penalty</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs italic">
                    No quality lots recorded yet. Click "New Inspection" to add one.
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => (
                  <React.Fragment key={lot.id}>
                    <tr
                      className={`border-b hover:bg-slate-50/50 text-slate-700 font-semibold transition-colors cursor-pointer ${
                        expandedLot === lot.id ? 'bg-slate-50/80' : ''
                      }`}
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
                    >
                      <td className="p-4 font-extrabold text-slate-800 text-sm">{lot.id}</td>
                      <td className="p-4 text-slate-600 font-mono text-[11px]">{lot.contract_id}</td>
                      <td className="p-4 font-bold text-slate-800">{lot.commodity}</td>
                      <td className="p-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            color: getMoistureColor(lot.moisture, lot.commodity),
                            backgroundColor: getMoistureColor(lot.moisture, lot.commodity) + '15',
                          }}
                        >
                          <Droplets className="w-3 h-3" />
                          {lot.moisture}%
                        </span>
                      </td>
                      <td className="p-4 text-center">{getGradeBadge(lot.grade)}</td>
                      <td className="p-4 text-right text-slate-500 font-medium">
                        {formatINR(lot.base_price)}
                      </td>
                      <td className="p-4 text-right font-extrabold text-sm" style={{ color: lot.penalty_pct > 0 ? '#ef4444' : 'var(--brand-green)' }}>
                        {formatINR(lot.adjusted_price)}
                      </td>
                      <td className="p-4 text-center">
                        {lot.penalty_pct === 0 ? (
                          <span className="text-green-600 font-bold text-[11px]">None</span>
                        ) : (
                          <span className="text-rose-600 font-bold text-[11px]">−{lot.penalty_pct}%</span>
                        )}
                      </td>
                      <td className="p-4 text-center">{getStatusBadge(lot.status)}</td>
                      <td className="p-4 text-center">
                        <button className="text-slate-400 hover:text-brand-green transition-colors">
                          {expandedLot === lot.id ? (
                            <ChevronUp className="w-4 h-4 inline-block" />
                          ) : (
                            <ChevronDown className="w-4 h-4 inline-block" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    <AnimatePresence>
                      {expandedLot === lot.id && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="bg-slate-50/60 border-b"
                              style={{ borderColor: 'var(--border)' }}
                            >
                              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Quality Metrics Detail */}
                                <div className="space-y-3">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Quality Metrics
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Moisture Level</span>
                                      <span
                                        className="font-bold"
                                        style={{ color: getMoistureColor(lot.moisture, lot.commodity) }}
                                      >
                                        {lot.moisture}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Broken Grains</span>
                                      <span className={`font-bold ${lot.broken_pct > 5 ? 'text-red-500' : 'text-slate-700'}`}>
                                        {lot.broken_pct}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Foreign Matter</span>
                                      <span className={`font-bold ${lot.foreign_matter > 2 ? 'text-red-500' : 'text-slate-700'}`}>
                                        {lot.foreign_matter}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Quantity</span>
                                      <span className="font-bold text-slate-700">{lot.quantity} q</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Location & GPS */}
                                <div className="space-y-3">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Location & GPS
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                      <span className="font-bold text-slate-700">{lot.location_name}</span>
                                    </div>
                                    <div className="text-slate-500 font-mono text-[10px]">
                                      {lot.gps_lat}, {lot.gps_lng}
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Inspected</span>
                                      <span className="font-medium text-slate-700">
                                        {new Date(lot.inspected_at).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Agent & Remarks */}
                                <div className="space-y-3">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Inspector Notes
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Agent</span>
                                      <span className="font-bold text-slate-700">{lot.agent_name}</span>
                                    </div>
                                    <div
                                      className="p-3 bg-white border rounded-lg text-slate-600 leading-relaxed italic text-[11px]"
                                      style={{ borderColor: 'var(--border)' }}
                                    >
                                      "{lot.agent_remarks}"
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Quality;
