import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import {
  getRecommendation,
  getLearningStats,
  postAlertFeedback,
  getMarketPrices,
} from '../lib/api';
import { ResolutionBadge } from '../components/ui/ResolutionBadge';
import { ConfidenceGauge } from '../components/ui/ConfidenceGauge';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  AlertTriangle,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  BookOpen,
  MapPin,
  Scale,
  Calendar,
  X,
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

export const Dashboard = () => {
  const {
    isLoading,
    setIsLoading,
    currentRecommendation,
    setCurrentRecommendation,
    alerts,
    setAlerts,
    learningStats,
    setLearningStats,
  } = useStore();

  const [searchText, setSearchText] = useState('');
  const [originInput, setOriginInput] = useState('Nagpur');
  const [quantityInput, setQuantityInput] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Active alerts feedback state
  const [ratedAlerts, setRatedAlerts] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Fetch stats
      const stats = await getLearningStats();
      if (stats && !stats.error) {
        setLearningStats(stats);
      }
      
      // Fetch default alerts (Cotton alerts as example or generic)
      const marketData = await getMarketPrices('Cotton');
      if (marketData && marketData.alerts) {
        setAlerts(marketData.alerts.slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchText.trim()) {
      toast.error('Please enter a commodity search term');
      return;
    }

    try {
      setIsLoading(true);
      const data = await getRecommendation(
        searchText.trim(),
        originInput.trim(),
        quantityInput ? parseFloat(quantityInput) : null
      );
      
      if (data) {
        setCurrentRecommendation(data);
        setShowModal(true);
        toast.success(`Resolved mapping for "${searchText}"!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Reasoning synthesis failed. Check backend status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertRate = async (alertId, isPositive) => {
    if (ratedAlerts[alertId]) return;
    try {
      await postAlertFeedback(alertId, isPositive);
      setRatedAlerts((prev) => ({ ...prev, [alertId]: isPositive ? 'up' : 'down' }));
      toast.success('Feedback recorded to adaptive pipeline!');
    } catch (err) {
      toast.error('Failed to register feedback.');
    }
  };

  // Default fallbacks for statistics styling and presentation
  const defaultStats = {
    aliases_total: 637,
    corrections_this_week: 14,
    total_resolutions: 150,
    tier_breakdown: {
      exact: 82,
      trigram: 34,
      embedding: 22,
      llm: 9,
      unknown: 3,
    },
    recent_activity: [
      { date: 'Mon', count: 12 },
      { date: 'Tue', count: 18 },
      { date: 'Wed', count: 15 },
      { date: 'Thu', count: 22 },
      { date: 'Fri', count: 20 },
      { date: 'Sat', count: 25 },
      { date: 'Sun', count: 32 },
    ],
  };

  const activeStats = learningStats || defaultStats;

  const pieData = [
    { name: 'Exact Match', value: activeStats.tier_breakdown?.exact || 0, color: '#10b981' },
    { name: 'Fuzzy Match', value: activeStats.tier_breakdown?.trigram || 0, color: '#3b82f6' },
    { name: 'Semantic Match', value: activeStats.tier_breakdown?.embedding || 0, color: '#8b5cf6' },
    { name: 'AI Resolved', value: activeStats.tier_breakdown?.llm || 0, color: '#f59e0b' },
    { name: 'Unknown', value: activeStats.tier_breakdown?.unknown || 0, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const formatSparklineData = () => {
    if (activeStats.recent_activity && activeStats.recent_activity.length > 0) {
      return activeStats.recent_activity.map(item => ({
        day: item.date ? item.date.substring(5) : item.day,
        resolutions: item.count || 0
      }));
    }
    return defaultStats.recent_activity;
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-display">
            TradeNexus Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Multilingual market intelligence and optimal corridor routing dispatcher.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-300 font-semibold">
            System Live: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Hero Search Section */}
      <div className="glass-card p-8 border border-slate-700/40 relative overflow-hidden">
        {/* Soft back glowing circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-2xl -z-10" />

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Ask TradeNexus Intelligence Advisor
            </h2>
            <p className="text-slate-400 text-sm">
              Resolve multilingual agricultural names in real-time to find highest margins.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Commodity text alias search */}
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter commodity: e.g. Kapas, Cotton, कपास, Alu, Potato..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {/* Origin city select/input */}
              <div className="relative w-full md:w-48">
                <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-emerald-400" />
                <input
                  type="text"
                  placeholder="Origin City"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-semibold"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                />
              </div>

              {/* Optional Quantity */}
              <div className="relative w-full md:w-36">
                <Scale className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="number"
                  placeholder="Qty (Qtl)"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-900/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-semibold"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2 mx-auto"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Generate AI Advice
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span>Try searching:</span>
            {['Kapas', 'Alu', 'Batata', 'Mustard', 'Soybean'].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => setSearchText(keyword)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-md border border-slate-700/50 transition-colors"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Alerts (Left) vs Learning Widget (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Active Alerts panel */}
        <div className="glass-card p-6 border border-slate-700/40 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Active Market Alerts</h3>
                <p className="text-xs text-slate-400">Real-time price spikes and drop triggers</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full">
              Live
            </span>
          </div>

          <div className="space-y-4 flex-grow overflow-y-auto max-h-[360px] pr-2 custom-scrollbar">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl space-y-3 hover:border-slate-600/50 transition-colors"
                >
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider">
                      {alert.alert_type === 'demand_spike' ? '🔥 Spike' : '📉 Drop'} •{' '}
                      {new Date(alert.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Feedback buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 mr-1">Was this helpful?</span>
                      <button
                        onClick={() => handleAlertRate(alert.id, true)}
                        disabled={ratedAlerts[alert.id]}
                        className={`p-1.5 rounded-lg border transition-all ${
                          ratedAlerts[alert.id] === 'up'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAlertRate(alert.id, false)}
                        disabled={ratedAlerts[alert.id]}
                        className={`p-1.5 rounded-lg border transition-all ${
                          ratedAlerts[alert.id] === 'down'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                            : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-slate-600" />
                <p className="text-slate-400 text-sm font-semibold">No active alerts detected</p>
                <p className="text-xs text-slate-500">Mandi pricing corridors are within normal bounds.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Learning Activity widget */}
        <div className="glass-card p-6 border border-slate-700/40 flex flex-col space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Adaptive Learning Activity</h3>
              <p className="text-xs text-slate-400">Multilingual cascade dictionary optimization</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl text-center space-y-1">
              <span className="text-2xl font-extrabold text-white font-display">
                {activeStats.aliases_total}
              </span>
              <p className="text-xs text-slate-400 font-medium">Mapped Dialects & Aliases</p>
            </div>
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center space-y-1">
              <span className="text-2xl font-extrabold text-emerald-400 font-display">
                +{activeStats.corrections_this_week}
              </span>
              <p className="text-xs text-slate-400 font-medium">Learned This Week</p>
            </div>
          </div>

          {/* Sparkline & Pie Chart Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow items-center">
            {/* Resolution sparkline */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Cascaded Queries</span>
                <span className="text-emerald-400 font-bold">7-Day Trend</span>
              </div>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatSparklineData()}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="resolutions"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Small PieChart breakdown */}
            <div className="flex flex-col items-center space-y-2">
              <div className="h-[100px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 font-bold">Tier Ratio</span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
                {pieData.slice(0, 3).map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Sheet/Modal with TradeRecommendation details */}
      {showModal && currentRecommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700/60 p-6 flex flex-col relative space-y-6 shadow-2xl animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-700/40">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-extrabold text-white font-display">
                    TradeNexus Advisory Report
                  </h3>
                  <ResolutionBadge tier={currentRecommendation.resolution_tier} />
                </div>
                <p className="text-slate-400 text-sm">
                  Corridor recommendation for{' '}
                  <span className="text-emerald-400 font-bold">{currentRecommendation.commodity}</span>{' '}
                  dispatched from <span className="text-white font-semibold">{originInput}</span>.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: AI Recommendation Text */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mb-3.5 inline-block">
                    TradeNexus LLM Recommendation Summary
                  </span>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {currentRecommendation.ai_recommendation}
                  </p>
                </div>

                {/* Top Markets Table */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Highest Selling Mandis (Top Price Channels)
                  </h4>
                  <div className="border border-slate-700/40 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-700/40">
                          <th className="p-3 font-semibold">Rank</th>
                          <th className="p-3 font-semibold">Mandi Name</th>
                          <th className="p-3 font-semibold">State</th>
                          <th className="p-3 font-semibold">Modal Price</th>
                          <th className="p-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRecommendation.top_markets.map((market, index) => (
                          <tr
                            key={index}
                            className={`border-b border-slate-700/20 transition-colors hover:bg-slate-800/20 ${
                              market.anomaly_flag ? 'bg-amber-500/5 text-amber-300' : 'text-slate-300'
                            }`}
                          >
                            <td className="p-3 font-bold">#{index + 1}</td>
                            <td className="p-3 font-semibold">{market.mandi}</td>
                            <td className="p-3">{market.state}</td>
                            <td className="p-3 font-extrabold text-sm">
                              {formatINR(market.modal_price)}
                              <span className="text-[10px] font-normal text-slate-400 ml-1">
                                /{market.unit}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {market.anomaly_flag ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                  ⚠️ Arbitrage Peak
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium">Standard</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Route confidence and alerts list */}
              <div className="space-y-6">
                
                {/* Confidence Gauge */}
                {currentRecommendation.best_route ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                      Logistics Telemetry
                    </h4>
                    <ConfidenceGauge score={currentRecommendation.best_route.confidence_score} />
                    
                    {/* Routing Details Card */}
                    <div className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Destination address:</span>
                        <span className="font-bold text-white">
                          {currentRecommendation.best_route.destination}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Driving distance:</span>
                        <span className="font-bold text-white">
                          {currentRecommendation.best_route.distance_km} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Transit duration:</span>
                        <span className="font-bold text-white">
                          {currentRecommendation.best_route.estimated_hours} hrs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Typical duration:</span>
                        <span className="font-bold text-white">
                          {currentRecommendation.best_route.typical_hours} hrs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Risk alerts (14d):</span>
                        <span className={`font-bold ${
                          currentRecommendation.best_route.recent_reports_count > 0 ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {currentRecommendation.best_route.recent_reports_count} incidents
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-800/40 border border-slate-700/30 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 h-44">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-300">No route mapping available</span>
                    <span className="text-[10px] text-slate-500">Ensure origin/destinations exist in seeded corridors.</span>
                  </div>
                )}

                {/* Metadata details (Data freshness & overall confidence) */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Data Freshness:</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      currentRecommendation.data_freshness.includes('Live')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-900 text-slate-400'
                    }`}>
                      {currentRecommendation.data_freshness}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Cascade Confidence:</span>
                    <span className="font-bold text-white">
                      {Math.round(currentRecommendation.confidence_score * 100)}%
                    </span>
                  </div>
                </div>

                {/* Active Alerts Pills */}
                {currentRecommendation.active_alerts && currentRecommendation.active_alerts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Triggered Corridor Alerts
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentRecommendation.active_alerts.map((a, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[10px] font-bold"
                        >
                          ⚠️ {a.mandi_name || 'Mandi'}: {a.alert_type === 'demand_spike' ? 'Spike' : 'Drop'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-4 border-t border-slate-700/40 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition-colors text-xs"
              >
                Close Advisor Report
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
