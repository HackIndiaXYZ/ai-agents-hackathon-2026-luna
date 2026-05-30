import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Compass, Eye, EyeOff, ShieldCheck, Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const { setAuthenticated } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setAuthenticated(true);
      setLoading(false);
      toast.success('Successfully signed in as Ramesh Patil (Demo Mode)');
      navigate('/app/dashboard');
    }, 800);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Left Pane — Branding and Quote */}
      <div 
        className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-12 text-white relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--brand-green-dark) 0%, var(--brand-green) 100%)' }}
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay" />
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="p-2 rounded-xl bg-white/10 border border-white/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight font-display">
            TradeNexus
          </span>
        </div>

        {/* Quote Block */}
        <div className="my-auto space-y-4 max-w-md relative z-10 py-12 md:py-0">
          <blockquote className="text-2xl sm:text-3xl font-bold font-display leading-tight">
            "₹6,820/quintal in Nagpur. I knew before anyone else."
          </blockquote>
          <cite className="block text-sm not-italic font-semibold text-emerald-100">
            — Ramesh P., Cotton Trader, Vidarbha
          </cite>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>APMC Approved</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100">
            <Zap className="w-4 h-4 shrink-0" />
            <span>Sub-100ms Cascade</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100">
            <Globe className="w-4 h-4 shrink-0" />
            <span>242 Languages</span>
          </div>
        </div>
      </div>

      {/* Right Pane — Sign In Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Sign in to your TradeNexus account
            </p>
          </div>

          {/* Demo Note Badge */}
          <div className="p-3.5 bg-slate-50 border rounded-xl flex items-start gap-2.5" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 mt-0.5 shrink-0 select-none">
              DEMO
            </span>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Enter any credentials (email / password) to bypass security and launch the portal dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {/* Email Address */}
              <motion.div variants={fieldVariants} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="ramesh@demo.com"
                  className="w-full px-3.5 py-2.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-slate-800"
                  style={{ borderColor: 'var(--border)' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>

              {/* Password */}
              <motion.div variants={fieldVariants} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-slate-800"
                    style={{ borderColor: 'var(--border)' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            </motion.div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-3 text-sm font-bold"
            >
              Sign In
            </Button>
          </form>

          {/* Registration link */}
          <div className="text-center text-xs text-slate-400 font-semibold pt-2">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-emerald-600 hover:text-emerald-700 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
