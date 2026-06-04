import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  TrendingUp, 
  BarChart3, 
  Truck, 
  AlertTriangle, 
  Loader2, 
  ChevronRight, 
  ArrowRight, 
  Activity, 
  Plus, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend 
} from 'recharts';

// UI components
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

// Formatting helpers
import { 
  formatINR, 
  formatQty, 
  formatDate, 
  formatPnL, 
  getPnLColor, 
  getStatusColor, 
  getContractTypeColor 
} from '../../utils/format';

// API client
import { 
  getPortfolioSummary, 
  getMtmList, 
  recalculateMtm, 
  getRiskAlerts, 
  getAgentActivity, 
  getMacroSignals,
  createContract,
  parseFieldNote
} from '../../lib/api';

export const Dashboard = () => {
  const navigate = useNavigate();
  
  // Real API states
  const [summary, setSummary] = useState(null);
  const [mtmRows, setMtmRows] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [macroSignals, setMacroSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Quick trade entry state
  const [fieldNote, setFieldNote] = useState('');
  const [parsingNote, setParsingNote] = useState(false);
  const [parsedDraft, setParsedDraft] = useState(null);
  const [creatingContract, setCreatingContract] = useState(false);

  // Time state for header
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pie chart colors
  const PIE_COLORS = [
    'var(--brand-green)', 
    'var(--blue)', 
    'var(--amber)', 
    'var(--rose)', 
    '#8b5cf6', 
    '#06b6d4', 
    '#ec4899', 
    '#10b981'
  ];

  // Fetch all dashboard data
  const fetchDashboardData = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [summaryData, mtmData, alertsData, activityData, signalsData] = await Promise.all([
        getPortfolioSummary(),
        getMtmList(),
        getRiskAlerts(),
        getAgentActivity(),
        getMacroSignals()
      ]);
      setSummary(summaryData);
      setMtmRows(mtmData);
      setAlerts(alertsData);
      setActivityLog(activityData);
      setMacroSignals(signalsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error('Failed to update live dashboard metrics. Using cache.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchDashboardData(true);

    // Live clock update every minute
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Agent activity auto-refresh every 5 minutes
    const activityInterval = setInterval(() => {
      fetchDashboardData(false);
    }, 300000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(activityInterval);
    };
  }, []);

  // Recalculate portfolio risk
  const handleRecalculate = async () => {
    setRecalculating(true);
    toast.loading('Recalculating portfolio Mark-to-Market...', { id: 'recalc-mtm' });
    try {
      await recalculateMtm();
      await fetchDashboardData(false);
      toast.success('Portfolio metrics successfully updated!', { id: 'recalc-mtm' });
    } catch (err) {
      console.error('Recalculation error:', err);
      toast.error('Unable to recalculate live MtM at this time.', { id: 'recalc-mtm' });
    } finally {
      setRecalculating(false);
    }
  };

  // Dismiss a risk alert locally
  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    toast.success('Alert dismissed');
  };

  // Parse quick field note
  const handleParseNote = async (e) => {
    e.preventDefault();
    if (!fieldNote.trim()) {
      toast.error('Please enter a note to parse');
      return;
    }
    setParsingNote(true);
    try {
      const res = await parseFieldNote(fieldNote);
      setParsedDraft(res);
      toast.success('Field note parsed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('AI parsing failed. Please verify your format.');
    } finally {
      setParsingNote(false);
    }
  };

  // Create contract from parsed draft
  const handleConfirmDraft = async () => {
    if (!parsedDraft) return;
    setCreatingContract(true);
    try {
      await createContract({
        type: parsedDraft.action.toUpperCase(),
        commodity: parsedDraft.commodity,
        quantity: parsedDraft.quantity,
        price: parsedDraft.price,
        counterparty_name: parsedDraft.counterparty,
        delivery_location: 'Nagpur Mandi',
        delivery_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
        unit: 'quintal'
      });
      toast.success(`Draft Contract created successfully!`);
      setParsedDraft(null);
      setFieldNote('');
      // Reload dashboard data
      fetchDashboardData(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create contract draft.');
    } finally {
      setCreatingContract(false);
    }
  };

  // Prepare Pie Chart data (percentage value exposure per commodity)
  const getPieData = () => {
    if (!mtmRows || mtmRows.length === 0) return [];
    
    // Group open value by commodity
    const grouped = {};
    let totalValue = 0;
    mtmRows.forEach(row => {
      const value = row.quantity * row.contract_price;
      grouped[row.commodity] = (grouped[row.commodity] || 0) + value;
      totalValue += value;
    });

    if (totalValue === 0) return [];

    return Object.keys(grouped).map(commodity => ({
      name: commodity,
      value: Math.round((grouped[commodity] / totalValue) * 100)
    }));
  };

  const pieData = getPieData();

  // Helper for active alert styling
  const getAlertColor = (type) => {
    switch (type) {
      case 'risk': return 'bg-rose-500';
      case 'demand_spike': return 'bg-amber-500';
      case 'weather_risk': return 'bg-blue-500';
      case 'sentiment': return 'bg-purple-500';
      default: return 'bg-slate-400';
    }
  };

  // Helper for agentActivity chips
  const getAgentChipClasses = (agentName) => {
    switch (agentName) {
      case 'Risk Agent': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Weather Agent': return 'bg-teal-50 text-teal-600 border-teal-200';
      case 'Macro Signal Agent': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'Contract Agent': return 'bg-green-50 text-green-600 border-green-200';
      case 'Ingestion Agent': return 'bg-orange-50 text-orange-600 border-orange-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Sort MTM list by PnL ascending (losses first)
  const sortedMtmRows = [...mtmRows].sort((a, b) => a.unrealized_pnl - b.unrealized_pnl);
  const displayMtmRows = sortedMtmRows.slice(0, 8);

  // Time formatter
  const formattedDateTime = currentTime.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <PageHeader
        title="Command Center"
        subtitle={loading ? 'Live portfolio overview' : `Live portfolio overview — ${summary?.open_contracts_count || 0} open contracts`}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg select-none">
              ⏰ {formattedDateTime}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchDashboardData(false)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-36 bg-white border border-slate-200 rounded-xl animate-pulse p-6 flex flex-col justify-between">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-8 bg-slate-200 rounded w-2/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.0 }}
            >
              <StatCard
                label="Total Exposure"
                value={formatINR(summary?.total_open_value || 0)}
                delta={`+${summary?.open_contracts_count || 0} open`}
                icon={<TrendingUp className="w-5 h-5" />}
                color="blue"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <StatCard
                label="Today's P&L"
                value={formatPnL(summary?.total_unrealized_pnl || 0)}
                delta={`${summary?.pnl_positive_count || 0} winning, ${summary?.pnl_negative_count || 0} losing`}
                icon={<BarChart3 className="w-5 h-5" />}
                color={(summary?.total_unrealized_pnl || 0) >= 0 ? 'green' : 'rose'}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <StatCard
                label="Dispatches In Transit"
                value={String(summary?.in_transit_count || 0)}
                delta={`Next ETA: ${summary?.nearest_eta || 'N/A'}`}
                icon={<Truck className="w-5 h-5" />}
                color="amber"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <StatCard
                label="Risk Alerts"
                value={String(alerts.filter(a => a.is_active).length)}
                delta="Weather + market signals"
                icon={<AlertTriangle className="w-5 h-5" />}
                color={alerts.filter(a => a.is_active).length > 0 ? 'rose' : 'green'}
              />
            </motion.div>
          </>
        )}
      </div>

      {/* Row 2: Live MtM P&L Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Live Mark-to-Market Valuation</h3>
            <p className="text-xs text-slate-400">Contracts active in portfolio, sorted by worst unrealized loss first</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5"
          >
            {recalculating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Recalculate
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-slate-50 border border-slate-100 rounded-lg animate-pulse flex items-center justify-between px-4">
                  <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/12"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/12"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          ) : mtmRows.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No active contracts found in portfolio.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 rounded-t-lg">
                  <th className="py-3 px-4 rounded-l-lg">Contract ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Contract Price</th>
                  <th className="py-3 px-4 text-right">Market Price</th>
                  <th className="py-3 px-4 text-right">Unrealized P&L</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayMtmRows.map((row) => {
                  const isPositive = row.unrealized_pnl >= 0;
                  const borderStyle = isPositive 
                    ? 'border-l-[3px] border-l-green-500' 
                    : 'border-l-[3px] border-l-red-500';

                  return (
                    <motion.tr
                      key={row.id}
                      onClick={() => navigate(`/app/contracts?id=${row.id}`)}
                      whileHover={{ backgroundColor: 'var(--surface-alt)' }}
                      className={`border-b border-slate-100 text-sm cursor-pointer transition-colors group ${borderStyle}`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {row.contract_number}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getContractTypeColor(row.type)}>
                          {row.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {row.commodity}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        {formatQty(row.quantity, row.unit)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatINR(row.contract_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatINR(row.market_price)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${getPnLColor(row.unrealized_pnl)}`}>
                        {formatPnL(row.unrealized_pnl)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusColor(row.status)}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 group-hover:text-brand-green transition-colors">
                        <ChevronRight className="w-4 h-4 inline-block" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/contracts')}
            className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-900"
          >
            View all in Contract Book
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      {/* Row 3: Active Alerts & Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left 60%: Active Alerts */}
        <Card className="lg:col-span-3 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Active Signals & Alerts</h3>
                <p className="text-xs text-slate-400">Aggregated weather anomalies and local mandi price alerts</p>
              </div>
              <Badge variant={alerts.length > 0 ? 'danger' : 'neutral'}>
                {alerts.length} Active
              </Badge>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-16 bg-slate-50 border border-slate-100 rounded-lg animate-pulse"></div>
                ))
              ) : alerts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  🟢 Clear sky. No critical risks or market deviations found.
                </div>
              ) : (
                alerts.slice(0, 8).map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex items-start justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${getAlertColor(alert.alert_type)}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{alert.message}</p>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {formatDate(alert.created_at)} • Mandi: {alert.mandi_name || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => dismissAlert(alert.id)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/markets')}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-900"
            >
              View all Market Alerts
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* Right 40%: Agent Activity */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">Agent Activity</h3>
              <p className="text-xs text-slate-400">This is what the AI has been doing while you work</p>
            </div>

            <div className="space-y-4 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-14 bg-slate-50 border border-slate-100 rounded-lg animate-pulse"></div>
                ))
              ) : activityLog.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No recent AI operations recorded.
                </div>
              ) : (
                activityLog.map((act) => (
                  <div key={act.id} className="flex gap-3 text-sm">
                    <Activity className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 uppercase tracking-wider ${getAgentChipClasses(act.agent_name)}`}>
                          {act.agent_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs font-medium leading-relaxed">
                        {act.summary}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 border-t border-slate-50 pt-4 flex justify-between items-center text-xs text-slate-400">
            <span>🔄 Auto-updates every 5 mins</span>
          </div>
        </Card>
      </div>

      {/* Row 4: Commodity Exposure, Dispatches Progress, Market Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Commodity Exposure Pie Chart */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Commodity Exposure</h3>
          <p className="text-xs text-slate-400 mb-4">Value allocation breakdown by crop category</p>

          <div className="h-56 relative">
            {pieData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                No exposure records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="48%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[index % PIE_COLORS.length]} 
                        className="cursor-pointer focus:outline-none"
                        onClick={() => navigate(`/app/contracts?commodity=${entry.name}`)}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Col 2: Recent Dispatches */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Dispatches Progress</h3>
            <p className="text-xs text-slate-400 mb-4">Fulfillment tracking of active dispatches</p>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-16 bg-slate-50 border border-slate-100 rounded-lg animate-pulse"></div>
                ))
              ) : mtmRows.filter(r => r.dispatches && r.dispatches.length > 0).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active transits booked.
                </div>
              ) : (
                // Extract active dispatches from contracts
                mtmRows
                  .filter(r => r.dispatches && r.dispatches.length > 0)
                  .flatMap(r => r.dispatches.map(d => ({ ...d, commodity: r.commodity, contract_number: r.contract_number })))
                  .slice(0, 3)
                  .map((d, index) => {
                    // Simple mock progress calculation: 50% for in_transit, 100% for delivered
                    const progress = d.status === 'delivered' ? 100 : 55;
                    return (
                      <div key={d.id || index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-800">{d.contract_number} ({d.commodity})</span>
                          <span className="text-slate-500">{d.vehicle || 'Truck'}</span>
                          <Badge variant={getStatusColor(d.status)}>
                            {d.status}
                          </Badge>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div 
                            className="bg-brand-green h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Progress: {progress}%</span>
                          <span>ETA: {d.eta || 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/dispatch')}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Dispatch
            </Button>
          </div>
        </Card>

        {/* Col 3: Market Sentiment */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Market Sentiment</h3>
          <p className="text-xs text-slate-400 mb-4">Daily macro signals synthesized by AI scanner</p>

          <div className="space-y-3.5">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-10 bg-slate-50 border border-slate-100 rounded animate-pulse"></div>
              ))
            ) : macroSignals.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No active sentiment signals parsed today.
              </div>
            ) : (
              macroSignals.map((sig) => (
                <div key={sig.id} className="flex items-start gap-2.5 text-xs">
                  {sig.sentiment === 'bull' ? (
                    <span className="p-1 rounded bg-emerald-50 text-emerald-600 shrink-0">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </span>
                  ) : sig.sentiment === 'bear' ? (
                    <span className="p-1 rounded bg-rose-50 text-rose-600 shrink-0">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 rounded bg-slate-100 text-slate-500 shrink-0">
                      <Minus className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{sig.commodity}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {sig.sentiment}
                      </span>
                    </div>
                    <p className="text-slate-500 leading-tight mt-0.5">{sig.key_signal}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Row 5: Quick Trade Entry */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-brand-green" />
          <h3 className="text-lg font-bold text-slate-900">Quick Trade Entry</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Draft a formal purchase or sales contract instantly by typing or pasting a field note.
        </p>

        <form onSubmit={handleParseNote} className="space-y-4">
          <div className="relative">
            <textarea
              value={fieldNote}
              onChange={(e) => setFieldNote(e.target.value)}
              placeholder="Try: Ramesh se 50 quintal kapas liya 6400 rupaye..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-sm custom-scrollbar"
            />
            <span className="absolute bottom-3 right-3 text-[10px] text-slate-400">
              Supports English, Hindi, Hinglish
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              ⚡ Powered by Ingestion Agent
            </span>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={parsingNote || !fieldNote.trim()}
              className="flex items-center gap-1.5"
            >
              {parsingNote ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Parse & Create Draft
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Parsed Result Preview */}
        <AnimatePresence>
          {parsedDraft && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-6 border-t border-slate-100 pt-6"
            >
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-800">Parsed Extraction Preview</h4>
                  </div>
                  <Badge variant="success">
                    Confidence: {Math.round(parsedDraft.confidence * 100)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5">
                  <div className="p-3 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5">Type</span>
                    <span className="font-semibold text-slate-800 uppercase">{parsedDraft.action}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5">Commodity</span>
                    <span className="font-semibold text-slate-800">{parsedDraft.commodity}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5">Quantity</span>
                    <span className="font-semibold text-slate-800">{formatQty(parsedDraft.quantity)}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5">Price</span>
                    <span className="font-semibold text-slate-800">{formatINR(parsedDraft.price)} / quintal</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-xs text-slate-400 shrink-0">
                    Counterparty: <span className="font-semibold text-slate-700">{parsedDraft.counterparty}</span>
                  </div>
                  <div className="flex-grow border-b border-dashed border-slate-200" />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setParsedDraft(null)}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmDraft}
                      disabled={creatingContract}
                      className="text-xs flex items-center gap-1 bg-brand-green text-white"
                    >
                      {creatingContract ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Confirm & Create Contract
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default Dashboard;
