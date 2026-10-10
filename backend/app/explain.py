
def explain(t,p,w):
 warnings=[]
 if t in ("rc_lowpass","rc_highpass"):
  fc=1/(2*3.141592653589793*p["R"]*p["C"])
  kind="low-pass" if t=="rc_lowpass" else "high-pass"
  text=f"This RC {kind} has a cutoff frequency of approximately {fc:.2f} Hz. The test input is a 1 kHz sine wave. The cutoff is where the ideal magnitude response is about 0.707 of passband gain."
  if (t=="rc_lowpass" and fc<1000) or (t=="rc_highpass" and fc>1000):warnings.append("The 1 kHz test tone is on the attenuated side of the cutoff.")
 elif t=="voltage_divider":
  ratio=p["R2"]/(p["R1"]+p["R2"]);text=f"Ignoring output loading, Vout/Vin = R2/(R1+R2) = {ratio:.4f}, so output amplitude is {ratio*100:.1f}% of input. A real load can change this ratio."
 else:
  gain=-p["Rf"]/p["Rin"];text=f"The ideal inverting gain is -Rf/Rin = {gain:.3f}; the minus sign indicates inversion. The educational model clips at ±12 V; real op-amps have device-specific limits."
  if abs(gain*p["Vin"])>12:warnings.append("Output clipping at the ±12 V demo rails is expected.")
 if w["source"]!="ngspice":warnings.append("ngspice unavailable or failed: result is the labelled analytical fallback, not a SPICE simulation.")
 return text,warnings
