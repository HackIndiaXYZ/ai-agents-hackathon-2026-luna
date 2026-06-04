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

export const demoPortfolioSummary = {
  total_open_value: 5242000,
  total_unrealized_pnl: 147800,
  open_contracts_count: 8,
  pnl_positive_count: 5,
  pnl_negative_count: 3,
  in_transit_count: 2,
  nearest_eta: "06 Jun 2026",
  active_alerts_count: 2
};

export const demoCounterparties = [
  { id: "cp1", name: "Ramesh Cotton Traders", reliability: 87, risk_level: "Low Risk", late_deliveries: 0, payment_delay_days: 2 },
  { id: "cp2", name: "Balaji Agro Industries", reliability: 94, risk_level: "Low Risk", late_deliveries: 0, payment_delay_days: 1 },
  { id: "cp3", name: "Guntur Chilli Exporters", reliability: 65, risk_level: "High Risk", late_deliveries: 3, payment_delay_days: 12 },
  { id: "cp4", name: "Sai Kripa Warehousing", reliability: 99, risk_level: "Low Risk", late_deliveries: 0, payment_delay_days: 0 },
  { id: "cp5", name: "Vikas Grain Co.", reliability: 78, risk_level: "Medium Risk", late_deliveries: 1, payment_delay_days: 6 }
];

export const demoDispatches = [
  {
    id: "DSP-001",
    contract_id: "CTR-2026-001",
    status: "in_transit",
    vehicle_number: "MH-31-AG-5432",
    dispatch_date: "2026-06-01",
    estimated_arrival: "2026-06-06",
    origin: "Amravati",
    destination: "Nagpur",
    driver_phone: "+91 98765 43210"
  },
  {
    id: "DSP-002",
    contract_id: "CTR-2026-003",
    status: "in_transit",
    vehicle_number: "MP-09-BC-9876",
    dispatch_date: "2026-06-02",
    estimated_arrival: "2026-06-08",
    origin: "Indore",
    destination: "Mumbai",
    driver_phone: "+91 88888 99999"
  },
  {
    id: "DSP-003",
    contract_id: "CTR-2026-002",
    status: "delivered",
    vehicle_number: "GJ-01-XX-1122",
    dispatch_date: "2026-05-20",
    estimated_arrival: "2026-05-24",
    origin: "Rajkot",
    destination: "Ahmedabad",
    driver_phone: "+91 77777 66666"
  }
];

export const demoContracts = [
  {
    id: "CTR-2026-001",
    contract_number: "CTR-2026-001",
    contract_date: "2026-05-15",
    type: "BUY",
    commodity: "Cotton",
    counterparty_id: "cp1",
    counterparty_name: "Ramesh Cotton Traders",
    quantity: 50,
    unit: "quintal",
    contract_price: 6400,
    market_price: 6800,
    unrealized_pnl: 20000, // (6800 - 6400) * 50 = +20,000
    status: "confirmed",
    delivery_date: "2026-06-15",
    delivery_location: "Nagpur Mandi",
    notes: "Payment: 15 days net. Quality standard grade A.",
    history_7d: [6350, 6380, 6400, 6420, 6500, 6650, 6800],
    lifecycle: ["draft", "confirmed"],
    dispatches: [
      { id: "DSP-001", status: "in_transit", vehicle: "MH-31-AG-5432", eta: "06 Jun 2026" }
    ],
    quality_lot: { moisture: 8.5, grade: "A", foreign_matter: 1.2, price_adjustment: 0 }
  },
  {
    id: "CTR-2026-002",
    contract_number: "CTR-2026-002",
    contract_date: "2026-05-18",
    type: "SELL",
    commodity: "Groundnut",
    counterparty_id: "cp2",
    counterparty_name: "Balaji Agro Industries",
    quantity: 120,
    unit: "quintal",
    contract_price: 7000,
    market_price: 6900,
    unrealized_pnl: 12000, // SELL: (7000 - 6900) * 120 = +12,000
    status: "delivered",
    delivery_date: "2026-05-24",
    delivery_location: "Ahmedabad Mandi",
    notes: "Direct mandi dispatch.",
    history_7d: [7050, 7030, 7010, 7000, 6980, 6950, 6900],
    lifecycle: ["draft", "confirmed", "in_transit", "delivered"],
    dispatches: [
      { id: "DSP-003", status: "delivered", vehicle: "GJ-01-XX-1122", eta: "24 May 2026" }
    ],
    quality_lot: { moisture: 7.2, grade: "Premium", foreign_matter: 0.8, price_adjustment: 150 }
  },
  {
    id: "CTR-2026-003",
    contract_number: "CTR-2026-003",
    contract_date: "2026-05-22",
    type: "BUY",
    commodity: "Soybean",
    counterparty_id: "cp5",
    counterparty_name: "Vikas Grain Co.",
    quantity: 150,
    unit: "quintal",
    contract_price: 4900,
    market_price: 4800,
    unrealized_pnl: -15000, // BUY: (4800 - 4900) * 150 = -15,000
    status: "in_transit",
    delivery_date: "2026-06-08",
    delivery_location: "Mumbai Port",
    notes: "Requires dry container booking.",
    history_7d: [4950, 4920, 4900, 4880, 4850, 4820, 4800],
    lifecycle: ["draft", "confirmed", "in_transit"],
    dispatches: [
      { id: "DSP-002", status: "in_transit", vehicle: "MP-09-BC-9876", eta: "08 Jun 2026" }
    ],
    quality_lot: { moisture: 9.8, grade: "B", foreign_matter: 2.1, price_adjustment: -50 }
  },
  {
    id: "CTR-2026-004",
    contract_number: "CTR-2026-004",
    contract_date: "2026-05-25",
    type: "SELL",
    commodity: "Onion",
    counterparty_id: "cp4",
    counterparty_name: "Sai Kripa Warehousing",
    quantity: 300,
    unit: "quintal",
    contract_price: 2200,
    market_price: 2400,
    unrealized_pnl: -60000, // SELL: (2200 - 2400) * 300 = -60,000
    status: "confirmed",
    delivery_date: "2026-06-18",
    delivery_location: "Delhi Mandi",
    notes: "Cold storage grade.",
    history_7d: [2100, 2150, 2200, 2250, 2300, 2350, 2400],
    lifecycle: ["draft", "confirmed"],
    dispatches: [],
    quality_lot: null
  },
  {
    id: "CTR-2026-005",
    contract_number: "CTR-2026-005",
    contract_date: "2026-05-28",
    type: "BUY",
    commodity: "Chilli",
    counterparty_id: "cp3",
    counterparty_name: "Guntur Chilli Exporters",
    quantity: 80,
    unit: "quintal",
    contract_price: 19000,
    market_price: 18500,
    unrealized_pnl: -40000, // BUY: (18500 - 19000) * 80 = -40,000
    status: "draft",
    delivery_date: "2026-06-25",
    delivery_location: "Guntur Yard",
    notes: "Quality standard grade B-3.",
    history_7d: [19200, 19100, 19000, 18900, 18700, 18600, 18500],
    lifecycle: ["draft"],
    dispatches: [],
    quality_lot: null
  },
  {
    id: "CTR-2026-006",
    contract_number: "CTR-2026-006",
    contract_date: "2026-05-29",
    type: "SELL",
    commodity: "Wheat",
    counterparty_id: "cp2",
    counterparty_name: "Balaji Agro Industries",
    quantity: 200,
    unit: "quintal",
    contract_price: 2350,
    market_price: 2450,
    unrealized_pnl: -20000, // SELL: (2350 - 2450) * 200 = -20,000
    status: "settled",
    delivery_date: "2026-05-31",
    delivery_location: "Ludhiana Mandi",
    notes: "Settled and invoiced.",
    history_7d: [2300, 2320, 2350, 2370, 2400, 2420, 2450],
    lifecycle: ["draft", "confirmed", "in_transit", "delivered", "settled"],
    dispatches: [],
    quality_lot: { moisture: 8.0, grade: "A+", foreign_matter: 0.5, price_adjustment: 80 }
  },
  {
    id: "CTR-2026-007",
    contract_number: "CTR-2026-007",
    contract_date: "2026-06-01",
    type: "BUY",
    commodity: "Cotton",
    counterparty_id: "cp1",
    counterparty_name: "Ramesh Cotton Traders",
    quantity: 80,
    unit: "quintal",
    contract_price: 6500,
    market_price: 6800,
    unrealized_pnl: 24000, // BUY: (6800 - 6500) * 80 = +24,000
    status: "confirmed",
    delivery_date: "2026-06-20",
    delivery_location: "Nagpur Mandi",
    notes: "Additional lot.",
    history_7d: [6400, 6420, 6500, 6550, 6600, 6720, 6800],
    lifecycle: ["draft", "confirmed"],
    dispatches: [],
    quality_lot: null
  },
  {
    id: "CTR-2026-008",
    contract_number: "CTR-2026-008",
    contract_date: "2026-06-02",
    type: "SELL",
    commodity: "Mustard",
    counterparty_id: "cp5",
    counterparty_name: "Vikas Grain Co.",
    quantity: 110,
    unit: "quintal",
    contract_price: 5600,
    market_price: 5400,
    unrealized_pnl: 22000, // SELL: (5600 - 5400) * 110 = +22,000
    status: "confirmed",
    delivery_date: "2026-06-28",
    delivery_location: "Jaipur Mandi",
    notes: "High oil content lot.",
    history_7d: [5650, 5620, 5600, 5550, 5500, 5450, 5400],
    lifecycle: ["draft", "confirmed"],
    dispatches: [],
    quality_lot: { moisture: 6.8, grade: "A", foreign_matter: 1.0, price_adjustment: 0 }
  }
];

export const demoMtmRows = demoContracts.map(c => ({
  contract_number: c.contract_number,
  type: c.type,
  commodity: c.commodity,
  quantity: c.quantity,
  unit: c.unit,
  contract_price: c.contract_price,
  market_price: c.market_price,
  unrealized_pnl: c.unrealized_pnl,
  status: c.status,
  id: c.id
}));

export const demoAgentActivity = [
  {
    id: "act-1",
    agent_name: "Risk Agent",
    summary: "Re-calculated portfolio MtM values for 8 contracts. Identified 3 high-loss items.",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago
  },
  {
    id: "act-2",
    agent_name: "Weather Agent",
    summary: "Precipitation spike (42mm) detected in Amravati. Logged potential transport delay for CTR-2026-001.",
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 mins ago
  },
  {
    id: "act-3",
    agent_name: "Macro Signal Agent",
    summary: "Scanned Google News and AGMARKNET. Found bullish market sentiment for Cotton due to unseasonal rains.",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() // 3 hours ago
  },
  {
    id: "act-4",
    agent_name: "Contract Agent",
    summary: "Parsed and created draft contract CTR-2026-008 from voice recording note.",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() // 6 hours ago
  },
  {
    id: "act-5",
    agent_name: "Ingestion Agent",
    summary: "Extracted structure fields from uploaded PDF receipt from Balaji Agro Industries.",
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() // 8 hours ago
  }
];

export const demoMacroSignals = [
  { id: "sig-1", commodity: "Cotton", sentiment: "bull", key_signal: "Unseasonal rains in Vidarbha crop zone likely to shrink production yields by 12%.", updated_at: "2h ago" },
  { id: "sig-2", commodity: "Soybean", sentiment: "bear", key_signal: "Aggressive domestic sowing reports and high import supply from South America.", updated_at: "4h ago" },
  { id: "sig-3", commodity: "Groundnut", sentiment: "neutral", key_signal: "Market arrivals align perfectly with seasonal demand averages.", updated_at: "1h ago" },
  { id: "sig-4", commodity: "Onion", sentiment: "bull", key_signal: "Mandi supply cuts across Lasalgaon due to export tariff relaxations.", updated_at: "3h ago" },
  { id: "sig-5", commodity: "Chilli", sentiment: "bear", key_signal: "Bumper harvest output reports in Guntur markets suppressing spot prices.", updated_at: "5h ago" }
];

