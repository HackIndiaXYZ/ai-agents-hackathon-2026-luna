import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { useTraderProfileStore } from '../../store/traderProfileStore';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { profile, updateProfile } = useTraderProfileStore();
  const { language, setLanguage } = useAppStore();
  const [form, setForm] = useState({ ...profile });

  const save = () => {
    updateProfile(form);
    toast.success('Profile saved');
  };

  const useGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setForm({ ...form, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error('Could not get location')
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" subtitle="Trader profile, location, and preferences" />

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Trader Profile</h3>
        {['name', 'email', 'phone', 'company', 'city', 'state', 'region'].map((field) => (
          <div key={field}>
            <label className="text-sm font-medium capitalize">{field}</label>
            <input
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Latitude</label>
            <input type="number" value={form.lat} onChange={(e) => setForm({ ...form, lat: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Longitude</label>
            <input type="number" value={form.lng} onChange={(e) => setForm({ ...form, lng: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <button onClick={useGPS} className="text-sm text-green-600 font-medium">Use Current Location</button>
        <button onClick={save} className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg">Save Profile</button>
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold">Preferences</h3>
        <div>
          <label className="text-sm font-medium">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Primary Commodities</label>
          <p className="text-sm text-gray-500 mt-1">{form.commodities?.join(', ')}</p>
        </div>
      </div>
    </div>
  );
}
