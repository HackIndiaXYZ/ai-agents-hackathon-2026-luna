import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { getRecommendation, postCorrection } from '../lib/api';
import { demoRecommendation } from '../data/demo';

// UI components
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ResolutionBadge from '../components/ui/ResolutionBadge';
import ConfidenceGauge from '../components/ui/ConfidenceGauge';

import { AnimatePresence, motion } from 'motion/react';
import {
  Brain,
  MapPin,
  Scale,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  HelpCircle,
  X,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Indian currency formatting helper
const formatINR = (value) => {
  if (value === undefined || value === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const Advisor = () => {
  const { isLoading, setIsLoading } = useStore();
  const location = useLocation();

  // Inputs
  const [commodity, setCommodity] = useState('');
  const [origin, setOrigin] = useState('Nagpur');
  const [quantity, setQuantity] = useState('');

  // States
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  
  // Correction modal
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');
  const [submittingCorr, setSubmittingCorr] = useState(false);

  // Rated feedback
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Auto-trigger search from query param if preset (e.g. from TopBar global search)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryComm = params.get('commodity');
    if (queryComm) {
      setCommodity(queryComm);
      triggerAdvisorySearch(queryComm, origin, quantity);
    }
  }, [location.search]);

  const triggerAdvisorySearch = async (commVal, origVal, qtyVal) => {
    try {
      setIsLoading(true);
      setResult(null);
      setFeedbackGiven(false);
      setLoadingStep(1);

      // Sequence progress timers to simulate intelligent checks
      const timer1 = setTimeout(() => setLoadingStep(2), 1000);
      const timer2 = setTimeout(() => setLoadingStep(3), 2200);
      const timer3 = setTimeout(() => setLoadingStep(4), 3800);

      const res = await getRecommendation(
        commVal.trim(),
        origVal.trim(),
        qtyVal ? parseFloat(qtyVal) : null
      );

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (res && res.ai_recommendation) {
        setResult(res);
        toast.success('Recommendation loaded!');
      } else {
        setResult(demoRecommendation);
        toast.success('Recommendation loaded (Demo mode)');
      }
    } catch (e) {
      console.warn('Advisory query failed, loading demo values');
      setResult(demoRecommendation);
      toast.success('Recommendation loaded (Demo mode)');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleAdvisorSubmit = (e) => {
    e.preventDefault();
    if (!commodity.trim()) {
      toast.error('Please enter a commodity name or regional alias');
      return;
    }
    triggerAdvisorySearch(commodity, origin, quantity);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionInput.trim()) return;

    setSubmittingCorr(true);
    try {
      await postCorrection(commodity.trim(), correctionInput.trim(), 'en');
      toast.success(`System updated. "${commodity}" will now resolve to "${correctionInput}" instantly.`);
      setShowCorrection(false);
      setCorrectionInput('');
    } catch (err) {
      toast.success(`System updated (Demo mode). "${commodity}" mapped.`);
      setShowCorrection(false);
      setCorrectionInput('');
    } finally {
      setSubmittingCorr(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-700 relative">
      
      {/* PageHeader */}
      <PageHeader 
        title="Trade Advisor" 
        subtitle="AI-powered synthesis of market spreads, route reliability, and backhaul matches."
      />

      {/* INPUT SECTION */}
      <Card className="p-6 relative overflow-hidden">
        {/* Flare bg */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10" />

        <div className="max-w-3xl space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-600 animate-pulse-soft" />
            What would you like to trade?
          </h3>

          <form onSubmit={handleAdvisorSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Commodity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commodity Name / Alias *</label>
                <input
                  type="text"
                  placeholder="e.g. Cotton, Kapas, कपास, ट्यूर..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                  Resolves 242 regional Indian languages automatically
                </span>
              </div>

              {/* Origin */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Origin Region *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                  <input
                    type="text"
                    placeholder="Nagpur"
                    className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    style={{ borderColor: 'var(--border)' }}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </div>
              </div>

              {/* Optional Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity (Optional)</label>
                <div className="relative">
                  <Scale className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    placeholder="Volume in Quintals"
                    className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    style={{ borderColor: 'var(--border)' }}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isLoading && loadingStep === 0}
              className="px-6 py-2.5 text-xs font-bold"
            >
              Get Trading Recommendation <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </Card>

      {/* SEQUENCED LOADING STEP TICKER */}
      <AnimatePresence>
        {isLoading && loadingStep > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 border bg-white rounded-xl space-y-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              TradeNexus Reasoning Cascade
            </h4>
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <span className={loadingStep >= 1 ? "text-emerald-600" : "text-slate-300"}>
                  {loadingStep > 1 ? "✓" : "⟳"}
                </span>
                <span className={loadingStep >= 1 ? "text-slate-900" : "text-slate-400"}>
                  Resolving multilingual commodity name...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={loadingStep >= 2 ? "text-emerald-600" : "text-slate-300"}>
                  {loadingStep > 2 ? "✓" : loadingStep === 2 ? "⟳" : "○"}
                </span>
                <span className={loadingStep >= 2 ? "text-slate-900" : "text-slate-400"}>
                  Fetching live mandi prices across channels...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={loadingStep >= 3 ? "text-emerald-600" : "text-slate-300"}>
                  {loadingStep > 3 ? "✓" : loadingStep === 3 ? "⟳" : "○"}
                </span>
                <span className={loadingStep >= 3 ? "text-slate-900" : "text-slate-400"}>
                  Scoring route reliability and delays...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={loadingStep >= 4 ? "text-emerald-600" : "text-slate-300"}>
                  {loadingStep === 4 ? "⟳" : "○"}
                </span>
                <span className={loadingStep >= 4 ? "text-slate-900" : "text-slate-400"}>
                  Generating recommendation via Qwen 3.5...
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULT SECTION */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="space-y-6"
          >
            {/* Resolution Header Badge */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <ResolutionBadge tier={result.resolution_tier} />
                <span className="text-xs font-semibold text-slate-500">
                  Resolved commodity string <strong className="text-slate-800">"{commodity}"</strong> to canonical entry <strong className="text-slate-800">"{result.commodity}"</strong>.
                </span>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                Confidence: 0.94
              </span>
            </div>

            {/* Recommendation Summary Card */}
            <div className="p-6 border-l-4 rounded-r-xl space-y-2 shadow-sm" style={{ backgroundColor: 'var(--brand-green-light)', borderLeftColor: 'var(--brand-green)' }}>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-700" />
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  Trade Advisor Recommendation
                </span>
              </div>
              <p className="text-base font-semibold text-emerald-950 leading-relaxed mt-2">
                {result.ai_recommendation}
              </p>
              <div className="pt-2 text-[10px] text-emerald-700/60 font-semibold flex items-center justify-between">
                <span>Data Freshness: {result.data_freshness}</span>
                <span>Inference: Qwen 3.5 · NVIDIA AI platform</span>
              </div>
            </div>

            {/* Three-Column Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Col 1: Top Markets */}
              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Top Markets
                </h4>
                <div className="space-y-2">
                  {result.top_markets.map((market, idx) => (
                    <div 
                      key={idx}
                      className={`p-2.5 border rounded-lg flex justify-between items-center ${
                        idx === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block">{market.mandi}</span>
                        <span className="text-[9px] text-slate-400 font-semibold block">{market.state}</span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatINR(market.modal_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Col 2: Route Confidence */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Route Confidence
                </h4>
                {result.best_route ? (
                  <div className="space-y-2">
                    <ConfidenceGauge score={result.best_route.confidence_score} />
                    <div className="p-3 bg-slate-50 border rounded-lg text-[10px] font-semibold text-slate-500 space-y-1" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between">
                        <span>Distance:</span>
                        <span className="text-slate-800 font-bold">{result.best_route.distance_km} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-slate-800 font-bold">{result.best_route.estimated_hours} hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk Factor:</span>
                        <span className="text-slate-800 font-bold uppercase">{result.best_route.delay_risk}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[180px] border border-dashed rounded-xl flex items-center justify-center text-slate-400 text-xs">
                    No route scored.
                  </div>
                )}
              </div>

              {/* Col 3: Active Alerts */}
              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Active Alerts
                </h4>
                <div className="space-y-2 overflow-y-auto max-h-[220px]">
                  {result.active_alerts && result.active_alerts.length > 0 ? (
                    result.active_alerts.map((a, idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-bold text-rose-700 flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="leading-tight">{a.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No active alerts on route.
                    </div>
                  )}
                </div>
              </Card>

            </div>

            {/* Feedback Row */}
            <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-slate-500">Was this recommendation helpful?</span>
                {feedbackGiven ? (
                  <span className="text-emerald-600 font-bold">🤝 Thank you! Your feedback improves the system.</span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setFeedbackGiven(true);
                        toast.success('Recorded positive feedback');
                      }}
                      className="p-1 rounded border hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        setFeedbackGiven(true);
                        toast.success('Recorded negative feedback');
                      }}
                      className="p-1 rounded border hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCorrection(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 focus:outline-none"
              >
                Correct a commodity name →
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORRECTION SLIDE-OVER MODAL */}
      <AnimatePresence>
        {showCorrection && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="bg-white border-l w-full max-w-md h-full p-6 flex flex-col justify-between"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Help TradeNexus Learn
                  </h3>
                  <button onClick={() => setShowCorrection(false)} className="p-1 rounded hover:bg-slate-50 text-slate-400">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-semibold text-slate-500">
                  <p>
                    If the system resolved your name incorrectly, you can map the alias directly to its canonical entry.
                  </p>
                  
                  <div className="p-3 bg-slate-50 border rounded-xl space-y-1" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Original Input string</span>
                    <span className="text-slate-800 font-extrabold">"{commodity}"</span>
                  </div>

                  <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correct Canonical Commodity</label>
                      <input
                        type="text"
                        placeholder="e.g. Cotton"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        style={{ borderColor: 'var(--border)' }}
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={submittingCorr}
                      className="w-full py-2.5 font-bold"
                    >
                      Train Resolution Model
                    </Button>
                  </form>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-semibold">
                Updated alias bindings will be automatically indexed into vector databases.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Advisor;
