import React, { useState } from 'react';
import { useStore } from '../store';
import { scoreCorridor, getMarketPrices } from '../lib/api';
import { ConfidenceGauge } from '../components/ui/ConfidenceGauge';
import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  Scale,
  Search,
  ListOrdered,
  Truck,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Standard Indian hubs matching seed CSV for suggestions
const INDIAN_CITIES = [
  'Nagpur', 'Mumbai', 'Indore', 'Ahmedabad', 'Lucknow', 
  'Delhi', 'Chennai', 'Guntur', 'Jaipur', 'Nashik', 
  'Hubli', 'Nizamabad', 'Rajkot', 'Patna', 'Kolkata', 
  'Ludhiana', 'Pune', 'Bengaluru', 'Madurai', 'Kochi', 
  'Junagadh', 'Jodhpur', 'Ujjain', 'Amritsar', 'Warangal', 
  'Visakhapatnam', 'Raipur', 'Kurnool', 'Hyderabad', 'Bhopal'
].sort();

// Utility for Indian Currency Formatting
const formatINR = (value) => {
  if (value === undefined || value === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const DispatchIntelligence = () => {
  const { isLoading, setIsLoading } = useStore();

  const [fromInput, setFromInput] = useState('Nagpur');
  const [toInput, setToInput] = useState('Mumbai');
  const [commodityInput, setCommodityInput] = useState('');
  
  // Results
  const [scoreResult, setScoreResult] = useState(null);
  const [comparisonRoutes, setComparisonRoutes] = useState([]);

  // Auto-complete state
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

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

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!fromInput.trim() || !toInput.trim()) {
      toast.error('Origin and Destination are required');
      return;
    }

    try {
      setIsLoading(true);
      setScoreResult(null);
      setComparisonRoutes([]);

      // 1. Fetch Primary Corridor Score
      const res = await scoreCorridor(fromInput.trim(), toInput.trim());
      if (res) {
        setScoreResult(res);
        toast.success(`Corridor scored! Delay risk is ${res.delay_risk.toUpperCase()}`);
      }

      // 2. Fetch Arbitrage Comparison if commodity is provided
      if (commodityInput.trim()) {
        const marketData = await getMarketPrices(commodityInput.trim());
        if (marketData && marketData.top_mandis && marketData.top_mandis.length > 0) {
          const topMandis = marketData.top_mandis.slice(0, 3);
          
          // Fetch corridor scores for top 3 destinations in parallel
          const scoringPromises = topMandis.map(async (mandi) => {
            try {
              const destName = `${mandi.mandi_name}, ${mandi.state}`;
              const corrScore = await scoreCorridor(fromInput.trim(), destName);
              return {
                mandi: mandi.mandi_name,
                state: mandi.state,
                modal_price: mandi.modal_price,
                unit: mandi.unit,
                distance_km: corrScore.distance_km,
                estimated_hours: corrScore.estimated_hours,
                confidence_score: corrScore.confidence_score,
                delay_risk: corrScore.delay_risk
              };
            } catch (err) {
              return {
                mandi: mandi.mandi_name,
                state: mandi.state,
                modal_price: mandi.modal_price,
                unit: mandi.unit,
                distance_km: 500,
                estimated_hours: 10,
                confidence_score: 0.7,
                delay_risk: 'medium'
              };
            }
          });

          const compResults = await Promise.all(scoringPromises);
          // Sort by price descending
          compResults.sort((a, b) => b.modal_price - a.modal_price);
          setComparisonRoutes(compResults);
        } else {
          toast.warn(`No market markets found for "${commodityInput}".`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Logistics scoring failed. Google API limit or connection issue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-display">
          Dispatch Route Intelligence
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Scans and analyzes transit congestion delays, actual mileage, and corridor risk metrics.
        </p>
      </div>

      {/* Corridor Input Form Card */}
      <div className="glass-card p-6 border border-slate-700/40 relative">
        <form onSubmit={handleDispatchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Origin Input */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Origin Mandi / City
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-emerald-400" />
                <input
                  type="text"
                  placeholder="e.g. Nagpur"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={fromInput}
                  onChange={(e) => handleInputChange(e.target.value, setFromInput, setFromSuggestions)}
                  onBlur={() => setTimeout(() => setFromSuggestions([]), 200)}
                />
              </div>
              {fromSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden text-xs">
                  {fromSuggestions.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleSelectSuggestion(city, setFromInput, setFromSuggestions)}
                      className="w-full px-4 py-2.5 text-left text-slate-200 hover:bg-slate-700 font-semibold"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Input */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Destination Mandi / City
              </label>
              <div className="relative">
                <Navigation className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-blue-400" />
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={toInput}
                  onChange={(e) => handleInputChange(e.target.value, setToInput, setToSuggestions)}
                  onBlur={() => setTimeout(() => setToSuggestions([]), 200)}
                />
              </div>
              {toSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden text-xs">
                  {toSuggestions.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleSelectSuggestion(city, setToInput, setToSuggestions)}
                      className="w-full px-4 py-2.5 text-left text-slate-200 hover:bg-slate-700 font-semibold"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Commodity Arbitrage Link */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Track Commodity Arbitrage (Optional)
              </label>
              <div className="relative">
                <Scale className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Cotton, Wheat"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={commodityInput}
                  onChange={(e) => setCommodityInput(e.target.value)}
                />
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Truck className="w-4.5 h-4.5" />
                Score Corridor
              </>
            )}
          </button>
        </form>
      </div>

      {/* Grid: Results */}
      {scoreResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Column 1: SVG Confidence Arc Gauge */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Transit Reliability
            </h3>
            <ConfidenceGauge score={scoreResult.confidence_score} />
          </div>

          {/* Column 2: Stats & Risk Badges */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Route Telemetry Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              <div className="p-5 bg-slate-800/40 border border-slate-700/30 rounded-2xl space-y-1">
                <span className="text-slate-500 text-xs font-semibold block">Total Distance</span>
                <span className="text-xl font-extrabold text-white font-display">
                  {scoreResult.distance_km} km
                </span>
              </div>

              <div className="p-5 bg-slate-800/40 border border-slate-700/30 rounded-2xl space-y-1">
                <span className="text-slate-500 text-xs font-semibold block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Est. Transit Time
                </span>
                <span className="text-xl font-extrabold text-white font-display">
                  {scoreResult.estimated_hours} hrs
                </span>
              </div>

              <div className="p-5 bg-slate-800/40 border border-slate-700/30 rounded-2xl space-y-1 col-span-2 md:col-span-1">
                <span className="text-slate-500 text-xs font-semibold block">Incident Reports (14d)</span>
                <span className={`text-xl font-extrabold font-display ${
                  scoreResult.recent_reports_count > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {scoreResult.recent_reports_count} delays
                </span>
              </div>

            </div>

            {/* Delay risk status alert card */}
            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
              scoreResult.delay_risk === 'low'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : scoreResult.delay_risk === 'medium'
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
            }`}>
              <AlertTriangle className="w-6 h-6 shrink-0 animate-pulse-soft" />
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold uppercase tracking-widest">
                  Delay Risk Status: {scoreResult.delay_risk.toUpperCase()}
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {scoreResult.delay_risk === 'low' 
                    ? 'Transit corridor flows are normal. High reliability for standard cargo trucks.'
                    : scoreResult.delay_risk === 'medium'
                    ? 'Potential bottleneck delays reported near border terminals. Secure buffer timing.'
                    : 'Extreme delay alerts active. Avoid routing high-perishables or prepare logistics bypasses.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Arbitrage Table */}
      {comparisonRoutes.length > 0 && (
        <div className="glass-card border border-slate-700/40 overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-slate-700/40 bg-slate-800/20 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Optimal Market Routes for {commodityInput}
            </h3>
            <span className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider">
              Arbitrage Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-700/40">
                  <th className="p-4 font-semibold">Rank</th>
                  <th className="p-4 font-semibold">Mandi Destination</th>
                  <th className="p-4 font-semibold">Mandi Modal Price</th>
                  <th className="p-4 font-semibold">Corridor Distance</th>
                  <th className="p-4 font-semibold">Est. Driving Time</th>
                  <th className="p-4 font-semibold">Reliability Index</th>
                  <th className="p-4 font-semibold text-right">Delay Risk</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRoutes.map((route, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700/20 text-slate-300 transition-colors hover:bg-slate-800/20"
                  >
                    <td className="p-4 font-bold text-white">#{idx + 1}</td>
                    <td className="p-4 font-bold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {route.mandi} ({route.state})
                    </td>
                    <td className="p-4 font-extrabold text-white text-sm">
                      {formatINR(route.modal_price)}/{route.unit}
                    </td>
                    <td className="p-4 font-semibold text-slate-400">{route.distance_km} km</td>
                    <td className="p-4 font-semibold text-slate-400">{route.estimated_hours} hrs</td>
                    <td className="p-4 font-bold">
                      <span className={`${
                        route.confidence_score >= 0.7 
                          ? 'text-emerald-400' 
                          : route.confidence_score >= 0.5 
                          ? 'text-amber-400' 
                          : 'text-rose-400'
                      }`}>
                        {Math.round(route.confidence_score * 100)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        route.delay_risk === 'low'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : route.delay_risk === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {route.delay_risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchIntelligence;
