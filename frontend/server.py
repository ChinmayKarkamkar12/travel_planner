"""
FastAPI backend for the Voyager Trip Planner frontend.
Run: python -m uvicorn frontend.server:app --port 8000
"""
import sys
import time
import asyncio
import os
from pathlib import Path

# Force UTF-8 output on Windows
os.environ["PYTHONIOENCODING"] = "utf-8"

_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from taskflowai import Task

from src.agentic.agents.reporter_agent import TravelReportAgent
from src.agentic.agents.travel_agent import TravelAgent
from src.agentic.agents.web_research_agent import WebResearchAgent

app = FastAPI(title="Voyager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = Path(__file__).parent

@app.get("/")
def root():
    return FileResponse(str(frontend_dir / "index.html"))

# ── Agents ─────────────────────────────────────────────────
reporter_agent     = TravelReportAgent.initialize_travel_report_agent()
travel_agent       = TravelAgent.initialize_travel_agent()
web_research_agent = WebResearchAgent.initialize_web_research_agent()

# ── Semaphore: only 1 agent call at a time (not thread-safe)
_lock = asyncio.Semaphore(1)

# ── Request model ──────────────────────────────────────────
class TripRequest(BaseModel):
    departure: str
    destination: str
    dates: str
    interests: str = ""


# ── Endpoints ──────────────────────────────────────────────

@app.post("/research/destination")
async def research_destination(req: TripRequest):
    async with _lock:
        try:
            result = await asyncio.to_thread(
                Task.create,
                agent=web_research_agent,
                context=f"User Destination: {req.destination}\nUser Interests: {req.interests}",
                instruction=(
                    f"Create a comprehensive report about {req.destination}:\n"
                    f"1. Key attractions and activities related to: {req.interests}\n"
                    f"2. Include 2-3 images formatted as: ![Description](https://url)\n"
                    f"3. Practical visitor information\n"
                    "Format in clean markdown."
                )
            )
            return {"result": str(result).encode("utf-8", errors="replace").decode("utf-8")}
        except Exception as e:
            return {"error": str(e)}


@app.post("/research/events")
async def research_events(req: TripRequest):
    async with _lock:
        try:
            result = await asyncio.to_thread(
                Task.create,
                agent=web_research_agent,
                context=f"Destination: {req.destination}\nDates: {req.dates}\nInterests: {req.interests}",
                instruction=(
                    f"Research events in {req.destination} during {req.dates} matching: {req.interests}.\n"
                    "For each event include: name, date/time, venue, ticket info, short description.\n"
                    "Format in clean markdown."
                )
            )
            return {"result": str(result).encode("utf-8", errors="replace").decode("utf-8")}
        except Exception as e:
            return {"error": str(e)}


@app.post("/research/weather")
async def research_weather(req: TripRequest):
    async with _lock:
        try:
            result = await asyncio.to_thread(
                Task.create,
                agent=travel_agent,
                context=f"Destination: {req.destination}\nDates: {req.dates}",
                instruction=(
                    "Provide detailed weather information:\n"
                    "1. Temperature ranges\n"
                    "2. Precipitation chances\n"
                    "3. General weather patterns\n"
                    "4. Recommended clothing/gear\n"
                    "Format in clean markdown."
                )
            )
            return {"result": str(result).encode("utf-8", errors="replace").decode("utf-8")}
        except Exception as e:
            return {"error": str(e)}


@app.post("/research/flights")
async def research_flights(req: TripRequest):
    async with _lock:
        try:
            result = await asyncio.to_thread(
                Task.create,
                agent=travel_agent,
                context=f"Flights from {req.departure} to {req.destination} on {req.dates}",
                instruction="Find top 3 affordable and convenient flight options. Concise bullet-point format."
            )
            return {"result": str(result).encode("utf-8", errors="replace").decode("utf-8")}
        except Exception as e:
            return {"error": str(e)}


@app.post("/report")
async def write_report(req: TripRequest):
    """Run all agents sequentially and produce a final report."""
    async with _lock:
        try:
            def _full_pipeline():
                dest = Task.create(
                    agent=web_research_agent,
                    context=f"Destination: {req.destination}\nInterests: {req.interests}",
                    instruction=f"Destination summary for {req.destination}. Clean markdown."
                )
                time.sleep(8)
                events = Task.create(
                    agent=web_research_agent,
                    context=f"Destination: {req.destination}\nDates: {req.dates}\nInterests: {req.interests}",
                    instruction=f"Events summary for {req.destination} during {req.dates}. Clean markdown."
                )
                time.sleep(8)
                weather = Task.create(
                    agent=travel_agent,
                    context=f"Destination: {req.destination}\nDates: {req.dates}",
                    instruction="Weather summary. Clean markdown."
                )
                time.sleep(8)
                flights = Task.create(
                    agent=travel_agent,
                    context=f"Flights from {req.departure} to {req.destination} on {req.dates}",
                    instruction="Top 3 flight options. Clean markdown."
                )
                time.sleep(8)
                return Task.create(
                    agent=reporter_agent,
                    context=(
                        f"Destination:\n{dest}\n\n"
                        f"Events:\n{events}\n\n"
                        f"Weather:\n{weather}\n\n"
                        f"Flights:\n{flights}"
                    ),
                    instruction=(
                        "Create a comprehensive travel report with a compelling title, "
                        "clear sections, and all key information. Format in clean markdown."
                    )
                )
            result = await asyncio.to_thread(_full_pipeline)
            return {"result": str(result).encode("utf-8", errors="replace").decode("utf-8")}
        except Exception as e:
            return {"error": str(e)}
