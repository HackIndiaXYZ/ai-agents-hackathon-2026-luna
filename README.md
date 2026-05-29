# TradeNexus

Multilingual Commodity Intelligence Platform for Indian Markets

TradeNexus is a production-grade commodity intelligence layer designed to assist Indian agricultural and commodity traders in optimization of sales, dispatch schedules, and geographic market selection. By integrating multi-agent AI workflows and real-time market data, TradeNexus translates complex regional market signals into clear, actionable trade recommendations.

---

## Project Overview

Agricultural and commodity trading in India operates across highly fragmented regional markets (mandis), where price discovery is obscured by varied regional naming conventions, languages, and dialects. A commodity like Cotton is referred to as Kapas (कपास) in Hindi, Kaapus (कापूस) in Marathi, and Paruthi (பருத்தி) in Tamil.

TradeNexus resolves this fragmentation by establishing an adaptive, multilingual intelligence framework. The platform enables traders to query market conditions using their regional terminology, normalizing these inputs into canonical representations, and running multi-agent analysis to determine:
- **Optimal Sales Destination**: Where a commodity will yield the highest net margin, accounting for geographic price spreads.
- **Optimal Dispatch Timing**: When to ship inventory based on historical price patterns, regional holiday calendars, and current market momentum.
- **Logistics & Compliance Feasibility**: Route viability, transportation metrics, and interstate APMC regulatory compliance requirements.

---

## Core AI Agents

The platform uses a decoupled multi-agent architecture to distribute specialized analysis tasks:

- **Adaptive Agent**: Resolves regional commodity names to canonical standards. Builds a dynamic alias graph based on linguistic inputs and user correction feedback loops.
- **Market Agent**: Conducts price discovery, historical trend analysis, and regional market profiling using structured agricultural database sources.
- **Opportunity Agent**: Evaluates arbitrage windows, geographical price spreads, and sudden demand-supply mismatches.
- **Dispatch Agent**: Calculates optimal dispatch scheduling, logistics lead times, and weather/route constraints.
- **Compliance Agent**: Validates regulatory frameworks, interstate transport mandates, and APMC (Agricultural Produce Market Committee) compliance checklist inputs.

---

## System Architecture

TradeNexus is architected as a clean, decoupled monorepo comprised of three primary layers:

1. **Frontend Presentation Layer**: A fast, responsive React Single Page Application (SPA) utilizing Vite for build optimization and Tailwind CSS for interface styling.
2. **Backend Services Layer**: An asynchronous FastAPI service managing routing, state serialization, external API integrations, and the orchestration of the five core AI agents.
3. **Adaptive Pipeline Layer**: An offline data pipeline responsible for exporting user corrections, running batch adaptation algorithms, and re-importing updated alias weights into the system cache.

External integrations include:
- **Nvidia AI Foundation Endpoints**: Powering reasoning workflows using `qwen/qwen3.5-397b-a17b`.
- **Supabase**: Providing managed PostgreSQL storage for canonical mappings, trade corridors, and user state.
- **Upstash Redis**: Providing a high-performance REST-based caching layer for external API responses and computed agent plans.

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
| | Task Scheduling | APScheduler |
| | HTTP Client | httpx |
| **Database** | Primary Database | Supabase (PostgreSQL client) |
| | Cache Layer | Upstash Redis (REST API client) |
| **LLM Engine**| Inference Provider | Nvidia AI (qwen/qwen3.5-397b-a17b) |

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
│       ├── data_ingestion/         # External API clients
│       ├── core/                   # Shared database and Redis clients
│       ├── models/                 # ORM schema models
│       ├── schemas/                # Pydantic schemas
│       └── requirements.txt
│
├── pipeline/                       # Offline adaptation data pipeline
│   ├── export_aliases.py
│   ├── run_adaptation.py
│   └── import_results.py
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

To configure local or production instances, define the following keys in your environment or a `.env` file at the project root:

| Variable | Description | Source |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Endpoint URI for Supabase PostgreSQL database | Supabase Dashboard |
| `SUPABASE_KEY` | Public service/anon key for Supabase client authorization | Supabase Dashboard |
| `UPSTASH_REDIS_REST_URL` | Base URI for Upstash REST client | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Bearer authorization token for Upstash Redis | Upstash Console |
| `NVIDIA_API_KEY` | Developer authorization key for Nvidia build endpoints | Nvidia Build Portal |
| `NVIDIA_MODEL` | Identifier for target Nvidia LLM model | Default: `qwen/qwen3.5-397b-a17b` |
| `DATA_GOV_API_KEY` | API authorization key for open Indian datasets | data.gov.in portal |
| `ADAPTION_API_KEY` | Custom validation key for pipeline execution | Internal configuration |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for distance matrix | Google Cloud Console |
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

---

## Roadmap

- **Phase 1: Foundation & Configuration Scaffolding (Current)**
  - Establish monorepo workspace patterns and config parsing.
  - Set up unified UI styling patterns and translation dictionaries.
  - Implement basic schema routing and server health checkers.

- **Phase 2: Agent Design & LLM Integration**
  - Implement full context parsing and prompt template design.
  - Integrate Nvidia AI endpoints to orchestrate agent reasoning cycles.
  - Establish agent-to-agent communication protocols.

- **Phase 3: Real-Time Data Ingestion & Caching**
  - Connect client pipelines to active data.gov.in resources.
  - Design Upstash Redis caching structures to optimize agent turnaround metrics.
  - Integrate maps distance matrix for routing optimization.

- **Phase 4: Optimization, Localization & Release**
  - Validate and expand translation directories to Marathi, Gujarati, Telugu, and Tamil.
  - Scale database index schemas to handle large-scale concurrent transaction volumes.
  - Package production-grade container builds.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
