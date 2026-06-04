import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  HelpCircle, 
  Search, 
  Plus, 
  Check, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  FileText,
  AlertTriangle,
  BrainCircuit,
  Loader2
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
import ResolutionBadge from '../../components/ui/ResolutionBadge';

// Helpers
import { formatINR, formatQty } from '../../utils/format';
import { 
  createContract, 
  getMarketPrices, 
  getCounterparties, 
  getCounterpartyRisk, 
  getForecast 
} from '../../lib/api';

export const ContractForm = () => {
  const navigate = useNavigate();

  // Form fields state
  const [isBuy, setIsBuy] = useState(true); // true = BUY, false = SELL
  const [commoditySearch, setCommoditySearch] = useState('');
  const [resolvedCommodity, setResolvedCommodity] = useState(null); // { name, tier }
  const [resolvingCommodity, setResolvingCommodity] = useState(false);

  const [counterpartyId, setCounterpartyId] = useState('');
  const [counterpartiesList, setCounterpartiesList] = useState([]);
  const [newCounterpartyName, setNewCounterpartyName] = useState('');
  const [isAddingCounterparty, setIsAddingCounterparty] = useState(false);
  const [counterpartyRisk, setCounterpartyRisk] = useState(null);

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('quintal');
  const [priceType, setPriceType] = useState('fixed'); // fixed | formula
  const [price, setPrice] = useState('');
  
  // Formula parameters
  const [basisMandi, setBasisMandi] = useState('Nagpur Mandi');
  const [basisAdjustment, setBasisAdjustment] = useState('0'); // adjustment in percentage
  
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('15 Days Net');
  const [notes, setNotes] = useState('');

  // Forecast state
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Fetch counterparties on mount
  useEffect(() => {
    const fetchCP = async () => {
      try {
        const cp = await getCounterparties();
        setCounterpartiesList(cp);
        if (cp.length > 0) {
          setCounterpartyId(cp[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCP();
  }, []);

  // Debounced search for commodity alias resolution
  useEffect(() => {
    if (!commoditySearch.trim()) {
      setResolvedCommodity(null);
      setForecast(null);
      return;
    }

    const timer = setTimeout(async () => {
      setResolvingCommodity(true);
      try {
        // Mock resolution tier logic matching backend rules
        const text = commoditySearch.trim().toLowerCase();
        let canonicalName = 'Cotton';
        let tier = 'unknown';

        if (text === 'cotton' || text === 'cotton crop') {
          canonicalName = 'Cotton';
          tier = 'exact';
        } else if (text === 'kapas' || text === 'kapasa') {
          canonicalName = 'Cotton';
          tier = 'llm';
        } else if (text.includes('soy') || text === 'soya') {
          canonicalName = 'Soybean';
          tier = 'trigram';
        } else if (text === 'soyabean' || text === 'soybean') {
          canonicalName = 'Soybean';
          tier = 'exact';
        } else if (text === 'groundnut' || text === 'mungfali') {
          canonicalName = 'Groundnut';
          tier = text === 'groundnut' ? 'exact' : 'embedding';
        } else if (text === 'onion' || text === 'pyaz') {
          canonicalName = 'Onion';
          tier = text === 'onion' ? 'exact' : 'llm';
        } else if (text === 'wheat' || text === 'gehun') {
          canonicalName = 'Wheat';
          tier = text === 'wheat' ? 'exact' : 'embedding';
        } else {
          // Default
          canonicalName = commoditySearch.charAt(0).toUpperCase() + commoditySearch.slice(1);
          tier = 'llm';
        }

        setResolvedCommodity({ name: canonicalName, tier });
        
        // Fetch forecast once commodity is resolved
        setForecastLoading(true);
        const fc = await getForecast(canonicalName);
        setForecast(fc);
      } catch (err) {
        console.error('Error resolving commodity:', err);
      } finally {
        setResolvingCommodity(false);
        setForecastLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [commoditySearch]);

  // Fetch counterparty risk details when selection changes
  useEffect(() => {
    if (!counterpartyId) {
      setCounterpartyRisk(null);
      return;
    }
    const fetchRisk = async () => {
      try {
        const risk = await getCounterpartyRisk(counterpartyId);
        setCounterpartyRisk(risk);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRisk();
  }, [counterpartyId]);

  // Calculate estimated price based on Fixed/Formula inputs
  const getCalculatedPrice = () => {
    if (priceType === 'fixed') {
      return Number(price) || 0;
    }
    
    // Formula pricing: mandi modal base ± percentage
    const basePrices = {
      'Nagpur Mandi': 6800,
      'Indore Mandi': 4800,
      'Guntur Mandi': 18500,
      'Delhi Mandi': 2400,
      'Ludhiana Mandi': 2450
    };
    const base = basePrices[basisMandi] || 5000;
    const adjustmentPct = Number(basisAdjustment) || 0;
    return Math.round(base * (1 + adjustmentPct / 100));
  };

  const calculatedPricePerUnit = getCalculatedPrice();
  const calculatedTotalValue = (Number(quantity) || 0) * calculatedPricePerUnit;

  // Add new counterparty inline
  const handleAddNewCounterparty = () => {
    if (!newCounterpartyName.trim()) {
      toast.error('Enter counterparty name');
      return;
    }
    const newId = `cp-${Date.now()}`;
    const newCP = {
      id: newId,
      name: newCounterpartyName,
      reliability: 100,
      risk_level: 'Low Risk',
      late_deliveries: 0,
      payment_delay_days: 0
    };
    setCounterpartiesList(prev => [...prev, newCP]);
    setCounterpartyId(newId);
    setNewCounterpartyName('');
    setIsAddingCounterparty(false);
    toast.success(`"${newCP.name}" added successfully!`);
  };

  // Submit contract
  const handleSubmit = async (e, status) => {
    e.preventDefault();
    
    if (!resolvedCommodity) {
      toast.error('Please enter and resolve a valid commodity');
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (priceType === 'fixed' && (!price || isNaN(Number(price)) || Number(price) <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }
    if (!deliveryLocation.trim()) {
      toast.error('Please enter a delivery location');
      return;
    }

    setSubmitting(true);
    const cpName = counterpartiesList.find(c => c.id === counterpartyId)?.name || 'Walk-in Farmer';

    try {
      await createContract({
        type: isBuy ? 'BUY' : 'SELL',
        commodity: resolvedCommodity.name,
        counterparty_id: counterpartyId,
        counterparty_name: cpName,
        quantity: Number(quantity),
        unit,
        price: calculatedPricePerUnit,
        delivery_date: deliveryDate,
        delivery_location: deliveryLocation,
        notes: `${notes}. Payment: ${paymentTerms}. Price determined by ${priceType === 'fixed' ? 'Fixed contract' : 'Formula basis ' + basisMandi + ' ' + basisAdjustment + '%'}`
      });

      toast.success(`Contract successfully created as ${status.toUpperCase()}!`);
      navigate('/app/contracts');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create contract.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/contracts')}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title="New Commodity Contract"
          subtitle="Create purchase and sales agreements backed by real-time risk scores"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) - Inputs */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 bg-white space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
              Primary Specifications
            </h3>

            {/* Buy / Sell Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contract Direction</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsBuy(true)}
                  className={`flex-1 py-3 px-6 rounded-xl border font-bold text-sm transition-all text-center flex items-center justify-center gap-2 ${
                    isBuy
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-100 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${isBuy ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                  BUY CONTRACT
                </button>
                <button
                  type="button"
                  onClick={() => setIsBuy(false)}
                  className={`flex-1 py-3 px-6 rounded-xl border font-bold text-sm transition-all text-center flex items-center justify-center gap-2 ${
                    !isBuy
                      ? 'bg-emerald-50 border-brand-green text-brand-green ring-2 ring-emerald-100 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${!isBuy ? 'bg-brand-green animate-pulse' : 'bg-slate-300'}`} />
                  SELL CONTRACT
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Commodity Lookup */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Commodity Search (Auto-Alias)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={commoditySearch}
                    onChange={(e) => setCommoditySearch(e.target.value)}
                    placeholder="e.g. Kapas, Soybean, Pyaz..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-green text-sm"
                  />
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                </div>
                
                {/* Resolution Indicator */}
                <div className="h-6 mt-1.5 flex items-center">
                  {resolvingCommodity ? (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Resolving alias...
                    </span>
                  ) : resolvedCommodity ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">
                        Resolved to: <strong className="text-slate-800">{resolvedCommodity.name}</strong>
                      </span>
                      <ResolutionBadge tier={resolvedCommodity.tier} />
                    </div>
                  ) : commoditySearch.trim() ? (
                    <span className="text-[10px] text-slate-400">Typing...</span>
                  ) : (
                    <span className="text-[10px] text-slate-300">Enter a regional or standard name.</span>
                  )}
                </div>
              </div>

              {/* Counterparty Lookup */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Counterparty</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCounterparty(prev => !prev)}
                    className="text-[10px] font-bold text-brand-green hover:text-emerald-800 uppercase tracking-wider flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Add new
                  </button>
                </div>

                {!isAddingCounterparty ? (
                  <select
                    value={counterpartyId}
                    onChange={(e) => setCounterpartyId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-green font-semibold text-slate-800"
                  >
                    {counterpartiesList.map((cp) => (
                      <option key={cp.id} value={cp.id}>{cp.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCounterpartyName}
                      onChange={(e) => setNewCounterpartyName(e.target.value)}
                      placeholder="New Counterparty Name"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddNewCounterparty}
                      className="text-xs px-3 py-2"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingCounterparty(false)}
                      className="text-xs text-slate-400 px-2.5"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Qty & Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Quantity</label>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    min="1"
                    className="flex-1 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-0 border-r border-slate-200"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="px-3 bg-slate-50 text-xs font-semibold focus:outline-none text-slate-700"
                  >
                    <option value="quintal">quintal</option>
                    <option value="ton">ton</option>
                    <option value="bags">bags</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              {/* Price Type Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Price Strategy</label>
                <div className="flex border border-slate-200 p-0.5 rounded-lg bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setPriceType('fixed')}
                    className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                      priceType === 'fixed'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Fixed Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceType('formula')}
                    className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                      priceType === 'formula'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Formula Basis
                  </button>
                </div>
              </div>
            </div>

            {/* Price Inputs */}
            {priceType === 'fixed' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Fixed Price per {unit} (INR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 6400"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-green text-sm"
                  />
                  <span className="absolute left-4 top-3 text-slate-400 text-sm font-semibold">₹</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Basis Mandi Base</label>
                  <select
                    value={basisMandi}
                    onChange={(e) => setBasisMandi(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="Nagpur Mandi">Nagpur Mandi (Base: ₹6,800)</option>
                    <option value="Indore Mandi">Indore Mandi (Base: ₹4,800)</option>
                    <option value="Guntur Mandi">Guntur Mandi (Base: ₹18,500)</option>
                    <option value="Delhi Mandi">Delhi Mandi (Base: ₹2,400)</option>
                    <option value="Ludhiana Mandi">Ludhiana Mandi (Base: ₹2,450)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Adjustment %</label>
                  <input
                    type="number"
                    value={basisAdjustment}
                    onChange={(e) => setBasisAdjustment(e.target.value)}
                    placeholder="e.g. +5 or -2"
                    step="0.5"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Calculated Price: <strong>{formatINR(calculatedPricePerUnit)}</strong> per {unit}
                  </span>
                </div>
              </div>
            )}

            {/* Delivery details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Delivery Location</label>
                <div className="relative">
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="e.g. Nagpur Warehouse"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-green text-sm"
                  />
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Delivery Target Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-green text-sm text-slate-700"
                  />
                  <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Additional details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 15 Days Net, Cash on Delivery"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-green text-sm text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional quality notes or specific dispatch terms..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-green text-sm text-slate-700 custom-scrollbar"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                onClick={(e) => handleSubmit(e, 'draft')}
                disabled={submitting}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                onClick={(e) => handleSubmit(e, 'confirmed')}
                disabled={submitting}
                className="bg-brand-green text-white"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4.5 h-4.5 mr-1.5" />
                )}
                Create & Confirm
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column (2/5) - Previews & Forecasting widgets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Preview Card */}
          <Card className="p-6 bg-slate-900 text-white relative overflow-hidden">
            {/* Background glowing circle */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Live Contract Preview</span>
              <Badge variant={isBuy ? 'info' : 'success'} className="border-none font-bold">
                {isBuy ? 'BUY' : 'SELL'}
              </Badge>
            </h3>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400 font-medium">Estimated Value</span>
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  {formatINR(calculatedTotalValue)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Commodity</span>
                  <span className="font-bold text-slate-200">
                    {resolvedCommodity?.name || 'Not resolved'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Quantity</span>
                  <span className="font-bold text-slate-200">
                    {quantity ? formatQty(quantity, unit) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Calculated Price</span>
                  <span className="font-bold text-slate-200">
                    {formatINR(calculatedPricePerUnit)} / {unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Target Delivery</span>
                  <span className="font-bold text-slate-200">
                    {deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>

              {/* Counterparty Risk rating */}
              {counterpartyRisk && (
                <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1 font-medium">Counterparty Reliability</span>
                    <span className="text-xs font-bold text-slate-200 block">
                      {counterpartyRisk.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                      counterpartyRisk.risk_level === 'High Risk' 
                        ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' 
                        : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                    }`}>
                      {counterpartyRisk.risk_level === 'High Risk' ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0 text-rose-500" />
                          High Risk • {counterpartyRisk.late_deliveries} late
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 shrink-0 text-emerald-500" />
                          Reliability: {counterpartyRisk.reliability}%
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ML Price Forecast Widget */}
          {resolvedCommodity && (
            <Card className="p-6 bg-white border border-slate-200 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-5 h-5 text-brand-green" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  ML Price Forecast
                </h3>
              </div>

              {forecastLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
                  <span className="text-xs text-slate-400">Analyzing price trends...</span>
                </div>
              ) : forecast ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Current Spot Market</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatINR(forecast.current_price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">7-Day Prediction</span>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-extrabold text-slate-900">
                          {formatINR(forecast.forecast_7d)}
                        </span>
                        <span className="inline-flex items-center gap-0.2 px-1 rounded bg-emerald-50 text-[10px] font-bold text-emerald-600">
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          +{forecast.growth_pct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline forecast chart */}
                  {forecast.history && (
                    <div className="h-16 w-full border border-slate-100 rounded-lg p-1 bg-slate-50/50">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecast.history.map((val, idx) => ({ id: idx, price: val }))}>
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="var(--brand-green)" 
                            strokeWidth={2} 
                            dot={{ r: 2 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 leading-normal bg-slate-50 p-2.5 rounded-lg">
                    <p className="font-semibold text-slate-500 mb-0.5">Model Source: LSTM Regressor</p>
                    <p>{forecast.message}</p>
                    <p className="mt-1 italic text-[9px]">Disclaimer: Algorithmic predictions are for informational support and do not guarantee market performance.</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Forecast metadata unavailable for this commodity.
                </div>
              )}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default ContractForm;
