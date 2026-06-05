import axios from 'axios';
import { useStore } from '../store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 35000, // 35 seconds to accommodate cold start loading of multi-lingual embedder
});

// Request interceptor to trigger global loading spinner
api.interceptors.request.use(
  (config) => {
    useStore.getState().setIsLoading(true);
    return config;
  },
  (error) => {
    useStore.getState().setIsLoading(false);
    return Promise.reject(error);
  }
);

// Response interceptor to release global loading spinner
api.interceptors.response.use(
  (response) => {
    useStore.getState().setIsLoading(false);
    return response;
  },
  (error) => {
    useStore.getState().setIsLoading(false);
    return Promise.reject(error);
  }
);

// Named exports for all API client hooks

export const getRecommendation = async (commodity, origin, quantity = null) => {
  const params = { commodity, origin };
  if (quantity !== null && quantity !== undefined && quantity !== '') {
    params.quantity = quantity;
  }
  const response = await api.get('/api/v1/advisor/recommend', { params });
  return response.data;
};

export const scoreCorridor = async (origin, destination) => {
  const response = await api.get('/api/v1/dispatch/score', {
    params: { origin, destination }
  });
  return response.data;
};

export const getOpportunities = async () => {
  const response = await api.get('/api/v1/opportunity');
  return response.data;
};

export const postOpportunity = async (opportunityData) => {
  const response = await api.post('/api/v1/opportunity', opportunityData);
  return response.data;
};

export const getMarketPrices = async (commodity, state = '') => {
  const params = { commodity };
  if (state) {
    params.state = state;
  }
  const response = await api.get('/api/v1/market/prices', { params });
  return response.data;
};

export const getMarketCommodities = async () => {
  const response = await api.get('/api/v1/market/commodities');
  return response.data;
};

export const getLearningStats = async () => {
  const response = await api.get('/api/v1/feedback/stats');
  return response.data;
};

export const getLearningCorpus = async (params = {}) => {
  const response = await api.get('/api/v1/learning/corpus', { params });
  return response.data;
};

export const getLearningCorpusStats = async () => {
  const response = await api.get('/api/v1/learning/corpus/stats');
  return response.data;
};

export const getLearningAliases = async (params = {}) => {
  const response = await api.get('/api/v1/learning/aliases', { params });
  return response.data;
};

export const getLearningCorrections = async () => {
  const response = await api.get('/api/v1/learning/corrections');
  return response.data;
};

export const getLearningPipeline = async () => {
  const response = await api.get('/api/v1/learning/pipeline');
  return response.data;
};

export const postCorrection = async (originalText, correctedCanonical, language = 'en') => {
  const response = await api.post('/api/v1/feedback/correction', {
    original_text: originalText,
    corrected_canonical: correctedCanonical,
    language
  });
  return response.data;
};

export const postAlertFeedback = async (alertId, isPositive) => {
  const response = await api.post('/api/v1/feedback/alert', {
    alert_id: alertId,
    is_positive: isPositive
  });
  return response.data;
};

export const getModelInfo = async (commodity) => {
  const response = await api.get(`/api/v1/risk/model-info/${commodity}`);
  return response.data;
};

export const getDataQuality = async () => {
  const response = await api.get('/api/v1/risk/data-quality');
  return response.data;
};

// --- CTRM Rebuild Additions ---
import * as demo from '../data/demo';

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_API_KEY || 'tradenexus_internal_secret';

/** Unwrap list payloads that may be a raw array or `{ key: [...] }`. */
const unwrapList = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
};

/** Normalize contract rows for UI field names used across pages. */
const normalizeContract = (row) => {
  if (!row) return row;
  const pnl = row.latest_pnl || {};
  return {
    ...row,
    commodity: row.commodity || row.commodity_name || 'Unknown',
    contract_price: row.contract_price ?? row.price_per_unit ?? 0,
    market_price: row.market_price ?? pnl.market_price ?? row.contract_price ?? row.price_per_unit ?? 0,
    unrealized_pnl: row.unrealized_pnl ?? pnl.unrealized_pnl ?? 0,
    contract_number: row.contract_number || row.id,
  };
};

/** Normalize dispatch rows for the dispatch table UI. */
const normalizeDispatch = (row) => ({
  ...row,
  id: row.id || row.dispatch_number,
  driver_phone: row.driver_phone || row.driver_contact,
  commodity: row.commodity || row.contract_commodity,
});

export const getPortfolioSummary = async () => {
  try {
    const response = await api.get('/api/v1/risk/portfolio');
    return response.data;
  } catch (error) {
    console.warn("Using demo portfolio summary:", error);
    return demo.demoPortfolioSummary;
  }
};

export const getMtmList = async () => {
  try {
    const response = await api.get('/api/v1/risk/mtm');
    const rows = unwrapList(response.data, ['contracts', 'mtm', 'data']);
    return rows.map(normalizeContract);
  } catch (error) {
    console.warn("Using demo MTM rows:", error);
    return demo.demoMtmRows;
  }
};

export const recalculateMtm = async () => {
  const response = await api.post('/api/v1/risk/recalculate', null, {
    headers: { 'X-Internal-Key': INTERNAL_KEY }
  });
  return response.data;
};

export const getRiskAlerts = async () => {
  try {
    const [riskRes, marketRes] = await Promise.all([
      api.get('/api/v1/risk/alerts').catch(() => ({ data: { alerts: [] } })),
      api.get('/api/v1/market/alerts').catch(() => ({ data: { alerts: [] } }))
    ]);
    const riskAlerts = unwrapList(riskRes.data, ['alerts', 'data']);
    const marketAlerts = unwrapList(marketRes.data, ['alerts', 'data']);
    const combined = [...riskAlerts, ...marketAlerts];
    return combined.length > 0 ? combined : demo.demoAlerts;
  } catch (error) {
    console.warn("Using demo alerts:", error);
    return demo.demoAlerts;
  }
};

export const getMarketAlerts = async () => {
  try {
    const response = await api.get('/api/v1/market/alerts');
    return unwrapList(response.data, ['alerts', 'data']);
  } catch (error) {
    console.warn('Market alerts endpoint unavailable:', error);
    return demo.demoAlerts;
  }
};

export const getAgentActivity = async () => {
  try {
    const response = await api.get('/api/v1/risk/activity');
    return unwrapList(response.data, ['activity_log', 'activity', 'data']);
  } catch (error) {
    console.warn("Using demo agent activity:", error);
    return demo.demoAgentActivity;
  }
};

export const getMacroSignals = async () => {
  try {
    const response = await api.get('/api/v1/risk/signals');
    const signals = unwrapList(response.data, ['signals', 'data']);
    return signals.map((s) => ({
      ...s,
      commodity: s.commodity || s.commodity_name,
      key_signal: s.key_signal || s.message || s.description,
    }));
  } catch (error) {
    console.warn("Using demo macro signals:", error);
    return demo.demoMacroSignals;
  }
};

export const getContracts = async (filters = {}) => {
  try {
    const response = await api.get('/api/v1/contracts', { params: filters });
    const rows = unwrapList(response.data, ['contracts', 'data']);
    return rows.map(normalizeContract);
  } catch (error) {
    console.warn("Using demo contracts:", error);
    let filtered = [...demo.demoContracts];
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    if (filters.commodity && filters.commodity !== '') {
      filtered = filtered.filter(c => c.commodity.toLowerCase() === filters.commodity.toLowerCase());
    }
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(c => c.type.toLowerCase() === filters.type.toLowerCase());
    }
    return filtered;
  }
};

export const getContract = async (id) => {
  try {
    const response = await api.get(`/api/v1/contracts/${id}`);
    const detail = response.data?.contract || response.data;
    return normalizeContract(detail);
  } catch (error) {
    console.warn(`Using demo contract details for ${id}:`, error);
    return demo.demoContracts.find(c => c.id === id) || demo.demoContracts[0];
  }
};

export const createContract = async (contractData) => {
  // Let it call POST /api/v1/contracts. Fallback returns mock created contract
  try {
    const payload = {
      ...contractData,
      type: String(contractData.type || 'buy').toLowerCase(),
      price_per_unit: contractData.price_per_unit ?? contractData.price ?? contractData.contract_price,
      price_type: contractData.price_type || 'fixed',
    };
    delete payload.price;
    delete payload.contract_price;
    delete payload.counterparty_name;

    const response = await api.post('/api/v1/contracts', payload);
    const created = response.data?.contract || response.data;
    return normalizeContract(created);
  } catch (error) {
    console.warn("Mocking contract creation:", error);
    const newId = `CTR-2026-0${demo.demoContracts.length + 1}`;
    const newContract = {
      id: newId,
      contract_number: newId,
      contract_date: new Date().toISOString().split('T')[0],
      type: contractData.type || 'BUY',
      commodity: contractData.commodity || 'Cotton',
      counterparty_id: contractData.counterparty_id || 'cp1',
      counterparty_name: contractData.counterparty_name || 'Ramesh Cotton Traders',
      quantity: Number(contractData.quantity) || 10,
      unit: contractData.unit || 'quintal',
      contract_price: Number(contractData.price) || 5000,
      market_price: Number(contractData.price) || 5000,
      unrealized_pnl: 0,
      status: 'confirmed',
      delivery_date: contractData.delivery_date || new Date().toISOString().split('T')[0],
      delivery_location: contractData.delivery_location || 'Nagpur Mandi',
      notes: contractData.notes || '',
      history_7d: [5000, 5000, 5000, 5000, 5000, 5000, 5000],
      lifecycle: ['draft', 'confirmed'],
      dispatches: [],
      quality_lot: null
    };
    demo.demoContracts.unshift(newContract); // Add to demo contracts list
    return newContract;
  }
};

export const updateContractStatus = async (id, status) => {
  try {
    const response = await api.patch(`/api/v1/contracts/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.warn(`Mocking status transition for ${id} to ${status}:`, error);
    const contract = demo.demoContracts.find(c => c.id === id);
    if (contract) {
      contract.status = status;
      if (!contract.lifecycle.includes(status)) {
        contract.lifecycle.push(status);
      }
    }
    return contract;
  }
};

export const getDispatches = async () => {
  try {
    const response = await api.get('/api/v1/dispatches');
    const rows = unwrapList(response.data, ['dispatches', 'data']);
    return rows.map(normalizeDispatch);
  } catch (error) {
    console.warn("Using demo dispatches:", error);
    return demo.demoDispatches;
  }
};

export const getMonitoredCorridors = async () => {
  try {
    const dispatches = await getDispatches();
    const seen = new Set();
    const corridors = [];

    for (const d of dispatches) {
      const origin = d.origin || d.corridor_origin;
      const destination = d.destination || d.corridor_destination;
      if (!origin || !destination) continue;
      const key = `${origin}|${destination}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let score = null;
      try {
        score = await scoreCorridor(origin, destination);
      } catch (e) {
        console.warn(`Corridor score unavailable for ${origin}→${destination}:`, e);
      }

      corridors.push({
        origin,
        destination,
        distance_km: score?.distance_km ?? 500,
        typical_duration_hours: score?.estimated_hours ?? score?.typical_hours ?? 10,
        reliability_score: score?.confidence_score ?? d.corridor_reliability ?? 0.75,
        delay_risk: score?.delay_risk ?? 'low',
      });
    }

    if (corridors.length > 0) return corridors;
    console.warn('No live corridors from dispatches; using demo corridor seed data.');
    return demo.demoCorridors;
  } catch (error) {
    console.warn('Using demo corridors:', error);
    return demo.demoCorridors;
  }
};

export const parseFieldNote = async (rawText) => {
  try {
    const response = await api.post('/api/v1/compliance/parse-note', {
      raw_text: rawText,
      language: 'auto'
    });
    return response.data;
  } catch (error) {
    console.warn("Mocking field note parse:", error);
    // Simple heuristic parser for demo fallback
    const text = rawText.toLowerCase();
    let type = 'BUY';
    if (text.includes('becha') || text.includes('diya') || text.includes('sell') || text.includes('sold')) {
      type = 'SELL';
    }
    let commodity = 'Cotton';
    if (text.includes('kapas') || text.includes('cotton')) commodity = 'Cotton';
    else if (text.includes('soyabean') || text.includes('soybean')) commodity = 'Soybean';
    else if (text.includes('pyaz') || text.includes('onion')) commodity = 'Onion';
    else if (text.includes('wheat') || text.includes('gehun')) commodity = 'Wheat';

    let quantity = 50;
    const qtyMatch = text.match(/(\d+)\s*(quintal|bags|quintals|ton|tons|kilo|kg)/);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1]);
    } else {
      const numMatch = text.match(/(\d+)/);
      if (numMatch) quantity = parseInt(numMatch[1]);
    }

    let price = 6400;
    const priceMatch = text.match(/(\d+)\s*(rupaye|rs|inr|rupya)/);
    if (priceMatch) {
      price = parseInt(priceMatch[1]);
    } else {
      // Find a larger number for price if it exists
      const numbers = text.match(/\b\d{4,5}\b/g);
      if (numbers) price = parseInt(numbers[0]);
    }

    return {
      success: true,
      action: type.toLowerCase(),
      commodity,
      quantity,
      price,
      counterparty: 'Ramesh Cotton Traders',
      confidence: 0.85,
      raw_text: rawText
    };
  }
};

export const getInvoice = async (contractId) => {
  try {
    const response = await api.get(`/api/v1/compliance/invoice/${contractId}`);
    return response.data;
  } catch (error) {
    console.warn(`Mocking invoice for ${contractId}:`, error);
    const contract = demo.demoContracts.find(c => c.id === contractId) || demo.demoContracts[0];
    const taxableValue = contract.quantity * contract.contract_price;
    const isLocal = true; // Assume SGST/CGST for demo
    const cgst = isLocal ? taxableValue * 0.09 : 0;
    const sgst = isLocal ? taxableValue * 0.09 : 0;
    const igst = !isLocal ? taxableValue * 0.18 : 0;
    const totalTax = cgst + sgst + igst;
    const totalVal = taxableValue + totalTax;

    return {
      contract_id: contractId,
      invoice_number: `INV-2026-${contractId.split('-')[2] || '000'}`,
      date: new Date().toISOString().split('T')[0],
      taxable_value: taxableValue,
      cgst_rate: 9,
      cgst_amount: cgst,
      sgst_rate: 9,
      sgst_amount: sgst,
      igst_rate: 18,
      igst_amount: igst,
      total_tax: totalTax,
      total_value: totalVal
    };
  }
};

export const getForecast = async (commodityId) => {
  try {
    const response = await api.get(`/api/v1/risk/forecast/${commodityId}`);
    return response.data;
  } catch (error) {
    console.warn(`Mocking forecast for ${commodityId}:`, error);
    // Simple forecast fallback
    return {
      commodity_id: commodityId,
      current_price: 6420,
      forecast_7d: 6680,
      growth_pct: 4.15,
      confidence: 88,
      history: [6350, 6380, 6400, 6420, 6450, 6520, 6680],
      message: "Based on LSTM model trained on 180 days of AGMARKNET data"
    };
  }
};

export const getCounterparties = async () => {
  try {
    const response = await api.get('/api/v1/counterparties');
    return unwrapList(response.data, ['counterparties', 'data']);
  } catch (error) {
    console.warn("Using demo counterparties:", error);
    return demo.demoCounterparties;
  }
};

export const getCounterpartyRisk = async (id) => {
  try {
    const response = await api.get(`/api/v1/risk/counterparty-risk/${id}`);
    return response.data;
  } catch (error) {
    console.warn(`Using demo counterparty risk for ${id}:`, error);
    const cp = demo.demoCounterparties.find(c => c.id === id) || demo.demoCounterparties[0];
    return cp;
  }
};

export const getWeatherForecast = async (region) => {
  try {
    const response = await api.get(`/api/v1/risk/weather/${region}`);
    return response.data;
  } catch (error) {
    console.warn(`Using demo weather forecast for ${region}:`, error);
    const key = String(region).toLowerCase().trim();
    return demo.demoWeatherForecasts[key] || {
      region,
      risk_level: "none",
      description: "Clear weather, normal conditions.",
      forecast: [
        { date: "04 Jun", day: "Thu", temp: "32°C", condition: "Clear", risk: "none", pop: "5%" },
        { date: "05 Jun", day: "Fri", temp: "33°C", condition: "Clear", risk: "none", pop: "5%" },
        { date: "06 Jun", day: "Sat", temp: "34°C", condition: "Clear", risk: "none", pop: "5%" },
        { date: "07 Jun", day: "Sun", temp: "34°C", condition: "Clear", risk: "none", pop: "5%" },
        { date: "08 Jun", day: "Mon", temp: "35°C", condition: "Clear", risk: "none", pop: "5%" }
      ]
    };
  }
};

const normalizeWeatherSignal = (row) => {
  if (!row || typeof row !== 'object') return null;
  if (row.region && row.description) return row;
  return {
    id: row.id,
    region: row.region || row.commodity_name || 'Corridor',
    risk_level: row.risk_level || (row.urgency === 'immediate' ? 'high' : 'low'),
    description: row.description || row.key_signal || 'Weather risk signal',
    affected_dispatches_count: row.affected_dispatches_count ?? row.affected_contracts ?? 0,
    forecast: row.forecast || row.raw_data?.forecast || [],
  };
};

export const getWeatherSignals = async () => {
  try {
    const response = await api.get('/api/v1/risk/signals', {
      params: { signal_type: 'weather_risk' },
    });
    const rows = unwrapList(response.data, ['signals', 'data']);
    const normalized = rows.map(normalizeWeatherSignal).filter(Boolean);
    return normalized.length > 0 ? normalized : demo.demoWeatherSignals;
  } catch (error) {
    console.warn("Using demo weather signals:", error);
    return demo.demoWeatherSignals;
  }
};

export const getInventory = async () => {
  try {
    const response = await api.get('/api/v1/inventory');
    return response.data;
  } catch (error) {
    console.warn("Using demo inventory:", error);
    return demo.demoInventory;
  }
};

export const updateInventory = async (data) => {
  try {
    const response = await api.post('/api/v1/inventory', data);
    return response.data;
  } catch (error) {
    console.warn("Using mock inventory update:", error);
    const { commodity, quantity, operation, unit = 'quintal', notes = '' } = data;
    
    const idx = demo.demoInventory.findIndex(item => item.canonical_name.toLowerCase() === commodity.toLowerCase());
    const qtyVal = Number(quantity);
    
    if (idx > -1) {
      const prevQty = demo.demoInventory[idx].quantity;
      let newQty = prevQty;
      if (operation === 'add') {
        newQty = prevQty + qtyVal;
      } else if (operation === 'subtract') {
        newQty = Math.max(0, prevQty - qtyVal);
      } else if (operation === 'set') {
        newQty = qtyVal;
      }
      
      demo.demoInventory[idx] = {
        ...demo.demoInventory[idx],
        quantity: newQty,
        notes: notes || demo.demoInventory[idx].notes,
        updated_at: new Date().toISOString()
      };
      
      return {
        status: "success",
        canonical_name: demo.demoInventory[idx].canonical_name,
        operation,
        previous_quantity: prevQty,
        new_quantity: newQty,
        unit,
        data: demo.demoInventory[idx]
      };
    } else {
      const newItem = {
        id: `inv-${demo.demoInventory.length + 1}`,
        commodity_id: `c${demo.demoInventory.length + 1}`,
        canonical_name: commodity.charAt(0).toUpperCase() + commodity.slice(1),
        quantity: qtyVal,
        unit,
        notes,
        updated_at: new Date().toISOString()
      };
      demo.demoInventory.push(newItem);
      return {
        status: "success",
        canonical_name: newItem.canonical_name,
        operation,
        previous_quantity: 0,
        new_quantity: qtyVal,
        unit,
        data: newItem
      };
    }
  }
};

export const getOpenPositions = async () => {
  try {
    const response = await api.get('/api/v1/positions');
    const positions = unwrapList(response.data, ['positions', 'data']);
    return positions.length > 0 ? positions : demo.demoPositions;
  } catch (error) {
    console.warn("Using demo open positions:", error);
    return demo.demoPositions;
  }
};

export const reportCorridorDelay = async (origin, destination, delayHours, reason = '') => {
  const response = await api.post('/api/v1/dispatch/report-delay', {
    origin,
    destination,
    delay_hours: Number(delayHours),
    reason: reason || undefined,
  });
  return response.data;
};

export const getExchangePrices = async (commodity = '') => {
  try {
    const params = commodity ? { commodity } : {};
    const response = await api.get('/api/v1/market/exchange-prices', { params });
    return response.data;
  } catch (error) {
    console.warn('Exchange prices unavailable:', error);
    return { prices: [], demo_mode: true };
  }
};

export const draftEwayBill = async (contractId, vehicleNumber, options = {}) => {
  const response = await api.post('/api/v1/compliance/eway-bill/draft', {
    contract_id: contractId,
    vehicle_number: vehicleNumber,
    ...options,
  });
  return response.data;
};

export const parseWhatsAppMessage = async (message, sender = '') => {
  const response = await api.post('/api/v1/compliance/whatsapp/parse', {
    message,
    sender: sender || undefined,
  });
  return response.data;
};

export const createQualityLot = async (lotData) => {
  const response = await api.post('/api/v1/quality-lots', lotData);
  return response.data;
};

export const createCounterparty = async (data) => {
  const response = await api.post('/api/v1/counterparties', data);
  return response.data?.counterparty || response.data;
};

export const createDispatch = async (dispatchData) => {
  try {
    const response = await api.post('/api/v1/dispatches', dispatchData);
    const created = response.data?.dispatch || response.data;
    return { dispatch: normalizeDispatch(created) };
  } catch (error) {
    console.warn("Mocking dispatch creation:", error);
    const newId = `DSP-${String(demo.demoDispatches.length + 1).padStart(3, '0')}`;
    const associatedContract = demo.demoContracts.find(c => c.id === dispatchData.contract_id) || demo.demoContracts[0];
    
    const newDispatch = {
      id: newId,
      contract_id: dispatchData.contract_id,
      status: "in_transit",
      vehicle_number: dispatchData.vehicle_number || "MH-12-QQ-9999",
      dispatch_date: dispatchData.dispatch_date || new Date().toISOString().split('T')[0],
      estimated_arrival: dispatchData.estimated_arrival || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      origin: dispatchData.origin || associatedContract.delivery_location || "Nagpur",
      destination: dispatchData.destination || "Mumbai",
      driver_phone: dispatchData.driver_contact || "+91 99999 88888",
      dispatched_quantity: Number(dispatchData.dispatched_quantity) || associatedContract.quantity
    };

    demo.demoDispatches.unshift(newDispatch);
    
    if (associatedContract) {
      associatedContract.status = "in_transit";
      if (!associatedContract.lifecycle.includes("in_transit")) {
        associatedContract.lifecycle.push("in_transit");
      }
      if (!associatedContract.dispatches) associatedContract.dispatches = [];
      associatedContract.dispatches.push({
        id: newId,
        status: "in_transit",
        vehicle: newDispatch.vehicle_number,
        eta: newDispatch.estimated_arrival
      });
    }

    return { dispatch: newDispatch };
  }
};

export const postLucyChat = async (message, sessionId, languageHint = 'en') => {
  const response = await api.post('/api/v1/lucy/chat', {
    message,
    session_id: sessionId,
    language_hint: languageHint
  });
  return response.data;
};

export const postLucyRetrieve = async (utterance, topK = 3) => {
  try {
    const response = await api.post('/api/v1/lucy/retrieve', {
      utterance,
      top_k: topK,
    });
    return response.data;
  } catch (error) {
    console.warn('Lucy retrieve endpoint unavailable:', error);
    return null;
  }
};

export const uploadComplianceDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/v1/compliance/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getQualityLots = async () => {
  try {
    const contracts = await getContracts();
    const lots = [];

    const candidates = contracts.filter((c) =>
      ['confirmed', 'delivered', 'in_transit', 'settled'].includes(c.status)
    );

    await Promise.all(
      candidates.slice(0, 25).map(async (contract) => {
        try {
          const detail = await getContract(contract.id);
          const contractLots = detail.quality_lots
            || (detail.quality_lot ? [detail.quality_lot] : []);

          for (const lot of contractLots) {
            lots.push({
              id: lot.id || `QL-${contract.contract_number}`,
              contract_id: contract.contract_number || contract.id,
              commodity: contract.commodity,
              quantity: lot.quantity ?? contract.quantity,
              moisture: lot.moisture_pct ?? lot.moisture ?? 10,
              broken_pct: lot.broken_pct ?? lot.broken_grain_pct ?? 2,
              foreign_matter: lot.foreign_matter_pct ?? lot.foreign_matter ?? 1,
              grade: lot.grade || 'B',
              base_price: lot.base_price ?? contract.contract_price,
              adjusted_price: lot.adjusted_price ?? lot.price_per_unit ?? contract.contract_price,
              penalty_pct: lot.penalty_pct ?? lot.price_adjustment_pct ?? 0,
              gps_lat: lot.gps_lat ?? lot.latitude ?? '',
              gps_lng: lot.gps_lng ?? lot.longitude ?? '',
              location_name: lot.location_name ?? lot.inspection_location ?? contract.delivery_location ?? 'Mandi',
              agent_name: lot.agent_name ?? lot.inspector_name ?? 'Field Agent',
              agent_remarks: lot.agent_remarks ?? lot.notes ?? '',
              inspected_at: lot.inspected_at ?? lot.created_at ?? new Date().toISOString(),
              status: lot.status ?? 'approved',
            });
          }
        } catch (e) {
          console.warn(`Quality lot fetch skipped for ${contract.id}:`, e);
        }
      })
    );

    return lots;
  } catch (error) {
    console.warn('Quality lots unavailable:', error);
    return [];
  }
};

export const getCommoditySpotPrice = async (commodity) => {
  try {
    const data = await getMarketPrices(commodity);
    const prices = data?.prices || [];
    if (prices.length === 0) return null;
    const nagpur = prices.find((p) => p.mandi_name?.toLowerCase().includes('nagpur'));
    return (nagpur || prices[0]).modal_price;
  } catch (error) {
    console.warn(`Spot price unavailable for ${commodity}:`, error);
    return null;
  }
};

export const getNetworkGraph = async () => {
  const response = await api.get('/api/v1/network/graph');
  return response.data;
};

export default api;


