import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getOpportunities, postOpportunity } from '../lib/api';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Opportunities = () => {
  const { isLoading, setIsLoading } = useStore();

  const [oppsList, setOppsList] = useState([]);
  
  // Form fields
  const [commodity, setCommodity] = useState('');
  const [origin, setOrigin] = useState('Nagpur');
  const [destination, setDestination] = useState('Mumbai');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('tonnes');
  const [isReturnLoad, setIsReturnLoad] = useState(false);
  const [contactInfo, setContactInfo] = useState('');

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      const list = await getOpportunities();
      if (list) {
        setOppsList(list);
      }
    } catch (e) {
      console.error('Failed to load opportunities:', e);
      // Fallback mocks
      setOppsList([
        {
          id: '1',
          commodity_name: 'Cotton',
          origin: 'Nagpur',
          destination: 'Ahmedabad',
          quantity: 12,
          unit: 'tonnes',
          is_return_load: false,
          contact_info: 'Rajesh Traders (+91 98230 45678)',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          commodity_name: 'Soybean',
          origin: 'Indore',
          destination: 'Mumbai',
          quantity: 25,
          unit: 'tonnes',
          is_return_load: true,
          contact_info: 'Karan Transport (+91 88776 55443)',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostOpportunity = async (e) => {
    e.preventDefault();
    if (!commodity.trim() || !origin.trim() || !destination.trim() || !quantity || !contactInfo.trim()) {
      toast.error('Please fill out all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const res = await postOpportunity({
        commodity: commodity.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        quantity: parseFloat(quantity),
        unit,
        is_return_load: isReturnLoad,
        contact_info: contactInfo.trim(),
      });
      if (res && res.status === 'success') {
        toast.success('Opportunity posted to marketplace!');
        // Reset form
        setCommodity('');
        setQuantity('');
        setContactInfo('');
        setIsReturnLoad(false);
        // Refresh list
        fetchOpportunities();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to post opportunity to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatch = (contact) => {
    toast.success(`Matched! Contact: ${contact}`, {
      duration: 6000,
      icon: '🤝',
    });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-display">
            Trucking & Return Load Opportunities
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse load availability postings, register cargo routes, and coordinate empty backhauls.
          </p>
        </div>
        <button
          onClick={fetchOpportunities}
          disabled={isLoading}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-semibold select-none self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Board
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form: Post Opportunity Form */}
        <div className="lg:col-span-1 glass-card p-6 border border-slate-700/40 space-y-4 self-start">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/40">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Post Cargo / Empty Return</h3>
          </div>

          <form onSubmit={handlePostOpportunity} className="space-y-4 text-xs">
            
            {/* Commodity Name */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold uppercase tracking-wider block">
                Commodity Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Cotton, Soybean, Batata"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
              />
            </div>

            {/* Origin & Destination Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold uppercase tracking-wider block">
                  Origin *
                </label>
                <input
                  type="text"
                  placeholder="Origin City"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold uppercase tracking-wider block">
                  Destination *
                </label>
                <input
                  type="text"
                  placeholder="Dest City"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-slate-400 font-bold uppercase tracking-wider block">
                  Quantity *
                </label>
                <input
                  type="number"
                  placeholder="Volume"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-slate-400 font-bold uppercase tracking-wider block">
                  Unit
                </label>
                <select
                  className="w-full px-2 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white focus:outline-none"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="tonnes">Tonnes</option>
                  <option value="quintals">Quintals</option>
                  <option value="trucks">Trucks</option>
                </select>
              </div>
            </div>

            {/* Return load checkbox */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="returnLoad"
                className="w-4 h-4 accent-emerald-500 bg-slate-900 border-slate-700/60 rounded focus:ring-0 focus:outline-none cursor-pointer"
                checked={isReturnLoad}
                onChange={(e) => setIsReturnLoad(e.target.checked)}
              />
              <label htmlFor="returnLoad" className="text-slate-300 font-semibold cursor-pointer select-none">
                This is a Return Load (Empty backhaul)
              </label>
            </div>

            {/* Contact details */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold uppercase tracking-wider block">
                Contact Details *
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Ramesh Singh (+91 94432 10101)"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              Post Opportunity
            </button>

          </form>
        </div>

        {/* Right Columns: Open Opportunities Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Active Cargo Listings</h3>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {oppsList && oppsList.length > 0 ? (
              oppsList.map((opp) => (
                <div
                  key={opp.id}
                  className={`p-5 bg-slate-800/40 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-500/50 transition-all ${
                    opp.is_return_load 
                      ? 'border-blue-500/25 bg-blue-500/5' 
                      : 'border-slate-700/30'
                  }`}
                >
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                        📦 {opp.commodity_name}
                      </span>
                      {opp.is_return_load ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-wider flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" /> Return Load
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          Standard Cargo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{opp.origin}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{opp.destination}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-slate-500" />
                        Qty: <strong className="text-slate-300">{opp.quantity} {opp.unit}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Listed: {new Date(opp.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Match Button */}
                  <div className="shrink-0 flex flex-col items-end gap-1 text-xs">
                    <button
                      onClick={() => handleMatch(opp.contact_info)}
                      className="px-4 py-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 group select-none"
                    >
                      🤝 Match Load
                    </button>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-slate-600" /> {opp.contact_info.split('(')[0].trim()}
                    </span>
                  </div>

                </div>
              ))
            ) : (
              <div className="p-12 text-center border border-slate-700/30 rounded-2xl bg-slate-800/20">
                <p className="text-slate-400 font-semibold">No load opportunities available</p>
                <p className="text-xs text-slate-500 mt-1">Be the first to list cargo and match dispatch trucks!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Opportunities;
