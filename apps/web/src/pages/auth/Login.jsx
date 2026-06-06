import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      setAuthenticated(true);
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: 'linear-gradient(135deg, #0D1F0D 0%, #14532d 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center font-bold">N</div>
          <span className="text-xl font-semibold">TradeNexus</span>
        </div>
        <blockquote className="text-2xl font-medium leading-relaxed max-w-md">
          "₹6,820/quintal in Nagpur. I knew before anyone else."
          <footer className="text-green-300 text-base mt-4 not-italic">— Ramesh P., Cotton Trader, Vidarbha</footer>
        </blockquote>
        <div className="flex flex-wrap gap-4 text-sm text-green-200/80">
          <span>Trusted by 2,500+ traders</span>
          <span>·</span>
          <span>Real-time mandi data</span>
          <span>·</span>
          <span>AI-powered insights</span>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your trading workspace</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full mt-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500/30 outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500/30 outline-none" />
          </div>
          <button type="submit" className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Sign In</button>
          <p className="text-center text-sm text-gray-500">
            No account? <Link to="/auth/signup" className="text-green-600 font-medium">Create one</Link>
          </p>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
            Demo Mode: enter any credentials to continue
          </div>
        </form>
      </div>
    </div>
  );
}
