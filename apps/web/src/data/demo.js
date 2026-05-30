// TradeNexus High-Fidelity Demo Data

export const demoAlerts = [
  {
    id: "a1",
    commodity_id: "c1",
    alert_type: "demand_spike",
    mandi_name: "Nagpur",
    state: "Maharashtra",
    message: "Cotton prices in Nagpur (Maharashtra) are 18% above the 10-day average. Modal price: ₹7,250/quintal.",
    price_delta_pct: 18.2,
    confidence_score: 0.94,
    is_active: true,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() // 2 hours ago
  },
  {
    id: "a2",
    commodity_id: "c2",
    alert_type: "price_drop",
    mandi_name: "Indore",
    state: "Madhya Pradesh",
    message: "Soybean prices in Indore (Madhya Pradesh) are 12% below the 10-day average. Modal price: ₹4,800/quintal.",
    price_delta_pct: -12.4,
    confidence_score: 0.88,
    is_active: true,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString() // 5 hours ago
  },
  {
    id: "a3",
    commodity_id: "c3",
    alert_type: "demand_spike",
    mandi_name: "Azadpur",
    state: "Delhi",
    message: "Onion prices in Azadpur (Delhi) are 24% above the 10-day average. Modal price: ₹2,400/quintal.",
    price_delta_pct: 24.1,
    confidence_score: 0.96,
    is_active: true,
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() // 8 hours ago
  },
  {
    id: "a4",
    commodity_id: "c4",
    alert_type: "price_drop",
    mandi_name: "Guntur",
    state: "Andhra Pradesh",
    message: "Chilli prices in Guntur (Andhra Pradesh) are 9% below the 10-day average. Modal price: ₹18,500/quintal.",
    price_delta_pct: -9.2,
    confidence_score: 0.85,
    is_active: true,
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  },
  {
    id: "a5",
    commodity_id: "c5",
    alert_type: "demand_spike",
    mandi_name: "Rajkot",
    state: "Gujarat",
    message: "Groundnut prices in Rajkot (Gujarat) are 15% above the 10-day average. Modal price: ₹6,900/quintal.",
    price_delta_pct: 15.0,
    confidence_score: 0.91,
    is_active: true,
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  }
];

export const demoPrices = [
  { id: "p1", mandi_name: "Nagpur", state: "Maharashtra", min_price: 6800, max_price: 7500, modal_price: 7250, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: true, anomaly_score: 1.8, trend_pct: 18.2, status: "spike" },
  { id: "p2", mandi_name: "Amravati", state: "Maharashtra", min_price: 6700, max_price: 7300, modal_price: 7100, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: 0.8, trend_pct: 5.4, status: "normal" },
  { id: "p3", mandi_name: "Yavatmal", state: "Maharashtra", min_price: 6600, max_price: 7200, modal_price: 6950, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: 0.3, trend_pct: 2.1, status: "normal" },
  { id: "p4", mandi_name: "Rajkot", state: "Gujarat", min_price: 6800, max_price: 7400, modal_price: 7200, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: 1.1, trend_pct: 8.5, status: "normal" },
  { id: "p5", mandi_name: "Ahmedabad", state: "Gujarat", min_price: 6900, max_price: 7600, modal_price: 7350, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: true, anomaly_score: 2.1, trend_pct: 14.3, status: "spike" },
  { id: "p6", mandi_name: "Indore", state: "Madhya Pradesh", min_price: 6400, max_price: 7000, modal_price: 6800, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: -0.4, trend_pct: -1.2, status: "normal" },
  { id: "p7", mandi_name: "Kurnool", state: "Andhra Pradesh", min_price: 6500, max_price: 7100, modal_price: 6900, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: 0.1, trend_pct: 0.5, status: "normal" },
  { id: "p8", mandi_name: "Adoni", state: "Andhra Pradesh", min_price: 6300, max_price: 6900, modal_price: 6700, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: -0.8, trend_pct: -3.4, status: "normal" },
  { id: "p9", mandi_name: "Guntur", state: "Andhra Pradesh", min_price: 6600, max_price: 7200, modal_price: 7000, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: 0.4, trend_pct: 1.8, status: "normal" },
  { id: "p10", mandi_name: "Warangal", state: "Telangana", min_price: 6700, max_price: 7300, modal_price: 7150, unit: "quintal", data_as_of: "2026-05-30", is_anomaly: false, anomaly_score: 0.9, trend_pct: 6.2, status: "normal" }
];

export const demoLearningStats = {
  total_resolutions: 1842,
  tier_breakdown: {
    exact: 1245,
    trigram: 382,
    embedding: 147,
    llm: 54,
    unknown: 14
  },
  corrections_this_week: 47,
  aliases_total: 637,
  languages_covered: 9,
  recent_activity: [
    { date: "2026-05-24", count: 240 },
    { date: "2026-05-25", count: 258 },
    { date: "2026-05-26", count: 247 },
    { date: "2026-05-27", count: 290 },
    { date: "2026-05-28", count: 312 },
    { date: "2026-05-29", count: 325 },
    { date: "2026-05-30", count: 350 }
  ]
};

export const demoCorridors = [
  { origin: "Amravati", destination: "Nagpur", distance_km: 156, typical_duration_hours: 3.2, reliability_score: 0.87, delay_risk: "low", last_updated: "1 hour ago" },
  { origin: "Bhopal", destination: "Surat", distance_km: 590, typical_duration_hours: 11.5, reliability_score: 0.74, delay_risk: "medium", last_updated: "3 hours ago" },
  { origin: "Delhi", destination: "Ludhiana", distance_km: 310, typical_duration_hours: 5.8, reliability_score: 0.91, delay_risk: "low", last_updated: "30 mins ago" },
  { origin: "Nagpur", destination: "Ahmedabad", distance_km: 845, typical_duration_hours: 16.5, reliability_score: 0.78, delay_risk: "medium", last_updated: "2 hours ago" },
  { origin: "Indore", destination: "Mumbai", distance_km: 585, typical_duration_hours: 11.2, reliability_score: 0.82, delay_risk: "low", last_updated: "4 hours ago" }
];

export const demoOpportunities = [
  {
    id: "opp1",
    commodity_name: "Cotton",
    origin: "Amravati",
    destination: "Nagpur",
    quantity: 120,
    unit: "quintals",
    is_return_load: false,
    contact_info: "Rajesh Patil (+91 98765 43210)",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    available_from: "2026-06-01"
  },
  {
    id: "opp2",
    commodity_name: "Soybean",
    origin: "Indore",
    destination: "Mumbai",
    quantity: 250,
    unit: "quintals",
    is_return_load: true,
    contact_info: "Karan Transport (+91 88776 55443)",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    available_from: "2026-06-02"
  },
  {
    id: "opp3",
    commodity_name: "Wheat",
    origin: "Bhopal",
    destination: "Surat",
    quantity: 400,
    unit: "quintals",
    is_return_load: false,
    contact_info: "Surat Agro Products (+91 94432 10101)",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    available_from: "2026-05-31"
  },
  {
    id: "opp4",
    commodity_name: "Mustard",
    origin: "Jaipur",
    destination: "Delhi",
    quantity: 180,
    unit: "quintals",
    is_return_load: true,
    contact_info: "Delhi Logistics Corp (+91 90123 45678)",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    available_from: "2026-06-03"
  }
];

export const demoRecommendation = {
  commodity: "Cotton",
  resolution_tier: "embedding",
  top_markets: [
    { mandi: "Nagpur", state: "Maharashtra", modal_price: 7250, unit: "quintal", anomaly_flag: true },
    { mandi: "Ahmedabad", state: "Gujarat", modal_price: 7120, unit: "quintal", anomaly_flag: false },
    { mandi: "Indore", state: "Madhya Pradesh", modal_price: 6900, unit: "quintal", anomaly_flag: false }
  ],
  best_route: {
    origin: "Amravati",
    destination: "Nagpur, Maharashtra",
    distance_km: 156,
    estimated_hours: 3.2,
    confidence_score: 0.87,
    delay_risk: "low",
    recent_reports_count: 0,
    typical_hours: 3.2
  },
  active_alerts: [
    { mandi_name: "Nagpur", alert_type: "demand_spike", message: "Cotton prices in Nagpur (Maharashtra) are 18% above the 10-day average." }
  ],
  ai_recommendation: "We recommend routing Cotton from Amravati to Nagpur immediately. The Nagpur mandi is offering a premium modal price of ₹7,250/quintal, showing an active demand spike of 18% above the historical baseline. The 156 km transit corridor via NH-53 reports low delay risk with an 87% reliability rating. To maximize return on transport, coordinate with local carriers for empty backhauls out of Nagpur.",
  confidence_score: 0.91,
  data_freshness: "Live (today)"
};
