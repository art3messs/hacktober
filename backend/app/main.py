
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx,shutil
from .model import analyze_prompt,OLLAMA_URL
from .simulation import simulate
from .explain import explain
from pydantic import BaseModel,Field
class AnalyzeRequest(BaseModel): prompt:str=Field(min_length=3,max_length=1000)
class SimulateRequest(BaseModel): template:str;params:dict[str,float]
app=FastAPI(title="Circuit Doctor API",version="0.1.0")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],allow_methods=["GET","POST"],allow_headers=["Content-Type"])
@app.get("/health")
async def health():
 ollama=False
 try:
  async with httpx.AsyncClient(timeout=1.5) as c:ollama=(await c.get(OLLAMA_URL+"/api/tags")).status_code==200
 except Exception:pass
 return {"status":"ok","ngspice":bool(shutil.which("ngspice")),"ollama":ollama}
@app.post("/analyze")
async def analyze(req:AnalyzeRequest):
 m=await analyze_prompt(req.prompt);p,w=simulate(m["template"],m["params"]);e,notes=explain(m["template"],p,w)
 if m.get("model")=="fallback":notes.insert(0,"Ollama unavailable or invalid output; deterministic prompt mapping was used.")
 return {"template":m["template"],"params":p,"waveform":w,"explanation":e,"warnings":notes}
@app.post("/simulate")
async def simulate_only(req:SimulateRequest):
 p,w=simulate(req.template,req.params);e,notes=explain(req.template,p,w)
 return {"template":req.template,"params":p,"waveform":w,"explanation":e,"warnings":notes}
