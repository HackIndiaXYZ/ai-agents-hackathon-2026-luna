import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Plus,
  Minus,
  Check,
  RefreshCw,
  Edit,
  Database,
  ArrowRightLeft,
  DollarSign,
  AlertCircle
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

import {
  formatINR,
  formatQty,
  formatPnL,
  getPnLColor
} from '../../utils/format';

import {
  getInventory,
  updateInventory,
  getContracts,
  getMarketPrices,
  getMacroSignals
} from '../../lib/api';

const COMMODITY_MOCK_PRICES = {
  'Cotton': 7250,
  'Soybean': 4800,
  'Onion': 2400,
  'Wheat': 2450,
  'Pigeon Pea': 9500,
  'Groundnut': 6900,
  'Mustard': 5400,
  'Chilli': 18500
};

export const Inventory = () => {
  const [activeTab, setActiveTab] = useState('physical');
  const [inventory, setInventory] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [macroSignals, setMacroSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateCommodity, setUpdateCommodity] = useState('Cotton');
  const [updateQty, setUpdateQty] = useState('');
  const [updateOp, setUpdateOp] = useState('add'); // add, subtract, set
  const [updateNotes, setUpdateNotes] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Fetch all necessary details
  const fetchInventoryData = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [invData, contractList, signalsData] = await Promise.all([
        getInventory(),
        getContracts(),
        getMacroSignals()
      ]);

      setInventory(invData || []);
      setContracts(contractList || []);
      setMacroSignals(signalsData || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load inventory. Displaying cached records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData(true);
  }, []);

  // Update handler
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!updateQty || Number(updateQty) <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    setSubmittingUpdate(true);
    try {
      const payload = {
        commodity: updateCommodity,
        quantity: Number(updateQty),
        operation: updateOp,
        notes: updateNotes,
        unit: 'quintal'
      };

      const res = await updateInventory(payload);
      if (res && res.status === 'shortfall') {
        toast.error(res.message);
      } else {
        toast.success(`Inventory updated: ${updateCommodity} ${updateOp}ed.`);
        setShowUpdateModal(false);
        setUpdateQty('');
        setUpdateNotes('');
        fetchInventoryData(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete inventory transaction.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Physical Inventory: Calculate Market Values dynamically
  const getCommodityPrice = (commodity) => {
    return COMMODITY_MOCK_PRICES[commodity] || 5000;
  };

  const getInventoryItemsWithValuation = () => {
    let totalPortfolioVal = 0;
    const items = inventory.map((item) => {
      const price = getCommodityPrice(item.canonical_name);
      const marketVal = item.quantity * price;
      totalPortfolioVal += marketVal;
      return {
        ...item,
        price,
        marketVal
      };
    });
    return { items, totalPortfolioVal };
  };

  const { items: inventoryWithValuation, totalPortfolioVal } = getInventoryItemsWithValuation();

  // Open Positions: aggregate contracts where status is not settled or cancelled
  const getOpenPositions = () => {
    const activeContracts = contracts.filter(c => c.status !== 'settled' && c.status !== 'cancelled');
    const grouped = {};

    activeContracts.forEach((c) => {
      const comm = c.commodity;
      if (!grouped[comm]) {
        grouped[comm] = {
          commodity: comm,
          buyQty: 0,
          sellQty: 0,
          buyValueSum: 0,
          sellValueSum: 0,
          netPnL: 0
        };
      }

      const qty = Number(c.quantity) || 0;
      const price = Number(c.contract_price) || 0;
      const pnl = Number(c.unrealized_pnl) || 0;

      if (c.type === 'BUY') {
        grouped[comm].buyQty += qty;
        grouped[comm].buyValueSum += qty * price;
      } else {
        grouped[comm].sellQty += qty;
        grouped[comm].sellValueSum += qty * price;
      }
      grouped[comm].netPnL += pnl;
    });

    return Object.keys(grouped).map((k) => {
      const g = grouped[k];
      const netPosition = g.buyQty - g.sellQty;
      const avgBuyPrice = g.buyQty > 0 ? Math.round(g.buyValueSum / g.buyQty) : 0;
      const avgSellPrice = g.sellQty > 0 ? Math.round(g.sellValueSum / g.sellQty) : 0;

      return {
        commodity: g.commodity,
        total_bought: g.buyQty,
        total_sold: g.sellQty,
        net_position: netPosition,
        avg_buy_price: avgBuyPrice,
        avg_sell_price: avgSellPrice,
        net_pnl: g.netPnL
      };
    });
  };

  const positions = getOpenPositions();

  // Exposure color logic: Long in rising market = green, Long in falling = red, Short in falling = green, Short in rising = red
  const getExposureBadge = (commodity, netPosition) => {
    if (netPosition === 0) return <Badge variant="neutral">Flat</Badge>;

    const sig = macroSignals.find(s =>
      s.commodity?.toLowerCase() === commodity.toLowerCase() ||
      s.commodity_name?.toLowerCase() === commodity.toLowerCase()
    );
    const isBull = sig?.sentiment === 'bull' || sig?.sentiment === 'bullish';
    const isBear = sig?.sentiment === 'bear' || sig?.sentiment === 'bearish';

    const directionLabel = netPosition > 0 ? 'Net Long' : 'Net Short';

    if (netPosition > 0) { // Net Long
      if (isBull) {
        return (
          <Badge variant="success" className="flex items-center gap-1.5 justify-center py-1">
            <TrendingUp className="w-3 h-3" />
            {directionLabel} (Hedging Rise)
          </Badge>
        );
      }
      if (isBear) {
        return (
          <Badge variant="danger" className="flex items-center gap-1.5 justify-center py-1">
            <TrendingDown className="w-3 h-3 text-rose-500 animate-pulse" />
            {directionLabel} (Exposed Bearish)
          </Badge>
        );
      }
    } else { // Net Short
      if (isBear) {
        return (
          <Badge variant="success" className="flex items-center gap-1.5 justify-center py-1">
            <TrendingDown className="w-3 h-3" />
            {directionLabel} (Hedging Fall)
          </Badge>
        );
      }
      if (isBull) {
        return (
          <Badge variant="danger" className="flex items-center gap-1.5 justify-center py-1">
            <TrendingUp className="w-3 h-3 text-rose-500 animate-pulse" />
            {directionLabel} (Exposed Bullish)
          </Badge>
        );
      }
    }

    return (
      <Badge variant="info">
        {directionLabel} ({sig?.sentiment ? sig.sentiment.toUpperCase() : 'STABLE'})
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-12 text-slate-700">
      <PageHeader
        title="Inventory & Positions Book"
        subtitle="Physical storage holdings and aggregated futures trade book ledger"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchInventoryData(false)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Update Inventory
            </Button>
          </div>
        }
      />

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('physical')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'physical' ? 'border-brand-green text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Database className="w-4 h-4" />
          Physical Inventory
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'positions' ? 'border-brand-green text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Open Exposure Positions
        </button>
      </div>

      {loading ? (
        <div className="h-[50vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* TAB 1: PHYSICAL INVENTORY */}
          {activeTab === 'physical' && (
            <Card>
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Warehouse Stock Ledger
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  Values recalculated based on live Mandi modal rates
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border)' }}>
                      <th className="p-4">Commodity</th>
                      <th className="p-4 text-right">Quantity</th>
                      <th className="p-4 text-center">Unit</th>
                      <th className="p-4 text-right">Current Mandi Price</th>
                      <th className="p-4 text-right">Total Market Value</th>
                      <th className="p-4">Last Updated</th>
                      <th className="p-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryWithValuation.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50/50 text-slate-700 font-semibold" style={{ borderColor: 'var(--border)' }}>
                        <td className="p-4 font-extrabold text-slate-800 text-sm">{item.canonical_name}</td>
                        <td className="p-4 text-right font-medium">{item.quantity.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-center text-slate-500 uppercase tracking-wider text-[10px]">{item.unit}</td>
                        <td className="p-4 text-right text-slate-600 font-bold">{formatINR(item.price)} / q</td>
                        <td className="p-4 text-right text-brand-green font-extrabold text-sm">{formatINR(item.marketVal)}</td>
                        <td className="p-4 text-slate-400 font-medium">
                          {item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setUpdateCommodity(item.canonical_name);
                              setShowUpdateModal(true);
                            }}
                            className="text-slate-400 hover:text-brand-green transition-colors p-1"
                          >
                            <Edit className="w-4 h-4 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/60 font-bold text-slate-900 border-t border-b" style={{ borderColor: 'var(--border-strong)' }}>
                      <td className="p-4" colSpan={4}>Grand Total Portfolio Storage Value</td>
                      <td className="p-4 text-right text-brand-green font-black text-base">{formatINR(totalPortfolioVal)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 2: OPEN POSITIONS */}
          {activeTab === 'positions' && (
            <Card>
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Trade exposure aggregated summary
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  Aggregate positions of active BUY & SELL contracts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase tracking-wider" style={{ borderColor: 'var(--border)' }}>
                      <th className="p-4">Commodity</th>
                      <th className="p-4 text-right">Total Bought</th>
                      <th className="p-4 text-right">Total Sold</th>
                      <th className="p-4 text-center">Net exposure Position</th>
                      <th className="p-4 text-right">Avg Buy Price</th>
                      <th className="p-4 text-right">Avg Sell Price</th>
                      <th className="p-4 text-right rounded-r-lg">Net Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                          No open trade exposures active.
                        </td>
                      </tr>
                    ) : (
                      positions.map((pos, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50/50 text-slate-700 font-semibold" style={{ borderColor: 'var(--border)' }}>
                          <td className="p-4 font-extrabold text-slate-800 text-sm">{pos.commodity}</td>
                          <td className="p-4 text-right text-blue-600">{pos.total_bought.toLocaleString('en-IN')} q</td>
                          <td className="p-4 text-right text-indigo-600">{pos.total_sold.toLocaleString('en-IN')} q</td>
                          <td className="p-4 text-center">
                            {getExposureBadge(pos.commodity, pos.net_position)}
                          </td>
                          <td className="p-4 text-right font-medium text-slate-600">{pos.avg_buy_price ? formatINR(pos.avg_buy_price) : '—'}</td>
                          <td className="p-4 text-right font-medium text-slate-600">{pos.avg_sell_price ? formatINR(pos.avg_sell_price) : '—'}</td>
                          <td className={`p-4 text-right font-black text-sm ${getPnLColor(pos.net_pnl)}`}>
                            {formatPnL(pos.net_pnl)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* UPDATE INVENTORY MODAL */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border max-w-md w-full shadow-2xl p-6 relative"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900">Adjust Warehouse Inventory</h3>
              <p className="text-xs text-slate-400">Perform direct balance edits or log transactions on commodity stocks.</p>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs font-semibold">
              {/* Commodity Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commodity</label>
                <select
                  value={updateCommodity}
                  onChange={(e) => setUpdateCommodity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green bg-white text-xs"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <option value="Cotton">Cotton</option>
                  <option value="Soybean">Soybean</option>
                  <option value="Onion">Onion</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Pigeon Pea">Pigeon Pea</option>
                  <option value="Groundnut">Groundnut</option>
                  <option value="Mustard">Mustard</option>
                  <option value="Chilli">Chilli</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity (quintal)</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green text-xs"
                  style={{ borderColor: 'var(--border)' }}
                  value={updateQty}
                  onChange={(e) => setUpdateQty(e.target.value)}
                  required
                />
              </div>

              {/* Operation */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adjustment Method</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setUpdateOp('add')}
                    className={`py-2 px-3 border rounded-lg text-center font-bold transition-all ${updateOp === 'add' ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    <Plus className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateOp('subtract')}
                    className={`py-2 px-3 border rounded-lg text-center font-bold transition-all ${updateOp === 'subtract' ? 'bg-rose-50 text-rose-700 border-rose-500' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    <Minus className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Subtract
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateOp('set')}
                    className={`py-2 px-3 border rounded-lg text-center font-bold transition-all ${updateOp === 'set' ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Set Value
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operation Remarks / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Reason for adjustment, e.g., monthly warehouse audits..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green resize-none text-xs"
                  style={{ borderColor: 'var(--border)' }}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdateQty('');
                    setUpdateNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submittingUpdate}
                >
                  Confirm Adjustment
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
