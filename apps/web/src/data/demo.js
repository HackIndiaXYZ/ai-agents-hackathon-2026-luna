export const demoStats = {
  totalExposure: 27820000,
  todayPnL: -1733450,
  mtmPnL: -713450,
  dispatchesInTransit: 12,
  riskAlerts: 4,
  availableCredit: 18400000,
  creditLimit: 25000000,
};

export const demoContracts = [
  { id: 'TN-2026-0008', type: 'SELL', commodity: 'Chickpea', qty: 300, unit: 'qtl', contractPrice: 5000, marketPrice: 5000, pnl: -15000000, status: 'DRAFT', counterparty: 'Shree Cotton Mills', deliveryDate: '2026-06-15', location: 'Nagpur', buyer: 'Shree Cotton Mills', seller: 'Ramesh Patil', startDate: '2026-06-01', endDate: '2026-06-15' },
  { id: 'TN-2026-0006', type: 'SELL', commodity: 'Cotton', qty: 50, unit: 'qtl', contractPrice: 0, marketPrice: 7018, pnl: -3550906, status: 'DRAFT', counterparty: 'Nagpur Mills', deliveryDate: '2026-06-20', location: 'Nagpur', buyer: 'Nagpur Mills', seller: 'Ramesh Patil', startDate: '2026-06-05', endDate: '2026-06-20' },
  { id: 'TN-2026-0007', type: 'SELL', commodity: 'Cotton', qty: 50, unit: 'qtl', contractPrice: 0, marketPrice: 7018, pnl: -3550906, status: 'DRAFT', counterparty: 'Akola Traders', deliveryDate: '2026-06-18', location: 'Akola', buyer: 'Akola Traders', seller: 'Ramesh Patil', startDate: '2026-06-04', endDate: '2026-06-18' },
  { id: 'TN-2026-0002', type: 'SELL', commodity: 'Cotton', qty: 100, unit: 'qtl', contractPrice: 6800, marketPrice: 7018, pnl: -218000, status: 'CONFIRMED', counterparty: 'Bharat Agro', deliveryDate: '2026-06-10', location: 'Indore', buyer: 'Bharat Agro', seller: 'Ramesh Patil', startDate: '2026-05-28', endDate: '2026-06-10' },
  { id: 'TN-2026-0005', type: 'BUY', commodity: 'Cotton', qty: 80, unit: 'qtl', contractPrice: 7200, marketPrice: 7018, pnl: -14560, status: 'IN_TRANSIT', counterparty: 'Ramesh Farm Collective', deliveryDate: '2026-06-08', location: 'Amravati', buyer: 'Ramesh Patil', seller: 'Ramesh Farm Collective', startDate: '2026-05-30', endDate: '2026-06-08' },
  { id: 'TN-2026-0004', type: 'BUY', commodity: 'Cotton', qty: 60, unit: 'qtl', contractPrice: 6500, marketPrice: 7018, pnl: 310800, status: 'CONFIRMED', counterparty: 'Wardha Cotton Coop', deliveryDate: '2026-06-12', location: 'Wardha', buyer: 'Ramesh Patil', seller: 'Wardha Cotton Coop', startDate: '2026-05-25', endDate: '2026-06-12' },
];

export const demoInventory = [
  { commodity: 'Cotton', qty: 600, unit: 'qtl', marketPrice: 7018, updatedAt: '2026-06-04T09:00:00Z' },
  { commodity: 'Soybean', qty: 120, unit: 'qtl', marketPrice: 4820, updatedAt: '2026-06-04T08:30:00Z' },
  { commodity: 'Pigeon Pea', qty: 80, unit: 'qtl', marketPrice: 6200, updatedAt: '2026-06-03T18:00:00Z' },
  { commodity: 'Onion', qty: 200, unit: 'qtl', marketPrice: 1840, updatedAt: '2026-06-04T07:00:00Z' },
  { commodity: 'Wheat', qty: 150, unit: 'qtl', marketPrice: 2350, updatedAt: '2026-06-03T20:00:00Z' },
];

export const demoMandiPrices = [
  { mandi: 'Indore', state: 'MP', commodity: 'Cotton', modal: 7260, change: 3.24, lat: 22.72, lng: 75.86, isAnomaly: true },
  { mandi: 'Dewas', state: 'MP', commodity: 'Cotton', modal: 7050, change: 2.81, lat: 22.96, lng: 76.05, isAnomaly: false },
  { mandi: 'Nagpur', state: 'Maharashtra', commodity: 'Cotton', modal: 6820, change: 2.17, lat: 21.15, lng: 79.09, isAnomaly: true },
  { mandi: 'Rajkot', state: 'Gujarat', commodity: 'Cotton', modal: 6430, change: 1.92, lat: 22.30, lng: 70.80, isAnomaly: false },
  { mandi: 'Jalgaon', state: 'Maharashtra', commodity: 'Cotton', modal: 6210, change: 1.35, lat: 21.01, lng: 75.56, isAnomaly: false },
  { mandi: 'Akola', state: 'Maharashtra', commodity: 'Cotton', modal: 6680, change: 1.90, lat: 20.71, lng: 77.00, isAnomaly: true },
  { mandi: 'Amravati', state: 'Maharashtra', commodity: 'Cotton', modal: 6540, change: 1.70, lat: 20.93, lng: 77.75, isAnomaly: false },
  { mandi: 'Ahmedabad', state: 'Gujarat', commodity: 'Soybean', modal: 4820, change: -0.45, lat: 23.03, lng: 72.58, isAnomaly: false },
  { mandi: 'Latur', state: 'Maharashtra', commodity: 'Pigeon Pea', modal: 6200, change: -1.20, lat: 18.40, lng: 76.56, isAnomaly: false },
  { mandi: 'Bhopal', state: 'MP', commodity: 'Soybean', modal: 4880, change: 0.80, lat: 23.26, lng: 77.41, isAnomaly: false },
  { mandi: 'Solapur', state: 'Maharashtra', commodity: 'Cotton', modal: 6380, change: 0.95, lat: 17.68, lng: 75.90, isAnomaly: false },
  { mandi: 'Nashik', state: 'Maharashtra', commodity: 'Onion', modal: 1840, change: -2.10, lat: 20.01, lng: 73.79, isAnomaly: false },
  { mandi: 'Surat', state: 'Gujarat', commodity: 'Cotton', modal: 6510, change: 1.45, lat: 21.17, lng: 72.83, isAnomaly: false },
  { mandi: 'Hyderabad', state: 'Telangana', commodity: 'Soybean', modal: 4750, change: 0.30, lat: 17.39, lng: 78.49, isAnomaly: false },
  { mandi: 'Delhi', state: 'Delhi', commodity: 'Wheat', modal: 2420, change: 0.55, lat: 28.61, lng: 77.21, isAnomaly: false },
  { mandi: 'Ludhiana', state: 'Punjab', commodity: 'Wheat', modal: 2380, change: 0.40, lat: 30.90, lng: 75.85, isAnomaly: false },
  { mandi: 'Pune', state: 'Maharashtra', commodity: 'Soybean', modal: 4790, change: -0.20, lat: 18.52, lng: 73.86, isAnomaly: false },
  { mandi: 'Wardha', state: 'Maharashtra', commodity: 'Cotton', modal: 6490, change: 1.10, lat: 20.74, lng: 78.60, isAnomaly: false },
  { mandi: 'Mumbai', state: 'Maharashtra', commodity: 'Soybean', modal: 4900, change: 0.65, lat: 19.08, lng: 72.88, isAnomaly: false },
  { mandi: 'Chennai', state: 'Tamil Nadu', commodity: 'Cotton', modal: 7120, change: 1.80, lat: 13.08, lng: 80.28, isAnomaly: false },
];

export const demoDispatches = [
  { id: 'TND-001', contractId: 'TN-2026-0002', commodity: 'Cotton', qty: 100, origin: 'Amravati', destination: 'Nagpur', status: 'IN_TRANSIT', dispatchDate: '2026-06-03', eta: '2026-06-07', vehicle: 'MH-31-AB-1234', confidence: 0.87, weatherRisk: 'low', daysLate: 0, originLat: 20.93, originLng: 77.75, destLat: 21.15, destLng: 79.09 },
  { id: 'TND-002', contractId: 'TN-2026-0005', commodity: 'Soybean', qty: 250, origin: 'Bhopal', destination: 'Mumbai', status: 'IN_TRANSIT', dispatchDate: '2026-06-02', eta: '2026-06-06', vehicle: 'MP-09-CD-5678', confidence: 0.74, weatherRisk: 'medium', daysLate: 1, originLat: 23.26, originLng: 77.41, destLat: 19.08, destLng: 72.88 },
  { id: 'TND-003', contractId: 'TN-2026-0004', commodity: 'Cotton', qty: 60, origin: 'Wardha', destination: 'Indore', status: 'LOADING', dispatchDate: '2026-06-05', eta: '2026-06-09', vehicle: 'MH-27-EF-9012', confidence: 0.91, weatherRisk: 'low', daysLate: 0, originLat: 20.74, originLng: 78.60, destLat: 22.72, destLng: 75.86 },
];

export const demoCounterparties = [
  { id: 'cp-1', name: 'Nagpur Cotton Mills', type: 'buyer', city: 'Nagpur', state: 'Maharashtra', reliability: 0.92, trades: 28, openExposure: 4875000, mlRisk: 0.12, onTime: 0.94 },
  { id: 'cp-2', name: 'Akola Textile Industries', type: 'buyer', city: 'Akola', state: 'Maharashtra', reliability: 0.76, trades: 14, openExposure: 2100000, mlRisk: 0.34, onTime: 0.78 },
  { id: 'cp-3', name: 'Bharat Agro', type: 'both', city: 'Indore', state: 'MP', reliability: 0.88, trades: 32, openExposure: 6200000, mlRisk: 0.18, onTime: 0.91 },
  { id: 'cp-4', name: 'Ramesh Farm Collective', type: 'seller', city: 'Amravati', state: 'Maharashtra', reliability: 0.95, trades: 19, openExposure: 1800000, mlRisk: 0.08, onTime: 0.96 },
  { id: 'cp-5', name: 'Wardha Cotton Coop', type: 'seller', city: 'Wardha', state: 'Maharashtra', reliability: 0.84, trades: 11, openExposure: 1200000, mlRisk: 0.22, onTime: 0.85 },
];

export const demoDiscoveredCounterparties = [
  { id: 'cp-d1', name: 'Green Harvest Traders', type: 'buyer', city: 'Nagpur', state: 'Maharashtra', reliability: 0.81, trades: 6, openExposure: 0, mlRisk: 0.28, discovered: true },
  { id: 'cp-d2', name: 'AgriCorp Vidarbha', type: 'buyer', city: 'Akola', state: 'Maharashtra', reliability: 0.77, trades: 4, openExposure: 0, mlRisk: 0.31, discovered: true },
  { id: 'cp-d3', name: 'Shree Cotton Mills', type: 'buyer', city: 'Nagpur', state: 'Maharashtra', reliability: 0.89, trades: 12, openExposure: 0, mlRisk: 0.15, discovered: true },
];

export const demoOpportunities = [
  { id: 'opp-1', type: 'FORWARD_LOAD', commodity: 'Cotton', origin: 'Amravati', destination: 'Nagpur', qty: 120, unit: 'qtl', margin: '₹18,600', matchScore: 92, availableFrom: '2026-06-08' },
  { id: 'opp-2', type: 'RETURN_LOAD', commodity: 'Soybean', origin: 'Mumbai', destination: 'Bhopal', qty: 250, unit: 'qtl', margin: '₹24,000', matchScore: 87, availableFrom: '2026-06-09' },
  { id: 'opp-3', type: 'FORWARD_LOAD', commodity: 'Wheat', origin: 'Ludhiana', destination: 'Delhi', qty: 400, unit: 'qtl', margin: '₹31,500', matchScore: 83, availableFrom: '2026-06-10' },
];

export const demoAlerts = [
  { id: 'a-1', type: 'demand_spike', commodity: 'Cotton', mandi: 'Nagpur', message: 'Cotton prices in Nagpur are 18% above 10-day average. Modal: ₹6,820/qtl.', pctChange: 18.2, time: '2026-06-04T07:42:00Z' },
  { id: 'a-2', type: 'weather_risk', commodity: null, mandi: null, message: 'Heavy rainfall forecast for Amravati region Tuesday. 2 active dispatches flagged.', time: '2026-06-04T06:15:00Z' },
  { id: 'a-3', type: 'demand_spike', commodity: 'Cotton', mandi: 'Akola', message: 'Cotton prices in Akola 14% above average. Modal: ₹6,680/qtl.', pctChange: 14.1, time: '2026-06-04T05:30:00Z' },
  { id: 'a-4', type: 'sentiment', commodity: 'Cotton', mandi: null, message: 'Bullish sentiment detected for Cotton. Export demand from SE Asia rising.', time: '2026-06-03T22:00:00Z' },
  { id: 'a-5', type: 'price_drop', commodity: 'Pigeon Pea', mandi: 'Latur', message: 'Pigeon Pea prices dropped 12% in Latur. Bumper harvest expected.', pctChange: -12.0, time: '2026-06-03T18:00:00Z' },
];

export const demoAgentLog = [
  { agent: 'Risk Agent', color: '#2563eb', time: '09:42 AM', summary: 'MtM calculated for 8 contracts. Best: TN-2026-0004 +₹4.8L. Worst: TN-2026-0008 -₹15L.' },
  { agent: 'Market Agent', color: '#16a34a', time: '09:26 AM', summary: 'Cotton prices up 3.24% in Indore market due to higher demand and low arrivals.' },
  { agent: 'Opportunity Agent', color: '#d97706', time: '08:55 AM', summary: 'New high-margin opportunity found: Soybean return load Indore → Mumbai. Est margin ₹24K.' },
  { agent: 'Inventory Agent', color: '#7c3aed', time: '01:23 AM', summary: 'Warehouse stock updated. Cotton inventory at 62% capacity.' },
  { agent: 'Weather Agent', color: '#0891b2', time: '07:00 AM', summary: 'Heavy rain warning Amravati region. 2 dispatches on Amravati→Nagpur flagged for delay.' },
  { agent: 'Adaptive Learning', color: '#d97706', time: '12:00 AM', summary: 'Processed 34 alias resolutions. 3 new aliases learned. Corpus: 847 entries.' },
];

export const demoPortfolioHistory = [
  { date: 'Jan 26', pnl: 82000 }, { date: 'Feb 26', pnl: 145000 },
  { date: 'Mar 26', pnl: -23000 }, { date: 'Apr 26', pnl: 198000 },
  { date: 'May 26', pnl: 267000 }, { date: 'Jun 26', pnl: 248600 },
];

export const demoPriceHistory = {
  Cotton: [
    { date: 'May 29', price: 6420 }, { date: 'May 30', price: 6510 },
    { date: 'May 31', price: 6480 }, { date: 'Jun 1', price: 6620 },
    { date: 'Jun 2', price: 6750 }, { date: 'Jun 3', price: 6780 },
    { date: 'Jun 4', price: 6820, forecast: true },
    { date: 'Jun 5', price: 6890, forecast: true, lower: 6780, upper: 7010 },
    { date: 'Jun 6', price: 6950, forecast: true, lower: 6810, upper: 7100 },
    { date: 'Jun 7', price: 7020, forecast: true, lower: 6840, upper: 7200 },
    { date: 'Jun 8', price: 7080, forecast: true, lower: 6860, upper: 7290 },
    { date: 'Jun 9', price: 7110, forecast: true, lower: 6870, upper: 7350 },
    { date: 'Jun 10', price: 7150, forecast: true, lower: 6900, upper: 7400 },
  ],
};

export const demoMacroSignals = [
  { commodity: 'Cotton', sentiment: 'bullish', confidence: 0.82, keySignal: 'Export demand from SE Asian textile hubs rising. MSP unchanged.', urgency: 'this_week' },
  { commodity: 'Soybean', sentiment: 'neutral', confidence: 0.61, keySignal: 'Stable crushing margins keeping prices range-bound.', urgency: 'this_month' },
  { commodity: 'Pigeon Pea', sentiment: 'bearish', confidence: 0.74, keySignal: 'Bumper kharif harvest expected — downward price pressure likely.', urgency: 'this_week' },
];

export const demoMLModels = {
  Cotton: { modelType: 'lstm', realRows: 847, realDataPct: 100, mape: 4.2, trainingPeriod: '2022–2026', dataSources: ['CEDA Ashoka', 'data.gov.in'] },
  Soybean: { modelType: 'lstm', realRows: 412, realDataPct: 100, mape: 5.8, trainingPeriod: '2023–2026', dataSources: ['data.gov.in'] },
  PigeonPea: { modelType: 'prophet', realRows: 156, realDataPct: 100, mape: 7.1, trainingPeriod: '2024–2026', dataSources: ['data.gov.in'] },
  Wheat: { modelType: 'xgboost', realRows: 89, realDataPct: 100, mape: 8.4, trainingPeriod: '2024–2026', dataSources: ['data.gov.in'] },
};

export const MANDI_COORDS = {
  Nagpur: [79.09, 21.15], Indore: [75.86, 22.72], Bhopal: [77.41, 23.26],
  Mumbai: [72.88, 19.08], Pune: [73.86, 18.52], Latur: [76.56, 18.40],
  Amravati: [77.75, 20.93], Akola: [77.00, 20.71], Wardha: [78.60, 20.74],
  Nashik: [73.79, 20.01], Surat: [72.83, 21.17], Rajkot: [70.80, 22.30],
  Ahmedabad: [72.58, 23.03], Delhi: [77.21, 28.61], Ludhiana: [75.85, 30.90],
  Jalgaon: [75.56, 21.01], Dewas: [76.05, 22.96], Solapur: [75.90, 17.68],
  Hyderabad: [78.49, 17.39], Chennai: [80.28, 13.08],
};

export const demoContractOverview = {
  total: 1248, active: 892, totalValue: 13420000000, expiringSoon: 43,
};

export const demoNetworkEvents = [
  { type: 'contract', text: 'Contract Updated — TN-2026-0014 updated. New price: 500 quintals of Cotton', time: '2h ago' },
  { type: 'alert', text: 'High Alert — TN-2026-0008 Flagged High Risk (82% reliability, 10-day delay)', time: '4h ago' },
  { type: 'dispatch', text: 'Dispatch Created — New dispatch created for Bharat Agro. ETA: 30 Jun 2026', time: '6h ago' },
  { type: 'payment', text: 'Payment Received — Payment of ₹1,26,000 received from Nagpur Mills', time: '1d ago' },
];

export const demoCorridors = [
  { route: 'Amravati → Nagpur', reliability: 0.92, weather: 'Clear', volume: 340 },
  { route: 'Bhopal → Mumbai', reliability: 0.78, weather: 'Rain expected', volume: 280 },
  { route: 'Indore → Surat', reliability: 0.85, weather: 'Clear', volume: 190 },
  { route: 'Nagpur → Pune', reliability: 0.88, weather: 'Partly cloudy', volume: 220 },
  { route: 'Wardha → Indore', reliability: 0.91, weather: 'Clear', volume: 150 },
];

export const demoInventoryChanges = [
  { text: 'Cotton +50 qtl added via Lucy', time: '2 hours ago' },
  { text: 'Soybean -30 qtl dispatched', time: '1 day ago' },
  { text: 'Wheat +20 qtl received', time: '2 days ago' },
];

export const COMMODITY_ALIASES = {
  kapas: { commodity: 'Cotton', tier: 'embedding', confidence: 94 },
  cotton: { commodity: 'Cotton', tier: 'exact', confidence: 100 },
  soybean: { commodity: 'Soybean', tier: 'exact', confidence: 100 },
};

export default {
  demoStats, demoContracts, demoInventory, demoMandiPrices, demoDispatches,
  demoCounterparties, demoOpportunities, demoAlerts, demoAgentLog,
  demoPortfolioHistory, demoPriceHistory, demoMacroSignals, demoMLModels, MANDI_COORDS,
};
