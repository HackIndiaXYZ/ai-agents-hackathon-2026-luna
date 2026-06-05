import React from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Shield,
  Lightbulb,
  FileText,
  Truck,
  LineChart,
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Search,
    title: 'Commodity Intelligence',
    desc: '4-tier resolution cascade: SQL, trigram, vector, LLM — sub-100ms for 95%+ of regional queries.',
    tags: ['639+ aliases', '9 languages'],
  },
  {
    icon: Shield,
    title: 'Risk Forecasting',
    desc: 'XGBoost counterparty classifiers, portfolio concentration alerts, and hourly MtM recalculation.',
    tags: ['XGBoost', 'MtM'],
  },
  {
    icon: Lightbulb,
    title: 'Trade Recommendations',
    desc: 'Parallel agent telemetry synthesized in a single LLM pass — where to sell, when to dispatch.',
    tags: ['Multi-agent', 'Nvidia LLM'],
  },
  {
    icon: FileText,
    title: 'Contract Intelligence',
    desc: 'Field-note parsing, lifecycle management, GST invoicing, and counterparty risk scoring.',
    tags: ['OCR', 'CTRM'],
  },
  {
    icon: Truck,
    title: 'Dispatch Optimization',
    desc: 'Google Routes v2 corridor scoring with weather overlays and reliability-weighted net margin.',
    tags: ['22 corridors', 'Open-Meteo'],
  },
  {
    icon: LineChart,
    title: 'Market Forecasting',
    desc: 'Per-commodity LSTM models trained on mandi history — 7-day outlook with confidence bands.',
    tags: ['LSTM', 'Prophet', 'Chronos'],
  },
];

const TECH_STACK = [
  '20+ AI Agents',
  '4-tier commodity resolution',
  'RAG-enhanced intent understanding',
  'Multilingual embeddings',
  'XGBoost risk models',
  'LSTM forecasting',
];

export const IntelligenceSection = () => {
  return (
    <section id="intelligence" className="py-24 lg:py-32 bg-[#030712] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-900/15 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400/80 mb-4">
            TradeNexus Intelligence
          </p>
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.75rem)] leading-tight tracking-tight">
            The Intelligence Layer
            <br />
            <span className="text-emerald-400 italic">Behind Every Decision.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 hover:border-emerald-500/25 transition-colors"
              >
                <Icon className="w-5 h-5 text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{cap.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">{cap.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {cap.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3"
        >
          {TECH_STACK.map((item) => (
            <span
              key={item}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] text-sm font-medium text-slate-300"
            >
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default IntelligenceSection;
