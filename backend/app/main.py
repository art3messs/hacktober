from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import shutil

from .model import analyze_prompt, OLLAMA_URL
from .simulation import simulate
from .explain import explain

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=1000)


class SimulateRequest(BaseModel):
    template: str
    params: dict[str, float]


app = FastAPI(
    title="Circuit Doctor API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health():
    ollama = False

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            response = await client.get(OLLAMA_URL + "/api/tags")
            ollama = response.status_code == 200
    except Exception:
        pass

    ngspice_available = bool(
        shutil.which("ngspice_con")
        or shutil.which("ngspice")
    )

    return {
        "status": "ok",
        "ngspice": ngspice_available,
        "ollama": ollama,
    }


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    model_result = await analyze_prompt(req.prompt)

    params, waveform = simulate(
        model_result["template"],
        model_result["params"],
    )

    explanation, warnings = explain(
        model_result["template"],
        params,
        waveform,
    )

    if model_result.get("model") == "fallback":
        warnings.insert(
            0,
            "Ollama unavailable or invalid output; "
            "deterministic prompt mapping was used.",
        )

    return {
        "template": model_result["template"],
        "params": params,
        "waveform": waveform,
        "explanation": explanation,
        "warnings": warnings,
    }


@app.post("/simulate")
async def simulate_only(req: SimulateRequest):
    params, waveform = simulate(
        req.template,
        req.params,
    )

    explanation, warnings = explain(
        req.template,
        params,
        waveform,
    )

    return {
        "template": req.template,
        "params": params,
        "waveform": waveform,
        "explanation": explanation,
        "warnings": warnings,
    }