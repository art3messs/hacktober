
import json, os, re, httpx
from .validation import DEFAULTS
OLLAMA_URL=os.getenv("OLLAMA_URL","http://127.0.0.1:11434")
OLLAMA_MODEL=os.getenv("OLLAMA_MODEL","qwen2.5:3b-instruct")
SYSTEM="""Map the prompt to JSON only: {"template":"rc_lowpass|rc_highpass|voltage_divider|inverting_opamp","params":{}}. Allowed keys: filters R,C,Vin; divider R1,R2,Vin; opamp Rin,Rf,Vin. Values are numeric SI units. Defaults are okay. Never output netlists, code, prose or extra keys. Convert 1k=1000, 100nF=1e-7, 1uF=1e-6."""
def fallback(prompt):
 s=prompt.lower()
 t="voltage_divider" if any(x in s for x in ["divider","divide voltage"]) else "inverting_opamp" if any(x in s for x in ["opamp","op-amp","op amp","inverting"]) else "rc_highpass" if any(x in s for x in ["high-pass","high pass","highpass"]) else "rc_lowpass"
 p=DEFAULTS[t].copy()
 pats={"R":r"\br\s*=\s*([\d.]+)\s*(k|ohm)?","R1":r"\br1\s*=\s*([\d.]+)\s*(k)?","R2":r"\br2\s*=\s*([\d.]+)\s*(k)?","Rin":r"\brin\s*=\s*([\d.]+)\s*(k)?","Rf":r"\brf\s*=\s*([\d.]+)\s*(k)?","C":r"\bc\s*=\s*([\d.]+)\s*(p|n|u|m|f)?","Vin":r"\bvin\s*=\s*([\d.]+)"}
 for k,pat in pats.items():
  m=re.search(pat,s)
  if m and k in p:
   v=float(m.group(1)); unit=(m.group(2) or "").lower()
   v*=({"k":1e3}.get(unit,1) if k!="C" else {"p":1e-12,"n":1e-9,"u":1e-6,"m":1e-3,"f":1}.get(unit,1))
   p[k]=v
 return {"template":t,"params":p,"model":"fallback"}
async def analyze_prompt(prompt):
 schema={
 "type":"object",
 "properties":{
  "template":{"type":"string","enum":list(DEFAULTS.keys())},
  "params":{"type":"object","additionalProperties":{"type":"number"}}
 },
 "required":["template","params"],
 "additionalProperties":False
 }
 payload={"model":OLLAMA_MODEL,"stream":False,"format":schema,"system":SYSTEM,"prompt":prompt,"options":{"temperature":0}}
 for _ in range(2):
  try:
   async with httpx.AsyncClient(timeout=35) as c: r=await c.post(f"{OLLAMA_URL}/api/generate",json=payload); r.raise_for_status()
   obj=json.loads(r.json().get("response",""))
   if obj.get("template") not in DEFAULTS or not isinstance(obj.get("params"),dict): raise ValueError("schema")
   return {"template":obj["template"],"params":obj["params"],"model":OLLAMA_MODEL}
  except Exception: payload["prompt"]="Return valid JSON only matching schema. User request: "+prompt
 return fallback(prompt)
