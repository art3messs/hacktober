import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"backend"))
from app.simulation import simulate
from app.explain import explain
p=argparse.ArgumentParser();p.add_argument("--template",required=True,choices=["rc_lowpass","rc_highpass","voltage_divider","inverting_opamp"]);p.add_argument("--params",required=True);a=p.parse_args()
params,w=simulate(a.template,json.loads(a.params));e,notes=explain(a.template,params,w)
print(json.dumps({"template":a.template,"params":params,"waveform":w,"explanation":e,"warnings":notes},indent=2))
