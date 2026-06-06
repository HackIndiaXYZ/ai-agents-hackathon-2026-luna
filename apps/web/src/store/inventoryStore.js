import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoInventory } from '../data/demo';

export const useInventoryStore = create(
  persist(
    (set, get) => ({
      items: demoInventory,
      changes: [],
      updateItem: (commodity, qtyDelta, operation = 'add') => {
        set((s) => {
          const items = [...s.items];
          const idx = items.findIndex((i) => i.commodity.toLowerCase() === commodity.toLowerCase());
          if (idx >= 0) {
            const cur = items[idx];
            let newQty = cur.qty;
            if (operation === 'add') newQty += qtyDelta;
            else if (operation === 'subtract') newQty -= qtyDelta;
            else newQty = qtyDelta;
            items[idx] = { ...cur, qty: Math.max(0, newQty), updatedAt: new Date().toISOString() };
          } else if (operation === 'add') {
            items.push({ commodity, qty: qtyDelta, unit: 'qtl', marketPrice: 5000, updatedAt: new Date().toISOString() });
          }
          const change = { text: `${commodity} ${operation === 'subtract' ? '-' : '+'}${qtyDelta} qtl via Lucy`, time: 'Just now' };
          return { items, changes: [change, ...s.changes] };
        });
      },
      getTotal: () => get().items.reduce((sum, i) => sum + i.qty * i.marketPrice, 0),
      getSummary: () => get().items.map((i) => `${i.commodity} ${i.qty}q`).join(' · '),
    }),
    { name: 'tn-inventory' }
  )
);
