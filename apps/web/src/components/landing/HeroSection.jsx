import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import Button from '../ui/Button';
import MarketMapDashboard from './MarketMapDashboard';
import LucyInsightBar from './LucyInsightBar';
import NetworkMesh from './NetworkMesh';

const TRUSTED = [
  'Shreeji Trading',
  'Kedia Agro',
  'Growel Commodities',
  'Global Agro',
  'Prime Commodities',
];

export const HeroSection = ({ portfolio, prices, lucyInsights, alerts, liveConnected }) => {
  return (
    <section className="relative min-h-screen bg-[#030712] text-white overflow-hidden">
      <NetworkMesh variant="dark" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, #22c55e 0%, transparent 50%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-8 lg:pt-32">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-7"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500">
              Built for Modern Traders
            </p>

            <h1 className="font-serif text-[clamp(2.75rem,6.5vw,5.75rem)] leading-[1.02] tracking-tight">
              The Operating System
              <br />
              for{' '}
              <span className="text-emerald-400">Commodity Trading.</span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
              Unify every operation. Empower every decision. AI agents working 24/7
              to help you trade smarter, manage risk, and grow sustainably.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/auth/signup">
                <Button variant="primary" size="lg" className="!px-7 !rounded-lg">
                  Start Trading Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/app/dashboard">
                <Button
                  variant="secondary"
                  size="lg"
                  className="!bg-transparent !text-white !border-white/25 hover:!bg-white/5 !rounded-lg"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Watch Live Demo
                </Button>
              </Link>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
                Trusted By
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {TRUSTED.map((name) => (
                  <span key={name} className="text-sm font-medium text-slate-500">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {liveConnected && (
              <p className="text-[10px] text-emerald-500/80 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live mandi data connected
              </p>
            )}
          </motion.div>

          {/* Laptop on rock pedestal — reference layout */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-emerald-500/8 blur-3xl rounded-full pointer-events-none" />
            {/* Rock base */}
            <div className="relative mt-8">
              <div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[95%] h-16 rounded-[50%] opacity-60"
                style={{
                  background: 'radial-gradient(ellipse, #1e293b 0%, #0f172a 70%, transparent 100%)',
                  filter: 'blur(2px)',
                }}
              />
              <div className="relative rounded-xl bg-gradient-to-b from-slate-600 to-slate-800 p-[3px] shadow-2xl shadow-black/60">
                <div className="rounded-[10px] overflow-hidden bg-white">
                  <MarketMapDashboard prices={prices} variant="hero" />
                </div>
              </div>
              <div className="mx-auto w-[90%] h-2.5 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-lg mt-0" />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 lg:mt-14"
        >
          <LucyInsightBar insights={lucyInsights} alerts={alerts} />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
