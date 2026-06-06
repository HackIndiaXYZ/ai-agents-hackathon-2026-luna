import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, TrendingUp, ChevronDown } from 'lucide-react';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all ${scrolled ? 'border-b border-white/10' : ''}`}
      style={{ background: 'rgba(13,31,13,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-green-600 flex items-center justify-center font-bold text-white">N</div>
        <span className="text-white font-semibold text-lg">TradeNexus</span>
      </div>
      <div className="hidden lg:flex items-center gap-6 text-sm text-white/80">
        {['Product', 'Solutions', 'AI Agents', 'Resources', 'Pricing', 'Company'].map((l) => (
          <button key={l} className="flex items-center gap-1 hover:text-white">{l} <ChevronDown size={12} /></button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Link to="/auth/login" className="px-4 py-2 text-sm text-white border border-white/30 rounded-lg hover:bg-white/10">Book a Demo</Link>
        <Link to="/auth/signup" className="px-4 py-2 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Get Started Free →</Link>
      </div>
    </nav>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10" style={{ background: '#FAFAF8' }}>
        <div className="h-6 bg-gray-200 flex items-center gap-1.5 px-3">
          <div className="w-2 h-2 rounded-full bg-red-400" /><div className="w-2 h-2 rounded-full bg-amber-400" /><div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {['Exposure ₹27.8L', 'P&L -₹17.3L', 'Alerts 4'].map((s) => (
              <div key={s} className="flex-1 bg-white rounded-lg p-2 text-[10px] font-semibold text-gray-700 border">{s}</div>
            ))}
          </div>
          <div className="bg-white rounded-lg p-3 border h-32 flex items-center justify-center text-xs text-gray-400">
            <MapPin size={24} className="text-green-600 mb-1" />
            <span className="ml-2">Market Map of India</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[9px]">
            {['Indore ₹7,260', 'Nagpur ₹6,820', 'Akola ₹6,680'].map((m) => (
              <div key={m} className="bg-white rounded p-1.5 border text-center font-medium">{m}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const agents = [
    { name: 'Market Intelligence', status: 'Analyzing' },
    { name: 'Opportunity Finder', status: 'Scanning' },
    { name: 'Risk Analyst', status: 'Monitoring' },
    { name: 'Contract Manager', status: 'Managing' },
    { name: 'Logistics Agent', status: 'Optimizing' },
    { name: 'Compliance Agent', status: 'Verifying' },
  ];

  return (
    <div className="text-white" style={{ background: 'var(--green-950)' }}>
      <Navbar />

      {/* Hero */}
      <section className="min-h-screen flex items-center px-8 pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle, #22c55e 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          animation: 'dot-grid 4s ease-in-out infinite',
        }} />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <p className="text-green-400 text-xs font-bold tracking-widest uppercase mb-4">Built for Modern Traders</p>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              The Operating System<br />for <span className="text-green-400">Commodity Trading.</span>
            </h1>
            <p className="text-green-100/70 text-lg leading-relaxed mb-8 max-w-lg">
              Unify every operation. Empower every decision. AI agents working 24/7 to help you trade smarter, manage risk, and grow sustainably.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/auth/signup" className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Start Trading Now →</Link>
              <button className="px-6 py-3 border border-white/30 rounded-lg hover:bg-white/10">▷ Watch Live Demo</button>
            </div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Trusted by 2,500+ Trading Businesses Across India</p>
            <div className="flex gap-6 text-white/30 text-sm font-semibold">
              {['ITC', 'Adani', 'Cargill', 'Olam', 'NCDEX'].map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>
          <HeroMockup />
        </div>

        <div className="absolute bottom-8 left-8 right-8 max-w-5xl mx-auto card p-4 flex flex-wrap items-center gap-4" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">L</div>
            <span className="text-sm">Lucy AI · Your Trading Assistant <span className="text-green-400">● Active</span></span>
          </div>
          <div className="flex-1 flex flex-wrap gap-2 text-[11px]">
            {['MARKET UPDATE: Cotton +3.2% Indore', 'OPPORTUNITY: Shree Cotton Mills', 'PROFIT EST: ₹4.8L'].map((i) => (
              <span key={i} className="px-2 py-1 bg-white/10 rounded">{i}</span>
            ))}
          </div>
          <button className="text-xs text-green-400 font-semibold">View All Insights →</button>
        </div>
      </section>

      {/* Section 2: Market Intelligence */}
      <section className="py-20 px-8" style={{ background: '#FAFAF8', color: 'var(--text-primary)' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-green-600 text-xs font-bold tracking-widest uppercase mb-3">Real-Time Intelligence. Nationwide.</p>
            <h2 className="text-4xl font-bold mb-4">Live Market Intelligence Across Every Mandi.</h2>
            <p className="text-gray-600 mb-8">2,500+ mandis. 28 states. 150+ commodities. Real-time price signals that tell you where to buy, sell, and dispatch next.</p>
            <div className="grid grid-cols-2 gap-4">
              {[{ n: '2,500+', l: 'Mandis' }, { n: '28', l: 'States' }, { n: '150+', l: 'Commodities' }, { n: '1.2Cr+', l: 'Daily Data Points' }].map((s) => (
                <div key={s.l} className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-green-600" />
                  <div><p className="font-bold text-lg">{s.n}</p><p className="text-xs text-gray-500">{s.l}</p></div>
                </div>
              ))}
            </div>
          </div>
          <HeroMockup />
        </div>
        <div className="max-w-4xl mx-auto mt-12 rounded-xl p-6 text-white" style={{ background: 'var(--green-950)' }}>
          <p className="text-sm leading-relaxed mb-4">Cotton arrivals are up 18% in Maharashtra while demand is strong in Gujarat. Prices likely to rise in the next 48 hours.</p>
          <div className="flex flex-wrap gap-2">
            {['18% Increase in Arrivals', 'High Demand Gujarat', '48 hrs Price Rise'].map((c) => (
              <span key={c} className="px-3 py-1 bg-white/10 rounded-full text-xs">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: AI Workforce */}
      <section className="py-20 px-8 bg-white" style={{ color: 'var(--text-primary)' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
          <div>
            <p className="text-green-600 text-xs font-bold tracking-widest uppercase mb-3">AI Agents Working 24/7 For You</p>
            <h2 className="text-4xl font-bold mb-4">An AI Workforce That <span className="text-green-600">Thinks.</span> You <span className="text-green-600">Grow.</span></h2>
            <p className="text-gray-600 mb-6">Six specialized agents monitor markets, manage contracts, optimize logistics, and flag risks — while you focus on trading decisions.</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {['6 AI Agents', '24/7 Operations', '100% Secure', '<2s Response Time'].map((s) => (
                <div key={s} className="p-3 border rounded-lg font-medium">{s}</div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center min-h-[320px]">
            <div className="w-16 h-16 rounded-xl bg-green-600 flex items-center justify-center text-2xl font-bold text-white z-10">N</div>
            {agents.map((a, i) => {
              const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * 140;
              const y = Math.sin(angle) * 100;
              return (
                <div key={a.name} className="absolute text-center" style={{ transform: `translate(${x}px, ${y}px)` }}>
                  <div className="card p-2 text-[10px] w-28 shadow-md">
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-green-600">● {a.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-16 rounded-xl p-8 text-white text-center" style={{ background: 'var(--green-950)' }}>
          <h3 className="text-xl font-bold mb-6">Real Impact. Measurable Results.</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['+18.6% Avg Profit', '-32% Time to Close', '-24% Risk Exposure', '+28% Inventory Turnover'].map((m) => (
              <p key={m} className="text-2xl font-bold text-green-400">{m}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Contracts */}
      <section className="py-20 px-8" style={{ background: '#FAFAF8', color: 'var(--text-primary)' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-green-600 text-xs font-bold tracking-widest uppercase mb-3">Contracts. Automated.</p>
            <h2 className="text-4xl font-bold mb-4">Contracts That Execute. Trust That Scales.</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {['Smart Contract Creation', 'Real-time Tracking', 'Clause-level Visibility', 'Auto Renewals'].map((c) => (
                <span key={c} className="px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full font-medium">{c}</span>
              ))}
            </div>
          </div>
          <div className="card p-4 shadow-lg">
            <p className="text-xs text-gray-500 mb-2">Contracts Overview</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Total: 1,248', 'Active: 892', 'Value: ₹1,342 Cr', 'Expiring: 43'].map((s) => (
                <div key={s} className="bg-gray-50 rounded p-2 text-xs font-semibold">{s}</div>
              ))}
            </div>
            <div className="h-24 bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400">Contract table preview</div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-8 card p-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">L</div>
          <p className="text-sm flex-1">Your contract with Shree Cotton Mills is expiring in 2 days. Would you like me to initiate renewal?</p>
          <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg">Renew Contract</button>
        </div>
      </section>

      {/* Section 5: Meet Lucy */}
      <section className="py-24 px-8" style={{ background: '#FAFAF8', color: 'var(--text-primary)' }}>
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="text-green-600 text-xs font-bold tracking-widest uppercase mb-3">Autonomous Commodity Intelligence</p>
          <h2 className="text-4xl font-bold mb-4">Meet Lucy. The AI Workforce Behind Every Trade.</h2>
          <p className="text-gray-600 text-lg">Most trading software waits for inputs. Lucy takes action.</p>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-4 mb-8">
          {[
            { q: 'Lucy, add 50 quintal potatoes to inventory', r: 'Inventory Updated +50 Quintal Potatoes (82% capacity)' },
            { q: "What are today's prices?", r: 'Indore ₹7,260 · Delhi ₹2,420 · Ahmedabad ₹4,820' },
            { q: 'I received an order for 500q cabbage', r: 'Projected Revenue ₹8.4L · Est. Profit ₹1.6L' },
            { q: 'Find new buyers', r: '3 Potential Buyers Found' },
          ].map((d) => (
            <div key={d.q} className="card p-4 text-sm">
              <p className="text-gray-500 mb-2">"{d.q}"</p>
              <p className="font-semibold text-green-700">{d.r}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {['Voice Native', 'Zero Manual Entry', '24×7 Market Monitoring', 'Autonomous Execution'].map((p) => (
            <span key={p} className="px-4 py-2 border rounded-full text-sm font-medium">{p}</span>
          ))}
        </div>
        <p className="text-center text-2xl font-bold">Stop Managing Software. Start Managing Trade.</p>
      </section>

      {/* Section 6: Why TradeNexus */}
      <section className="py-20 px-8 bg-white" style={{ color: 'var(--text-primary)' }}>
        <div className="max-w-7xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold">Built for Traders. Backed by Intelligence.</h2>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4 mb-12">
          {['AI-Native', 'End-to-End', 'Enterprise Grade', 'Network Effects', 'Real-time Intelligence', 'Human + AI Support'].map((f) => (
            <div key={f} className="card p-4 text-center font-semibold">{f}</div>
          ))}
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-4 gap-4 text-center mb-12">
          {['99.9% Uptime', '2,500+ Businesses', '1.2Cr+ Transactions', '28 States'].map((s) => (
            <div key={s}><p className="font-bold">{s}</p></div>
          ))}
        </div>
        <div className="max-w-3xl mx-auto rounded-xl p-6 text-white" style={{ background: 'var(--green-950)' }}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-green-400 mb-3">TradeNexus</p>
              {['AI-native from day one', 'Real-time mandi data', 'Autonomous agents', 'Multilingual Lucy', 'Network intelligence', 'Adaptive learning', 'Decision support'].map((r) => (
                <p key={r} className="mb-1">✓ {r}</p>
              ))}
            </div>
            <div>
              <p className="font-bold text-red-400 mb-3">Traditional CTRM</p>
              {['Manual data entry', 'Delayed price feeds', 'Static dashboards', 'English only', 'Siloed operations', 'Fixed rules', 'Reporting only'].map((r) => (
                <p key={r} className="mb-1 text-white/60">✗ {r}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Multilingual */}
      <section className="py-20 px-8" style={{ background: '#FAFAF8', color: 'var(--text-primary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Built Multilingual. Made for Bharat.</h2>
          <p className="text-gray-600 mb-8">Lucy understands the way you speak and the way you trade.</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {['English', 'हिंदी', 'मराठी', 'ગુજરાતી', 'ਪੰਜਾਬੀ', '+ More'].map((l) => (
              <span key={l} className="px-5 py-3 card font-medium">{l}</span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {['Local Market Intelligence', 'Regional Customization', 'Local Formats', 'Regulatory Adaptation'].map((c) => (
              <span key={c} className="px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8 text-sm text-white/60">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-md bg-green-600 flex items-center justify-center font-bold text-white">N</div>
              <span className="text-white font-semibold">TradeNexus</span>
            </div>
            <p>India's first AI-native autonomous CTRM platform.</p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Product</p>
            {['Dashboard', 'Markets', 'Risk', 'Lucy AI'].map((l) => <p key={l} className="mb-1">{l}</p>)}
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Technology</p>
            <p>Adaption</p><p>NVIDIA</p><p>data.gov.in</p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Company</p>
            <p>AI Agents Hackathon 2026</p><p>Team Luna</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
