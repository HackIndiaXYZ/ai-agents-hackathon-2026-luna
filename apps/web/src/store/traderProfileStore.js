import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTraderProfileStore = create(
  persist(
    (set) => ({
      profile: {
        name: 'Ramesh Patil',
        email: 'ramesh@demo.in',
        phone: '+91 98765 43210',
        company: 'Ramesh Cotton Traders',
        city: 'Amravati',
        state: 'Maharashtra',
        region: 'Vidarbha',
        lat: 20.93,
        lng: 77.75,
        commodities: ['Cotton', 'Soybean'],
        creditLimit: 25000000,
      },
      updateProfile: (updates) => set((s) => ({ profile: { ...s.profile, ...updates } })),
    }),
    { name: 'tn-trader-profile' }
  )
);
