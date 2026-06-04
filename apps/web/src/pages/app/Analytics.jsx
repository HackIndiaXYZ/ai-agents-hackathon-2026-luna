import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Area
} from 'recharts';
import { 
  BarChart3, Calendar, Filter, Download, ArrowUpRight, ArrowDownRight, 
  TrendingUp, Users, ShoppingBag, DollarSign, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

import { getContracts, getMtmList, getCounterparties } from '../../lib/api';
import { formatINR, getPnLColor } from '../../utils/format';

export const Analytics = () => {
  const [timeframe, setTimeframe] = useState('all'); // 30d, ytd, all
  const [selectedCommodity, setSelectedCommodity] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // all, buy, sell
  
  const [contracts, setContracts] = useState([]);
  const [mtmRows, setMtmRows] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [contractsData, mtmData, cpData] = await Promise.all([
        getContracts(),
        getMtmList(),
        getCounterparties()
      ]);
      setContracts(contractsData || []);
      setMtmRows(mtmData || []);
      setCounterparties(cpData || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to sync live analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Unique commodities list for filters
  const commoditiesList = useMemo(() => {
    const list = new Set(contracts.map(c => c.commodity).filter(Boolean));
    return ['all', ...Array.from(list).sort()];
  }, [contracts]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    let result = [...contracts];
    
    // Filter by commodity
    if (selectedCommodity !== 'all') {
      result = result.filter(c => c.commodity.toLowerCase() === selectedCommodity.toLowerCase());
    }
    
    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter(c => c.type.toLowerCase() === selectedType.toLowerCase());
    }

    // Filter by timeframe
    const now = new Date();
    if (timeframe === '30d') {
      const limit = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      result = result.filter(c => new Date(c.contract_date) >= limit);
    } else if (timeframe === 'ytd') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      result = result.filter(c => new Date(c.contract_date) >= startOfYear);
    }
    
    return result;
  }, [contracts, selectedCommodity, selectedType, timeframe]);

  // Stats Aggregation
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let buyValue = 0;
    let sellValue = 0;
    let buyQty = 0;
    let sellQty = 0;
    
    // Calculate MtM totals based on filtered set
    const filteredMtm = mtmRows.filter(row => {
      const contract = contracts.find(c => c.id === row.contract_id || c.contract_number === row.contract_id);
      if (!contract) return true; // keep if details missing
      
      if (selectedCommodity !== 'all' && contract.commodity.toLowerCase() !== selectedCommodity.toLowerCase()) return false;
      if (selectedType !== 'all' && contract.type.toLowerCase() !== selectedType.toLowerCase()) return false;
      return true;
    });

    const totalPnL = filteredMtm.reduce((acc, curr) => acc + (curr.unrealized_pnl || 0), 0);

    filteredContracts.forEach(c => {
      const val = (c.quantity || 0) * (c.contract_price || c.price_per_unit || 0);
      totalQty += c.quantity || 0;
      totalValue += val;
      if (c.type.toLowerCase() === 'buy') {
        buyValue += val;
        buyQty += c.quantity || 0;
      } else {
        sellValue += val;
        sellQty += c.quantity || 0;
      }
    });

    const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;
    const avgBuyPrice = buyQty > 0 ? buyValue / buyQty : 0;
    const avgSellPrice = sellQty > 0 ? sellValue / sellQty : 0;

    return {
      totalQty,
      totalValue,
      totalPnL,
      buyQty,
      sellQty,
      avgPrice,
      avgBuyPrice,
      avgSellPrice,
      activeContractsCount: filteredContracts.length
    };
  }, [filteredContracts, mtmRows, contracts, selectedCommodity, selectedType]);

  // Chart Data 1: Trade Volume & Value Over Time (Monthly)
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = {};
    
    filteredContracts.forEach(c => {
      if (!c.contract_date) return;
      const dateObj = new Date(c.contract_date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const key = `${months[month]} ${year}`;
      
      const val = (c.quantity || 0) * (c.contract_price || c.price_per_unit || 0);
      
      if (!map[key]) {
        map[key] = { name: key, Volume: 0, Value: 0, sortKey: dateObj.getTime() };
      }
      map[key].Volume += c.quantity || 0;
      map[key].Value += val / 100000; // Value in Lakhs for readable scale
    });

    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredContracts]);

  // Chart Data 2: PnL Breakdown by Commodity
  const commodityPnLData = useMemo(() => {
    const map = {};
    
    mtmRows.forEach(row => {
      const contract = contracts.find(c => c.id === row.contract_id || c.contract_number === row.contract_id);
      if (!contract) return;
      
      const comm = contract.commodity;
      if (selectedCommodity !== 'all' && comm.toLowerCase() !== selectedCommodity.toLowerCase()) return;
      if (selectedType !== 'all' && contract.type.toLowerCase() !== selectedType.toLowerCase()) return;
      
      if (!map[comm]) {
        map[comm] = { name: comm, PnL: 0 };
      }
      map[comm].PnL += row.unrealized_pnl || 0;
    });

    return Object.values(map);
  }, [mtmRows, contracts, selectedCommodity, selectedType]);

  // Chart Data 3: Counterparty Concentration Value
  const counterpartyConcentrationData = useMemo(() => {
    const map = {};
    
    filteredContracts.forEach(c => {
      const cpName = c.counterparty_name || counterparties.find(cp => cp.id === c.counterparty_id)?.name || 'Unknown';
      const val = (c.quantity || 0) * (c.contract_price || c.price_per_unit || 0);
      
      if (!map[cpName]) {
        map[cpName] = { name: cpName, value: 0 };
      }
      map[cpName].value += val;
    });

    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5
  }, [filteredContracts, counterparties]);

  // Colors for Pie Chart
  const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Table Data Breakdown
  const tableData = useMemo(() => {
    const map = {};
    
    filteredContracts.forEach(c => {
      const comm = c.commodity;
      const val = (c.quantity || 0) * (c.contract_price || c.price_per_unit || 0);
      
      if (!map[comm]) {
        map[comm] = {
          commodity: comm,
          contractsCount: 0,
          buyQty: 0,
          sellQty: 0,
          buyValue: 0,
          sellValue: 0,
          pnl: 0
        };
      }
      
      map[comm].contractsCount += 1;
      if (c.type.toLowerCase() === 'buy') {
        map[comm].buyQty += c.quantity || 0;
        map[comm].buyValue += val;
      } else {
        map[comm].sellQty += c.quantity || 0;
        map[comm].sellValue += val;
      }
    });

    // Add PnL totals
    mtmRows.forEach(row => {
      const contract = contracts.find(c => c.id === row.contract_id || c.contract_number === row.contract_id);
      if (!contract) return;
      const comm = contract.commodity;
      if (map[comm]) {
        map[comm].pnl += row.unrealized_pnl || 0;
      }
    });

    return Object.values(map);
  }, [filteredContracts, mtmRows, contracts]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredContracts.length === 0) {
      toast.error('No contract records to export');
      return;
    }
    
    const headers = ['Contract ID', 'Date', 'Type', 'Commodity', 'Counterparty', 'Quantity', 'Unit', 'Price/Unit', 'Value', 'Status'];
    const rows = filteredContracts.map(c => [
      c.contract_number || c.id,
      c.contract_date,
      c.type,
      c.commodity,
      c.counterparty_name || 'Unknown',
      c.quantity,
      c.unit,
      c.contract_price || c.price_per_unit || 0,
      (c.quantity || 0) * (c.contract_price || c.price_per_unit || 0),
      c.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tradenexus_analytics_${timeframe}_${selectedCommodity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Analytics CSV Exported');
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-slate-700">
      <PageHeader 
        title="CTRM Analytics Dashboard" 
        subtitle="Live contract performance, P&L distributions, and volume metrics" 
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchAnalyticsData(true)} className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export Report
            </Button>
          </div>
        }
      />

      {/* FILTER CONTROL PANEL */}
      <Card>
        <div className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              {[
                { label: '30 Days', value: '30d' },
                { label: 'YTD', value: 'ytd' },
                { label: 'All Time', value: 'all' }
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setTimeframe(t.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    timeframe === t.value 
                      ? 'bg-white text-emerald-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Commodity filter dropdown */}
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="text-xs font-bold border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="all">All Commodities</option>
              {commoditiesList.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Contract Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs font-bold border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="all">Buy & Sell Contracts</option>
              <option value="buy">Buy Only</option>
              <option value="sell">Sell Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TOP ROW PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Valuation', 
            value: formatINR(stats.totalValue), 
            icon: DollarSign, 
            color: 'var(--brand-green)', 
            sub: `${stats.activeContractsCount} active contracts` 
          },
          { 
            label: 'Unrealized P&L', 
            value: (stats.totalPnL >= 0 ? '+' : '') + formatINR(stats.totalPnL), 
            icon: stats.totalPnL >= 0 ? ArrowUpRight : ArrowDownRight, 
            color: getPnLColor(stats.totalPnL),
            sub: 'Mark-to-market live valuations'
          },
          { 
            label: 'Aggregated volume', 
            value: `${stats.totalQty.toLocaleString('en-IN')} q`, 
            icon: ShoppingBag, 
            color: '#3b82f6', 
            sub: `Buy: ${stats.buyQty} | Sell: ${stats.sellQty}` 
          },
          { 
            label: 'Weighted average price', 
            value: `₹${Math.round(stats.avgPrice).toLocaleString('en-IN')}/q`, 
            icon: TrendingUp, 
            color: '#f59e0b', 
            sub: `Buy Avg: ₹${Math.round(stats.avgBuyPrice)}` 
          }
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i}>
              <div className="p-5 flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                  <p className="text-2xl font-black font-display tracking-tight" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{c.sub}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* PRIMARY CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Trade Volume Trend */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Trade Volume & Value Trend</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Aggregate contract quantities and valuation spreads over time</p>
              </div>
              
              <div className="h-[300px]">
                {monthlyChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                    No timeline data for selection
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Volume (Quintals)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 9, fontWeight: 600 } }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Value (Lakh Rupees)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 9, fontWeight: 600 } }} />
                      <Tooltip 
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}
                        formatter={(value, name) => [name === 'Value' ? `\u20b9${Math.round(value)} Lakhs` : `${Math.round(value)} q`, name]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      <Bar yAxisId="left" dataKey="Volume" fill="var(--brand-green)" radius={[4, 4, 0, 0]} opacity={0.85} />
                      <Line yAxisId="right" type="monotone" dataKey="Value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Card>

          {/* Commodity Profit and Loss chart */}
          <Card>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Unrealized P&L Distribution by Commodity</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Aggregate contract deviations compared to live Agmarknet benchmark spreads</p>
              </div>

              <div className="h-[250px]">
                {commodityPnLData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                    No P&L details available for selected filters
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={commodityPnLData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `\u20b9${(val/1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}
                        formatter={(val) => [formatINR(val), 'Unrealized P&L']}
                      />
                      <Bar dataKey="PnL">
                        {commodityPnLData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.PnL >= 0 ? '#059669' : '#ef4444'} 
                            opacity={0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Counterparty concentration */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="h-full flex flex-col justify-between">
            <div className="p-5 space-y-4 flex-1">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Top Counterparties by Value</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Client capital exposures of top 5 buyers</p>
              </div>

              <div className="h-[240px] relative flex items-center justify-center">
                {counterpartyConcentrationData.length === 0 ? (
                  <div className="text-slate-400 text-xs font-semibold">
                    No counterparty data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={counterpartyConcentrationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {counterpartyConcentrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}
                        formatter={(val) => [formatINR(val), 'Value']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legends list */}
              <div className="space-y-2 mt-4">
                {counterpartyConcentrationData.map((item, index) => {
                  const pct = stats.totalValue > 0 ? (item.value / stats.totalValue * 100).toFixed(1) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-semibold text-slate-600 truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* DETAILED DATA BREAKDOWN TABLE */}
      <Card>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Commodity Exposure & P&L Breakdown</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Summed aggregates of total bought, sold, and unrealized positions</p>
          </div>

          <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-500" style={{ borderColor: 'var(--border)' }}>
                  <th className="p-3.5">Commodity</th>
                  <th className="p-3.5">Active Contracts</th>
                  <th className="p-3.5">Buy Volume</th>
                  <th className="p-3.5">Sell Volume</th>
                  <th className="p-3.5">Total Buy Value</th>
                  <th className="p-3.5">Total Sell Value</th>
                  <th className="p-3.5 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-600" style={{ borderColor: 'var(--border)' }}>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-semibold">No records match the current filters</td>
                  </tr>
                ) : (
                  tableData.map(row => (
                    <tr key={row.commodity} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">{row.commodity}</td>
                      <td className="p-3.5">{row.contractsCount}</td>
                      <td className="p-3.5">{row.buyQty.toLocaleString('en-IN')} q</td>
                      <td className="p-3.5">{row.sellQty.toLocaleString('en-IN')} q</td>
                      <td className="p-3.5">{formatINR(row.buyValue)}</td>
                      <td className="p-3.5">{formatINR(row.sellValue)}</td>
                      <td className="p-3.5 text-right font-bold" style={{ color: getPnLColor(row.pnl) }}>
                        {(row.pnl >= 0 ? '+' : '') + formatINR(row.pnl)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
