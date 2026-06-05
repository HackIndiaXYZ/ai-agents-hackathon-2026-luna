import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Play,
  ArrowRight,
  Package,
  FileText,
  TrendingUp,
  Shield,
  Users,
  Truck,
} from 'lucide-react';
import Button from '../ui/Button';

const ORBIT_AGENTS = [
  { icon: Package, name: 'Inventory Agent', desc: 'Tracks stock and manages warehouses' },
  { icon: FileText, name: 'Contract Agent', desc: 'Creates and tracks contracts automatically' },
  { icon: TrendingUp, name: 'Market Agent', desc: 'Monitors prices and trends in real-time' },
  { icon: Shield, name: 'Risk Agent', desc: 'Monitors exposure and secures transactions' },
  { icon: Users, name: 'Counterparty Agent', desc: 'Verifies parties and manages relationships' },
  { icon: Truck, name: 'Logistics Agent', desc: 'Optimizes routes and ensures delivery' },
];

const WORKFLOWS = [
  {
    user: 'Add 50 quintal potatoes to my inventory',
    lucy: 'Inventory Updated',
    detail: 'Warehouse capacity at 82%',
    type: 'inventory',
  },
  {
    user: 'What is cotton price in Indore?',
    lucy: 'Indore: ₹7,260 (+4.2%) · Delhi: ₹7,180 · Ahmedabad: ₹7,350',
    detail: 'Prices updated 2 min ago',
    type: 'market',
  },
  {
    user: 'Received order for 80 quintal soybean',
    lucy: 'Projected Revenue: ₹8.4L · Est. Profit: ₹1.6L',
    detail: 'Inventory available: 120 quintal',
    type: 'deal',
  },
  {
    user: 'Find cotton buyers near Nagpur',
    lucy: '3 buyers matched — top: Green Harvest Pvt Ltd (94% match)',
    detail: 'Buyer discovery complete',
    type: 'buyers',
  },
];

const FEATURES = [
  { num: '01', title: 'Voice Native', desc: 'Hindi, English, Hinglish, Marathi, Gujarati, and more.' },
  { num: '02', title: 'Zero Manual Entry', desc: 'Inventory and contracts updated from conversation.' },
  { num: '03', title: '24×7 Market Monitoring', desc: 'Continuous tracking across all commodity movements.' },
  { num: '04', title: 'Autonomous Execution', desc: 'Lucy performs the work — you manage the trade.' },
];

export const LucySection = ({ prices }) => {
  const spot = prices?.[0];

  return (
    <section id="lucy" className="py-20 lg:py-28 bg-[#fafaf8] border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-600">
              Autonomous Commodity Intelligence
            </p>
            <h2 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] text-slate-900">
              Meet Lucy. The AI Workforce Behind{' '}
              <span className="text-emerald-600">Every Trade.</span>
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              Lucy is not a chatbot waiting for commands — she is an active agent that manages
              inventory, contracts, and risk through natural conversation in your language.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/app/dashboard">
                <Button variant="primary" size="lg" className="!rounded-lg">
                  <Play className="w-4 h-4 mr-2" /> Watch Lucy in Action
                </Button>
              </Link>
              <Link to="/auth/signup">
                <Button variant="secondary" size="lg" className="!rounded-lg">
                  Start Trading with Lucy <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Lucy portrait + orbit */}
          <div className="relative mx-auto w-full max-w-md h-[380px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 border-4 border-white shadow-xl flex items-center justify-center">
                <span className="text-4xl font-serif text-emerald-800">L</span>
              </div>
              <p className="text-center text-xs font-bold text-slate-700 mt-3">Lucy AI</p>
              <p className="text-center text-[10px] text-emerald-600 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active 24/7
              </p>
            </div>
            {ORBIT_AGENTS.map((agent, i) => {
              const angle = (i / ORBIT_AGENTS.length) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * 140;
              const y = Math.sin(angle) * 120;
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="absolute top-1/2 left-1/2 w-36"
                  style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                >
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 text-center">
                    <Icon className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-[9px] font-bold text-slate-800">{agent.name}</p>
                    <p className="text-[8px] text-slate-500 leading-tight mt-0.5">{agent.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {WORKFLOWS.map((w, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You</p>
              <p className="text-sm text-slate-700 italic">&ldquo;{w.user}&rdquo;</p>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Lucy</p>
                <p className="text-sm font-semibold text-slate-900">
                  {w.type === 'market' && spot
                    ? `${spot.mandi_name}: ₹${spot.modal_price?.toLocaleString('en-IN')} (+${(spot.trend_pct || 2).toFixed(1)}%)`
                    : w.lucy}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">{w.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {FEATURES.map((f) => (
            <div key={f.num} className="space-y-2">
              <p className="text-3xl font-bold text-emerald-600/30 font-serif">{f.num}</p>
              <p className="text-base font-bold text-slate-900">{f.title}</p>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="font-serif text-center text-2xl sm:text-3xl text-slate-900">
          Stop Managing Software.{' '}
          <span className="text-emerald-600 italic">Start Managing Trade.</span>
        </p>
        <p className="text-center text-slate-500 mt-3 max-w-xl mx-auto">
          TradeNexus transforms CTRM from a system of records into a{' '}
          <strong className="text-slate-700">system of action.</strong>
        </p>
      </div>
    </section>
  );
};

export default LucySection;
