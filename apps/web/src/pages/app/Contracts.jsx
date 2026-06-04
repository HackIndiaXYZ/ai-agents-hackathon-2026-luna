import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  FileText, 
  X, 
  Check, 
  ChevronRight, 
  ArrowRight, 
  Calendar,
  Filter,
  TrendingUp,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';

// UI components
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
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
  getContracts, 
  getContract, 
  updateContractStatus, 
  getInvoice, 
  getDispatches 
} from '../../lib/api';

export const Contracts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContractId = searchParams.get('id');
  const urlCommodity = searchParams.get('commodity');

  // List states
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Drawer states
  const [selectedContract, setSelectedContract] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  // Invoice Modal states
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Extract unique commodities for dropdown
  const uniqueCommodities = [...new Set(contracts.map(c => c.commodity))];

  // Fetch contract list
  const fetchContractsList = async () => {
    setLoading(true);
    try {
      const filters = {
        status: statusFilter,
        commodity: commodityFilter,
        type: typeFilter
      };
      const data = await getContracts(filters);
      
      // Perform local date filtering
      let processed = [...data];
      if (dateRangeFilter !== 'all') {
        const now = new Date();
        let daysLimit = 7;
        if (dateRangeFilter === '30d') daysLimit = 30;
        if (dateRangeFilter === '90d') daysLimit = 90;
        
        const limitDate = new Date(now.setDate(now.getDate() - daysLimit));
        processed = processed.filter(c => new Date(c.contract_date) >= limitDate);
      }

      setContracts(processed);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load contracts book.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch list when filters change
  useEffect(() => {
    fetchContractsList();
  }, [statusFilter, commodityFilter, typeFilter, dateRangeFilter]);

  // Read URL query parameters
  useEffect(() => {
    if (urlCommodity) {
      setCommodityFilter(urlCommodity);
    }
    if (urlContractId) {
      handleOpenDrawer(urlContractId);
    }
  }, [urlContractId, urlCommodity, contracts.length]);

  // Open drawer and fetch full details
  const handleOpenDrawer = async (contractId) => {
    setDrawerLoading(true);
    setDrawerOpen(true);
    try {
      const details = await getContract(contractId);
      setSelectedContract(details);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load contract details.');
      setDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Clear contract ID from query params
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('id');
    setSearchParams(newParams);
  };

  // Lifecycle steps mapping
  const LIFECYCLE_STEPS = ['draft', 'confirmed', 'in_transit', 'delivered', 'settled'];

  // Advance contract lifecycle status
  const handleAdvanceStatus = async () => {
    if (!selectedContract) return;
    const currentIdx = LIFECYCLE_STEPS.indexOf(selectedContract.status.toLowerCase());
    if (currentIdx === -1 || currentIdx === LIFECYCLE_STEPS.length - 1) {
      toast.error('Contract is already fully settled.');
      return;
    }

    const nextStatus = LIFECYCLE_STEPS[currentIdx + 1];
    setAdvancingStatus(true);
    toast.loading(`Advancing status to ${nextStatus}...`, { id: 'status-adv' });

    try {
      const updated = await updateContractStatus(selectedContract.id, nextStatus);
      setSelectedContract(updated);
      toast.success(`Contract status advanced to ${nextStatus}!`, { id: 'status-adv' });
      fetchContractsList(); // Refresh table list
    } catch (err) {
      console.error(err);
      toast.error('Failed to advance contract status.', { id: 'status-adv' });
    } finally {
      setAdvancingStatus(false);
    }
  };

  // Generate Invoice
  const handleGenerateInvoice = async () => {
    if (!selectedContract) return;
    setInvoiceLoading(true);
    setInvoiceModalOpen(true);
    try {
      const data = await getInvoice(selectedContract.id);
      setInvoiceData(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate tax invoice.');
      setInvoiceModalOpen(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Print invoice helper
  const handlePrintInvoice = () => {
    window.print();
  };

  // Paginate list
  const totalPages = Math.max(1, Math.ceil(contracts.length / itemsPerPage));
  const paginatedContracts = contracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 relative">
      {/* Page Header */}
      <PageHeader
        title="Contract Book"
        subtitle="Manage and execute your physical commodity trades"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/app/contracts/new')}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </Button>
        }
      />

      {/* Filters Row */}
      <Card className="p-4 bg-white">
        <div className="flex flex-col gap-4">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
            {['all', 'draft', 'confirmed', 'in_transit', 'delivered', 'settled'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                  statusFilter === status
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Commodity + Type + Date Picker Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-center">
            {/* Commodity Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commodity</label>
              <select
                value={commodityFilter}
                onChange={(e) => {
                  setCommodityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                <option value="">All Commodities</option>
                {uniqueCommodities.map((comm) => (
                  <option key={comm} value={comm}>{comm}</option>
                ))}
              </select>
            </div>

            {/* Type Toggle */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trade Type</label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {['all', 'buy', 'sell'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTypeFilter(type);
                      setCurrentPage(1);
                    }}
                    className={`flex-1 text-[11px] font-bold uppercase py-1.5 rounded-md transition-all ${
                      typeFilter === type
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Range</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                <option value="all">All Dates</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            {(statusFilter !== 'all' || commodityFilter !== '' || typeFilter !== 'all' || dateRangeFilter !== 'all') && (
              <div className="sm:col-span-3 lg:col-span-1 pt-4 self-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setCommodityFilter('');
                    setTypeFilter('all');
                    setDateRangeFilter('all');
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Contract Book Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-10 bg-slate-50 border border-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm font-semibold mb-4">No contracts found. Create your first trade.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/contracts/new')}
            >
              Add Contract
            </Button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-4 px-6">Contract#</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Commodity</th>
                    <th className="py-4 px-6">Counterparty</th>
                    <th className="py-4 px-6 text-right">Qty</th>
                    <th className="py-4 px-6 text-right">Contract ₹</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Unrealized P&L</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.map((contract) => (
                    <motion.tr
                      key={contract.id}
                      onClick={() => handleOpenDrawer(contract.id)}
                      whileHover={{ backgroundColor: 'var(--surface-alt)' }}
                      className="border-b border-slate-100 text-sm cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {contract.contract_number}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">
                        {formatDate(contract.contract_date)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={getContractTypeColor(contract.type)}>
                          {contract.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {contract.commodity}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {contract.counterparty_name}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-slate-600">
                        {formatQty(contract.quantity, contract.unit)}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-800">
                        {formatINR(contract.contract_price)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={getStatusColor(contract.status)}>
                          {contract.status}
                        </Badge>
                      </td>
                      <td className={`py-4 px-6 text-right font-bold ${getPnLColor(contract.unrealized_pnl)}`}>
                        {formatPnL(contract.unrealized_pnl)}
                      </td>
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="View Details"
                            onClick={() => handleOpenDrawer(contract.id)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Edit Contract"
                            onClick={() => {
                              toast.info('Editing will be enabled in next release.');
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            title="Generate Invoice"
                            onClick={() => {
                              setSelectedContract(contract);
                              handleGenerateInvoice();
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-green transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-400">
                Showing {Math.min(contracts.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(contracts.length, currentPage * itemsPerPage)} of {contracts.length} contracts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`px-3 py-1.5 rounded text-xs font-bold ${
                      currentPage === idx + 1
                        ? 'bg-brand-green text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Contract Detail Drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-slate-900 z-40 cursor-pointer"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto custom-scrollbar flex flex-col justify-between"
            >
              {drawerLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
                    <span className="text-xs text-slate-400 font-medium">Fetching details...</span>
                  </div>
                </div>
              ) : selectedContract ? (
                <div>
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{selectedContract.contract_number}</h3>
                        <Badge variant={getStatusColor(selectedContract.status)}>
                          {selectedContract.status}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Date: {formatDate(selectedContract.contract_date)}
                      </span>
                    </div>
                    <button
                      onClick={handleCloseDrawer}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-6">
                    {/* Section 1 - Details Grid */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">
                        Contract Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Type</span>
                          <Badge variant={getContractTypeColor(selectedContract.type)}>
                            {selectedContract.type}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Commodity</span>
                          <span className="font-bold text-slate-800">{selectedContract.commodity}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Quantity</span>
                          <span className="font-bold text-slate-800">{formatQty(selectedContract.quantity, selectedContract.unit)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Price</span>
                          <span className="font-bold text-slate-800">{formatINR(selectedContract.contract_price)} / {selectedContract.unit || 'quintal'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Counterparty</span>
                          <span className="font-semibold text-slate-800">{selectedContract.counterparty_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Est. Delivery Date</span>
                          <span className="font-semibold text-slate-800">{formatDate(selectedContract.delivery_date)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Delivery Location</span>
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {selectedContract.delivery_location}
                          </div>
                        </div>
                        {selectedContract.notes && (
                          <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 block mb-0.5">Notes</span>
                            <span className="text-slate-600 italic block leading-relaxed">{selectedContract.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2 - MtM P&L */}
                    <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Mark-to-Market Valuation
                          </h4>
                          <span className="text-[10px] text-slate-400">Live prices from regional mandis</span>
                        </div>
                        {selectedContract.history_7d && selectedContract.history_7d.length > 0 && (
                          <div className="w-[100px] h-[35px] shrink-0 border border-slate-200/50 rounded bg-white overflow-hidden p-0.5">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedContract.history_7d.map((val, idx) => ({ id: idx, price: val }))}>
                                <Line 
                                  type="monotone" 
                                  dataKey="price" 
                                  stroke={selectedContract.unrealized_pnl >= 0 ? 'var(--brand-green)' : 'var(--rose)'} 
                                  strokeWidth={1.5} 
                                  dot={false} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Contract Price</span>
                          <span className="font-bold text-slate-800">{formatINR(selectedContract.contract_price)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Market Price</span>
                          <span className="font-bold text-slate-800">{formatINR(selectedContract.market_price)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Unrealized P&L</span>
                          <span className={`font-extrabold text-sm ${getPnLColor(selectedContract.unrealized_pnl)}`}>
                            {formatPnL(selectedContract.unrealized_pnl)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3 - Timeline Lifecycle */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">
                        Lifecycle Timeline
                      </h4>

                      <div className="flex items-center justify-between relative mt-2 px-2">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                        
                        {LIFECYCLE_STEPS.map((step, idx) => {
                          const currentIdx = LIFECYCLE_STEPS.indexOf(selectedContract.status.toLowerCase());
                          const isCompleted = idx < currentIdx;
                          const isActive = idx === currentIdx;

                          let circleClass = 'bg-white border-slate-200 text-slate-400';
                          if (isCompleted) circleClass = 'bg-brand-green border-brand-green text-white';
                          else if (isActive) circleClass = 'border-brand-green text-brand-green font-bold ring-2 ring-emerald-100';

                          return (
                            <div key={step} className="flex flex-col items-center gap-1 z-10">
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${circleClass}`}>
                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                              </div>
                              <span className={`text-[9px] font-bold capitalize select-none ${isActive ? 'text-brand-green font-extrabold' : 'text-slate-400'}`}>
                                {step.replace('_', ' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {LIFECYCLE_STEPS.indexOf(selectedContract.status.toLowerCase()) < LIFECYCLE_STEPS.length - 1 && (
                        <div className="pt-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAdvanceStatus}
                            disabled={advancingStatus}
                            className="w-full flex items-center justify-center gap-1 text-xs"
                          >
                            {advancingStatus ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            Advance Status to "{LIFECYCLE_STEPS[LIFECYCLE_STEPS.indexOf(selectedContract.status.toLowerCase()) + 1].toUpperCase().replace('_', ' ')}"
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Section 4 - Dispatches */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">
                        Attached Dispatches
                      </h4>
                      {selectedContract.dispatches && selectedContract.dispatches.length > 0 ? (
                        <div className="space-y-2">
                          {selectedContract.dispatches.map((disp) => (
                            <div 
                              key={disp.id} 
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block">ID: {disp.id}</span>
                                <span className="text-slate-400 block mt-0.5">Vehicle: {disp.vehicle} • ETA: {disp.eta}</span>
                              </div>
                              <Badge variant={getStatusColor(disp.status)}>
                                {disp.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center">
                          <p className="text-xs text-slate-400 mb-2.5">No dispatches schedule for this contract.</p>
                          {selectedContract.status.toLowerCase() === 'confirmed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleCloseDrawer();
                                navigate('/app/dispatch');
                              }}
                              className="text-xs"
                            >
                              Schedule Dispatch
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Section 5 - Quality Lot */}
                    {selectedContract.quality_lot && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">
                          Quality Specifications Lot
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div>
                            <span className="text-slate-400 block">Grade</span>
                            <span className="font-bold text-slate-800">{selectedContract.quality_lot.grade}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Moisture content</span>
                            <span className="font-bold text-slate-800">{selectedContract.quality_lot.moisture}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Foreign Matter</span>
                            <span className="font-bold text-slate-800">{selectedContract.quality_lot.foreign_matter}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Price Adjustments</span>
                            <span className={`font-bold ${selectedContract.quality_lot.price_adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedContract.quality_lot.price_adjustment >= 0 ? '+' : ''}
                              {formatINR(selectedContract.quality_lot.price_adjustment)} / quintal
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-slate-100 flex items-center justify-between sticky bottom-0 bg-white gap-3">
                    <Button
                      variant="primary"
                      onClick={handleGenerateInvoice}
                      className="flex-1 flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      Generate Invoice
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        toast.info("Navigating to full audit log.");
                      }}
                      className="text-xs shrink-0 flex items-center gap-1"
                    >
                      Audit
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-6 text-center text-slate-400 text-sm">
                  Click on any contract row to view details.
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invoice Generation Modal */}
      <AnimatePresence>
        {invoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceModalOpen(false)}
              className="fixed inset-0 bg-slate-900"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] overflow-y-auto z-10 custom-scrollbar print:max-h-full print:shadow-none print:border-none print:p-0"
            >
              {invoiceLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
                  <span className="text-xs text-slate-400 font-semibold">Generating tax calculations...</span>
                </div>
              ) : invoiceData ? (
                <div className="p-6 space-y-6">
                  {/* Invoice Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Tax Invoice</h3>
                      <span className="text-xs text-slate-400 font-medium">Invoice Number: {invoiceData.invoice_number}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Date</span>
                      <span className="text-sm font-bold text-slate-800">{formatDate(invoiceData.date)}</span>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block uppercase font-bold tracking-wider">Seller (Supplier)</span>
                      <span className="font-bold text-slate-800 block text-sm">TradeNexus CTRM Ltd.</span>
                      <span className="text-slate-500">Maharashtra, IN</span>
                      <span className="text-slate-400 block mt-1">GSTIN: 27AAAAA1111A1Z1</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-bold tracking-wider">Buyer (Recipient)</span>
                      <span className="font-bold text-slate-800 block text-sm">{selectedContract?.counterparty_name}</span>
                      <span className="text-slate-500">{selectedContract?.delivery_location}</span>
                      <span className="text-slate-400 block mt-1">GSTIN: 27BBBBB2222B2Z2</span>
                    </div>
                  </div>

                  {/* Line Item Table */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-right">Quantity</th>
                        <th className="py-2 text-right">Rate</th>
                        <th className="py-2 text-right">Taxable Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 font-medium text-slate-800">
                        <td className="py-3">
                          {selectedContract?.commodity} Supply Lot
                          <span className="text-[10px] text-slate-400 block font-normal">Contract Reference: {selectedContract?.contract_number}</span>
                        </td>
                        <td className="py-3 text-right">
                          {formatQty(selectedContract?.quantity, selectedContract?.unit)}
                        </td>
                        <td className="py-3 text-right">
                          {formatINR(selectedContract?.contract_price)}
                        </td>
                        <td className="py-3 text-right font-bold">
                          {formatINR(invoiceData.taxable_value)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* GST Calculations Breakdown */}
                  <div className="space-y-2.5 text-xs border-t border-slate-100 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Taxable Value</span>
                      <span className="font-semibold text-slate-800">{formatINR(invoiceData.taxable_value)}</span>
                    </div>
                    {invoiceData.cgst_amount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">CGST ({invoiceData.cgst_rate}%)</span>
                          <span className="font-semibold text-slate-800">{formatINR(invoiceData.cgst_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">SGST ({invoiceData.sgst_rate}%)</span>
                          <span className="font-semibold text-slate-800">{formatINR(invoiceData.sgst_amount)}</span>
                        </div>
                      </>
                    )}
                    {invoiceData.igst_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">IGST ({invoiceData.igst_rate}%)</span>
                        <span className="font-semibold text-slate-800">{formatINR(invoiceData.igst_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                      <span className="text-slate-900">Total Value (INR)</span>
                      <span className="text-slate-900 text-base">{formatINR(invoiceData.total_value)}</span>
                    </div>
                  </div>

                  {/* Close and Print Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 print:hidden justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInvoiceModalOpen(false)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePrintInvoice}
                      className="text-xs flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print / PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Failed to load invoice calculations.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Contracts;
