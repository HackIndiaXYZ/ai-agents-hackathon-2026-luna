# TradeNexus — Complete Frontend Page Specifications

Every page, every component, every data point. Use this as the definitive reference for the UI build.

---

## Navigation Structure

```
PUBLIC
  /                    Landing page
  /auth/login          Login
  /auth/signup         Signup

APP (protected, AppLayout)
  /app/dashboard       Command Center
  /app/contracts       Contract Book
  /app/contracts/new   New Contract
  /app/risk            Risk & P&L Dashboard
  /app/markets         Market Intelligence
  /app/dispatch        Dispatch Intelligence
  /app/inventory       Inventory & Positions
  /app/opportunities   Trade Opportunities
  /app/counterparties  Counterparty CRM
  /app/compliance      Compliance & Documents
  /app/quality         Quality Lots
  /app/network         Supply Chain Network
  /app/analytics       Business Analytics
  /app/learning        Adaptive Learning
  /app/settings        Settings

GLOBAL (floats above all app pages)
  Lucy Copilot         Cmd+K or bottom-right button
```

**Sidebar navigation groups:**
```
📊 OPERATIONS        Contract Book · Dispatch · Inventory
💰 RISK & P&L        Risk Dashboard · Market Intelligence
🤝 RELATIONSHIPS     Opportunities · Counterparties
📋 COMPLIANCE        Compliance · Quality Lots
🧠 AI INTELLIGENCE   Trade Advisor · Learning Activity · Analytics · Network
⚙️  Settings
```

---

## Page 1: Landing Page `/`

**Purpose:** Convert a visiting trader. Must feel like a funded startup, not a student project.

### Section A — Sticky Navbar
- TradeNexus logo (green leaf + wordmark)
- Nav links: Product | How It Works | Datasets | About
- Right: Sign In (ghost) + Get Started (green CTA)
- On scroll >60px: white background + shadow

### Section B — Hero (full viewport)
- Eyebrow badge: `✦ AI-Native CTRM · Multilingual · Adaptive Learning`
- H1 (word-by-word stagger animation):
  - "India's First" — light
  - "Autonomous CTRM" — bold, green
  - "for Commodity Traders" — light
- Subtitle (600px max-width, centered, muted):
  > "From mandi prices to mark-to-market P&L — TradeNexus gives India's 400,000 commodity traders enterprise-grade intelligence at ₹2,000/month. Speaks Hindi. Thinks in quintals. Understands kapas."
- CTA row: "Start Trading Smarter →" (green) + "View Live Demo →" (ghost)
- Trust row: `✓ 3,000+ Mandis · ✓ 9 Indian Languages · ✓ 30 Trading Intents · ✓ Real-time P&L`
- Hero visual: Animated mock MtM table showing 4 contract rows with P&L values counting up/down in real time. One row flips red→green. Subtle float animation.

### Section C — Ticker (social proof)
- Dark green background, infinite horizontal scroll
- "Live cotton prices from 3,000+ mandis" · "Kapas = Cotton, automatically" · "Route confidence updated hourly" · "Powered by Adaption multilingual AI" · "247 regional commodity aliases" · repeat

### Section D — How It Works
- Heading: "From raw signal to settled contract"
- 4-step horizontal flow with connecting SVG arrows:
  1. **Capture** (Scan icon) — "Speak, type, or upload. Lucy understands Hindi, English, Hinglish, and 9 regional languages. WhatsApp note → contract draft in seconds."
  2. **Analyze** (BarChart3) — "Live mandi prices across 3,000+ markets. LSTM-powered 7-day price forecast. Anomalies detected automatically."
  3. **Risk** (Shield) — "Mark-to-Market P&L updated every hour. XGBoost counterparty default risk. Weather-linked dispatch alerts."
  4. **Decide** (Brain) — "Qwen synthesizes everything. One recommendation. In your language."
- Cards animate in with stagger on scroll (whileInView)

### Section E — Feature Grid (6 cards)
1. **Mark-to-Market P&L** — "Know exactly where you stand. Live unrealized P&L vs current mandi prices for every open contract."
2. **LSTM Price Forecasting** — "7-day price forecasts trained on 180+ days of AGMARKNET data. Confidence bands included. MAPE displayed."
3. **4-Tier Commodity Resolution** — "Kapas. Sarso. Gehu. Narma. Harbhara. Our cascade resolves 800+ regional aliases in under 100ms."
4. **Lucy AI Copilot** — "Voice-enabled trade operations. Speaks Hindi, English, Hinglish. Understands what you mean, not just what you say."
5. **Weather-Linked Dispatch** — "Open-Meteo 7-day forecasts linked to active shipments. Route risk automatically updated."
6. **First-Mile Compliance** — "PDF invoice → structured data in 3 seconds. GST calculator, HSN lookup, e-way bill preparation."

### Section F — Comparison Table
`TradeNexus vs Eka vs Mindsprint vs Spreadsheets`
Rows: Starting price · Target user · Hindi support · AI Copilot · First-mile capture · Setup time · Mobile-first

### Section G — Live Stats (animated counters on scroll)
- Dark navy background
- `3,247+` mandis monitored · `9` Indian languages · `1,629` multilingual intent examples · `82%` Adaption quality improvement

### Section H — CTA Section
- "Ready to trade smarter?"
- Subtle green gradient background
- Two CTAs + link to HuggingFace dataset

### Section I — Footer
4-column: Brand · Product links · Technology stack · Hackathon credits (Adaption logo + link)

---

## Page 2: Login `/auth/login`

**Layout:** 50/50 split screen

**Left panel** (dark green gradient #14532d → #16a34a):
- TradeNexus logo (white)
- Large trader quote:
  > "₹6,820/quintal in Nagpur. I knew before anyone else."
  > — Ramesh P., Cotton Trader, Vidarbha
- 3 trust badges below

**Right panel** (white, centered form):
- "Welcome back"
- "Sign in to your TradeNexus account"
- Email + Password inputs (styled)
- Sign In button (full width, green)
- "Don't have an account? Sign up"
- Demo note badge: "Demo: enter anything and press Sign In"
- Form fields stagger in on mount

---

## Page 3: Signup `/auth/signup`

Same split layout, right panel:
- Name + Email + Password
- "I'm a commodity trader" checkbox
- Region selector (Indian states)
- Create Account button
- Success state → redirect
- Left panel quote is different

---

## Page 4: Command Center Dashboard `/app/dashboard`

**The first thing a trader sees. Must feel alive, data-rich, immediately actionable.**

### Header
- "Good morning, Ramesh" + current date/time (updates every minute)
- "8 open contracts · ₹34.2L exposure · Last updated: just now"

### Row 1 — 4 Stat Cards (animate in staggered 0.1s each)
| Card | Value | Delta |
|------|-------|-------|
| Total Exposure | ₹34,20,000 | 8 open contracts |
| Today's P&L | -₹1,46,000 (red) | 3 winning · 5 losing |
| In Transit | 2 dispatches | Next arrival: tomorrow |
| Risk Alerts | 3 active (red) | Weather + market signals |

### Row 2 — MtM P&L Table (most important component)
- Title: "Live Mark-to-Market" + "Recalculate" button
- Columns: Contract # · Type badge · Commodity · Qty · Contract ₹ · Market ₹ · Unrealized P&L · Status · Action
- Green left border = profitable row
- Red left border = losing row
- P&L column: +₹47,200 or -₹1,26,000 with color
- Sort: P&L ascending (worst losses first)
- 8 rows max + "View all in Risk Dashboard →"
- Loading skeleton: 8 rows animated pulse

### Row 3 — Two columns (60/40)
**Left: Active Alerts (last 8)**
- Combined market + risk + weather alerts
- Each row: colored dot + message + time ago + dismiss
- Types: 🔴 risk · 🟡 demand_spike · 🔵 weather_risk · 🟣 sentiment
- "View all →" footer

**Right: Agent Activity Log (last 24h)**
- Title: "AI Agents — last 24 hours"
- Each entry: agent name chip (colored) + summary + time
- Chips: Risk Agent (blue) · Weather Agent (teal) · Macro Signal (purple) · Contract Agent (green) · Adaptive Learning (orange)
- Auto-refreshes every 5 minutes
- Shows real agent actions with specific data: "MtM calculated for 8 contracts. Best: TN-2026-0006. Worst: TN-2026-0005 -₹1,26,000"

### Row 4 — Three columns
**Commodity Exposure** (Recharts PieChart):
- Portfolio % per commodity
- Click slice → /app/contracts?commodity=X

**Dispatches In Transit**:
- 3-4 most recent dispatches
- Progress bar: dispatch_date → estimated_arrival
- Weather risk badge per dispatch
- "Schedule dispatch →" CTA

**Market Sentiment Feed**:
- Latest macro signals per commodity
- Bull ↑ (green) · Bear ↓ (red) · Neutral → (gray)
- Key signal sentence
- Last updated timestamp

### Row 5 — Full Width: Quick Trade Entry (Field Note Parser)
- Card: "Field Note → Contract"
- Textarea placeholder: "Try: Ramesh se 50 quintal kapas liya 6400 rupaye..."
- Submit: "Parse & Create Draft"
- Language detected badge (auto-detect)
- On result: parsed fields preview card inline
- Confirm button creates contract

---

## Page 5: Contract Book `/app/contracts`

**The operational core of the CTRM.**

### Filter Bar
- Status pills: All | Draft | Confirmed | In Transit | Delivered | Settled
- Commodity dropdown (20 options)
- Type toggle: All / Buy / Sell
- Date range: Last 7d / 30d / 90d / All
- Search box: contract number or counterparty
- "New Contract" (primary green, right-aligned)

### Contract Table
Sortable columns:
- Contract # · Date · Type (BUY/SELL badge) · Commodity · Counterparty · Quantity · Value (₹) · Status badge · Unrealized P&L · Actions

P&L column: color-coded, +/- prefix. Most important sorting column.
Status badges: Draft (gray) · Confirmed (blue) · In Transit (amber) · Delivered (green) · Settled (teal) · Cancelled (red)

Row actions: View 👁 · Edit ✏️ · Invoice 📄
Row click: opens detail drawer (slide from right, 480px)

**Empty state:** "No contracts yet. Create your first trade." with CTA

### Contract Detail Drawer (480px, slides from right)
**Header:** TN-2026-0006 · SELL badge · Confirmed · [✕]

**Section 1 — Contract Details:**
Grid: Type · Commodity · Quantity · Price/unit · Total value · Counterparty · Contract date · Delivery date · Delivery location · Payment terms · Notes

**Section 2 — Mark-to-Market:**
- Contract price vs current market price (large, colored)
- Unrealized P&L in very large text
- "Per quintal: ₹420 favorable"
- 7-day P&L sparkline (Recharts, tiny)

**Section 3 — Lifecycle Timeline:**
Horizontal step indicator: Draft → Confirmed → In Transit → Delivered → Settled
Current step highlighted. Completed = green checkmark.
"Advance Status" button below timeline.

**Section 4 — Dispatches:**
List of attached dispatches with status + ETA
"Schedule Dispatch" button if confirmed

**Section 5 — Quality Lot (if exists):**
Moisture % · Grade · Foreign matter % · Price adjustment applied

**Section 6 — Compliance:**
"Generate Invoice" → opens invoice view
"View Full Page →" link

---

## Page 6: New Contract Form `/app/contracts/new`

**Two-column layout, full page.**

### Left Column — Primary Fields
- BUY / SELL toggle (large, prominent, green/blue)
- Commodity search:
  - Live alias resolution as you type
  - ResolutionBadge appears: "Cotton ✓ Resolved via Semantic Match"
  - Confidence score shown
- Counterparty: search + "Add new counterparty" inline
- Quantity input + Unit select (quintal / kg / tonne)
- Price type: Fixed / Formula
  - Fixed: ₹ per unit input
  - Formula: "Mandi modal ± %" inputs
- Delivery date (date picker)
- Delivery location (city input)

### Right Column — Preview + Intelligence
- Payment terms (text)
- Notes (textarea)

**Live Contract Preview card:**
- Auto-updates as fields fill
- Estimated contract value (qty × price)
- "Contract: TN-2026-XXXX (auto)"

**Counterparty Risk Badge (appears when counterparty selected):**
- "Reliability: 87% — Low Risk ✓" (green)
- OR "⚠ High Risk — 3 late deliveries in 90 days" (amber)
- Powered by XGBoost default risk model

**ML Price Forecast widget (appears when commodity resolved):**
- "Current market: ₹6,420/quintal"
- "7-day forecast: ₹6,680 (+4.1% predicted)"
- Tiny sparkline chart with dashed forecast extension
- "LSTM model · 847 real data rows · MAPE 4.2%"
- Model credibility badge (compact)

**Submit buttons:**
- "Save as Draft" (secondary)
- "Create & Confirm" (primary green)

---

## Page 7: Risk & P&L Dashboard `/app/risk`

**The most data-dense page. For the trader who wants to know exactly where they stand.**

### Top Row — Portfolio Health (3 large stat cards)
- Total Unrealized P&L (large, colored)
- Portfolio Concentration: "Cotton 72% ⚠" (warning if >60%)
- Worst Performer: "TN-2026-0005 · -₹1,26,000 · Cotton"

### Main Section — Full MtM Table
- All contracts (not just 8 like dashboard)
- Additional columns: Days to Delivery · Delivery Location · Price Forecast trend arrow
- Export as CSV button (client-side)
- Sort by any column
- Color-coded rows (green/red border)

### Price Forecast Section
- Commodity selector dropdown
- Recharts LineChart:
  - Historical: solid green line
  - Forecast: dashed green line (lighter)
  - Confidence band: filled area (lower/upper bounds)
  - Vertical "Today" line
  - Anomaly dots: larger amber circles
- Below chart: Model Credibility Card:
  - "LSTM · 847 real rows · 100% real data · MAPE 4.2%"
  - Training period, data sources
  - Full credibility statement (judge-ready)

### Signals — Two columns
**Weather Signals:**
- List from `/risk/signals?type=weather_risk`
- Region + risk description + affected dispatches count
- Click: expands to 7-day forecast table for that region

**Market Sentiment:**
- Per-commodity sentiment (bull/bear/neutral)
- Confidence score + urgency
- Key signal sentence
- Affected contracts count

### Counterparty Risk Table
- All counterparties with ML risk scores
- Columns: Name · Type · Trades · On-Time % · Risk Level · Open Exposure · ML Risk Score
- Color: green (<30% risk) · amber (30-60%) · red (>60%)
- XGBoost model output + feature importances on expand

### Data Quality Panel
- "Training Data Integrity" heading
- Per-commodity horizontal bar showing real data %
- 100% real = solid green · <100% = amber segment shown

---

## Page 8: Market Intelligence `/app/markets`

**Live mandi price intelligence with anomaly detection and ML forecasting.**

### Filter Row
- Commodity select (20 options, with alias hint: "Cotton (Kapas, Narma, कपास)")
- State filter (all Indian states)
- Date range: Today / Last 3d / Last 7d / Last 30d
- "Refresh Prices" button with spinner state

### AI Summary Card (appears after commodity selected)
- Green left border, light green background
- Brain icon + "Market Intelligence Note"
- 2-3 sentence Qwen-generated trading insight
- Specific mandi name, price, trend direction
- "Data confidence: 94% · Data as of: 4 Jun 2026"
- "Generated by Qwen 3.5 (NVIDIA API)" attribution

### Anomaly Alert Row
- Horizontal scrollable pill cards
- Each: commodity + mandi + price + delta % + type badge
- Subtle pulse animation on the dot
- Click: highlights that row in the table below

### Basis Risk Card (if open contracts exist for this commodity)
- "Your open contracts vs current market"
- Mini table: Contract # · Contract Price · Market Price · Basis Risk %
- Green = favorable (market moved in your favor)
- Red = unfavorable

### Main Price Table
Sortable columns:
- Mandi · State · Min ₹ · Modal ₹ · Max ₹ · Date · Trend arrow · Status badge

Status: Normal (gray) · ⚠ Anomaly (amber) · ↑ Spike (red) · ↓ Drop (blue)
Anomaly rows: amber left border + amber row tint
Row hover: "View details →"
Pagination: 20 rows per page

### Charts Row — Two columns
**7-Day Price Trend** (Recharts LineChart):
- Modal price over 7 days, green curve
- Tooltip: date + price + delta from previous day
- Anomaly points: larger amber dot + label
- "Trend: +6.2% over 7 days"

**Top 5 Mandis by Price** (Recharts BarChart horizontal):
- Bars darkest green = highest price
- Mandi name + modal price label
- Click bar → filter table to that mandi

### Price Forecast Section (below charts)
- "7-Day Price Outlook" for selected commodity
- Recharts AreaChart with confidence band
- ModelCredibilityBadge (compact): "[LSTM · 847 rows · 100% real · MAPE 4.2%]"

### Macro Sentiment Card (right)
- Current sentiment for selected commodity
- Large bull/bear/neutral icon
- Confidence percentage
- Factors list (up to 3)
- Key signal sentence

---

## Page 9: Dispatch Intelligence `/app/dispatch`

**Route scoring, dispatch management, and weather-aware corridor intelligence.**

### Top — Route Scorer
- Two large inputs: From (origin city) · To (destination city)
- Indian city autocomplete (20 major agricultural cities)
- "Score This Route" button
- Loading: skeleton pulse while API call

**Result Card (animates in):**

Left: ConfidenceGauge SVG (200px, arc)
- 0-40%: rose arc + "High Risk"
- 40-70%: amber arc + "Moderate"
- 70-100%: green arc + "Reliable"
- Score animates from 0 to target on mount

Middle: Stats 2×2 grid
- Distance: "428 km"
- Est. Duration: "8.2 hours"
- Delay Risk: Low/Medium/High badge
- Recent Reports: "2 this week"

Right: Recommendation text
- "This corridor is performing well. Travel time within 5% of typical. Low delay risk this week."
- Weather badge: if rain forecast → "⚠ Heavy rain forecast Tuesday" (amber)
- If weather risk: alternative route card below

### Active Dispatches Table
Columns: Dispatch # · Contract · Commodity · Route · Qty · Status · ETA · Weather Risk · Days Late
- Status badges with colors
- Weather Risk: 🌧 icon if weather signal exists
- Days Late column: 0 (green) · 1-2 (amber) · 3+ (red)
- Click row: expand inline detail with full dispatch info

### Schedule New Dispatch (collapsible panel)
- Contract selector (confirmed contracts only)
- Quantity (auto-fills, editable)
- Vehicle number + driver contact
- Dispatch date
- Auto-selects corridor from contract delivery location
- Shows route confidence score before confirming
- Submit → creates dispatch + updates contract status

### Corridor Intelligence Table
All monitored corridors:
Columns: Origin → Destination · Distance · Typical Hours · Reliability bar · Weather · Recent Reports
- Reliability bar: colored progress bar
- Weather: live from weather agent
- Click row: auto-fills Route Scorer above + scrolls up

### Report a Delay (collapsible)
- Corridor select + Delay hours + Reason text + Submit
- "Help other traders — report a delay you experienced"
- After submit: "Thank you! This improves route intelligence for everyone."

---

## Page 10: Inventory & Positions `/app/inventory`

**Two tabs: Physical Inventory · Open Positions**

### Tab 1 — Physical Inventory

**Header Stat Row (3 cards):**
- Total Inventory Value (market price × quantity)
- Total Quantity (quintals, all commodities)
- Commodities Tracked: 5

**Inventory Table:**
Columns: Commodity · Quantity (q) · Unit · Current Market Price · Market Value (₹) · Last Updated · Action

- Market Value = quantity × current modal price (live calculation)
- Total row at bottom (portfolio value)
- "Update Inventory" button per row → inline form (add/subtract/set + notes)
- Color: green if value up today, red if down

**Quick Update Widget:**
- Commodity select + Quantity + Operation (add/subtract/set)
- "Lucy can do this via voice: say '50 quintal kapas add kar de'"
- Submit → calls inventory endpoint

### Tab 2 — Open Positions

**What it shows:** Aggregate of all open contracts per commodity.

**Position Table:**
Columns: Commodity · Total Bought (q) · Total Sold (q) · Net Position · Avg Buy Price · Avg Sell Price · Net P&L (₹) · Status

Net Position: positive = net long (green), negative = net short (red)
Status: "Long — rising market ✓" or "Exposed — falling market ⚠"

**Position Summary Chart** (Recharts BarChart):
- Horizontal bars showing net position per commodity
- Green = net long, Red = net short
- Reference line at 0

---

## Page 11: Trade Opportunities `/app/opportunities`

**Find return loads, post forward opportunities, discover buyers.**

### Top Row — 2 Stat Cards
- Open Opportunities: count
- Return Loads Available: count

### Filter Row
- Type: All / Forward Load / Return Load
- Commodity dropdown
- Origin state filter
- "Post New Opportunity" (primary green, right-aligned)

### Opportunity Cards Grid (2 columns)
Each card:
- Top badge: "RETURN LOAD" (amber) or "FORWARD LOAD" (green)
- Commodity name + quantity + unit
- Route: "Amravati → Mumbai" with arrow →
- Available from date
- Contact: partially masked "Contact via TradeNexus"
- Posted: "2 hours ago"
- "Express Interest" button (secondary) → shows full contact in modal

Animate in on mount with stagger. New cards slide in at top.

### Post Opportunity Modal (AnimatePresence, slides up)
- Commodity select (20 options)
- Origin + Destination inputs
- Quantity + Unit
- Available from (date picker)
- Return load toggle (with label explanation)
- Contact info
- Submit → POST + card appears in grid with "Posted!" animation

---

## Page 12: Counterparty CRM `/app/counterparties`

**Know who you're trading with.**

### Header Stat Row
- Total Counterparties · Average Reliability · High Risk (red count) · Total Open Exposure (₹)

### Counterparty Table
Columns: Name · Type (buyer/seller/both) · City/State · Total Trades · On-Time % · Reliability bar · Open Exposure · ML Risk Score · Actions

Reliability bar: colored (green >80%, amber 60-80%, red <60%)
ML Risk Score: XGBoost probability badge
Click row: opens detail panel (right drawer)

### Counterparty Detail Panel (480px drawer)
- Name + type + contact (GSTIN, phone)
- Reliability score (large, colored)
- ML risk prediction: "23% default probability — Low Risk"
- XGBoost top risk factors: "Payment history: 0.87, Corridor reliability: 0.74..."
- Trade history table: last 10 contracts with outcome
- Open contracts list
- "View all contracts →" link

### Add Counterparty
- Inline form via "Add Counterparty" button
- Name · Type · City/State · GSTIN · Contact
- Instantly searchable after add

---

## Page 13: Compliance & Documents `/app/compliance`

**Three tabs: Document Extraction · Invoice Generator · Field Note Parser**

### Tab 1 — Document Extraction

**Upload Zone:**
- Large dashed drop zone (drag-and-drop + click)
- Upload icon + "Drop invoice PDF here · or click to browse"
- Supported: PDF, JPG, PNG · Max 10MB
- On file selected: file name + size + "Extract Data" button

**Processing Animation (2-3 seconds):**
Sequential loading messages:
"Reading document..." → "Extracting fields..." → "Validating GST..." → "Complete ✓"

**Extraction Result (two columns):**

Left — "Extracted Fields" table:
| Field | Value | Confidence |
|-------|-------|-----------|
| Invoice Number | INV-2026-08421 | High ✓ |
| GSTIN (Seller) | 27AAPCS1234M1Z5 | High ✓ |
| GSTIN (Buyer) | 24BBBCS4321N2Y6 | High ✓ |
| Commodity | Cotton (Raw) | High ✓ |
| HSN Code | 5201 | High ✓ |
| Quantity | 40 Quintals | High ✓ |
| Invoice Value | ₹2,72,800 | High ✓ |
| Tax Amount | ₹4,910.40 | Medium |
| E-way Bill Required | Yes | High ✓ |
Each row editable inline (click to edit)

Right — "Compliance Check":
- ✅ GSTIN format valid
- ✅ HSN code recognized (5201 — Raw Cotton)
- ✅ Invoice value matches line items
- ⚠️ E-way bill required for >50km transport
- ✅ Tax calculation appears correct
- "Compliance Score: 94%" (large green text)
- "Create Contract from Invoice" button
- "Export Structured Data" button (downloads JSON)

### Tab 2 — Invoice Generator

- Contract selector (confirmed/delivered contracts)
- On select: shows structured invoice preview
- Invoice preview card:
  - Header: TradeNexus Invoice
  - Seller info (GSTIN, address)
  - Buyer info
  - Commodity + HSN + quantity + rate + taxable value
  - GST breakdown: CGST 2.5% + SGST 2.5% (intra-state) OR IGST 5% (inter-state)
  - Total invoice value
  - Quality adjustment applied if quality lot exists
- "Print Invoice" (window.print())
- "Download as PDF" (browser print dialog)
- Print CSS: sidebar/topbar hidden on print

### Tab 3 — Field Note Parser

- Large textarea
- Placeholder: "Enter a field note in any language..."
- Example chips (click to autofill):
  - "Ramesh se 50 quintal kapas liya 6400 rupaye"
  - "Sold 30 quintals soybean to Pune traders at 4800"
  - "Moisture in cotton lot was 14%, some foreign matter"
- Language: auto-detected badge
- Submit: "Parse Note"
- Result: pre-filled form with extracted fields (editable)
- "Create Contract" or "Update Inventory" CTA

---

## Page 14: Quality Lots `/app/quality`

**First-mile data capture. GPS-tagged, quality-scored inventory batches.**

### Explanation Banner
Light blue card: "Quality tracking creates a digital record of commodity condition at origin — enabling accurate pricing, ESG compliance, and dispute resolution."

### New Quality Lot Form (top)

Two-column layout:
- Contract selector (confirmed/in-transit)
- Commodity + Quantity + Unit
- Moisture % slider (0-30%):
  - <10%: green indicator "✓ Within standard"
  - 10-14%: amber "⚠ Slightly elevated"
  - >14%: red "✗ Above standard"
- Grade selector: Grade A / B / C / Mixed
- Foreign matter % (0-10%)
- Broken grains % (0-10%)
- Origin location text
- "Use Current Location" button (navigator.geolocation)
- Field agent note (textarea)

**Live Price Adjustment Preview (updates as sliders move):**
```
Base price:           ₹6,400/quintal
Moisture (12.4%):     -2.4% → -₹154
Foreign matter (1.8%): -0.8% → -₹51
Grade B:              -3.0% → -₹192
─────────────────────────────────────
Adjusted price:       ₹6,003/quintal
```

Submit: creates quality lot + links to contract

### Quality Lots Table
Columns: Lot ID · Contract · Commodity · Qty · Grade badge · Moisture % · Foreign matter % · Price Adj% · Origin · Date

Grade badges: A (green) · B (amber) · C (red) · Mixed (gray)
Click row: expand inline with map location (if GPS captured) + full details

---

## Page 15: Supply Chain Network `/app/network`

**D3.js force-directed visualization of your entire trade network.**

### Controls Row
- Show/hide toggles: [✓] Contracts [✓] Dispatches [✓] Opportunities
- Commodity filter dropdown
- Status filter
- "Reset view" button

### The Graph (full width, 560px height)
Built with D3 force simulation.

**Node types:**
- Inventory locations: circle, size = quantity, green
- Buyer/counterparty: diamond (rotated square), size = contract value, blue
- Mandi: square, size = trade volume, amber

**Link types:**
- Profitable contract: solid green line, width = value
- Losing contract: solid red line, width = value
- Active dispatch: animated dashed blue line (moving dot)
- Opportunity: dotted line, lighter opacity

**Interactions:**
- Hover node: tooltip (name, type, value, status)
- Click node: navigates to relevant page
- Drag nodes: repositions
- Scroll: zoom in/out
- Click link: shows contract/dispatch detail in sidebar panel

**Legend (top-left):**
Node shapes + link types with labels

**Empty state:** "No active trades yet. Create your first contract to see your network."

---

## Page 16: Business Analytics `/app/analytics`

**P&L reports, trade performance, counterparty analytics.**

### Date Range Selector
Last 7d / 30d / 90d / All time — affects all sections

### Section 1 — P&L Summary (4 cards)
- Realized P&L (settled contracts): ₹X
- Unrealized P&L (open contracts): ₹X
- Total Trades: N
- Win Rate: N%

**Monthly P&L Chart** (Recharts BarChart):
- Bars colored green/red by positive/negative
- Tooltip: month + P&L + trade count

### Section 2 — Commodity Performance Table
Columns: Commodity · Contracts · Volume (q) · Avg Buy ₹ · Avg Sell ₹ · Net P&L · Best Trade · Worst Trade
Click row: drill-down to all contracts for that commodity

### Section 3 — Counterparty Analytics Table
Columns: Counterparty · Trades · Total Value · On-Time % · Avg Delay (days) · Total P&L from trades · Risk Level
Sort by Total Value desc default

### Section 4 — Trade Velocity Chart (Recharts LineChart)
- New contracts per week (14 weeks)
- Settled contracts per week
- "Days to Settlement" trend line

### Section 5 — Adaptive Learning Metrics
Card: "TradeNexus Intelligence Growth"
- Total aliases in corpus: 847
- Corrections processed this week: N
- Tier breakdown bar chart (horizontal Recharts):
  - Exact: 312 · Trigram: 89 · Embedding: 34 · LLM: 8
- Languages covered: 9
- "This week: N contracts processed by AI, N risk alerts generated, N weather signals detected"
- Adaption logo + "Powered by Adaption Adaptive Data"

---

## Page 17: Adaptive Learning `/app/learning`

**Showcase of the Adaptive Data integration. This is the Adaption track story page.**

### Hero Stats Row (4 cards)
- Intent Corpus Size: 1,629 examples
- Languages Covered: 9
- Intents Learned: 30
- Aliases in Corpus: 847+

### Section 1 — Resolution Tier Activity
**Live resolution funnel** (last 7 days):
```
Input queries:  ████████████████████████ 412 total
Exact match:    ████████████████ 247 (59.9%)   < 1ms
Trigram match:  ████████ 89 (21.6%)            < 10ms
Embedding match:████ 58 (14.1%)               < 100ms
LLM fallback:   ██ 18 (4.4%)                  2-4s
```
Recharts BarChart showing tier counts per day (7-day view)

### Section 2 — Intent Corpus Explorer
- Language filter (9 options)
- Intent category filter
- Search box
- Table: utterance · language · intent · difficulty · source
- Source badges: seed_english (gray) · adaption_translated (blue) · hinglish_handcrafted (purple)
- "847 examples shown" count

### Section 3 — Adaption Pipeline Status
Timeline card:
- ✅ 217 seed examples created
- ✅ Uploaded to Adaption (Dataset ID: xxx)
- ✅ Adaptation complete (Grade B → Grade A)
- ✅ Quality improvement: +X%
- ✅ 1,539 multilingual rows downloaded
- ✅ 90 Hinglish examples added
- ✅ 1,629 examples embedded (pgvector)
- ✅ Published to HuggingFace + Kaggle
- 🔄 Next pipeline run: [date]

Each step has timestamp and brief description.
"View dataset on HuggingFace →" button
"View dataset on Kaggle →" button

### Section 4 — Recent Corrections Feed
Table: Original input · Resolved to · Method · Language · Time
- Each row: a real correction that improved the system
- "These corrections feed the next Adaption pipeline run"

### Section 5 — Commodity Alias Browser
- Filter by language
- Filter by commodity
- Table: alias · canonical name · language · region · confidence · source
- Source: seed / adaption_translated / user_correction / llm_inferred

---

## Page 18: Settings `/app/settings`

**Four sections, all read-only in demo mode.**

### Section 1 — Profile
Name · Email · Region · Preferred language
"Demo Mode" badge next to each field

### Section 2 — Notification Preferences
Toggle switches:
- Price spike alerts (on)
- Route delay warnings (on)
- New trade opportunities (on)
- Weekly market digest (off)
- Counterparty default warnings (on)

### Section 3 — Language & Region
- UI language: English | हिंदी | मराठी | ગુજરાતી
- Commodity unit: Quintal | Kg | Tonne
- Home state: dropdown (affects mandi ranking)

### Section 4 — About This Demo
Gray background card:
- "TradeNexus was built for the AI Agents Hackathon 2026 — Adaption Track"
- Architecture summary (4 bullet points)
- Tech stack highlights
- Links: GitHub · HuggingFace Dataset · Kaggle Dataset
- "Adaptive Data Track — powered by Adaption" with logo
- Team credits

---

## Global Component: Lucy AI Copilot

**Floats above all pages. Triggered by Cmd+K or bottom-right button.**

### Lucy Button (always visible, bottom-right)
- Idle: green pill "🤖 Ask Lucy"
- Listening: pulsing green circle + mic icon
- Processing: amber spinner
- Speaking: green volume wave animation

### Lucy Full-Screen Mode (React Portal)
Background: rgba(15, 23, 42, 0.95), dims everything behind

**Header:**
Lucy avatar (animated green circle) + "Lucy" + "Trade Copilot" + "📊 Back to Dashboard" + [✕]

**Inventory Banner (first open):**
Slim green bar: "Your inventory: Cotton 600q · Soybean 120q · Pigeon Pea 80q" [✕]

**Conversation Area (scrollable):**
- User bubbles: right-aligned, green background
- Lucy bubbles: left-aligned, white, green left border
  - Response text (rendered markdown)
  - Execution timeline (collapsed by default, expandable)
  - Inline result cards: MtM card / forecast chart / buyer list / confidence gauge
  - "View Contract →" / "Open full page →" buttons

**Execution Timeline (while processing):**
- Steps tick through with minimum display time (0.5-0.9s per step)
- Agents with colored icons:
  - 🔵 Commodity Intelligence
  - 🟢 Market Intelligence
  - 🟤 Dispatch Intelligence
  - 🟣 ML Inference
  - 🟠 Ingestion Agent
  - 🔴 Risk Agent
  - 🔵 Trade Advisor
- Each step: agent name + detail + duration_ms
- "Retrieved 3 similar examples · 91% confidence" (RAG indicator)

**Idle State (no messages):**
- Lucy avatar centered, floating animation
- "Good morning, Ramesh · Your inventory: Cotton 600q..."
- 3 example chips:
  - "What's my P&L today?"
  - "Kapas ke liye best mandi?"
  - "Cotton forecast next week"
- Row 2: "Schedule dispatch" · "Parse field note" · "Market sentiment"

**Voice Input Area (fixed bottom, 80px):**
- Center: large mic button (56px)
  - Idle: microphone icon
  - Listening: stop icon + pulsing ring
- Left: ⌨ text input toggle
- Right: 🔊 voice on/off
- Language pill: "हिं/EN" (auto) | "हिं" | "EN"
- Live transcript shows above when listening

---

## Feature-Data Status Reference

Quick reference for demo preparation and judge questions.

| Feature | Real or Demo | Notes |
|---------|-------------|-------|
| Mandi prices | **Real** | data.gov.in API, updated every 30min |
| Price anomaly detection | **Real** | Statistical, 1.5σ threshold |
| LSTM forecasting | **Real** | Trained on AGMARKNET history |
| Weather forecasts | **Real** | Open-Meteo API, free, no key |
| Route scoring | **Real** | Google Routes API v2 |
| Market sentiment | **Real AI** | Qwen daily analysis |
| Contract management | **Real** | Full lifecycle, Supabase |
| MtM P&L | **Real** | Calculated vs live prices |
| Counterparty risk (ML) | **Real ML** | XGBoost, trained on delivery history |
| Invoice generation | **Real** | GST calculation correct |
| OCR document parsing | **Real** | PyMuPDF + Tesseract + Qwen |
| Lucy voice (Hindi) | **Real** | Web Speech API |
| Lucy intent classification | **Real** | RAG + Qwen |
| Buyer discovery | **Demo (seeded)** | 30 realistic seeded buyers |
| MCX/NCDEX prices | **Demo** | Exchange data costs money |
| NIC e-way bill filing | **Demo** | Shows form, doesn't submit |
| WhatsApp integration | **Demo** | Mock interface, same NLP |
| Historical price charts | **Real** | CEDA Ashoka + data.gov.in |
| Model credibility metrics | **Real** | MAPE from actual test evaluation |
| Adaption dataset | **Real** | Traceable dataset_id, real grades |
| RAG retrieval | **Real** | pgvector similarity search |