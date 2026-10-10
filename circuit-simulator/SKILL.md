---
name: circuit-simulator
description: Maps plain-language requests to validated educational circuit templates, simulates supported RC filters, voltage dividers, and inverting op-amps, and explains waveforms. Use when asked to model or inspect one of these circuits.
---
# Circuit Simulator Skill
1. Choose only `rc_lowpass`, `rc_highpass`, `voltage_divider`, or `inverting_opamp`.
2. Output structured parameters only; never accept model-generated netlists or executable code.
3. Validate parameter names, finite numeric values, and ranges.
4. Run `python scripts/simulate.py --template rc_lowpass --params '{"R":1000,"C":1e-7,"Vin":5}'` from the repo root.
5. Explain the result and state whether the source is ngspice or analytical fallback.
6. This is an educational demo, not circuit certification.
