import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Search, 
  BarChart3, 
  Navigation, 
  Brain, 
  Globe, 
  TrendingUp, 
  Route, 
  Handshake, 
  FileCheck, 
  Compass, 
  CheckCircle2,
  Table,
  Cpu,
  Smartphone,
  Check,
  X,
  Database
} from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';

export const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [marketSizeCounter, setMarketSizeCounter] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Market size counter animation (counting up to 50,000)
  useEffect(() => {
    let start = 0;
    const end = 50000;
    const duration = 1500; // 1.5 seconds
    const range = end - start;
    const stepTime = 15;
    const increments = duration / stepTime;
    const stepValue = range / increments;
    
    const timer = setInterval(() => {
      start += stepValue;
      if (start >= end) {
        setMarketSizeCounter(end);
        clearInterval(timer);
      } else {
        setMarketSizeCounter(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  // Landing page animations configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const steps = [
    {
      num: "01",
      icon: Search,
      title: "Sync Mandis & Inventory",
      desc: "Connect user warehouses directly to 3,000+ live APMC mandi price feeds instantly using adaptive mapping."
    },
    {
      num: "02",
      icon: Brain,
      title: "Evaluate Real-Time Risk",
      desc: "Run live Mark-to-Market (MtM) calculations, exposure tracking, and basis risk evaluations over your books."
    },
    {
      num: "03",
      icon: Route,
      title: "Optimize Dispatch Logs",
      desc: "Score transit corridors for delays and monitor monsoons using route telemetry before routing drivers."
    },
    {
      num: "04",
      icon: Handshake,
      title: "Trade & Liquidate",
      desc: "Post opportunities, match buyers, extract invoices via compliance OCR, and log notes in regional languages."
    }
  ];

  const features = [
    {
      icon: TrendingUp,
      title: "Mark-to-Market Ledger",
      desc: "Ditch manual spreadsheets. Get instant portfolio valuation updates, worst-performer summaries, and live basis risk tables."
    },
    {
      icon: Route,
      title: "Logistics Corridor Scoring",
      desc: "Google Maps routing telemetry combined with live weather overlays. Auto-detect flood risks along transit roads."
    },
    {
      icon: Brain,
      title: "Linguistic Resolve Cascade",
      desc: "Type in English, Hindi, or Hinglish. Our 4-tier model translates 'Narma' and 'Kapas' back to Cotton automatically."
    },
    {
      icon: FileCheck,
      title: "Automated GST Invoicing",
      desc: "Drag-and-drop OCR scans trade invoices, validates GSTINs/HSNs, computes tax splits, and generates printable bills."
    },
    {
      icon: Sparkles,
      title: "Live ML Forecasting",
      desc: "180 days of historical patterns feed our LSTM networks to output a 7-day outlook with confidence interval bands."
    },
    {
      icon: Compass,
      title: "Interactive Network Graph",
      desc: "A fully custom D3 force-directed visualization graphing your warehouse hubs, open opportunities, and buyer nodes."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* SECTION A — NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 transition-all duration-300 ${
          isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b' : 'bg-transparent'
        }`}
        style={isScrolled ? { borderColor: 'var(--border)' } : {}}
      >
        <div className="flex items-center gap-2.5">
          <Compass className="w-6 h-6" style={{ color: 'var(--brand-green)' }} />
          <span className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
            TradeNexus
          </span>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            CTRM
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#product" className="hover:text-slate-950 transition-colors">Product</a>
          <a href="#comparison" className="hover:text-slate-950 transition-colors">Differentiation</a>
          <a href="#market" className="hover:text-slate-950 transition-colors">Opportunity</a>
          <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/auth/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/auth/signup">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* SECTION B — HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 relative overflow-hidden bg-gradient-to-b from-emerald-50/20 via-white to-transparent">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-100/30 rounded-full blur-[100px] -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-6 flex flex-col items-center">
          
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ backgroundColor: 'var(--brand-green-light)', color: 'var(--brand-green)', borderColor: 'var(--border)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Driven CTRM Operating System for Indian Ag-Commodities</span>
          </motion.div>

          {/* Heading */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-1"
          >
            <h1 className="text-4xl sm:text-6xl tracking-tight text-slate-900 font-display leading-none">
              <motion.span variants={itemVariants} className="block font-normal">India's First Intelligent</motion.span>
              <motion.span variants={itemVariants} className="block font-extrabold" style={{ color: 'var(--brand-green)' }}>Commodity Trading & Risk</motion.span>
              <motion.span variants={itemVariants} className="block font-normal">Management Platform</motion.span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-base sm:text-lg text-slate-500 font-medium max-w-2xl leading-relaxed"
          >
            Bridge physical grain logistics with real-time portfolio risk management. Monitor mandi spreads, track basis risk, predict crop prices, and automate regional trade records.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <Link to="/auth/signup">
              <Button variant="primary" size="lg">
                Access CTRM Console <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
              </Button>
            </Link>
            <Link to="/app/dashboard">
              <Button variant="secondary" size="lg">See Live Demo</Button>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="pt-4 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-400"
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-mandi Spreads</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time MtM Valuation</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multilingual Resolvers</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> First-Mile Quality Capture</span>
          </motion.div>
        </div>

        {/* Hero Visual dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 w-full max-w-5xl px-4"
        >
          <motion.div 
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-2xl bg-white shadow-md relative z-10"
            style={{ borderColor: 'var(--border)' }}
          >
            <StatCard label="Total Portfolio Value" value="₹4.73 Cr" delta="Live Mark-to-Market" color="green" />
            <StatCard label="Net Basis Risk" value="+4.15%" delta="Weighted Average spread" color="blue" />
            <StatCard label="Moisture Deficit Penalities" value="₹1.48L" delta="First-mile lot metrics" color="amber" />
            <StatCard label="Corridor Transit Alerts" value="2 active" delta="Vidarbha monsoon risk" color="rose" />
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION C — SOCIAL PROOF TICKER */}
      <section className="py-3 overflow-hidden text-xs font-bold text-white uppercase tracking-wider relative select-none flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-green-dark)' }}>
        <div className="flex gap-16 animate-pulse-soft whitespace-nowrap">
          <span>• Dedicated Ag-CTRM Tooling</span>
          <span>• Indian Mandi & APMC Price Feeds Sync</span>
          <span>• Live Basis Risk computations</span>
          <span>• First-Mile moisture & weight penalties</span>
          <span>• D3 Supply Chain flow visualizations</span>
        </div>
      </section>

      {/* SECTION D — HOW IT WORKS */}
      <section id="product" className="py-24 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              CTRM Architecture Built For Ag-Markets
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              Standard CTRMs focus on paper markets. TradeNexus tracks the physical, first-mile reality.
            </p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 relative"
          >
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div key={idx} variants={itemVariants} className="relative">
                  <Card className="p-6 h-full flex flex-col justify-between border relative bg-slate-50/50">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-extrabold text-slate-300">{step.num}</span>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                          <StepIcon className="w-5 h-5 shrink-0" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </Card>

                  {/* Desktop connecting arrow line */}
                  {idx < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="var(--brand-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* SECTION E — COMPARISON TABLE */}
      <section id="comparison" className="py-24 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Differentiation Matrix
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              How TradeNexus stacks up against traditional systems and manual tracking
            </p>
          </div>

          <div className="overflow-x-auto border rounded-2xl shadow-sm bg-white" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b font-bold text-slate-500" style={{ borderColor: 'var(--border)' }}>
                  <th className="p-4">Feature</th>
                  <th className="p-4 bg-emerald-50 text-emerald-800 font-black">TradeNexus</th>
                  <th className="p-4">Eka / Mindsprint</th>
                  <th className="p-4">Spreadsheets</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold text-slate-600" style={{ borderColor: 'var(--border)' }}>
                {[
                  { name: 'Target User', tn: 'Indian Traders / SMEs', alt1: 'Global Corporates', alt2: 'Everyone' },
                  { name: 'Mobile-First Design', tn: true, alt1: false, alt2: 'Partial' },
                  { name: 'Hindi & Regional Support', tn: true, alt1: false, alt2: false },
                  { name: 'AI Copilot (Lucy)', tn: true, alt1: false, alt2: false },
                  { name: 'First-Mile Quality Capture', tn: true, alt1: false, alt2: 'Manual Entry' },
                  { name: 'Setup Time', tn: 'Under 10 Minutes', alt1: '3-6 Months', alt2: 'Instant but messy' },
                  { name: 'Pricing model', tn: 'Pay-As-You-Grow', alt1: '₹20L+ annual contract', alt2: 'Free' }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                    
                    {/* TradeNexus Column (highlighted) */}
                    <td className="p-4 bg-emerald-50/40 text-emerald-800 font-bold border-x border-emerald-100">
                      {typeof row.tn === 'boolean' ? (
                        row.tn ? <span className="inline-flex items-center gap-1 text-emerald-700 font-black"><Check className="w-4 h-4" /> Yes</span> : <X className="w-4 h-4 text-slate-400" />
                      ) : row.tn}
                    </td>

                    <td className="p-4">
                      {typeof row.alt1 === 'boolean' ? (
                        row.alt1 ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="inline-flex items-center gap-1 text-rose-500"><X className="w-4 h-4" /> No</span>
                      ) : row.alt1}
                    </td>
                    
                    <td className="p-4">
                      {typeof row.alt2 === 'boolean' ? (
                        row.alt2 ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="inline-flex items-center gap-1 text-rose-500"><X className="w-4 h-4" /> No</span>
                      ) : row.alt2}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION F — MARKET SIZE SECTION */}
      <section id="market" className="py-24 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white relative overflow-hidden">
        {/* Decorative backdrop elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] -z-10" />

        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span>Market Opportunity</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display leading-tight">
              The Market Eka Can't Serve — We Can.
            </h2>
            
            <p className="text-slate-300 font-medium text-sm leading-relaxed">
              India has over 400,000 active ag-commodity trading enterprises. Enterprise CTRM systems require millions in licensing fees and months of integration. As a result, 98% of mid-market traders rely on fragmented WhatsApp threads and manual spreadsheets. TradeNexus changes this.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">400,000+ Addressable Traders</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">A completely unserved ag-trading customer segment across Tier 2 and Tier 3 markets.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Zero Enterprise Licensing Barriers</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Mobile-first, cloud-native deployments that require no IT staff or expensive upfront retainers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Animated counter visual */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Total Addressable Market</p>
              
              {/* Counter Display */}
              <div className="text-4xl md:text-5xl font-black font-display text-white tracking-tight">
                ₹{marketSizeCounter.toLocaleString('en-IN')}+ Cr
              </div>
              <p className="text-xs text-slate-400 font-semibold">Annual physical commodity trading turnover across SME networks</p>
            </div>

            <div className="border-t border-white/10 pt-6 grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-white">4,00,000</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Traders</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-white">98%</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Excel / Manual Dependent</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION G — FEATURE HIGHLIGHTS */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Enterprise Power. App Simplicity.
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              Modern CTRM tooling engineered for India's physical ag-trading networks.
            </p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map((feature, idx) => {
              const FeatIcon = feature.icon;
              return (
                <motion.div key={idx} variants={itemVariants}>
                  <Card hover={true} className="p-6 h-full flex flex-col justify-between bg-white border">
                    <div className="space-y-4">
                      <div className="p-2.5 w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FeatIcon className="w-5 h-5 shrink-0" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* SECTION H — CTA SECTION */}
      <section className="py-24 px-6 text-center space-y-6 relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Ready to trade smarter?
          </h2>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            Equip your enterprise with the pricing models, logistics scorers, and risk ledgers to maximize margins.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/auth/signup">
              <Button variant="primary" size="lg">Get Started Free</Button>
            </Link>
            <Link to="/app/dashboard">
              <Button variant="secondary" size="lg">View Demo Dashboard</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION I — FOOTER */}
      <footer className="mt-auto py-12 px-6 bg-slate-900 text-slate-400 border-t border-slate-800 text-xs font-medium">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-extrabold tracking-tight font-display">TradeNexus</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Dedicated CTRM Platform for Indian ag-commodity markets. Tracking live mandis, corridor risks, tax compliance, and portfolio exposures.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">CTRM Suite</h4>
            <ul className="space-y-2">
              <li><Link to="/app/dashboard" className="hover:text-white transition-colors">Command Center</Link></li>
              <li><Link to="/app/risk" className="hover:text-white transition-colors">Risk Ledger</Link></li>
              <li><Link to="/app/network" className="hover:text-white transition-colors">Supply Network Graph</Link></li>
              <li><Link to="/app/analytics" className="hover:text-white transition-colors">Analytics & P&L</Link></li>
              <li><Link to="/app/inventory" className="hover:text-white transition-colors">Physical Storage</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Logistics & Operations</h4>
            <ul className="space-y-2">
              <li><Link to="/app/dispatch" className="hover:text-white transition-colors">Dispatch & Corridors</Link></li>
              <li><Link to="/app/markets" className="hover:text-white transition-colors">Market Prices</Link></li>
              <li><Link to="/app/compliance" className="hover:text-white transition-colors">Compliance Assistant</Link></li>
              <li><Link to="/app/quality" className="hover:text-white transition-colors">Quality Standards</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Technology Stack</h4>
            <ul className="space-y-2">
              <li className="hover:text-white transition-colors cursor-pointer">Adaptive Data Cascade</li>
              <li className="hover:text-white transition-colors cursor-pointer">D3.js Force Simulation</li>
              <li className="hover:text-white transition-colors cursor-pointer">Live Mandi API Sync</li>
              <li className="hover:text-white transition-colors cursor-pointer">Weather Routing Telemetry</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <span>© 2026 TradeNexus. Built for AI Agents Hackathon.</span>
          <span>Light Mode Experience • Stripe Clean Design Guidelines</span>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
