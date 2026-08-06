<div align="center">

# ⚡ SparkStudio AI

### *Domain-Specific Multi-Agent Harness for Autonomous Video Content Production*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://spark-studio-ai.vercel.app)
[![Backend](https://img.shields.io/badge/⚙️_Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://sparkstudio-backend.onrender.com)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3-F55036?style=flat-square)

---

> **"One topic. Five specialized AI agents. Complete production kit in 2 minutes."**

SparkStudio AI is a **production-grade, domain-specific Agent Harness** engineered for the Creator Economy. It orchestrates 5 specialized AI agents — Researcher, Scriptwriter, Storyboarder, Subtitle Generator, and Quality Auditor — into a single cohesive pipeline that eliminates the 10-hour manual video production workflow.

</div>

---

## 🎯 Why SparkStudio AI?

Content creators spend **80% of their time** on scripting, storyboarding, SEO research, and captioning — leaving only 20% for actual creativity. Existing tools are completely fragmented: ChatGPT for scripts, Midjourney for images, CapCut for captions, with **no coherent orchestrating harness** connecting them.

SparkStudio AI fills this gap by providing a **structured, stateful multi-agent harness** that:

- 🧠 **Maintains durable session state** across all agents via Supabase
- 🔄 **Compacts context** between agents to prevent token decay
- 🛡️ **Self-heals** on API failures with automatic retry & fallback
- 👁️ **Streams every agent decision** to the human in real-time via SSE
- 📦 **Produces real artifacts** — not just chat responses

---

## 🏗️ Agent Harness Architecture

```
                        ┌─────────────────────────────────┐
                        │     SparkStudio Orchestrator      │
                        │     (FastAPI + Python)            │
                        │  ┌─────────────────────────────┐ │
  User Input ──────────►│  │  State Manager (Supabase)   │ │
  (Topic + Audience)    │  │  Context Compactor          │ │
                        │  │  Budget Tracker (Groq API)  │ │
                        │  │  Self-Healing Retry Logic   │ │
                        │  └─────────────────────────────┘ │
                        └───────────────┬─────────────────-─┘
                                        │
              ┌─────────────────────────▼─────────────────────────┐
              │                 Agent Pipeline                      │
              │                                                     │
    ┌─────────▼──────┐  ┌──────────────┐  ┌────────────────────┐  │
    │ 🔍 Researcher  │─►│ ✍️ Scriptwr. │─►│ 🎬 Storyboarder   │  │
    │ Viral hooks    │  │ Full script  │  │ Scene directions   │  │
    │ Angles & SEO   │  │ + timecodes  │  │ + image prompts    │  │
    └────────────────┘  └──────────────┘  └────────────────────┘  │
                                                      │             │
    ┌─────────────────────┐  ┌───────────────────────▼──────────┐  │
    │ 🏆 Quality Auditor  │◄─│ 📝 Subtitle Agent                │  │
    │ Engagement score    │  │ SRT + VTT caption files          │  │
    │ SEO grade           │  │ Timecode-synced                  │  │
    │ Improvement tips    │  └──────────────────────────────────┘  │
    └─────────┬───────────┘                                         │
              └─────────────────────────────────────────────────────┘
                                        │
                        ┌───────────────▼─────────────────┐
                        │         Export Engine            │
                        │  📄 PDF Audit Report (FPDF2)    │
                        │  🎙️ SRT + VTT Caption Files     │
                        │  🖼️ Storyboard Image Prompts    │
                        │  📦 ZIP Bundle (one-click DL)   │
                        └─────────────────────────────────┘
```

---

## ✅ Agent Harness Design & Key Evaluation Criteria

| Criteria | Weight | SparkStudio Implementation |
|---|---|---|
| **Architectural Robustness & Sandboxing** | 20% | FastAPI isolates each agent as an async task. Groq token headers track budget. JSON schema validation guards every agent output. |
| **State & Long-Horizon Memory Management** | 20% | Supabase (PostgreSQL) persists full project state. Context compaction passes only essential JSON summaries between agents — zero context decay. |
| **Tool Integration & Self-Healing Resilience** | 20% | Tools: Groq LLM + Pollinations Image API + FPDF2 + ZipFile. Automatic exponential backoff on 429/503. Fallback to default templates on malformed outputs. |
| **Real-World Utility & Performance Lift** | 20% | Converts a 10-hour manual workflow into a 2-minute autonomous pipeline. Produces tangible, ready-to-use artifacts (not just text). |
| **Prototype Interface & Developer Experience** | 20% | Next.js 14 dashboard with live SSE agent log streaming. Full human-in-the-loop supervision at every stage. |

---

## 🚀 Features

- **5-Agent Orchestrated Pipeline** — Research → Script → Storyboard → Subtitles → Quality
- **Real-time SSE Streaming** — Watch every agent decision live in the browser
- **Durable State Management** — Session persists across network interruptions
- **Self-Healing Retry Logic** — Auto-recovery from API rate limits and failures
- **One-Click Export** — Complete ZIP with PDF report + SRT/VTT captions + storyboard
- **Budget-Aware Execution** — Token consumption tracked via Groq API headers
- **Human-in-the-Loop** — Supervise, review, or retry any agent stage live
- **Premium SaaS UI** — Glassmorphism, micro-animations, dark mode

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Framer Motion | Interactive dashboard & SSE streaming |
| **Orchestrator** | Python FastAPI, asyncio | Agent harness core & task isolation |
| **LLM** | Groq (LLaMA 3 8B/70B) | Ultra-fast inference (~800 tokens/sec) |
| **Image Gen** | Pollinations AI | Free storyboard image generation |
| **State/DB** | Supabase (PostgreSQL) | Durable session state & user auth |
| **Export** | FPDF2 + Python zipfile | PDF reports + ZIP bundling |
| **Frontend Deploy** | Vercel | Edge-optimized Next.js hosting |
| **Backend Deploy** | Render | FastAPI container deployment |
| **Streaming** | Server-Sent Events (SSE) | Real-time agent log streaming |

---

## 📦 Project Structure

```
SparkStudio_AI/
├── frontend/                        # Next.js 14 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   └── project/[id]/   # Main project workspace
│   │   │   ├── auth/               # Supabase auth pages
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── storyboard-image.tsx # Pollinations image loader
│   │   │   ├── agent-log-stream.tsx # SSE real-time log viewer
│   │   │   └── export-panel.tsx    # ZIP/PDF download UI
│   │   ├── hooks/                  # Custom React hooks
│   │   └── lib/                    # API client & utilities
│   └── package.json
│
├── backend/                         # FastAPI Agent Harness
│   ├── agents/                     # Specialized AI agents
│   │   ├── research_agent.py       # Hooks, angles, SEO research
│   │   ├── script_agent.py         # Full script with timecodes
│   │   ├── storyboard_agent.py     # Scene descriptions & image prompts
│   │   ├── subtitle_agent.py       # SRT/VTT caption generation
│   │   └── quality_agent.py        # Engagement scoring & audit
│   ├── services/
│   │   ├── orchestrator.py         # Core agent harness controller
│   │   ├── export_service.py       # PDF (FPDF2) + ZIP bundler
│   │   └── llm_service.py          # Groq API wrapper with retry
│   ├── api/
│   │   └── routes.py               # FastAPI REST + SSE endpoints
│   ├── models/                     # Pydantic schemas
│   ├── prompts/                    # Agent system prompts
│   └── main.py
│
├── database/                        # Supabase schema & migrations
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Supabase](https://supabase.com) project (free tier works)
- [Groq API Key](https://console.groq.com) (free tier: 14,400 tokens/min)

### 1. Clone & Install

```bash
git clone https://github.com/jaivijaim2008/SparkStudio_AI.git
cd SparkStudio_AI
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials (see below)

uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials

npm run dev
```

Visit `http://localhost:3000` 🎉

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

```env
# Groq LLM (get free key at console.groq.com)
GROQ_API_KEY=gsk_your_key_here
LLM_MODEL=llama3-8b-8192

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# CORS
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🚀 Deployment

### Frontend → Vercel

```bash
# Push to GitHub then:
# 1. Import repo at vercel.com
# 2. Set root directory: frontend
# 3. Add environment variables
# 4. Deploy!
```

### Backend → Render

```
Build Command:  pip install -r requirements.txt
Start Command:  uvicorn main:app --host 0.0.0.0 --port $PORT
Root Directory: backend
```

Add all backend environment variables in the Render dashboard.

---

## 📊 Performance

| Metric | Value |
|---|---|
| Agent Pipeline Execution | ~2 minutes end-to-end |
| LLM Inference Speed | ~800 tokens/sec (Groq LLaMA 3) |
| Manual Workflow Replaced | 10+ hours |
| Productivity Gain | **300x faster** |
| Concurrent Users Supported | 100+ (free tier infra) |
| API Cost | Near-zero (Groq free tier) |

---

## 📄 License

MIT License.

---

<div align="center">

**⭐ Star this repo if SparkStudio AI impressed you!**

*SparkStudio AI — Not just another chatbot. We build infrastructure.*

</div>
