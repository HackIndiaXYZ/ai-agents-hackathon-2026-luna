import { lucyChat } from './api';
import { demoCounterparties, demoMandiPrices, demoPriceHistory, demoMacroSignals, demoContracts } from '../data/demo';
import { useInventoryStore } from '../store/inventoryStore';
import { useContractStore } from '../store/contractStore';
import { inr } from './utils';

const NEARBY_STATES = ['Maharashtra', 'MP', 'Gujarat', 'Telangana'];

function isHindi(text) {
  return /[\u0900-\u097F]/.test(text) || /\b(kya|hai|ka|ke|ki|kar|de|batao|dhundo|khareedna|mera|kapas|quintal)\b/i.test(text);
}

function runSteps(steps, setSteps) {
  return new Promise((resolve) => {
    let i = 0;
    const show = () => {
      if (i < steps.length) {
        setSteps(steps.slice(0, i + 1));
        i++;
        setTimeout(show, 300 + Math.random() * 200);
      } else resolve();
    };
    show();
  });
}

export async function processLucyMessage(message, { sessionId, setSteps, navigate }) {
  const lower = message.toLowerCase();
  const hindi = isHindi(message);

  const defaultSteps = [
    { label: 'Speech recognized', status: 'done', ms: 42 },
    { label: 'Commodity Intelligence', status: 'done', detail: 'Parsing intent', ms: 89 },
    { label: 'Market Intelligence', status: 'done', detail: '37 mandis analyzed', ms: 156 },
    { label: 'Trade Advisor Agent', status: 'done', detail: 'Generating recommendation', ms: 312 },
  ];

  await runSteps(defaultSteps, setSteps);

  try {
    const res = await lucyChat(message, sessionId);
    if (res.data && !res._demo) {
      return { text: res.data.response || res.data.message, cards: res.data.cards, actions: res.data.actions };
    }
  } catch { /* fallback */ }

  // Local intent handlers
  if (/good morning|hi lucy|hello lucy|namaste/i.test(lower)) {
    const summary = useInventoryStore.getState().getSummary();
    return {
      text: hindi
        ? `नमस्ते Ramesh! आपका inventory: ${summary}. मैं आपकी कैसे मदद कर सकती हूँ?`
        : `Good morning, Ramesh! Your inventory: ${summary}. How can I help you trade smarter today?`,
    };
  }

  if (/kapas|cotton.*add|add.*cotton|quintal.*add/i.test(lower) && /add|kar de|jodo/i.test(lower)) {
    const match = lower.match(/(\d+)\s*(quintal|qtl|q)/i);
    const qty = match ? parseInt(match[1], 10) : 50;
    useInventoryStore.getState().updateItem('Cotton', qty, 'add');
    const item = useInventoryStore.getState().items.find((i) => i.commodity === 'Cotton');
    return {
      text: hindi
        ? `Cotton inventory अपडेट: ${item.qty - qty}q → ${item.qty}q`
        : `Cotton inventory updated: ${item.qty - qty}q → ${item.qty}q`,
      toast: 'Inventory updated',
    };
  }

  if (/p&l|pnl|profit|loss/i.test(lower) && /mera|my|today|aaj/i.test(lower)) {
    const total = demoContracts.reduce((s, c) => s + c.pnl, 0);
    return {
      text: hindi ? 'आपका आज का P&L सारांश:' : "Here's your P&L summary:",
      cards: [{
        type: 'pnl',
        mtm: -713450,
        today: -1733450,
        total,
        worst: demoContracts.sort((a, b) => a.pnl - b.pnl)[0],
      }],
    };
  }

  if (/forecast|cotton.*price|price.*cotton|ka forecast/i.test(lower)) {
    return {
      text: hindi ? 'Cotton का 7-दिन का forecast:' : 'Cotton 7-day price forecast:',
      cards: [{ type: 'forecast', data: demoPriceHistory.Cotton }],
    };
  }

  if (/buyer|buyers|dhundo|find.*counterpart/i.test(lower)) {
    const buyers = [...demoCounterparties.filter((c) => c.type === 'buyer' || c.type === 'both')]
      .filter((c) => NEARBY_STATES.includes(c.state));
    navigate?.('/app/counterparties');
    return {
      text: hindi
        ? `Nagpur के पास ${buyers.length} cotton buyers मिले:`
        : `Found ${buyers.length} cotton buyers near Nagpur:`,
      cards: [{ type: 'buyers', items: buyers.slice(0, 4) }],
      actions: [{ label: 'View Counterparties', path: '/app/counterparties' }],
    };
  }

  if (/best mandi|mandi.*cotton/i.test(lower)) {
    const top = [...demoMandiPrices].filter((m) => m.commodity === 'Cotton').sort((a, b) => b.modal - a.modal).slice(0, 3);
    return {
      text: hindi ? 'Cotton के लिए top mandis:' : 'Top mandis for Cotton today:',
      cards: [{ type: 'mandis', items: top }],
    };
  }

  if (/khareedna|buy.*from|purchase/i.test(lower)) {
    const qtyMatch = lower.match(/(\d+)\s*(quintal|qtl|q)/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 40;
    const draft = {
      type: 'BUY', commodity: 'Cotton', qty, unit: 'qtl', contractPrice: 6820,
      marketPrice: 7018, status: 'DRAFT', counterparty: 'Ramesh Farm Collective',
      location: 'Amravati', deliveryDate: '2026-06-15',
    };
    useContractStore.getState().addContract(draft);
    navigate?.('/app/contracts/new');
    return {
      text: hindi ? `${qty} quintal Cotton का contract draft तैयार:` : `Contract draft created for ${qty}q Cotton:`,
      cards: [{ type: 'contract', contract: draft }],
      actions: [{ label: 'Confirm Contract', path: '/app/contracts/new' }],
      prefill: draft,
    };
  }

  if (/risk|exposure/i.test(lower)) {
    return {
      text: hindi ? 'Portfolio risk सारांश:' : 'Portfolio risk summary:',
      cards: [{
        type: 'risk',
        concentration: 'Chickpea 35.6%',
        mtm: -713450,
        alerts: 4,
      }],
    };
  }

  if (/going up|price.*up|badhao/i.test(lower) && /cotton/i.test(lower)) {
    const signal = demoMacroSignals.find((s) => s.commodity === 'Cotton');
    return {
      text: hindi
        ? `Cotton bullish है — ${signal?.keySignal}`
        : `Cotton outlook is bullish. ${signal?.keySignal} 7-day forecast: +4.8%.`,
      cards: [{ type: 'forecast', data: demoPriceHistory.Cotton }],
    };
  }

  if (/dispatch|bhejo|schedule/i.test(lower)) {
    navigate?.('/app/dispatch');
    return {
      text: hindi ? 'Dispatch form तैयार — Nagpur के लिए कल:' : 'Dispatch scheduled for Nagpur tomorrow:',
      cards: [{ type: 'dispatch', origin: 'Amravati', destination: 'Nagpur', eta: '2026-06-07' }],
      actions: [{ label: 'Open Dispatch', path: '/app/dispatch' }],
      prefill: { origin: 'Amravati', destination: 'Nagpur', date: '2026-06-07' },
    };
  }

  return {
    text: hindi
      ? 'मैं समझ गई। आप contracts, markets, risk, या inventory के बारे में पूछ सकते हैं।'
      : "I can help with P&L, mandi prices, forecasts, counterparties, contracts, and dispatches. What would you like to know?",
  };
}
