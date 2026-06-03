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

export default api;

