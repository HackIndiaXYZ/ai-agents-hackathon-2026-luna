import React from 'react';
import { motion } from 'motion/react';
import { Database, Brain, Wheat, Leaf, Apple, Milk, Gem, Fuel, MessageCircle } from 'lucide-react';

const COMMODITIES = [
  { icon: Wheat, label: 'Agriculture', items: 'Grains, Pulses, Oilseeds' },
  { icon: Leaf, label: 'Cash Crops', items: 'Cotton, Sugarcane, Jute' },
  { icon: Apple, label: 'Horticulture', items: 'Fruits, Vegetables, Spices' },
  { icon: Milk, label: 'Animal & Dairy', items: 'Milk, Feed, Livestock' },
  { icon: Gem, label: 'Metals & Minerals', items: 'Iron Ore, Aluminum' },
  { icon: Fuel, label: 'Energy & Others', items: 'Coal, Petroleum products' },
];

const PAN_INDIA = [
  { value: '700+', label: 'Mandis Connected' },
  { value: '28', label: 'States Covered' },
  { value: 'Live', label: 'Real-time Prices' },
  { value: 'Local', label: 'Hyper-Local Insights' },
];

const LANGUAGES = [
  { code: 'A/इ', label: 'English', sample: 'Check cotton prices in Indore' },
  { code: 'हि', label: 'Hindi', sample: 'कपास का भाव क्या है?' },
  { code: 'म', label: 'Marathi', sample: 'कापसाचा भाव काय आहे?' },
  { code: 'ગુ', label: 'Gujarati', sample: 'કપાસનો ભાવ શું છે?' },
  { code: 'ਪੰ', label: 'Punjabi', sample: 'ਕਪਾਹ ਦਾ ਰੇਟ ਕੀ ਹੈ?' },
  { code: '+', label: 'More', sample: 'Tamil, Telugu, Kannada, Bengali, Hinglish' },
];

const FOOTER_FEATURES = [
  { title: 'Local Market Intelligence', desc: 'Hyper-local mandi insights tailored to your region.' },
  { title: 'Regional Customization', desc: 'Workflows, units, and taxes adapted per state.' },
  { title: 'Local Formats', desc: 'Weights, measures, and currency in familiar terms.' },
  { title: 'Regulatory Adaptation', desc: 'State-specific rules and compliance built in.' },
];

export const MultilingualSection = ({ learningStats }) => {
  const intentExamples = learningStats?.intent_examples_total ?? 1632;
  const languages = learningStats?.languages_covered ?? 9;

  return (
    <section id="multilingual" className="bg-white">
      {/* Top — white with map */}
      <div className="py-20 lg:py-28 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto mb-14"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-600 mb-4">
              Built for Every Commodity. Adapted for Every Market.
            </p>
            <h2 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] text-slate-900">
              One Platform. Every Commodity.{' '}
              <span className="text-emerald-600">Every Market. Every Trader.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              From Vidarbha cotton to Punjab wheat — TradeNexus adapts to your region,
              language, and business model without reconfiguration.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Commodities card */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-bold text-slate-900 mb-4">Commodities Supported</p>
              <ul className="space-y-4">
                {COMMODITIES.map(({ icon: Icon, label, items }) => (
                  <li key={label} className="flex gap-3">
                    <Icon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{items}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* India map center */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-2xl border border-slate-200 bg-[#fafaf8] p-6 min-h-[280px] flex items-center justify-center"
            >
              <svg viewBox="0 0 100 100" className="w-full max-w-xs">
                <path
                  d="M32 12 L58 10 L76 24 L82 42 L78 58 L70 74 L58 88 L42 82 L30 68 L24 48 L28 28 Z"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
                {[
                  [38, 28], [32, 42], [45, 48], [35, 62], [50, 72], [55, 45], [48, 35],
                ].map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r="3" fill="rgba(34,197,94,0.2)" />
                    <circle cx={x} cy={y} r="1.5" fill="#16a34a" />
                  </g>
                ))}
              </svg>
            </motion.div>

            {/* Pan-India card */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-bold text-slate-900 mb-4">Pan-India Coverage</p>
              <div className="space-y-4">
                {PAN_INDIA.map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-lg font-bold text-emerald-600">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Dark multilingual section — reference */}
      <div className="py-20 lg:py-28 bg-[#0a0a0a] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500 mb-4">
              Speak Your Language. Trade with Confidence.
            </p>
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight">
              Built Multilingual. Made for Bharat.
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              Lucy understands regional languages, dialects, and code-mixed Hinglish —
              powered by retrieval-augmented intent classification across {intentExamples}+ training examples.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.label}
                className={`rounded-xl border p-5 ${
                  lang.label === 'More'
                    ? 'border-dashed border-slate-600 bg-transparent'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{lang.label}</p>
                    <p className="text-xs text-emerald-500/80 font-mono">{lang.code}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 italic">{lang.sample}</p>
                <div className="w-8 h-0.5 bg-emerald-500 mt-4 rounded-full" />
              </div>
            ))}
          </div>

          {/* RAG stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-900/30">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xl font-bold tabular-nums">{intentExamples}+</p>
                <p className="text-xs text-slate-400">Multilingual training examples</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-900/30">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xl font-bold tabular-nums">{languages}</p>
                <p className="text-xs text-slate-400">Indian languages + Hinglish</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-900/30">
              <Brain className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-bold">Vector retrieval powered</p>
                <p className="text-xs text-slate-400">384-dim multilingual embeddings</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {FOOTER_FEATURES.map((f) => (
              <div key={f.title}>
                <p className="text-sm font-bold text-white mb-1">{f.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-6 text-center max-w-2xl mx-auto">
            <p className="font-serif text-xl text-white">Built for Bharat. Ready for the World.</p>
            <p className="text-sm text-slate-400 mt-2">
              Start in your language. Scale across commodities, corridors, and markets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MultilingualSection;
