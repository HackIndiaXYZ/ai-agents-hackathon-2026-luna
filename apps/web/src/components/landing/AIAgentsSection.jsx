import React from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  TrendingUp,
  Shield,
  FileCheck,
  Truck,
  FileText,
  Search,
  Clock,
  Zap,
  Lock,
} from 'lucide-react';

const AGENTS = [
  { name: 'Market Intelligence Agent', icon: TrendingUp, status: 'Analyzing', desc: 'Tracks prices, trends, and demand across mandis', angle: 0 },
  { name: 'Opportunity Finder Agent', icon: Search, status: 'Scanning', desc: 'Finds high-margin trades and arbitrage windows', angle: 60 },
  { name: 'Contract Manager Agent', icon: FileText, status: 'Managing', desc: 'Automates contract creation and renewals', angle: 120 },
  { name: 'Logistics Agent', icon: Truck, status: 'Optimizing', desc: 'Routes dispatches and monitors corridor risk', angle: 180 },
  { name: 'Compliance Agent', icon: FileCheck, status: 'Verifying', desc: 'GST, e-way bills, and regulatory compliance', angle: 240 },
  { name: 'Risk Analyst Agent', icon: Shield, status: 'Monitoring', desc: 'Exposure, VaR, and counterparty risk scoring', angle: 300 },
];

const QUICK_STATS = [
  { icon: Compass, label: '6 AI Agents' },
  { icon: Clock, label: '24/7 Operations' },
  { icon: Lock, label: '100% Secure' },
  { icon: Zap, label: '< 2s Response' },
];

const IMPACT = [
  { value: '+18.6%', label: 'Avg. Profit Increase', sub: 'vs last quarter' },
  { value: '-32%', label: 'Time to Close Trades', sub: 'faster execution' },
  { value: '-24%', label: 'Risk Exposure', sub: 'portfolio reduction' },
  { value: '+28%', label: 'Inventory Turnover', sub: 'improvement' },
];

export const AIAgentsSection = () => {
  const radius = 155;

  return (
    <section id="ai-agents" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-600">
              AI Agents Working 24/7 For You
            </p>
            <h2 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] text-slate-900">
              An AI Workforce That{' '}
              <span className="text-emerald-600">Thinks.</span>
              <br />
              You <span className="text-emerald-600">Grow.</span>
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              Specialized AI agents collaborate in real-time to analyze markets, manage risk,
              and execute operations — so you can focus on growing your business.
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              {QUICK_STATS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Icon className="w-4 h-4 text-emerald-600" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hub diagram */}
          <div className="relative mx-auto w-full max-w-lg h-[400px] sm:h-[440px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
              {AGENTS.map((a) => {
                const rad = (a.angle * Math.PI) / 180 - Math.PI / 2;
                const cx = 200 + Math.cos(rad) * 130;
                const cy = 200 + Math.sin(rad) * 130;
                return (
                  <line
                    key={a.name}
                    x1="200"
                    y1="200"
                    x2={cx}
                    y2={cy}
                    stroke="rgba(22,163,74,0.2)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-emerald-500/40 shadow-lg flex items-center justify-center">
                <Compass className="w-7 h-7 text-emerald-400" />
              </div>
            </div>

            {AGENTS.map((agent) => {
              const rad = (agent.angle * Math.PI) / 180 - Math.PI / 2;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="absolute top-1/2 left-1/2 w-40"
                  style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                >
                  <div className="bg-white rounded-xl border border-slate-200 shadow-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">{agent.name}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-snug mb-1.5">{agent.desc}</p>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">{agent.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact banner — reference dark strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-[#0a1210] border border-emerald-900/30 p-8 lg:p-10 grid lg:grid-cols-3 gap-8 items-center overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 w-64 h-full opacity-30 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {Array.from({ length: 40 }).map((_, i) => (
                <circle
                  key={i}
                  cx={20 + (i % 8) * 22}
                  cy={20 + Math.floor(i / 8) * 22}
                  r="2"
                  fill="#22c55e"
                  opacity={0.3 + (i % 3) * 0.2}
                />
              ))}
            </svg>
          </div>

          <div className="relative">
            <h3 className="font-serif text-2xl text-white mb-2">Real Impact. Measurable Results.</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-powered decisions that translate directly to margin, speed, and risk reduction.
            </p>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-4 lg:col-span-2 gap-6">
            {IMPACT.map((m) => (
              <div key={m.label} className="text-center lg:text-left border-l border-white/10 pl-4 first:border-0 first:pl-0">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums">{m.value}</p>
                <p className="text-xs font-bold text-white mt-1">{m.label}</p>
                <p className="text-[10px] text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AIAgentsSection;
