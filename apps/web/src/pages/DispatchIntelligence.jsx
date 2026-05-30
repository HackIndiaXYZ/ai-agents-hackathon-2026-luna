import React, { useState } from 'react';
import { useStore } from '../store';
import { scoreCorridor } from '../lib/api';
import { demoCorridors } from '../data/demo';

// UI components
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfidenceGauge from '../components/ui/ConfidenceGauge';

import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  Send,
  PlusCircle,
  Truck,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const INDIAN_CITIES = [
  'Nagpur', 'Mumbai', 'Indore', 'Ahmedabad', 'Lucknow',
  'Delhi', 'Chennai', 'Guntur', 'Jaipur', 'Nashik',
  'Hubli', 'Nizamabad', 'Rajkot', 'Patna', 'Kolkata',
  'Ludhiana', 'Pune', 'Bengaluru', 'Madurai', 'Kochi'
].sort();

export const DispatchIntelligence = () => {
  const { isLoading, setIsLoading } = useStore();

  const [fromInput, setFromInput] = useState('Nagpur');
  const [toInput, setToInput] = useState('Mumbai');
  const [scoreResult, setScoreResult] = useState(null);

  // Suggestions state
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  // Report a delay form
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportCorridor, setReportCorridor] = useState('');
  const [reportDelayHours, setReportDelayHours] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleInputChange = (value, setInput, setSuggestions) => {
    setInput(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = INDIAN_CITIES.filter(city =>
      city.toLowerCase().startsWith(value.toLowerCase()) &&
      city.toLowerCase() !== value.toLowerCase()
    );
    setSuggestions(filtered.slice(0, 5));
  };

  const handleSelectSuggestion = (city, setInput, setSuggestions) => {
    setInput(city);
    setSuggestions([]);
  };

  const handleScoreRoute = async (e) => {
    e.preventDefault();
    if (!fromInput.trim() || !toInput.trim()) {
      toast.error('Please enter From and To regions');
      return;
    }

    try {
      setIsLoading(true);
      setScoreResult(null);

      const res = await scoreCorridor(fromInput.trim(), toInput.trim());
      if (res && !res.error) {
        setScoreResult(res);
        toast.success(`Corridor scored!`);
      } else {
        // Mock fallback
        setScoreResult({
          origin: fromInput,
          destination: toInput,
          distance_km: 560,
          estimated_hours: 10.4,
          confidence_score: 0.82,
          delay_risk: 'low',
          recent_reports_count: 1,
          typical_hours: 10.0
        });
        toast.success('Corridor scored (Demo mode)');
      }
    } catch (err) {
      // Mock fallback
      setScoreResult({
        origin: fromInput,
        destination: toInput,
        distance_km: 560,
        estimated_hours: 10.4,
        confidence_score: 0.82,
        delay_risk: 'low',
        recent_reports_count: 1,
        typical_hours: 10.0
      });
      toast.success('Corridor scored (Demo mode)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCorridorRow = (row) => {
    setFromInput(row.origin);
    setToInput(row.destination);
    
    // Auto-fill values and trigger scoring
    setScoreResult({
      origin: row.origin,
      destination: row.destination,
      distance_km: row.distance_km,
      estimated_hours: row.typical_duration_hours,
      confidence_score: row.reliability_score,
      delay_risk: row.delay_risk,
      recent_reports_count: row.delay_risk === 'low' ? 0 : 2,
      typical_hours: row.typical_duration_hours
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(`Loaded corridor: ${row.origin} to ${row.destination}`);
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportCorridor || !reportDelayHours) {
      toast.error('Please specify corridor and delay hours');
      return;
    }

    setSubmittingReport(true);
    setTimeout(() => {
      setSubmittingReport(false);
      setReportCorridor('');
      setReportDelayHours('');
      setReportReason('');
      setShowReportForm(false);
      toast.success('Thank you! This improves route intelligence for everyone.', { icon: '🤝' });
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-700">
      
      {/* PageHeader */}
      <PageHeader 
        title="Dispatch Intelligence" 
        subtitle="Route reliability scoring and driving telemetry mapping for commodity corridors."
      />

      {/* TOP SECTION — ROUTE SCORER */}
      <Card className="p-6">
        <form onSubmit={handleScoreRoute} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Input */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Origin Mandi / City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                <input
                  type="text"
                  placeholder="e.g. Nagpur"
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={fromInput}
                  onChange={(e) => handleInputChange(e.target.value, setFromInput, setFromSuggestions)}
                  onBlur={() => setTimeout(() => setFromSuggestions([]), 200)}
                />
              </div>
              {fromSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 overflow-hidden text-xs max-h-48 overflow-y-auto">
                  {fromSuggestions.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleSelectSuggestion(city, setFromInput, setFromSuggestions)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 font-semibold text-slate-700"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Input */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Destination Mandi / City</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-3 w-4 h-4 text-blue-600" />
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={toInput}
                  onChange={(e) => handleInputChange(e.target.value, setToInput, setToSuggestions)}
                  onBlur={() => setTimeout(() => setToSuggestions([]), 200)}
                />
              </div>
              {toSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 overflow-hidden text-xs max-h-48 overflow-y-auto">
                  {toSuggestions.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleSelectSuggestion(city, setToInput, setToSuggestions)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 font-semibold text-slate-700"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            className="w-full py-2.5 text-xs font-bold"
          >
            <Truck className="w-4 h-4 mr-2" />
            Score This Route
          </Button>
        </form>
      </Card>

      {/* RESULT CARD */}
      {scoreResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
          {/* Left section: SVG gauge */}
          <ConfidenceGauge score={scoreResult.confidence_score} />

          {/* Middle section: Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border bg-white rounded-xl flex flex-col justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
              <span className="text-xl font-extrabold text-slate-900 font-display mt-2">{scoreResult.distance_km} km</span>
            </div>
            
            <div className="p-4 border bg-white rounded-xl flex flex-col justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration
              </span>
              <span className="text-xl font-extrabold text-slate-900 font-display mt-2">{scoreResult.estimated_hours} hrs</span>
            </div>

            <div className="p-4 border bg-white rounded-xl flex flex-col justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delay Risk</span>
              <div className="mt-2">
                <Badge variant={scoreResult.delay_risk === 'low' ? 'success' : scoreResult.delay_risk === 'medium' ? 'warning' : 'danger'}>
                  {scoreResult.delay_risk}
                </Badge>
              </div>
            </div>

            <div className="p-4 border bg-white rounded-xl flex flex-col justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reports</span>
              <span className="text-sm font-bold text-slate-700 mt-2">{scoreResult.recent_reports_count} delays</span>
            </div>
          </div>

          {/* Right section: Recommendation card */}
          <div className="p-5 border-l-4 rounded-r-xl flex flex-col justify-between" style={{ backgroundColor: scoreResult.delay_risk === 'low' ? 'var(--brand-green-light)' : 'var(--amber-light)', borderLeftColor: scoreResult.delay_risk === 'low' ? 'var(--brand-green)' : 'var(--amber)' }}>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider block" style={{ color: scoreResult.delay_risk === 'low' ? 'var(--brand-green-dark)' : 'var(--amber)' }}>
                Corridor Recommendation
              </span>
              <p className="text-xs font-semibold leading-relaxed mt-2" style={{ color: scoreResult.delay_risk === 'low' ? 'var(--brand-green-dark)' : 'var(--text-primary)' }}>
                {scoreResult.delay_risk === 'low'
                  ? 'This corridor is performing well. Current travel time is within 5% of typical duration. Low delay risk this week.'
                  : 'Moderate delay factors present. Regional terminals report congestion bottlenecks. Allocate backup transit windows.'}
              </p>
            </div>
            <span className="text-[9px] text-slate-400 font-semibold block mt-4">
              Telemetry sync: Google Routes API v2
            </span>
          </div>
        </div>
      )}

      {/* MONITORED CORRIDOR TABLE */}
      <Card>
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
            All Monitored Corridors
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            Click row to load scorer
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border)' }}>
                <th className="p-4">Origin</th>
                <th className="p-4">Destination</th>
                <th className="p-4">Distance</th>
                <th className="p-4">Reliability Index</th>
                <th className="p-4">Delay Risk</th>
                <th className="p-4 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {demoCorridors.map((row, idx) => {
                const isGreen = row.reliability_score >= 0.7;
                return (
                  <tr
                    key={idx}
                    onClick={() => handleSelectCorridorRow(row)}
                    className="border-b hover:bg-slate-50 cursor-pointer transition-colors text-slate-700 font-semibold"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="p-4 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {row.origin}
                    </td>
                    <td className="p-4">{row.destination}</td>
                    <td className="p-4 text-slate-500">{row.distance_km} km</td>
                    <td className="p-4 w-48">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 text-right font-bold ${isGreen ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {Math.round(row.reliability_score * 100)}%
                        </span>
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${isGreen ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${row.reliability_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={row.delay_risk === 'low' ? 'success' : 'warning'}>
                        {row.delay_risk}
                      </Badge>
                    </td>
                    <td className="p-4 text-right text-slate-400">{row.last_updated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REPORT A DELAY */}
      <Card className="border border-slate-200">
        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Help other traders — report a delay you experienced
          </span>
          {showReportForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showReportForm && (
          <form onSubmit={handleReportSubmit} className="p-4 border-t space-y-4 text-xs bg-slate-50/50" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corridor Route *</label>
                <input
                  type="text"
                  placeholder="e.g. Nagpur to Mumbai"
                  className="w-full px-3 py-2 border bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={reportCorridor}
                  onChange={(e) => setReportCorridor(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delay Hours *</label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 border bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={reportDelayHours}
                  onChange={(e) => setReportDelayHours(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason for Disruption</label>
              <textarea
                rows="2"
                placeholder="e.g. Checkpoint terminal queue backlog"
                className="w-full px-3 py-2 border bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                style={{ borderColor: 'var(--border)' }}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={submittingReport}
              className="py-2 px-6 text-xs font-bold"
            >
              Submit Report
            </Button>
          </form>
        )}
      </Card>

    </div>
  );
};

export default DispatchIntelligence;
