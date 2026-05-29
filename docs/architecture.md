# TradeNexus — Architecture

## Overview

TradeNexus is a multilingual commodity trader intelligence platform for Indian markets. It helps traders decide **where to sell**, **when to dispatch**, and **which markets are profitable**.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Dashboard │ │ Markets  │ │ Dispatch │ │Opportun. │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘       │
│                         │ Axios                          │
└─────────────────────────┼───────────────────────────────┘
                          │ REST API
┌─────────────────────────┼───────────────────────────────┐
│                    FastAPI Backend                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Market   │ │ Dispatch │ │Opportun. │ │Compliance│   │
│  │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘       │
│                         │                                │
│              ┌──────────┴──────────┐                     │
│              │  Adaptive Agent     │  ← Core             │
│              │  (Multilingual NLP) │    Differentiator    │
│              └──────────┬──────────┘                     │
│                         │                                │
│  ┌──────────┐  ┌────────┴──────┐  ┌──────────┐          │
│  │data.gov  │  │  Nvidia API   │  │Google Maps│          │
│  │  Client  │  │  (Qwen-3.5)   │  │  Client   │          │
│  └──────────┘  └───────────────┘  └──────────┘          │
└─────────────────────────┼───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────┴────┐     ┌──────┴─────┐    ┌─────┴────┐
   │Supabase │     │  Upstash   │    │data.gov  │
   │(Postgres)│    │  Redis     │    │   .in    │
   └─────────┘     └────────────┘    └──────────┘
```

## Key Components

### Frontend (`apps/web/`)
- **React 19** with Vite for fast HMR
- **TailwindCSS** for utility-first styling
- **Zustand** for lightweight state management
- **i18next** for Hindi/English UI translations
- **Recharts** for market data visualization

### Backend (`services/api/`)
- **FastAPI** with async/await throughout
- **5 AI Agents**: Market, Dispatch, Opportunity, Compliance, Adaptive
- **Nvidia Qwen qwen/qwen3.5-397b-a17b** powers the agents via OpenAI compatible Nvidia API
- **Supabase** (PostgreSQL) for persistent storage
- **Upstash Redis** (REST) for caching and rate limiting

### Adaptive Learning Pipeline (`pipeline/`)
- Offline batch processing of alias corrections
- Exports → Processes → Imports updated alias mappings
- Continuous improvement of multilingual commodity resolution

## Data Flow

1. **User searches** for a commodity in any Indian language
2. **Adaptive Agent** resolves the regional name to canonical form
3. **Market Agent** fetches prices from data.gov.in and Supabase
4. **Opportunity Agent** identifies arbitrage and demand spikes
5. **Dispatch Agent** recommends optimal timing and routes
6. **Compliance Agent** validates regulatory requirements
7. **Results** rendered in the user's preferred language
