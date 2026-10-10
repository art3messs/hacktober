
from fastapi import HTTPException
DEFAULTS = {
 "rc_lowpass":{"R":1000.,"C":1e-7,"Vin":5.},
 "rc_highpass":{"R":1000.,"C":1e-7,"Vin":5.},
 "voltage_divider":{"R1":10000.,"R2":10000.,"Vin":5.},
 "inverting_opamp":{"Rin":10000.,"Rf":10000.,"Vin":1.}}
LIMITS={"R":(1,1e7),"R1":(1,1e7),"R2":(1,1e7),"Rin":(1,1e7),"Rf":(1,1e7),"C":(1e-12,1e-2),"Vin":(.001,24)}
def validate_params(template, params):
 if template not in DEFAULTS: raise HTTPException(422,"Unsupported template")
 clean=DEFAULTS[template].copy()
 for k,v in params.items():
  if k not in clean: raise HTTPException(422,f"Parameter {k} is not allowed")
  try: v=float(v)
  except (ValueError,TypeError): raise HTTPException(422,f"{k} must be numeric")
  if not __import__("math").isfinite(v): raise HTTPException(422,f"{k} must be finite")
  lo,hi=LIMITS[k]
  if not lo<=v<=hi: raise HTTPException(422,f"{k} must be between {lo:g} and {hi:g}")
  clean[k]=v
 return clean
