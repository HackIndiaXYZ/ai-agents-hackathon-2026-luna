import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getMarketPrices, getMarketCommodities } from '../lib/api';
import { ResolutionBadge } from '../components/ui/ResolutionBadge';
import {
  TrendingUp,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  Filter,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Utility for Indian Currency Formatting
const formatINR = (value) => {
  if (value === undefined || value === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const MarketPrices = () => {
  const { isLoading, setIsLoading } = useStore();

  const [commodities, setCommodities] = useState([
    'Wheat', 'Cotton', 'Paddy', 'Soybean', 'Mustard', 
    'Potato', 'Onion', 'Tomato', 'Chilli', 'Garlic', 
    'Ginger', 'Turmeric', 'Groundnut', 'Gram', 'Arhar', 
    'Moong', 'Urad', 'Masur', 'Maize', 'Sugarcane'
  ]);

  const [selectedComm, setSelectedComm] = useState('Cotton');
  const [selectedState, setSelectedState] = useState('');
  const [states, setStates] = useState([]);
  
  // Data retrieved from API
  const [prices, setPrices] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [dataAsOf, setDataAsOf] = useState('');

  useEffect(() => {
    fetchCommodityList();
  }, []);

  useEffect(() => {
    fetchPricesData();
  }, [selectedComm]);

  const fetchCommodityList = async () => {
    try {
      const list = await getMarketCommodities();
      if (list && list.length > 0) {
        // Map objects to names if returned as object list
        const names = list.map(c => typeof c === 'string' ? c : c.canonical_name);
        setCommodities(names);
      }
    } catch (e) {
      console.warn('Failed to load dynamic commodity list, using fallback.');
    }
  };

  const fetchPricesData = async () => {
    if (!selectedComm) return;
    try {
      setIsLoading(true);
      const data = await getMarketPrices(selectedComm);
      if (data) {
        setPrices(data.prices || []);
        setAiSummary(data.ai_summary || '');
        setDataAsOf(data.data_as_of || '');
        
        // Extract unique states for filter
        const uniqueStates = [...new Set((data.prices || []).map(p => p.state))].sort();
        setStates(uniqueStates);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load market prices for ${selectedComm}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter prices by selected state
  const filteredPrices = selectedState
    ? prices.filter(p => p.state === selectedState)
    : prices;

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-display">
            Market Price Discovery
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse real-time mandi pricing spreads, historical models, and automated anomaly bounds.
          </p>
        </div>
        
        {/* Data As Of indicator */}
        {dataAsOf && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700/60 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300 font-semibold">
              Data as of: <span className="text-emerald-400">{dataAsOf}</span>
            </span>
          </div>
        )}
      </div>

      {/* Selectors Card */}
      <div className="glass-card p-6 border border-slate-700/40 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Commodity select dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Select Canonical Commodity
          </label>
          <select
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/60 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all cursor-pointer"
            value={selectedComm}
            onChange={(e) => {
              setSelectedComm(e.target.value);
              setSelectedState(''); // reset state filter
            }}
          >
            {commodities.map((comm) => (
              <option key={comm} value={comm}>
                {comm}
              </option>
            ))}
          </select>
        </div>

        {/* State filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Filter by Indian State
          </label>
          <div className="relative">
            <Filter className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all cursor-pointer"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">All States ({states.length} available)</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Summary Highlight Card */}
      {aiSummary && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl mt-1">
              <FileText className="w-6 h-6 animate-pulse-soft" />
            </div>
            <div className="space-y-1.5 flex-grow">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                TradeNexus AI Market Summary
              </span>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line mt-2">
                {aiSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Table Card */}
      <div className="glass-card border border-slate-700/40 overflow-hidden">
        <div className="p-5 border-b border-slate-700/40 flex items-center justify-between bg-slate-800/20">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Mandi Price Index Summary — {selectedComm}
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            Showing {filteredPrices.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-700/40">
                <th className="p-4 font-semibold">Mandi Name</th>
                <th className="p-4 font-semibold">State</th>
                <th className="p-4 font-semibold">Min Price</th>
                <th className="p-4 font-semibold">Modal Price</th>
                <th className="p-4 font-semibold">Max Price</th>
                <th className="p-4 font-semibold">Reporting Date</th>
                <th className="p-4 font-semibold text-right">Anomaly Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.length > 0 ? (
                filteredPrices.map((price) => (
                  <tr
                    key={price.id}
                    className={`border-b border-slate-700/20 transition-colors hover:bg-slate-800/30 ${
                      price.is_anomaly
                        ? 'bg-amber-500/5 text-amber-300 hover:bg-amber-500/10'
                        : 'text-slate-300'
                    }`}
                  >
                    <td className="p-4 font-bold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {price.mandi_name}
                    </td>
                    <td className="p-4">{price.state}</td>
                    <td className="p-4 font-medium text-slate-400">
                      {formatINR(price.min_price)}/{price.unit || 'qtl'}
                    </td>
                    <td className="p-4 font-extrabold text-sm text-white">
                      {formatINR(price.modal_price)}/{price.unit || 'qtl'}
                    </td>
                    <td className="p-4 font-medium text-slate-400">
                      {formatINR(price.max_price)}/{price.unit || 'qtl'}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {price.data_as_of}
                    </td>
                    <td className="p-4 text-right">
                      {price.is_anomaly ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm animate-pulse-soft">
                          ⚠️ Arbitrage Anomaly ({price.anomaly_score ? `${price.anomaly_score > 0 ? '+' : ''}${Math.round(price.anomaly_score * 10) / 10}σ` : 'Triggered'})
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Standard bounds</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                    No active pricing records found for this selection. Try changing the commodity dropdown or clearing the state filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketPrices;
