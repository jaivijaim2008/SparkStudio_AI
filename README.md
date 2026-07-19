# CreatorPilot AI

> **"One Prompt. Complete Content Production."**

CreatorPilot AI is a multi-agent AI production copilot that converts a single idea into a complete content creator package — scripts, storyboards, thumbnails, SEO optimization, subtitles, voice direction, and quality reports.

![CreatorPilot AI](https://img.shields.io/badge/CreatorPilot-AI-blueviolet?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)

---

## 🚀 Features

- **9 AI Agents** working in a production pipeline
- **One-click generation** — enter your idea, get everything
- **Real-time progress** — watch agents work via Server-Sent Events
- **Export everything** — PDF reports, SRT subtitles, ZIP packages
- **Premium SaaS UI** — glassmorphism, animations, dark/light mode
- **Demo mode** — works without AI models for instant hackathon demos

## 🏗️ Architecture

```
User Input → Research Agent → Script Writer → Storyboard Agent
           → Thumbnail Agent → SEO Agent → Subtitle Agent
           → Voice Agent → Quality Agent → Publisher Agent → Export
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.11 |
| AI | Ollama (Qwen2.5:7B) — swappable to OpenAI/Gemini |
| Database | Supabase (Auth + PostgreSQL) |
| Deployment | Vercel (Frontend) + Docker (Backend) |

## 📦 Project Structure

```
AI_CREATOR_COPILOT/
├── frontend/                  # Next.js 15 App
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   └── lib/              # Utilities & API client
│   └── package.json
├── backend/                   # FastAPI Backend
│   ├── agents/               # 9 AI agents
│   ├── services/             # Orchestrator, LLM, Export
│   ├── api/                  # REST API routes
│   ├── models/               # Pydantic schemas
│   ├── prompts/              # Agent system prompts
│   └── main.py
├── database/                  # Supabase schema
├── docker-compose.yml
└── README.md
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- Python 3.11+
- Ollama (optional — demo mode works without it)

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

### Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn main:app --reload --port 8000
```

### Ollama Setup (Optional)

```bash
# Install Ollama from https://ollama.ai
ollama pull qwen2.5:7b
ollama serve
```

## 🔧 Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)

```env
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=qwen2.5:7b
LLM_PROVIDER=ollama
DEMO_MODE=true
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
CORS_ORIGINS=http://localhost:3000
```

## 🐳 Docker

```bash
docker-compose up --build
```

## 🚀 Deployment

### Vercel (Frontend)

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy!

### Backend (Render/Railway)

1. Create new web service
2. Point to `backend/` directory
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

## 📄 License

MIT License — built for the Creator Tools & Copilots Hackathon.
