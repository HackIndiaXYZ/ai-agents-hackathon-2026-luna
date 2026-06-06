import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoContracts } from '../data/demo';

export const useContractStore = create(
  persist(
    (set) => ({
      contracts: demoContracts,
      addContract: (c) => set((s) => ({ contracts: [{ ...c, id: c.id || `TN-2026-${String(s.contracts.length + 1).padStart(4, '0')}` }, ...s.contracts] })),
      updateContract: (id, updates) =>
        set((s) => ({
          contracts: s.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
    }),
    { name: 'tn-contracts' }
  )
);
