import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      setAuthenticated: (v) => set({ isAuthenticated: v }),
      demoUser: { name: 'Ramesh Patil', email: 'ramesh@demo.in', region: 'Vidarbha' },
      language: 'en',
      setLanguage: (l) => set({ language: l }),
    }),
    { name: 'tn-app', partialize: (s) => ({ isAuthenticated: s.isAuthenticated, language: s.language }) }
  )
);
