
import math, shutil, subprocess, tempfile
from pathlib import Path
import numpy as np
from .validation import validate_params
def analytic(t,p,n=500):
 time=np.linspace(0,.01,n); w=2*np.pi*1000; vin=p["Vin"]*np.sin(w*time)
 if t in ("rc_lowpass","rc_highpass"):
  x=w*p["R"]*p["C"]
  gain=1/math.sqrt(1+x*x) if t=="rc_lowpass" else x/math.sqrt(1+x*x)
  phase=-math.atan(x) if t=="rc_lowpass" else math.atan2(1,x)
  out=p["Vin"]*gain*np.sin(w*time+phase)
 elif t=="voltage_divider": out=vin*p["R2"]/(p["R1"]+p["R2"])
 else: out=np.clip(-p["Rf"]/p["Rin"]*vin,-12,12)
 return {"time":time.tolist(),"input":vin.tolist(),"output":out.tolist(),"unit":"V","source":"analytical-fallback"}
def netlist(t,p,out):
 if t=="rc_lowpass": body=f"V1 in 0 SIN(0 {p['Vin']} 1k)\nR1 in out {p['R']}\nC1 out 0 {p['C']}\n"
 elif t=="rc_highpass": body=f"V1 in 0 SIN(0 {p['Vin']} 1k)\nC1 in out {p['C']}\nR1 out 0 {p['R']}\n"
 elif t=="voltage_divider": body=f"V1 in 0 SIN(0 {p['Vin']} 1k)\nR1 in out {p['R1']}\nR2 out 0 {p['R2']}\n"
 else: body=f"V1 in 0 SIN(0 {p['Vin']} 1k)\nRin in neg {p['Rin']}\nRf neg out {p['Rf']}\nBOP out 0 V=limit(-1e6*V(neg),-12,12)\n"
 return f"Fixed Circuit Doctor template: {t}\n{body}.control\nset wr_singlescale\nset wr_vecnames\ntran 10u 10m\nwrdata {out} v(in) v(out)\nquit\n.endc\n.end\n"
def ngspice(t,p):
 if not shutil.which("ngspice"): return None
 try:
  with tempfile.TemporaryDirectory() as d:
   out=str(Path(d)/"wave.dat"); cir=Path(d)/"circuit.cir"; cir.write_text(netlist(t,p,out))
   r=subprocess.run(["ngspice","-b",str(cir)],capture_output=True,text=True,timeout=8,cwd=d)
   if r.returncode or not Path(out).exists(): return None
   a=np.loadtxt(out,skiprows=1)
   if a.ndim!=2 or a.shape[1]<3:return None
   return {"time":a[:,0].tolist(),"input":a[:,1].tolist(),"output":a[:,2].tolist(),"unit":"V","source":"ngspice"}
 except Exception:return None
def simulate(template,params):
 p=validate_params(template,params); wave=ngspice(template,p) or analytic(template,p)
 return p,wave
