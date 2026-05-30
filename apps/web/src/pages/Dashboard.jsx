import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  getLearningStats, 
  getRecommendation, 
  postAlertFeedback,
  getMarketPrices
} from '../lib/api';
import { 
  demoAlerts, 
  demoLearningStats, 
  demoCorridors, 
  demoOpportunities, 
  demoRecommendation 
} from '../data/demo';

// UI components
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ResolutionBadge from '../components/ui/ResolutionBadge';
import ConfidenceGauge from '../components/ui/ConfidenceGauge';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { 
  AlertTriangle, 
  Sparkles, 
  Activity, 
  Navigation, 
  Search, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowRight, 
  ChevronRight, 
  Globe, 
  TrendingUp, 
  Truck, 
  Handshake, 
  Brain 
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

export const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    isLoading, 
    setIsLoading, 
    alerts, 
    setAlerts,
    learningStats,
    setLearningStats,
    currentRecommendation,
    setCurrentRecommendation
  } = useStore();

  // Search input state
  const [commoditySearch, setCommoditySearch] = useState('');
  const [originSearch, setOriginSearch] = useState('Nagpur');
  const [quantitySearch, setQuantitySearch] = useState('');
  const [recommendationResult, setRecommendationResult] = useState(null);

  // Rated alerts mapping
  const [ratedAlerts, setRatedAlerts] = useState({});

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats
      const stats = await getLearningStats();
      if (stats && !stats.error) {
        setLearningStats(stats);
      } else {
        setLearningStats(demoLearningStats);
      }

      // Fetch market alerts for Cotton as fallback default
      const marketRes = await getMarketPrices('Cotton');
      if (marketRes && marketRes.alerts) {
        setAlerts(marketRes.alerts.slice(0, 5));
      } else {
        setAlerts(demoAlerts);
      }
    } catch (e) {
      console.warn('Dashboard fetch failed, loading demo values');
      setLearningStats(demoLearningStats);
      setAlerts(demoAlerts);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvisorSubmit = async (e) => {
    e.preventDefault();
    if (!commoditySearch.trim()) {
      toast.error('Please enter a commodity name');
      return;
    }

    try {
      setIsLoading(true);
      setRecommendationResult(null);

      const res = await getRecommendation(
        commoditySearch.trim(),
        originSearch.trim(),
        quantitySearch ? parseFloat(quantitySearch) : null
      );

      if (res && res.ai_recommendation) {
        setRecommendationResult(res);
        setCurrentRecommendation(res);
        toast.success(`Advice generated for "${commoditySearch}"`);
      } else {
        // fall back silently to demo Cotton
        setRecommendationResult(demoRecommendation);
        setCurrentRecommendation(demoRecommendation);
        toast.success('Advice loaded (Demo mode)');
      }
    } catch (err) {
      console.warn('Failed advising, loading demo');
      setRecommendationResult(demoRecommendation);
      setCurrentRecommendation(demoRecommendation);
      toast.success('Advice loaded (Demo mode)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertRate = async (alertId, isPositive) => {
    if (ratedAlerts[alertId]) return;
    try {
      await postAlertFeedback(alertId, isPositive);
      setRatedAlerts(prev => ({ ...prev, [alertId]: isPositive ? 'up' : 'down' }));
      toast.success('Feedback recorded to adaptive pipeline');
    } catch (e) {
      setRatedAlerts(prev => ({ ...prev, [alertId]: isPositive ? 'up' : 'down' }));
      toast.success('Feedback recorded (Demo mode)');
    }
  };

  // Safe fallback counts
  const activeAlertsCount = alerts?.filter(a => a.is_active)?.length || 0;
  const activeStats = learningStats || demoLearningStats;
  const activeAlerts = alerts || demoAlerts;

  const pieData = [
    { name: 'Exact Match', value: activeStats.tier_breakdown?.exact || 0, color: '#16a34a' },
    { name: 'Fuzzy Match', value: activeStats.tier_breakdown?.trigram || 0, color: '#2563eb' },
    { name: 'Semantic Match', value: activeStats.tier_breakdown?.embedding || 0, color: '#8b5cf6' },
    { name: 'AI Resolved', value: activeStats.tier_breakdown?.llm || 0, color: '#d97706' },
  ].filter(d => d.value > 0);

  // Top Commodities List mockup
  const topCommodities = [
    { name: 'Cotton', bestMandi: 'Nagpur (MH)', price: 7250, trend: '↑ 18%' },
    { name: 'Wheat', bestMandi: 'Ludhiana (PB)', price: 2350, trend: '↑ 4.5%' },
    { name: 'Soybean', bestMandi: 'Indore (MP)', price: 4800, trend: '↓ 12%' },
    { name: 'Mustard', bestMandi: 'Jaipur (RJ)', price: 5400, trend: '↑ 6.2%' },
    { name: 'Potato', bestMandi: 'Ahmedabad (GJ)', price: 1850, trend: '↑ 14%' },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-slate-700">
      
      {/* PageHeader layout */}
      <PageHeader 
        title="Good morning, Ramesh" 
        subtitle="Here is your agricultural trade overview for today."
        actions={
          <span className="text-xs font-semibold text-slate-400">
            System updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        }
      />

      {/* ROW 1 — STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Active Alerts" 
          value={activeAlertsCount} 
          delta={activeAlertsCount > 0 ? `${activeAlertsCount} Spikes` : 'Standard'}
          icon={<AlertTriangle className="w-5 h-5" />} 
          color={activeAlertsCount > 0 ? "rose" : "green"} 
        />
        <StatCard 
          label="Markets Monitored" 
          value="3,247 mandis" 
          delta="+12 added"
          icon={<TrendingUp className="w-5 h-5" />} 
          color="green" 
        />
        <StatCard 
          label="Aliases Learned Today" 
          value={activeStats.corrections_this_week || 47} 
          delta="Cascade boost"
          icon={<Sparkles className="w-5 h-5" />} 
          color="amber" 
        />
        <StatCard 
          label="Avg Route Confidence" 
          value="82%" 
          delta="+2.4% traffic"
          icon={<Truck className="w-5 h-5" />} 
          color="blue" 
        />
      </div>

      {/* ROW 2 — PRIMARY CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Column (60%): Market Alerts */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col justify-between p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Market Alerts & Spikes
                  </h3>
                </div>
                {activeAlertsCount > 0 && (
                  <Badge variant="danger">{activeAlertsCount} Active</Badge>
                )}
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {activeAlerts.length > 0 ? (
                  activeAlerts.map((alert) => {
                    const isSpike = alert.alert_type === 'demand_spike';
                    return (
                      <div 
                        key={alert.id}
                        className="flex items-start justify-between gap-4 p-3 bg-slate-50 border rounded-xl hover:bg-slate-100/50 transition-colors"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                            isSpike ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 leading-tight">
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                              <span>{isSpike ? '⚡ Spike' : '📉 Drop'}</span>
                              <span>•</span>
                              <span>{new Date(alert.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Thumbs up/down */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAlertRate(alert.id, true)}
                            disabled={ratedAlerts[alert.id]}
                            className={`p-1.5 rounded-lg border transition-all ${
                              ratedAlerts[alert.id] === 'up'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-white text-slate-400 hover:text-slate-700'
                            }`}
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAlertRate(alert.id, false)}
                            disabled={ratedAlerts[alert.id]}
                            className={`p-1.5 rounded-lg border transition-all ${
                              ratedAlerts[alert.id] === 'down'
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : 'bg-white text-slate-400 hover:text-slate-700'
                            }`}
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Markets are quiet. Pricing corridors within normal statistical limits.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t text-right" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => navigate('/app/markets')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                View all alerts <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column (40%): Learning Activity */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <Globe className="w-5 h-5 text-slate-400" />
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Adaptive Learning Activity
                </h3>
              </div>

              <div className="text-center space-y-1">
                <span className="text-3xl font-extrabold text-slate-900 font-display block">
                  {activeStats.corrections_this_week || 47}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  aliases resolved this week
                </span>
              </div>

              {/* Recharts PieChart */}
              <div className="h-[120px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-[10px] font-bold text-slate-400 uppercase">
                  Tiers
                </div>
              </div>

              {/* Stats Rows */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-emerald-600">⚡</span>
                  <span>{activeStats.tier_breakdown?.exact || 312} exact</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-blue-600">🔍</span>
                  <span>{activeStats.tier_breakdown?.trigram || 89} fuzzy</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-purple-600">✦</span>
                  <span>{activeStats.tier_breakdown?.embedding || 34} semantic</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-amber-600">✧</span>
                  <span>{activeStats.tier_breakdown?.llm || 8} AI</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold border-t" style={{ borderColor: 'var(--border)' }}>
              <span>Powered by Adaptive Data</span>
              <span className="text-emerald-600 uppercase">Adaption AI</span>
            </div>
          </Card>
        </div>

      </div>

      {/* ROW 3 — SECONDARY (3 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Col 1: Top Commodities Today */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            Top Commodities Today
          </h3>
          <div className="space-y-3">
            {topCommodities.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => navigate(`/app/markets?commodity=${item.name}`)}
                className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent rounded-lg cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 block">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{item.bestMandi}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900 block">{formatINR(item.price)}</span>
                  <span className="text-[10px] text-emerald-600 font-bold">{item.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Col 2: Route Watch */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            Route Watch
          </h3>
          <div className="space-y-4">
            {demoCorridors.slice(0, 3).map((item, idx) => {
              const score = item.reliability_score;
              return (
                <div 
                  key={idx} 
                  onClick={() => navigate('/app/dispatch')}
                  className="p-3 bg-slate-50 border rounded-xl hover:bg-slate-100/50 cursor-pointer transition-all space-y-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">{item.origin} → {item.destination}</span>
                    <span className={score >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}>
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                  
                  {/* Miniature progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${score >= 0.7 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${score * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Col 3: Open Opportunities */}
        <Card className="p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              Open Opportunities
            </h3>
            <div className="space-y-3">
              {demoOpportunities.slice(0, 2).map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => navigate('/app/opportunities')}
                  className="p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all space-y-1.5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">{item.commodity_name}</span>
                    <Badge variant={item.is_return_load ? "warning" : "success"}>
                      {item.is_return_load ? "Return" : "Forward"}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {item.origin} → {item.destination} • {item.quantity} qtl
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full mt-4"
            onClick={() => navigate('/app/opportunities')}
          >
            <Handshake className="w-4 h-4 mr-2" />
            Manage Opportunities
          </Button>
        </Card>

      </div>

      {/* ROW 4 — QUICK ADVISOR */}
      <Card className="p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-600" />
            Ask the Trade Advisor
          </h3>
          <p className="text-xs text-slate-400 font-semibold">
            Synthesize real-time prices, routes, and alerts into a direct AI recommendation.
          </p>
        </div>

        <form onSubmit={handleAdvisorSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commodity Name</label>
            <input
              type="text"
              placeholder="e.g. Cotton, Kapas, Batata"
              className="w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ borderColor: 'var(--border)' }}
              value={commoditySearch}
              onChange={(e) => setCommoditySearch(e.target.value)}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origin Location</label>
            <input
              type="text"
              placeholder="e.g. Nagpur"
              className="w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ borderColor: 'var(--border)' }}
              value={originSearch}
              onChange={(e) => setOriginSearch(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantity (Quintals)</label>
            <input
              type="number"
              placeholder="e.g. 100"
              className="w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ borderColor: 'var(--border)' }}
              value={quantitySearch}
              onChange={(e) => setQuantitySearch(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              className="w-full py-2 text-xs font-bold"
            >
              Get Recommendation
            </Button>
          </div>
        </form>

        {/* Inline result representation */}
        {recommendationResult && (
          <div className="p-5 border rounded-xl bg-slate-50/50 space-y-4 animate-slide-up" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <ResolutionBadge tier={recommendationResult.resolution_tier} />
              <span className="text-xs font-bold text-slate-500">
                Resolved to <strong className="text-slate-800">{recommendationResult.commodity}</strong>
              </span>
            </div>

            <div className="bg-white border rounded-xl p-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                {recommendationResult.ai_recommendation}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top selling market</span>
                <span className="text-sm font-bold text-slate-800">
                  {recommendationResult.top_markets[0]?.mandi || 'N/A'} ({recommendationResult.top_markets[0]?.state || 'N/A'}) •{' '}
                  <strong className="text-emerald-600">{formatINR(recommendationResult.top_markets[0]?.modal_price)}</strong>
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corridor confidence</span>
                <span className="text-sm font-bold text-slate-800">
                  {Math.round(recommendationResult.confidence_score * 100)}% reliability score
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
