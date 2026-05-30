import React, { useState } from 'react';
import { useStore } from '../store';

// UI components
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

import {
  User,
  Bell,
  Globe,
  Info,
  CheckCircle,
  Link as LinkIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings = () => {
  const { demoUser } = useStore();

  const [notifSpikes, setNotifSpikes] = useState(true);
  const [notifDelays, setNotifDelays] = useState(true);
  const [notifOpps, setNotifOpps] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState('quintal');
  const [selectedLang, setSelectedLang] = useState('en');

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-700">
      
      {/* PageHeader */}
      <PageHeader 
        title="Settings" 
        subtitle="Manage your profile configurations, alert thresholds, and defaults."
        actions={
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Main Configuration Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PROFILE SECTION */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Profile Details
                </h3>
              </div>
              <Badge variant="neutral">Demo Mode</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-1">
                <span className="text-slate-400">Full Name</span>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none"
                  value={demoUser.name}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">Email Address</span>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none"
                  value={demoUser.email}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">Default Region</span>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none"
                  value={demoUser.region}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">Default Language</span>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed focus:outline-none"
                  value={demoUser.language === 'en' ? 'English (en)' : 'Hindi (hi)'}
                  disabled
                />
              </div>
            </div>
          </Card>

          {/* NOTIFICATION PREFERENCES */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <Bell className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                Notification Thresholds
              </h3>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              {[
                { label: "Price spike alerts", desc: "Notify when mandi prices deviate 1.5σ from baseline", state: notifSpikes, set: setNotifSpikes },
                { label: "Route delay warnings", desc: "Alert when logistics corridors report bottleneck terminal delays", state: notifDelays, set: setNotifDelays },
                { label: "New trade opportunities", desc: "Notify when cargo return load listings are posted", state: notifOpps, set: setNotifOpps },
                { label: "Weekly market digest", desc: "Email summary of weekly trends and anomaly metrics", state: notifDigest, set: setNotifDigest }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-slate-800 font-bold block">{item.label}</span>
                    <p className="text-slate-400 font-medium">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4.5 h-4.5 accent-emerald-600 cursor-pointer rounded"
                    checked={item.state}
                    onChange={(e) => item.set(e.target.checked)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* LANGUAGE & REGION */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <Globe className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                Language & Weight Settings
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <span className="text-slate-400">Language Preference</span>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400">Default Commodity Unit</span>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ borderColor: 'var(--border)' }}
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="quintal">Quintal (100 kg)</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="tonne">Metric Tonne (1000 kg)</option>
                </select>
              </div>
            </div>
          </Card>

        </div>

        {/* Column 3: Hackathon / Metadata Info */}
        <div className="space-y-6">
          <Card className="p-5 bg-slate-50 border space-y-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                About This Application
              </h3>
            </div>
            
            <div className="space-y-3 text-xs leading-relaxed text-slate-500 font-semibold">
              <p>
                TradeNexus was designed and engineered for the <strong>AI Agents Hackathon 2026</strong>.
              </p>
              
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Key Specifications</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Adaptive Data Track Integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>NVIDIA model complete fallback loop</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Google Routes telemetry integration</span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Project Repository Links</span>
                <a href="#" className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
                <a href="#" className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>HuggingFace Dataset page</span>
                </a>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};

export default Settings;
