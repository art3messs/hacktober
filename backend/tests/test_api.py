
from fastapi.testclient import TestClient
from app.main import app
from app.validation import validate_params
from fastapi import HTTPException
import pytest
c=TestClient(app)
def test_health(): assert c.get("/health").json()["status"]=="ok"
def test_slider_endpoint():
 r=c.post("/simulate",json={"template":"rc_lowpass","params":{"R":2200,"C":1e-7,"Vin":5}})
 assert r.status_code==200 and len(r.json()["waveform"]["time"])>10
def test_unknown_parameter():
 with pytest.raises(HTTPException):validate_params("rc_lowpass",{"netlist":"bad"})
def test_out_of_range():
 with pytest.raises(HTTPException):validate_params("rc_lowpass",{"R":0})

def test_all_templates_simulate_without_external_tools(monkeypatch):
    import app.simulation as sim
    monkeypatch.setattr(sim, "ngspice", lambda template, params: None)
    cases = [
        ("rc_lowpass", {"R": 1000, "C": 1e-7, "Vin": 5}),
        ("rc_highpass", {"R": 2200, "C": 1e-8, "Vin": 5}),
        ("voltage_divider", {"R1": 10000, "R2": 20000, "Vin": 5}),
        ("inverting_opamp", {"Rin": 10000, "Rf": 47000, "Vin": 1}),
    ]
    for template, params in cases:
        clean, wave = sim.simulate(template, params)
        assert set(clean) == set(params)
        assert wave["source"] == "analytical-fallback"
        assert len(wave["time"]) == len(wave["input"]) == len(wave["output"])
        assert all(__import__("math").isfinite(v) for v in wave["output"])

def test_analyze_fallback_is_disclosed(monkeypatch):
    import app.main as main
    async def fake_analyze(prompt):
        return {"template": "rc_lowpass", "params": {"R": 1000, "C": 1e-7, "Vin": 5}, "model": "fallback"}
    monkeypatch.setattr(main, "analyze_prompt", fake_analyze)
    monkeypatch.setattr("app.simulation.ngspice", lambda template, params: None)
    r = c.post("/analyze", json={"prompt": "RC low pass filter"})
    assert r.status_code == 200
    assert any("deterministic prompt mapping" in x for x in r.json()["warnings"])
    assert r.json()["waveform"]["source"] == "analytical-fallback"
