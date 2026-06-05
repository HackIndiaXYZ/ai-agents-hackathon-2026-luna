import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, X, ArrowRight, Cpu, Layers, ShieldCheck, Network, Radio, Headphones } from 'lucide-react';

const METRICS = [
  { value: '99.9%', label: 'System Uptime' },
  { value: '2,500+', label: 'Trading Businesses' },
  { value: '1.2Cr+', label: 'Transactions Processed' },
  { value: '28', label: 'States Covered' },
];

const HUB_CARDS = [
  { icon: Cpu, title: 'AI-Native by Design', desc: '20+ agents orchestrated from day one — not retrofitted chatbots.', side: 'left' },
  { icon: Layers, title: 'End-to-End Platform', desc: 'Markets, inventory, contracts, dispatch, risk, and compliance unified.', side: 'left' },
  { icon: ShieldCheck, title: 'Enterprise Grade', desc: 'pgvector RAG, Redis caching, auditable agent execution logs.', side: 'left' },
  { icon: Network, title: 'Network Advantage', desc: 'Buyer discovery, corridor scoring, and supply chain graph.', side: 'right' },
  { icon: Radio, title: 'Real-time Intelligence', desc: 'Live mandi feeds, anomaly detection, and ML forecasting.', side: 'right' },
  { icon: Headphones, title: 'Human + AI Support', desc: 'Lucy handles complexity — you retain full control.', side: 'right' },
];

const COMPARISON = [
  { feature: 'AI agents working 24/7', tn: true, legacy: false },
  { feature: 'End-to-end automation', tn: true, legacy: false },
  { feature: 'Real-time market intelligence', tn: true, legacy: false },
  { feature: 'Unified data & workflows', tn: true, legacy: false },
  { feature: 'Predictive insights (LSTM/XGBoost)', tn: true, legacy: false },
  { feature: 'Designed for commodity traders', tn: true, legacy: false },
  { feature: 'Manual data entry', tn: false, legacy: true },
  { feature: 'Siloed modules', tn: false, legacy: true },
];

export const WhyTradeNexusSection = () => {
  return (
    <section id="why-tradenexus" className="bg-[#fafaf8]">
      {/* Top — cream background */}
      <div className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h2 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] text-slate-900">
              Built for Traders.{' '}
              <span className="text-emerald-600">Backed by Intelligence.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              The first AI-native CTRM platform built for Indian commodity markets —
              unifying operations that traditional systems leave fragmented.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
            {METRICS.map((m) => (
              <div key={m.label} className="text-center p-4 rounded-xl bg-white border border-slate-200">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{m.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Hub diagram */}
          <div className="relative max-w-3xl mx-auto aspect-square sm:aspect-[4/3] min-h-[360px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 shadow-xl flex items-center justify-center">
                <span className="text-xs font-bold text-white text-center leading-tight">Trade<br />Nexus</span>
              </div>
            </div>
            {HUB_CARDS.map((card, i) => {
              const isLeft = card.side === 'left';
              const row = i % 3;
              const positions = isLeft
                ? [{ x: -42, y: -28 }, { x: -44, y: 2 }, { x: -42, y: 32 }]
                : [{ x: 42, y: -28 }, { x: 44, y: 2 }, { x: 42, y: 32 }];
              const pos = positions[row];
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="absolute top-1/2 left-1/2 w-44 sm:w-48"
                  style={{ transform: `translate(calc(-50% + ${pos.x}%), calc(-50% + ${pos.y}%))` }}
                >
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">{card.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dark comparison — reference bottom half */}
      <div className="relative py-20 lg:py-24 bg-[#0a1210] overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <path d="M0 80 Q200 40 400 70 T800 50 T1200 60 V200 H0Z" fill="none" stroke="#22c55e" strokeWidth="0.5" />
            <path d="M0 120 Q300 90 600 110 T1200 95 V200 H0Z" fill="none" stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500 mb-4">
              The TradeNexus Difference
            </p>
            <h3 className="font-serif text-3xl sm:text-4xl text-white leading-tight mb-4">
              Not Just Software.
              <br />
              A Strategic Advantage.
            </h3>
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/25 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Explore Platform Capabilities <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden relative"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-black text-white z-10">
              VS
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="p-5">
                <p className="text-xs font-bold text-emerald-400 mb-4">TradeNexus</p>
                <ul className="space-y-2.5">
                  {COMPARISON.filter((r) => r.tn === true).map((r) => (
                    <li key={r.feature} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {r.feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5">
                <p className="text-xs font-bold text-slate-500 mb-4">Traditional CTRM</p>
                <ul className="space-y-2.5">
                  {['Manual data entry', 'Siloed modules', 'Delayed reports', 'Multiple logins', 'Reactive reporting', 'Built for IT teams'].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-500">
                      <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyTradeNexusSection;
