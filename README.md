# Voyager — Production-Ready Multi-AI Agent Trip Planner

> A production-grade multi-AI agent travel planning system built with **TaskflowAI** and a custom **FastAPI + Vanilla JS frontend**. Enter a destination, travel dates, and interests — three specialised agents orchestrate research, weather, flights, and generate a complete travel briefing.

---

## What's New (Latest Changes)

- **Custom Web Frontend** — replaced Streamlit with a hand-crafted dark-theme UI (`frontend/index.html`) featuring animated skeleton loaders, card-based layout, and image rendering
- **FastAPI Backend** — `frontend/server.py` exposes REST endpoints (`/research/destination`, `/research/events`, `/research/weather`, `/research/flights`, `/report`) with async threading so the server stays responsive during long agent calls
- **Switched LLM to Groq** — agents now use `llama-3.3-70b-versatile` via Groq inference instead of OpenAI GPT-3.5 Turbo
- **Wikipedia User-Agent fix** — patched `WikipediaTools` to send a proper `User-Agent` header, resolving 403 Forbidden errors on image/article searches
- **Windows UTF-8 fix** — server runs with `PYTHONUTF8=1` and sanitises all agent output before returning JSON
- **`from_root` removed** — logger now uses `pathlib.Path` directly, eliminating the `from_root` package dependency
- **`.gitignore` updated** — added `log/`, `*.egg-info/`, `.vscode/`, temp files, and secrets patterns

---

## Architecture

### Agent Pipeline (sequential)

All three agents are initialised once at server startup and invoked per request via `asyncio.to_thread()` with a semaphore to prevent concurrent calls.

```
User Request
     │
     ▼
WebResearchAgent ──► Destination Report
     │
     ▼
WebResearchAgent ──► Events Report
     │
     ▼
TravelAgent      ──► Weather Report
     │
     ▼
TravelAgent      ──► Flight Options
     │
     ▼
TravelReportAgent ──► Final Travel Plan (markdown)
```

| Agent | File | Tools |
|---|---|---|
| **WebResearchAgent** | `src/agentic/agents/web_research_agent.py` | SerperSearch, WikiArticles, WikiImages |
| **TravelAgent** | `src/agentic/agents/travel_agent.py` | GetWeatherData, SearchFlights |
| **TravelReportAgent** | `src/agentic/agents/reporter_agent.py` | — (aggregates context) |

### Stack

| Layer | Technology |
|---|---|
| LLM | Groq `llama-3.3-70b-versatile` |
| Agent framework | TaskflowAI |
| Backend API | FastAPI + Uvicorn |
| Frontend | Vanilla HTML/CSS/JS (single file, no framework) |
| Search | Serper API |
| Weather | Weather.com API |
| Flights | AviationStack API |
| Images | Wikimedia Commons |

---

## Project Structure

```
├── .github/workflows/
│   └── deploy.yml               # CI/CD → AWS ECR + EC2
├── deployment/
│   └── app.py                   # Legacy Streamlit UI (kept for reference)
├── frontend/
│   ├── index.html               # Main frontend (self-contained HTML/CSS/JS)
│   └── server.py                # FastAPI backend — serves UI + API endpoints
├── docs/
│   ├── Agentic RAG Pipeline.md
│   └── Types of Agentic RAG.md
├── flowcharts/
│   └── project_pipeline.jpg
├── log/                         # Agent log files (gitignored)
├── notebooks/
│   └── TripPlanner_Multi_AI_Agent_Experimental.ipynb
├── src/agentic/
│   ├── agents/
│   │   ├── reporter_agent.py
│   │   ├── travel_agent.py
│   │   └── web_research_agent.py
│   ├── exception/
│   │   └── __init__.py
│   ├── logger/
│   │   └── __init__.py          # Uses pathlib (no from_root dependency)
│   ├── tools/
│   │   ├── get_weather_data.py
│   │   ├── search_articles.py
│   │   ├── search_flights.py
│   │   ├── search_images.py
│   │   └── serper_search.py
│   └── utils/
│       └── main_utils.py        # Loads Groq llama-3.3-70b-versatile
├── .gitignore
├── demo.py
├── requirements.txt
├── setup.py
└── template.py
```

---

## Environment Setup

Python 3.10+ recommended (Conda or venv):

```bash
conda create -p your_env_name python=3.10
conda activate your_env_path
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
WEATHER_API_KEY=your_weather_api_key
SERPER_API_KEY=your_serper_api_key
AVIATIONSTACK_API_KEY=your_aviationstack_api_key
```

> **Note:** Get a free Groq API key at [console.groq.com](https://console.groq.com). The free tier has a 100,000 token/day limit — each full trip plan uses ~5,000–10,000 tokens.

---

## Running the App

### Custom Frontend (recommended)

```bash
# From project root
PYTHONUTF8=1 python -m uvicorn frontend.server:app --port 8000
```

Then open **http://localhost:8000** in your browser.

### Legacy Streamlit UI

```bash
python -m streamlit run deployment/app.py
```

---

## Docker

```bash
docker build \
  --build-arg GROQ_API_KEY=... \
  --build-arg WEATHER_API_KEY=... \
  --build-arg SERPER_API_KEY=... \
  --build-arg AVIATIONSTACK_API_KEY=... \
  -t voyager-tripplanner .

docker run -p 8000:8000 voyager-tripplanner
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the frontend UI |
| `POST` | `/research/destination` | Destination info + images |
| `POST` | `/research/events` | Events & activities |
| `POST` | `/research/weather` | Weather forecast |
| `POST` | `/research/flights` | Top 3 flight options |
| `POST` | `/report` | Full combined travel plan |

All `POST` endpoints accept:

```json
{
  "departure": "Mumbai",
  "destination": "Tokyo",
  "dates": "Dec 20-25, 2025",
  "interests": "food, temples, nature"
}
```

---

## Deployment (AWS)

CI/CD via GitHub Actions (`.github/workflows/deploy.yml`):

1. Checkout latest code from `main`
2. Build Docker image with API keys as build args
3. Authenticate to AWS and push image to ECR
4. SSH into EC2, pull latest image, restart container

**Prerequisites:**
- AWS account with ECR repository and EC2 instance
- API keys stored as GitHub Secrets
- EC2 key pair PGP key added to GitHub Secrets
- Self-hosted GitHub Actions runner configured on EC2

See `scripts.sh` for Docker and runner setup commands.

---

## Known Limitations

| Issue | Notes |
|---|---|
| Groq free tier limit | 100k tokens/day — resets daily. Upgrade at console.groq.com for higher limits |
| Sequential agent calls | Each section loads one after another (~1–2 min total) due to rate limit buffers |
| Wikipedia 403 | Fixed via User-Agent header patch in `taskflowai` WikipediaTools |
| Windows encoding | Fixed via `PYTHONUTF8=1` and UTF-8 sanitisation of agent output |

---

## Contributing

Discussions and pull requests are welcome. Feel free to fork and use this project in your portfolio.

Framework docs: [TaskflowAI Documentation](https://www.taskflowai.org/)

---

## License

Licensed under the **MIT License** — free to use, modify, and share with proper attribution. See [LICENSE](LICENSE) for details.
