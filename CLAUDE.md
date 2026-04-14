# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready multi-AI agent trip planning system built with **TaskflowAI**. Users enter a destination, travel dates, and interests; the system orchestrates three specialized agents in sequence to produce a comprehensive travel report with destination info, events, weather, and flights.

## Environment Setup

Python 3.10+ with Conda is recommended:

```bash
conda create -p your_env_name python=3.10
conda activate your_env_path
pip install -r requirements.txt
```

Create a `.env` file in the project root with the following keys:

```
OPENAI_API_KEY=
WEATHER_API_KEY=
SERPER_API_KEY=
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
```

## Running the App

```bash
# Run the Streamlit UI (main entry point)
streamlit run deployment/app.py

# Run the demo script
python demo.py
```

## Docker

```bash
docker build \
  --build-arg OPENAI_API_KEY=... \
  --build-arg WEATHER_API_KEY=... \
  --build-arg SERPER_API_KEY=... \
  --build-arg AMADEUS_API_KEY=... \
  --build-arg AMADEUS_API_SECRET=... \
  -t tripplanner .

docker run -p 8501:8501 tripplanner
```

The Dockerfile exposes port 8501 and runs `deployment/app.py`.

## Architecture

### Agent Pipeline (sequential)

All agents are initialized at app startup in `deployment/app.py` and tasks are created via `Task.create(agent=..., context=..., instruction=...)`.

1. **WebResearchAgent** (`src/agentic/agents/web_research_agent.py`) — handles destination research and events research. Tools: `SerperSearch` (web search via Serper API), `WikiArticles` (Wikipedia articles), `WikiImages` (Wikipedia images).

2. **TravelAgent** (`src/agentic/agents/travel_agent.py`) — handles weather and flight queries. Tools: `GetWeatherData` (Weather.com API via `WebTools`), `SearchFlights` (Amadeus API via `AmadeusTools`).

3. **TravelReportAgent** (`src/agentic/agents/reporter_agent.py`) — aggregates outputs from the above agents into a final markdown travel report. No tools; relies on context passed in from prior task outputs.

### Model

All three agents use `OpenaiModels.gpt_3_5_turbo` loaded via `LoadModel.load_openai_model()` in `src/agentic/utils/main_utils.py`. The model is selected at module import time and validated for `OPENAI_API_KEY`.

### Tools Layer (`src/agentic/tools/`)

Each tool is a thin wrapper class with a single classmethod that returns the underlying TaskflowAI tool function:
- `SerperSearch.search_web()` → `WebTools.serper_search`
- `WikiArticles.fetch_articles()` → `WikipediaTools.search_articles`
- `WikiImages.search_images()` → `WikipediaTools.search_images`
- `GetWeatherData.fetch_weather_data()` → `WebTools.get_weather_data`
- `SearchFlights.search_flights_tool()` → `AmadeusTools.search_flights`

### Cross-cutting Concerns

- **Logger** (`src/agentic/logger/__init__.py`): Writes timestamped `.log` files to `log/` using `from_root` to anchor the path to the project root.
- **Exception** (`src/agentic/exception/__init__.py`): `CustomException` enriches errors with filename and line number from the traceback.
- **Package install**: `setup.py` uses `find_packages()` so `src` is importable as a package after `pip install -e .` (already included in `requirements.txt` as `-e .`).

### Deployment

CI/CD via GitHub Actions (`.github/workflows/deploy.yml`): builds a Docker image with API keys as build args, pushes to AWS ECR, and deploys to EC2 via a self-hosted runner. Helper shell commands are in `scripts.sh`.
