import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    console.warn('API unavailable, using demo data:', error.message);
    return Promise.resolve({ data: null, _demo: true });
  }
);

export const getMarketPrices = (commodity, state) =>
  api.get('/api/v1/market/prices', { params: { commodity, state } });

export const getRiskPortfolio = () => api.get('/api/v1/risk/portfolio');
export const getMtmContracts = () => api.get('/api/v1/risk/mtm');
export const getAlerts = () => api.get('/api/v1/risk/alerts');
export const getAgentActivity = () => api.get('/api/v1/risk/activity');
export const getWeatherForecast = (region) => api.get(`/api/v1/risk/weather/${region}`);
export const getMacroSignals = () => api.get('/api/v1/risk/signals');
export const getPriceForecast = (commodity) => api.get(`/api/v1/risk/forecast/${commodity}`);
export const getModelInfo = (commodity) => api.get(`/api/v1/risk/model-info/${commodity}`);
export const getDataQuality = () => api.get('/api/v1/risk/data-quality');
export const getContracts = (params) => api.get('/api/v1/contracts', { params });
export const createContract = (data) => api.post('/api/v1/contracts', data);
export const getDispatches = (params) => api.get('/api/v1/dispatches', { params });
export const getInventory = () => api.get('/api/v1/inventory');
export const updateInventory = (data) => api.post('/api/v1/inventory/update', data);
export const getOpportunities = (params) => api.get('/api/v1/opportunities', { params });
export const getCounterparties = () => api.get('/api/v1/counterparties');
export const lucyChat = (message, sessionId) =>
  api.post('/api/v1/lucy/chat', { message, session_id: sessionId });
export const lucyNewSession = () => api.post('/api/v1/lucy/session/new');
export const getNetworkGraph = () => api.get('/api/v1/network/graph');
export const retrieveIntents = (q) => api.get('/api/v1/lucy/retrieve', { params: { q } });

export default api;
