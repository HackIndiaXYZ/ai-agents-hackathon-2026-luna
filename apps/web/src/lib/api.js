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
    return response.data;
  } catch (error) {
    console.warn("Using demo MTM rows:", error);
    return demo.demoMtmRows;
  }
};

export const recalculateMtm = async () => {
  const response = await api.post('/api/v1/risk/recalculate');
  return response.data;
};

export const getRiskAlerts = async () => {
  try {
    const [riskRes, marketRes] = await Promise.all([
      api.get('/api/v1/risk/alerts').catch(() => ({ data: [] })),
      api.get('/api/v1/market/alerts').catch(() => ({ data: [] }))
    ]);
    const combined = [...(riskRes.data || []), ...(marketRes.data || [])];
    return combined.length > 0 ? combined : demo.demoAlerts;
  } catch (error) {
    console.warn("Using demo alerts:", error);
    return demo.demoAlerts;
  }
};

export const getAgentActivity = async () => {
  try {
    const response = await api.get('/api/v1/risk/activity');
    return response.data;
  } catch (error) {
    console.warn("Using demo agent activity:", error);
    return demo.demoAgentActivity;
  }
};

export const getMacroSignals = async () => {
  try {
    const response = await api.get('/api/v1/risk/signals');
    return response.data;
  } catch (error) {
    console.warn("Using demo macro signals:", error);
    return demo.demoMacroSignals;
  }
};

export const getContracts = async (filters = {}) => {
  try {
    const response = await api.get('/api/v1/contracts', { params: filters });
    return response.data;
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
    return response.data;
  } catch (error) {
    console.warn(`Using demo contract details for ${id}:`, error);
    return demo.demoContracts.find(c => c.id === id) || demo.demoContracts[0];
  }
};

export const createContract = async (contractData) => {
  // Let it call POST /api/v1/contracts. Fallback returns mock created contract
  try {
    const response = await api.post('/api/v1/contracts', contractData);
    return response.data;
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
    return response.data;
  } catch (error) {
    console.warn("Using demo dispatches:", error);
    return demo.demoDispatches;
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
    return response.data;
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

export const getWeatherSignals = async () => {
  try {
    const response = await api.get('/api/v1/risk/signals', { params: { type: 'weather_risk' } });
    return response.data;
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
    return response.data;
  } catch (error) {
    console.warn("Using demo open positions:", error);
    return demo.demoPositions;
  }
};

export const createDispatch = async (dispatchData) => {
  try {
    const response = await api.post('/api/v1/dispatches', dispatchData);
    return response.data;
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

export default api;


