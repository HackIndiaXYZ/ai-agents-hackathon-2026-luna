import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getOpportunities, postOpportunity } from '../lib/api';
import { demoOpportunities } from '../data/demo';

// UI components
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

import { AnimatePresence, motion } from 'motion/react';
import {
  PlusCircle,
  Truck,
  MapPin,
  Scale,
  Phone,
  Bookmark,
  ChevronRight,
  RefreshCw,
  Clock,
  ArrowRightLeft,
  X,
  Calendar,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Opportunities = () => {
  const { isLoading, setIsLoading } = useStore();

  const [opps, setOpps] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('All'); // All | Forward | Return
  const [filterCommodity, setFilterCommodity] = useState('All');

  // Form Fields
  const [formCommodity, setFormCommodity] = useState('Cotton');
  const [formOrigin, setFormOrigin] = useState('Nagpur');
  const [formDestination, setFormDestination] = useState('Mumbai');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('quintals');
  const [formAvailableFrom, setFormAvailableFrom] = useState('');
  const [formIsReturnLoad, setFormIsReturnLoad] = useState(false);
  const [formContactInfo, setFormContactInfo] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  useEffect(() => {
    fetchOpps();
  }, []);

  const fetchOpps = async () => {
    try {
      setIsLoading(true);
      const res = await getOpportunities();
      if (res && res.length > 0) {
        setOpps(res);
      } else {
        setOpps(demoOpportunities);
      }
    } catch (err) {
      console.warn('Failed opportunities fetch, loading demo data');
      setOpps(demoOpportunities);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostOpportunity = async (e) => {
    e.preventDefault();
    if (!formCommodity || !formOrigin.trim() || !formDestination.trim() || !formQuantity || !formContactInfo.trim()) {
      toast.error('Please fill out all required fields');
      return;
    }

    setSubmittingPost(true);
    try {
      const payload = {
        commodity: formCommodity,
        origin: formOrigin.trim(),
        destination: formDestination.trim(),
        quantity: parseFloat(formQuantity),
        unit: formUnit,
        is_return_load: formIsReturnLoad,
        contact_info: formContactInfo.trim()
      };

      const res = await postOpportunity(payload);
      if (res && res.status === 'success') {
        toast.success('Opportunity posted successfully!');
        setShowModal(false);
        // Reset form fields
        setFormQuantity('');
        setFormContactInfo('');
        setFormIsReturnLoad(false);
        fetchOpps();
      } else {
        toast.error('Failed to post opportunity');
      }
    } catch (e) {
      // Fallback post logic for demo
      const newOpp = {
        id: `opp_${Date.now()}`,
        commodity_name: formCommodity,
        origin: formOrigin,
        destination: formDestination,
        quantity: parseFloat(formQuantity),
        unit: formUnit,
        is_return_load: formIsReturnLoad,
        contact_info: formContactInfo,
        created_at: new Date().toISOString(),
        available_from: formAvailableFrom || new Date().toISOString().substring(0, 10)
      };
      setOpps(prev => [newOpp, ...prev]);
      toast.success('Opportunity posted (Demo mode)');
      setShowModal(false);
      setFormQuantity('');
      setFormContactInfo('');
      setFormIsReturnLoad(false);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleMatchInterest = (contact) => {
    toast.success(`Matched! Contact: ${contact}`, {
      duration: 6000,
      icon: '🤝'
    });
  };

  // Filter logic
  const filteredOpps = opps.filter(opp => {
    const matchesType = filterType === 'All' 
      ? true 
      : filterType === 'Return' 
      ? opp.is_return_load 
      : !opp.is_return_load;

    const matchesCommodity = filterCommodity === 'All'
      ? true
      : opp.commodity_name?.toLowerCase() === filterCommodity.toLowerCase();

    return matchesType && matchesCommodity;
  });

  const openLoadsCount = opps.filter(o => !o.is_return_load).length;
  const returnLoadsCount = opps.filter(o => o.is_return_load).length;

  const uniqueCommodities = [...new Set(opps.map(o => o.commodity_name))].sort();

  return (
    <div className="space-y-8 animate-fade-in text-slate-700">
      
      {/* PageHeader */}
      <PageHeader 
        title="Trade Opportunities" 
        subtitle="Find return loads and forward shipment matches."
        actions={
          <Button variant="secondary" size="sm" onClick={fetchOpps} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Board
          </Button>
        }
      />

      {/* TOP ROW — TWO STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          label="Open Opportunities (Forward Loads)" 
          value={openLoadsCount} 
          delta={`${openLoadsCount} active listings`}
          icon={<Truck className="w-5 h-5" />} 
          color="green" 
        />
        <StatCard 
          label="Return Loads Available (Empty Backhauls)" 
          value={returnLoadsCount} 
          delta={`${returnLoadsCount} trucks waiting`}
          icon={<ArrowRightLeft className="w-5 h-5" />} 
          color="amber" 
        />
      </div>

      {/* FILTER ROW */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Filter Board:</span>
          </div>

          {/* Load Type */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border" style={{ borderColor: 'var(--border)' }}>
            {['All', 'Forward', 'Return'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === type 
                    ? 'bg-white shadow-sm text-slate-900 font-bold' 
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {type === 'All' ? 'All Types' : type === 'Forward' ? 'Forward' : 'Return'}
              </button>
            ))}
          </div>

          {/* Commodity Dropdown */}
          <select
            className="px-3 py-1.5 bg-white border rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            style={{ borderColor: 'var(--border)' }}
            value={filterCommodity}
            onChange={(e) => setFilterCommodity(e.target.value)}
          >
            <option value="All">All Commodities</option>
            {uniqueCommodities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Post Trigger */}
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Post New Opportunity
        </Button>
      </Card>

      {/* OPPORTUNITY CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredOpps.length > 0 ? (
          filteredOpps.map((opp) => (
            <Card hover={true} key={opp.id} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Commodity Load</span>
                  <h4 className="text-lg font-extrabold text-slate-950 font-display">
                    {opp.commodity_name}
                  </h4>
                </div>
                <Badge variant={opp.is_return_load ? "warning" : "success"}>
                  {opp.is_return_load ? "Return Load" : "Forward Load"}
                </Badge>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{opp.origin}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{opp.destination}</span>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Quantity</span>
                  <span className="text-slate-800">{opp.quantity} {opp.unit || 'quintals'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Available From</span>
                  <span className="text-slate-800">{opp.available_from}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs font-semibold" style={{ borderColor: 'var(--border)' }}>
                <span className="text-slate-400">
                  Contact: <span className="text-slate-700 font-bold select-all">+{opp.contact_info.replace(/\+\d+\s/, '').substring(0, 5)}•••••</span>
                </span>
                
                <Button variant="secondary" size="sm" onClick={() => handleMatchInterest(opp.contact_info)}>
                  Express Interest
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-2 py-16 text-center text-slate-400 text-xs">
            No active cargo opportunities found. Try resetting filters.
          </div>
        )}
      </div>

      {/* POST OPPORTUNITY MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col justify-between"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Modal Header */}
              <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Post Trade Opportunity
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg border hover:bg-slate-50 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handlePostOpportunity} className="p-5 space-y-4 text-xs">
                
                {/* Commodity */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commodity Type *</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                    style={{ borderColor: 'var(--border)' }}
                    value={formCommodity}
                    onChange={(e) => setFormCommodity(e.target.value)}
                  >
                    {['Cotton', 'Wheat', 'Soybean', 'Mustard', 'Potato', 'Onion'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Origin / Destination Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Origin *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                      style={{ borderColor: 'var(--border)' }}
                      value={formOrigin}
                      onChange={(e) => setFormOrigin(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Destination *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                      style={{ borderColor: 'var(--border)' }}
                      value={formDestination}
                      onChange={(e) => setFormDestination(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Volume / Available From */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity *</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                        style={{ borderColor: 'var(--border)' }}
                        value={formQuantity}
                        onChange={(e) => setFormQuantity(e.target.value)}
                        required
                      />
                      <select
                        className="px-2 py-2 border rounded-lg focus:outline-none"
                        style={{ borderColor: 'var(--border)' }}
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                      >
                        <option value="quintals">Qtl</option>
                        <option value="tonnes">Tonnes</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date *</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                      style={{ borderColor: 'var(--border)' }}
                      value={formAvailableFrom}
                      onChange={(e) => setFormAvailableFrom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Return load toggle */}
                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    type="checkbox"
                    id="modalReturnLoad"
                    className="w-4 h-4 accent-emerald-600 bg-slate-50 border-slate-300 rounded focus:ring-0 focus:outline-none cursor-pointer"
                    checked={formIsReturnLoad}
                    onChange={(e) => setFormIsReturnLoad(e.target.checked)}
                  />
                  <label htmlFor="modalReturnLoad" className="font-semibold text-slate-600 cursor-pointer">
                    This listing represents an Empty Return load backhaul
                  </label>
                </div>

                {/* Contact info */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Details *</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Ramesh Patil (+91 98765 43210)"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 resize-none"
                    style={{ borderColor: 'var(--border)' }}
                    value={formContactInfo}
                    onChange={(e) => setFormContactInfo(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" loading={submittingPost}>
                    Post Opportunity
                  </Button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Opportunities;
