import React from 'react';
import { motion } from 'motion/react';
import { Radio, MapPin, Truck, Bell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MarketMapDashboard from './MarketMapDashboard';
import LucyInsightBar from './LucyInsightBar';

const FEATURES = [
  { icon: Radio, title: 'Real-time Price Updates', desc: 'Live AGMARKNET feeds across 2,500+ mandis' },
  { icon: MapPin, title: 'Mandi Level Insights', desc: 'Hyper-local price spreads and anomaly detection' },
  { icon: Truck, title: 'Arrival & Stock Monitoring', desc: 'Track arrivals and inventory across corridors' },
  { icon: Bell, title: 'Demand Signals', desc: 'AI-detected spikes, drops, and arbitrage windows' },
];

export const MarketIntelligenceSection = ({ prices, commodityCount, lucyInsights }) => {
  return (
    <section id="market-intelligence" className="py-20 lg:py-28 bg-[#fafaf8]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-14">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] text-slate-900 tracking-tight">
              Live Market Intelligence
              <br />
              Across Every Mandi.
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-md">
              Track prices, arrivals, and demand in real time. Make decisions with complete visibility across India.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="space-y-2">
                  <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 py-4 px-5 rounded-xl bg-white border border-slate-200 shadow-sm">
              {[
                { v: '2,500+', l: 'Mandis Covered' },
                { v: '28', l: 'States & UTs' },
                { v: `${commodityCount}+`, l: 'Commodities' },
                { v: '1.2Cr+', l: 'Daily Data Points' },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{s.v}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 shadow-xl overflow-hidden bg-white"
          >
            <MarketMapDashboard prices={prices} variant="full" />
          </motion.div>
        </div>

        {/* Lucy insight row — reference bottom strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid lg:grid-cols-4 gap-4"
        >
          <div className="lg:col-span-1 rounded-xl bg-[#0f1a14] border border-emerald-900/40 p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Lucy AI Insight</p>
            <p className="text-sm leading-relaxed text-slate-300">
              {lucyInsights?.[0] || 'Cotton arrivals up 18% in Maharashtra while demand is strong in Gujarat. Prices likely to rise in 48 hours.'}
            </p>
          </div>
          <div className="lg:col-span-2 grid sm:grid-cols-3 gap-4">
            {[
              { v: '18%', l: 'Arrival increase', sub: 'Maharashtra' },
              { v: 'High', l: 'Demand signal', sub: 'Gujarat markets' },
              { v: '48 hrs', l: 'Price rise window', sub: 'Probability' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{s.v}</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{s.l}</p>
                <p className="text-[10px] text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <Link
              to="/app/markets"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Explore Full Insights <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketIntelligenceSection;
