import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  demoAlerts,
  demoPrices,
  demoPortfolioSummary,
  demoMacroSignals,
  demoAgentActivity,
  demoLearningStats,
} from '../data/demo';

const silentApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 12000,
});

const FALLBACK_INSIGHTS = [
  'Cotton modal price in Nagpur is 18% above the 10-day average — arbitrage window open to Ahmedabad corridor.',
  'Soybean arrivals in Indore down 12% week-on-week — demand signal strengthening in MP mandis.',
  'Vidarbha corridor delay risk elevated — reroute groundnut dispatches via Nashik for 6% faster transit.',
  'Wheat basis spread widened to ₹340/quintal between Punjab and Delhi — dispatch timing favorable.',
];

export function useLandingData() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(demoPortfolioSummary);
  const [prices, setPrices] = useState(demoPrices.slice(0, 8));
  const [alerts, setAlerts] = useState(demoAlerts.slice(0, 4));
  const [macroSignals, setMacroSignals] = useState(demoMacroSignals.slice(0, 3));
  const [agentActivity, setAgentActivity] = useState(demoAgentActivity.slice(0, 5));
  const [learningStats, setLearningStats] = useState(demoLearningStats);
  const [lucyInsights, setLucyInsights] = useState(FALLBACK_INSIGHTS);
  const [commodityCount, setCommodityCount] = useState(20);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await Promise.allSettled([
        silentApi.get('/api/v1/risk/portfolio'),
        silentApi.get('/api/v1/market/prices', { params: { commodity: 'Cotton' } }),
        silentApi.get('/api/v1/market/alerts'),
        silentApi.get('/api/v1/risk/signals'),
        silentApi.get('/api/v1/risk/activity'),
        silentApi.get('/api/v1/feedback/stats'),
        silentApi.get('/api/v1/market/commodities'),
      ]);

      if (cancelled) return;

      let connected = false;

      const [portfolioRes, pricesRes, alertsRes, signalsRes, activityRes, statsRes, commoditiesRes] = results;

      if (portfolioRes.status === 'fulfilled' && portfolioRes.value?.data) {
        setPortfolio(portfolioRes.value.data);
        connected = true;
      }

      if (pricesRes.status === 'fulfilled') {
        const rows = pricesRes.value?.data?.prices;
        if (Array.isArray(rows) && rows.length > 0) {
          setPrices(rows.slice(0, 10));
          connected = true;
        }
      }

      if (alertsRes.status === 'fulfilled') {
        const rows = alertsRes.value?.data?.alerts || alertsRes.value?.data;
        if (Array.isArray(rows) && rows.length > 0) {
          setAlerts(rows.slice(0, 4));
          connected = true;
        }
      }

      if (signalsRes.status === 'fulfilled') {
        const rows = signalsRes.value?.data?.signals || signalsRes.value?.data;
        if (Array.isArray(rows) && rows.length > 0) {
          setMacroSignals(rows.slice(0, 4));
          const insights = rows
            .map((s) => s.key_signal || s.message || s.description)
            .filter(Boolean)
            .slice(0, 4);
          if (insights.length > 0) setLucyInsights(insights);
          connected = true;
        }
      }

      if (activityRes.status === 'fulfilled') {
        const rows = activityRes.value?.data?.activity_log || activityRes.value?.data?.activity || activityRes.value?.data;
        if (Array.isArray(rows) && rows.length > 0) {
          setAgentActivity(rows.slice(0, 6));
          connected = true;
        }
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setLearningStats(statsRes.value.data);
        connected = true;
      }

      if (commoditiesRes.status === 'fulfilled') {
        const rows = commoditiesRes.value?.data?.commodities || commoditiesRes.value?.data;
        if (Array.isArray(rows) && rows.length > 0) {
          setCommodityCount(rows.length);
          connected = true;
        }
      }

      if (!connected) {
        setLucyInsights(FALLBACK_INSIGHTS);
      }

      setLiveConnected(connected);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return {
    loading,
    liveConnected,
    portfolio,
    prices,
    alerts,
    macroSignals,
    agentActivity,
    learningStats,
    lucyInsights,
    commodityCount,
  };
}

export default useLandingData;
