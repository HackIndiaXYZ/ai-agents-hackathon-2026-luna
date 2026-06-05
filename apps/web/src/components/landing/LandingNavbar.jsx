import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Calendar, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import TradeNexusLogo from './TradeNexusLogo';

const NAV = [
  { label: 'Product', href: '#market-intelligence' },
  { label: 'Solutions', href: '#why-tradenexus' },
  { label: 'AI Agents', href: '#ai-agents' },
  { label: 'Resources', href: '#intelligence' },
  { label: 'Pricing', href: '#cta' },
  { label: 'Company', href: '#cta' },
];

export const LandingNavbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onDark = !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        onDark ? 'bg-[#030712]/80 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between gap-4">
        <Link to="/">
          <TradeNexusLogo dark={onDark} />
        </Link>

        <nav className={`hidden xl:flex items-center gap-6 text-sm font-medium ${onDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-0.5 hover:text-emerald-500 transition-colors"
            >
              {item.label}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/app/dashboard">
            <Button
              variant="secondary"
              size="sm"
              className={onDark ? '!bg-transparent !text-slate-200 !border-white/20 hover:!bg-white/5' : ''}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Book a Demo
            </Button>
          </Link>
          <Link to="/auth/signup">
            <Button variant="primary" size="sm">
              Get Started Free <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
