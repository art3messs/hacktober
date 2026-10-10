import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np

from .validation import validate_params


def analytic(t, p, n=500):
    time = np.linspace(0, 0.01, n)
    w = 2 * np.pi * 1000
    vin = p["Vin"] * np.sin(w * time)

    if t in ("rc_lowpass", "rc_highpass"):
        x = w * p["R"] * p["C"]
        gain = (
            1 / math.sqrt(1 + x * x)
            if t == "rc_lowpass"
            else x / math.sqrt(1 + x * x)
        )
        phase = (
            -math.atan(x)
            if t == "rc_lowpass"
            else math.atan2(1, x)
        )
        out = p["Vin"] * gain * np.sin(w * time + phase)

    elif t == "voltage_divider":
        out = vin * p["R2"] / (p["R1"] + p["R2"])

    else:
        out = np.clip(-p["Rf"] / p["Rin"] * vin, -12, 12)

    return {
        "time": time.tolist(),
        "input": vin.tolist(),
        "output": out.tolist(),
        "unit": "V",
        "source": "analytical-fallback",
    }


def netlist(t, p, out):
    if t == "rc_lowpass":
        body = (
            f"V1 in 0 SIN(0 {p['Vin']} 1k)\n"
            f"R1 in out {p['R']}\n"
            f"C1 out 0 {p['C']}\n"
        )

    elif t == "rc_highpass":
        body = (
            f"V1 in 0 SIN(0 {p['Vin']} 1k)\n"
            f"C1 in out {p['C']}\n"
            f"R1 out 0 {p['R']}\n"
        )

    elif t == "voltage_divider":
        body = (
            f"V1 in 0 SIN(0 {p['Vin']} 1k)\n"
            f"R1 in out {p['R1']}\n"
            f"R2 out 0 {p['R2']}\n"
        )

    else:
        body = (
            f"V1 in 0 SIN(0 {p['Vin']} 1k)\n"
            f"Rin in neg {p['Rin']}\n"
            f"Rf neg out {p['Rf']}\n"
            f"BOP out 0 V=limit(-1e6*V(neg),-12,12)\n"
        )

    return (
        f"Fixed Circuit Doctor template: {t}\n"
        f"{body}"
        ".control\n"
        "set wr_singlescale\n"
        "set wr_vecnames\n"
        "tran 10u 10m\n"
        f"wrdata {out} v(in) v(out)\n"
        "quit\n"
        ".endc\n"
        ".end\n"
    )


def ngspice(t, p):
    executable = (
        shutil.which("ngspice_con")
        or shutil.which("ngspice")
    )

    if not executable:
        return None

    try:
        with tempfile.TemporaryDirectory() as d:
            # Use a relative output filename so Windows paths containing
            # spaces do not break ngspice's wrdata command.
            out = "wave.dat"
            cir = Path(d) / "circuit.cir"

            cir.write_text(netlist(t, p, out), encoding="utf-8")

            result = subprocess.run(
                [executable, "-b", str(cir)],
                capture_output=True,
                text=True,
                timeout=8,
                cwd=d,
            )

            output_file = Path(d) / out

            if result.returncode != 0 or not output_file.exists():
                return None

            data = np.loadtxt(output_file, skiprows=1)

            if data.ndim != 2 or data.shape[1] < 3:
                return None

            return {
                "time": data[:, 0].tolist(),
                "input": data[:, 1].tolist(),
                "output": data[:, 2].tolist(),
                "unit": "V",
                "source": "ngspice",
            }

    except Exception:
        return None


def simulate(template, params):
    validated_params = validate_params(template, params)

    waveform = (
        ngspice(template, validated_params)
        or analytic(template, validated_params)
    )

    return validated_params, waveform