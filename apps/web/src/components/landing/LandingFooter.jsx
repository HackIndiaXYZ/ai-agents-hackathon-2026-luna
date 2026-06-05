import React from 'react';
import { Link } from 'react-router-dom';
import TradeNexusLogo from './TradeNexusLogo';

export const LandingFooter = () => {
  return (
    <footer className="py-12 px-6 bg-slate-950 text-slate-400 border-t border-white/5 text-xs font-medium">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <TradeNexusLogo dark />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 max-w-xs">
            AI-native CTRM platform for Indian commodity markets. Mandi intelligence,
            agent orchestration, and enterprise-grade risk management.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">CTRM Suite</h4>
          <ul className="space-y-2">
            <li><Link to="/app/dashboard" className="hover:text-white transition-colors">Command Center</Link></li>
            <li><Link to="/app/risk" className="hover:text-white transition-colors">Risk Ledger</Link></li>
            <li><Link to="/app/network" className="hover:text-white transition-colors">Supply Network</Link></li>
            <li><Link to="/app/analytics" className="hover:text-white transition-colors">Analytics & P&L</Link></li>
            <li><Link to="/app/inventory" className="hover:text-white transition-colors">Inventory</Link></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Operations</h4>
          <ul className="space-y-2">
            <li><Link to="/app/dispatch" className="hover:text-white transition-colors">Dispatch & Corridors</Link></li>
            <li><Link to="/app/markets" className="hover:text-white transition-colors">Market Prices</Link></li>
            <li><Link to="/app/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
            <li><Link to="/app/opportunities" className="hover:text-white transition-colors">Opportunities</Link></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Intelligence</h4>
          <ul className="space-y-2">
            <li><Link to="/app/advisor" className="hover:text-white transition-colors">Trade Advisor</Link></li>
            <li><Link to="/app/contracts" className="hover:text-white transition-colors">Contracts</Link></li>
            <li><Link to="/app/quality" className="hover:text-white transition-colors">Quality Lots</Link></li>
            <li><a href="#intelligence" className="hover:text-white transition-colors">AI Agents</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <span>© 2026 TradeNexus. Built for HackIndia 2026.</span>
        <span>Enterprise AI CTRM · Multilingual · Agent-Native</span>
      </div>
    </footer>
  );
};

export default LandingFooter;
