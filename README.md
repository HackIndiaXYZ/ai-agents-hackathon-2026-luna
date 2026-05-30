# TradeNexus

Multilingual Commodity Intelligence Platform for Indian Markets

TradeNexus is a production-grade commodity intelligence layer designed to assist Indian agricultural and commodity traders in optimization of sales, dispatch schedules, and geographic market selection. By integrating multi-agent AI workflows, real-time market data, and local multilingual semantic search, TradeNexus translates complex regional market signals into clear, actionable trade recommendations.

---

## Project Overview

Agricultural and commodity trading in India operates across highly fragmented regional markets (mandis), where price discovery is obscured by varied regional naming conventions, languages, and dialects. A commodity like Cotton is referred to as Kapas (कपास) in Hindi, Kaapus (कापूस) in Marathi, and Paruthi (பருத்தி) in Tamil.

TradeNexus resolves this fragmentation by establishing an adaptive, multilingual intelligence framework. The platform enables traders to query market conditions using their regional terminology, normalizing these inputs into canonical representations, and running multi-agent analysis to determine:
- **Optimal Sales Destination**: Where a commodity will yield the highest net margin, accounting for geographic price spreads.
- **Optimal Dispatch Timing**: When to ship inventory based on historical price patterns, regional transport routes, and current mandi momentum.
- **Logistics & Compliance Feasibility**: Route viability, transportation metrics, and interstate APMC regulatory compliance requirements.

---

## System Architecture

TradeNexus utilizes a **hybrid deterministic/cognitive multi-agent flow** to maximize speed and accuracy while minimizing API costs and cognitive latency. Zero-LLM statistical agents perform deterministic calculations in parallel, feeding their structured telemetry data into a central cognitive advisor agent for a single-pass LLM synthesis.

### Core Architecture Flow

```
                      +-----------------------------+
                      |     User Regional Query     |
                      +--------------+--------------+
                                     |
                                     v
                  +------------------+------------------+
                  |  Commodity Intelligence Agent (4-Tier) |
                  +------------------+------------------+
                                     |
                                     | (Canonical Term, e.g., Cotton)
                                     v
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
+------+------+               +------+------+               +------+------+
| MarketAgent |               |DispatchAgent|               | Opportunity |
|  (Zero-LLM) |               |  (Zero-LLM) |               |    Agent    |
| Statistical |               |   Routing   |               |  (Zero-LLM) |
| Mandi Prices|               |  Google v2  |               |  Arbitrage  |
+------+------+               +------+------+               +------+------+
       |                             |                             |
       +-----------------------------+-----------------------------+
                                     |
                                     v (Structured Telemetry Feed)
                              +------+------+
                              | Compliance  |
                              |    Agent    | <--- Nvidia LLM (Permits)
                              +------+------+
                                     |
                                     v
                              +------+------+
                              |TradeAdvisor |
                              |    Agent    | <--- Nvidia LLM (Synthesis)
                              +------+------+
                                     |
                                     v
                        +------------+------------+
                        | Final Executive Report  |
                        +-------------------------+
```

---

## Core AI Agents

The platform uses a decoupled six-agent layout to distribute specialized analysis tasks:

1. **Commodity Intelligence Cascade**: Resolves regional commodity terms (Hindi, Marathi, Gujarati, Telugu, Tamil, etc.) to canonical forms using a sub-100ms 4-Tier fallback model.
2. **Market Intelligence Agent**: Zero-LLM agent that calculates price averages, min/max metrics, traded volumes, and weekly price trends deterministically across Indian mandis.
3. **Dispatch Planning Agent**: Zero-LLM logistics agent that queries the Google Routes API v2 client and computes route utility metrics, fuel indexes, and trucking fees deterministically.
4. **Opportunity Finder Agent**: Zero-LLM agent that evaluates geographic price spreads, performs transportation margin calculations, and identifies profitable arbitrage windows.
5. **Compliance Checker Agent**: Cognitive LLM agent that processes unstructured regulatory texts and extracts permit requirements, APMC cess/fees, and FSSAI quality checklists.
6. **Trade Advisor Agent**: Central orchestrator that fetches structured telemetry from the deterministic agents and triggers a single-pass Nvidia LLM synthesis to compile final trading recommendations.

---

## Linguistic Resolution Cascade

To resolve agricultural dialects at scale without incurring heavy LLM pricing or latency overheads, TradeNexus utilizes a 4-Tier fallback cascade:

```
[Tier 1: SQL Exact Match]           ---------> Match Found (~5ms)
       | (Miss)
       v
[Tier 2: Trigram Similarity]        ---------> Match Found (~15ms)
       | (Miss)
       v
[Tier 3: Multilingual Vector]       ---------> Match Found (~40ms) (sentence-transformers)
       | (Miss)
       v
[Tier 4: Nvidia LLM Fallback]       ---------> Match Found (~1.5s) (qwen3.5-397b-a17b)
```

1. **Tier 1: SQL Exact Match**: Performs case-insensitive checks against cached alias records.
2. **Tier 2: Trigram Similarity**: Uses trigram string comparisons (`pg_trgm`) to capture spelling variations and typos.
3. **Tier 3: Semantic Vector Match**: Generates a 384-dimensional vector embedding of the regional query locally using `paraphrase-multilingual-MiniLM-L12-v2` and searches `pgvector` records.
4. **Tier 4: Nvidia LLM Fallback**: Invokes `qwen/qwen3.5-397b-a17b` to resolve rare and highly contextual regional crops. Successful matches are asynchronously logged to the feedback loop for future Tier 1 resolution.

---

## Technology Stack

| Layer | Component | Technology Selection |
| :--- | :--- | :--- |
| **Frontend** | Core framework | React 19 + Vite |
| | Styling | Tailwind CSS |
| | State Management | Zustand |
| | Internationalization | i18next + react-i18next |
| | Data Visualization | Recharts |
| **Backend** | API framework | FastAPI (Python 3.11) |
| | Settings & Schemas | Pydantic v2 + Pydantic Settings |
| | Local Embeddings | sentence-transformers (`paraphrase-multilingual-MiniLM-L12-v2`) |
| | HTTP Client | httpx |
| **Database** | Primary Database | Supabase (PostgreSQL client + `pgvector` / `pg_trgm`) |
| | Cache Layer | Upstash Redis (REST API client) |
| **LLM Engine**| Inference Provider | Nvidia AI Foundation Endpoints (`qwen/qwen3.5-397b-a17b`) |

---

## Project Structure

```
tradenexus/
├── apps/
│   └── web/                        # React + Vite frontend
│       ├── src/
│       │   ├── pages/              # View components
│       │   ├── components/
│       │   │   ├── ui/             # Reusable UI primitives
│       │   │   └── agents/         # Agent-specific dashboards
│       │   ├── hooks/              # Custom React hooks
│       │   ├── store/              # Zustand global state stores
│       │   ├── lib/                # Client library initializations
│       │   └── i18n/               # Translation dictionary JSONs
│       ├── package.json
│       └── vite.config.js
│
├── services/
│   └── api/                        # FastAPI backend
│       ├── main.py                 # Application entrypoint
│       ├── routers/                # API endpoints
│       ├── agents/                 # AI agent definitions
│       ├── data_ingestion/         # External API clients (data.gov.in, Google Routes)
│       ├── core/                   # Shared database, LLM provider, and embedding service
│       ├── models/                 # ORM schema models
│       ├── schemas/                # Pydantic schemas
│       ├── scripts/                # Database and pgvector maintenance scripts
│       └── requirements.txt
│
├── pipeline/                       # Offline adaptation data pipeline
│   ├── export_aliases.py           # Exports feedback events to JSONL
│   ├── run_adaptation.py           # Submits alias data to Adaption Labs SDK
│   └── import_results.py           # Upserts refined aliases back to Supabase
│
├── data/
│   └── seeds/                      # Structural database seeds
│       ├── commodity_aliases.csv   # Pre-seeded regional name mappings
│       └── trade_corridors.csv     # Major interstate transport routes
│
├── docs/                           # Architecture and schema documentation
│   └── architecture.md
│
├── .env.example                    # Local setup environment template
└── README.md                       # Repository entry documentation
```

---

## Environment Variables

Configure local or production instances by defining the following keys in your environment or a `.env` file at the project root:

| Variable | Description | Source |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Endpoint URI for Supabase PostgreSQL database | Supabase Dashboard |
| `SUPABASE_KEY` | Public service/anon key for Supabase client authorization | Supabase Dashboard |
| `UPSTASH_REDIS_REST_URL` | Base URI for Upstash REST client | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Bearer authorization token for Upstash Redis | Upstash Console |
| `LLM_PROVIDER` | Selection of LLM engine | Options: `nvidia` (default), `mock` |
| `NVIDIA_API_KEY` | Developer authorization key for Nvidia build endpoints | Nvidia Build Portal |
| `NVIDIA_MODEL` | Target Nvidia LLM model | Default: `qwen/qwen3.5-397b-a17b` |
| `INTERNAL_KEY` | Secret token to authorize internal pipeline hooks | Custom random string |
| `DATA_GOV_API_KEY` | API authorization key for open Indian datasets | data.gov.in portal |
| `ADAPTION_API_KEY` | Custom validation key for pipeline execution | Adaption Labs platform |
| `GOOGLE_ROUTES_API_KEY` | Google Routes v2 API key | Google Cloud Console |
| `ENVIRONMENT` | Target execution environment | Options: `development`, `production` |

---

## Setup and Local Development

### Prerequisites
- **Node.js** >= 18.x
- **Python** >= 3.11
- **npm** (included with Node.js)

### Initial Repository Configuration
1. Clone the repository to your local workspace.
2. Initialize the environment configuration file:
   ```bash
   cp .env.example .env
   ```
3. Populate the required API keys within the generated `.env` file.

### Backend Services Execution
1. Navigate to the api service workspace directory:
   ```bash
   cd services/api
   ```
2. Establish a Python virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   - **Windows**: `.venv\Scripts\activate`
   - **macOS/Linux**: `source .venv/bin/activate`
4. Install backend library dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Launch the FastAPI application instance:
   ```bash
   uvicorn main:app --reload
   ```
6. Access interactive API documentation at `http://localhost:8000/docs` and verify server health via the `/health` endpoint.

### Frontend Development Execution
1. Navigate to the frontend workspace directory:
   ```bash
   cd apps/web
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the presentation layer at `http://localhost:5173`.

---

## Adaptive Data Pipeline Loop

The multilingual dialect mappings are continually refined through a 4-step execution loop to correct spelling drift and capture new colloquial commodity names:

1. **Export**: Run `python pipeline/export_aliases.py` to dump user feedback and unresolved alias signals from Supabase/Redis to a standardized JSONL format.
2. **Adapt**: Run `python pipeline/run_adaptation.py` to submit the exported alias dataset to the **Adaption Labs Platform SDK**, cluster matching dialects, and download refined canonical mappings.
3. **Import**: Run `python pipeline/import_results.py` to read the refined dataset and upsert clean records back into the `commodity_aliases` Supabase table.
4. **Rebuild**: Run `python services/api/scripts/build_embedding_index.py` to update the local embedding calculations and synchronize the `pgvector` store in Supabase.

---

## Roadmap

- **Phase 1: Foundation & Configuration Scaffolding (Completed)**
  - Establish monorepo workspace patterns and config parsing.
  - Set up unified UI styling patterns and translation dictionaries.
  - Implement basic schema routing and server health checkers.

- **Phase 2: Hybrid Agent Design & LLM Integration (Completed)**
  - Implement zero-LLM deterministic Market, Dispatch, and Opportunity agents.
  - Integrate Nvidia AI endpoints to orchestrate Compliance and TradeAdvisor cognitive agents.
  - Establish the 4-Tier Linguistic Resolution Cascade (SQL -> Trigram -> Vector -> LLM).
  - Transition maps integrations to the modern Google Routes API v2.

- **Phase 3: Real-Time Data Ingestion & Caching (In Progress)**
  - Connect client pipelines to active data.gov.in resources.
  - Design Upstash Redis caching structures to optimize agent turnaround metrics.

- **Phase 4: Release & Localization**
  - Validate and expand translation directories to Marathi, Gujarati, Telugu, and Tamil.
  - Scale database index schemas to handle large-scale concurrent transaction volumes.
  - Package production-grade container builds.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
