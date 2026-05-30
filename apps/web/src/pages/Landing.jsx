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
  CheckCircle2 
} from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';

export const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      title: "Enter commodity",
      desc: "Type Cotton, Kapas, कपास, or any regional dialect. Our 4-tier cascade resolves it instantly."
    },
    {
      num: "02",
      icon: BarChart3,
      title: "Real mandi prices",
      desc: "Live prices from data.gov.in across 3,000+ mandis. Anomalies detected automatically."
    },
    {
      num: "03",
      icon: Navigation,
      title: "Route reliability",
      desc: "Google Routes API + corridor reports tells you if the road to your buyer is reliable today."
    },
    {
      num: "04",
      icon: Brain,
      title: "AI recommendation",
      desc: "Qwen synthesizes everything into a clear, specific trading recommendation in your language."
    }
  ];

  const features = [
    {
      icon: Globe,
      title: "Multilingual Resolution",
      desc: "Kapas = Cotton. Automatically. Our 4-tier cascade resolves regional commodity names across Hindi, Marathi, Gujarati, Telugu, Tamil and 238 other languages. No manual mapping required."
    },
    {
      icon: TrendingUp,
      title: "Live Mandi Intelligence",
      desc: "Price spikes before your competitors see them. Anomaly detection fires when modal prices deviate 1.5σ from the 10-day average. Get alerts, not noise."
    },
    {
      icon: Route,
      title: "Route Confidence",
      desc: "Know before you dispatch. Real-time route scoring combines Google Routes API data with user-reported corridor delays. Confidence score, not just ETA."
    },
    {
      icon: Sparkles,
      title: "Adaptive Learning",
      desc: "Gets smarter with every trade. Every correction teaches the system. Processed through Adaption's multilingual AI platform. The corpus grows daily."
    },
    {
      icon: Handshake,
      title: "Trade Matching",
      desc: "Turn empty trucks into profit. Post return loads, find forward opportunities. Simple matching for real traders."
    },
    {
      icon: FileCheck,
      title: "Compliance Ready",
      desc: "Invoice → structured data in seconds. Upload a PDF invoice. Get extracted GST, HSN codes, and e-way bill fields instantly."
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
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#product" className="hover:text-slate-950 transition-colors">Product</a>
          <a href="#how-it-works" className="hover:text-slate-950 transition-colors">How It Works</a>
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
            <span>AI-Powered • Multilingual • Adaptive Learning</span>
          </motion.div>

          {/* Heading */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-1"
          >
            <h1 className="text-4xl sm:text-6xl tracking-tight text-slate-900 font-display leading-none">
              <motion.span variants={itemVariants} className="block font-normal">India's Smartest</motion.span>
              <motion.span variants={itemVariants} className="block font-extrabold" style={{ color: 'var(--brand-green)' }}>Commodity Trading</motion.span>
              <motion.span variants={itemVariants} className="block font-normal">Intelligence</motion.span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-base sm:text-lg text-slate-500 font-medium max-w-2xl leading-relaxed"
          >
            From mandi prices to route confidence — TradeNexus gives commodity traders in India the intelligence to decide where to sell, when to dispatch, and how much to earn.
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
                Start Trading Smarter <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
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
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 20 Commodity Types</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 242 Languages</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3,000+ Mandis</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-Time Prices</span>
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
            <StatCard label="Cotton, Nagpur" value="₹7,250" delta="+18% spike" color="green" />
            <StatCard label="Route Reliability" value="87%" delta="Amravati→Nagpur" color="blue" />
            <StatCard label="Aliases Learned" value="47" delta="+14 this week" color="amber" />
            <StatCard label="Active Alerts" value="3" delta="High spikes" color="rose" />
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION C — SOCIAL PROOF TICKER */}
      <section className="py-3 overflow-hidden text-xs font-bold text-white uppercase tracking-wider relative select-none flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-green-dark)' }}>
        <div className="flex gap-16 animate-pulse-soft whitespace-nowrap">
          <span>• Cotton prices live from 3,000+ mandis</span>
          <span>• Resolves Kapas, कपास, Narma automatically</span>
          <span>• Route reliability updated hourly</span>
          <span>• Powered by Adaption multilingual AI</span>
          <span>• 242 Indian languages supported</span>
        </div>
      </section>

      {/* SECTION D — HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-white border-y" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              From Raw Signal to Clear Decision
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              Four steps. One recommendation.
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

      {/* SECTION E — FEATURE HIGHLIGHTS */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Everything a trader needs. Nothing they don't.
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              Modern tooling engineered for India's physical ag-trading networks.
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

      {/* SECTION F — LIVE STATS TICKER */}
      <section className="py-16 text-white relative overflow-hidden" style={{ backgroundColor: 'var(--text-primary)' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <h3 className="text-4xl font-extrabold tracking-tight text-white font-display">3,247+</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Mandis Monitored</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-extrabold tracking-tight text-white font-display">242</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Languages Mapped</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-extrabold tracking-tight text-white font-display">82%</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Data Quality Lift via Adaptive Loop</p>
          </div>
        </div>
      </section>

      {/* SECTION G — CTA SECTION */}
      <section className="py-24 px-6 text-center space-y-6 relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Ready to trade smarter?
          </h2>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            Join commodity traders across India who use TradeNexus to make better decisions, faster.
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

      {/* SECTION H — FOOTER */}
      <footer className="mt-auto py-12 px-6 bg-slate-900 text-slate-400 border-t border-slate-800 text-xs font-medium">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-extrabold tracking-tight font-display">TradeNexus</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Built for Indian commodity traders. Bridging real-time logistics corridors, pricing metrics, and multilingual intelligence.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2">
              <li><Link to="/app/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link to="/app/markets" className="hover:text-white transition-colors">Markets Index</Link></li>
              <li><Link to="/app/dispatch" className="hover:text-white transition-colors">Dispatch Telemetry</Link></li>
              <li><Link to="/app/opportunities" className="hover:text-white transition-colors">Opportunities</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Technology</h4>
            <ul className="space-y-2">
              <li className="hover:text-white transition-colors cursor-pointer">Adaptive Data Cascade</li>
              <li className="hover:text-white transition-colors cursor-pointer">NVIDIA Qwen 3.5 LLM</li>
              <li className="hover:text-white transition-colors cursor-pointer">data.gov.in API Sync</li>
              <li className="hover:text-white transition-colors cursor-pointer">Google Routes Telemetry</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Hackathon Context</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">AI Agents Hackathon 2026</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Adaption AI Track</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub Repository</a></li>
              <li><a href="#" className="hover:text-white transition-colors">HuggingFace Dataset</a></li>
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
