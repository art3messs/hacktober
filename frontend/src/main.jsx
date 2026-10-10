import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Plot from 'react-plotly.js';
import axios from 'axios';
import './style.css';

const API = 'http://127.0.0.1:8000';

const examples = [
  {
    name: 'RC Low-pass',
    prompt: 'RC low-pass filter with R=1k and C=100nF',
    icon: '↘',
    template: 'rc_lowpass',
    defaults: { R: 1000, C: 1e-7, Vin: 5 },
  },
  {
    name: 'RC High-pass',
    prompt: 'RC high-pass filter with R=2.2k and C=10nF',
    icon: '↗',
    template: 'rc_highpass',
    defaults: { R: 2200, C: 1e-8, Vin: 5 },
  },
  {
    name: 'Voltage Divider',
    prompt: 'Voltage divider with R1=10k and R2=20k, Vin=5V',
    icon: '⇣',
    template: 'voltage_divider',
    defaults: { R1: 10000, R2: 20000, Vin: 5 },
  },
  {
    name: 'Inverting Op-amp',
    prompt: 'Inverting op-amp with Rin=10k and Rf=47k',
    icon: '±',
    template: 'inverting_opamp',
    defaults: { Rin: 10000, Rf: 47000, Vin: 1 },
  },
];

const cfg = {
  rc_lowpass: {
    title: 'RC Low-pass Filter',
    description: 'Passes low frequencies and attenuates high frequencies.',
    fields: [
      { key: 'R', label: 'Resistance', min: 100, max: 100000, step: 100, unit: 'Ω' },
      { key: 'C', label: 'Capacitance', min: 1e-9, max: 1e-5, step: 1e-9, unit: 'F' },
      { key: 'Vin', label: 'Input voltage', min: 0.1, max: 12, step: 0.1, unit: 'V' },
    ],
  },
  rc_highpass: {
    title: 'RC High-pass Filter',
    description: 'Passes high frequencies and attenuates low frequencies.',
    fields: [
      { key: 'R', label: 'Resistance', min: 100, max: 100000, step: 100, unit: 'Ω' },
      { key: 'C', label: 'Capacitance', min: 1e-9, max: 1e-5, step: 1e-9, unit: 'F' },
      { key: 'Vin', label: 'Input voltage', min: 0.1, max: 12, step: 0.1, unit: 'V' },
    ],
  },
  voltage_divider: {
    title: 'Voltage Divider',
    description: 'Produces a fraction of the input voltage using two resistors.',
    fields: [
      { key: 'R1', label: 'Upper resistance', min: 100, max: 100000, step: 100, unit: 'Ω' },
      { key: 'R2', label: 'Lower resistance', min: 100, max: 100000, step: 100, unit: 'Ω' },
      { key: 'Vin', label: 'Input voltage', min: 0.1, max: 12, step: 0.1, unit: 'V' },
    ],
  },
  inverting_opamp: {
    title: 'Inverting Op-amp',
    description: 'Amplifies and inverts an input signal within the model limits.',
    fields: [
      { key: 'Rin', label: 'Input resistance', min: 100, max: 100000, step: 100, unit: 'Ω' },
      { key: 'Rf', label: 'Feedback resistance', min: 100, max: 100000, step: 100, unit: 'Ω' },
      { key: 'Vin', label: 'Input voltage', min: 0.1, max: 12, step: 0.1, unit: 'V' },
    ],
  },
};

function fmt(value, unit = '') {
  const n = Number(value);

  if (!Number.isFinite(n)) return '—';

  if (unit === 'Ω') {
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)} MΩ`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)} kΩ`;
    return `${n.toFixed(1)} Ω`;
  }

  if (unit === 'F') {
    if (Math.abs(n) >= 1e-3) return `${(n * 1e3).toFixed(3)} mF`;
    if (Math.abs(n) >= 1e-6) return `${(n * 1e6).toFixed(3)} µF`;
    if (Math.abs(n) >= 1e-9) return `${(n * 1e9).toFixed(2)} nF`;
    return `${n.toExponential(2)} F`;
  }

  if (unit === 'Hz') {
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)} MHz`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)} kHz`;
    return `${n.toFixed(2)} Hz`;
  }

  return `${n.toFixed(3)}${unit ? ` ${unit}` : ''}`;
}

function CircuitDiagram({ template, params }) {
  const titles = {
    rc_lowpass: 'RC LOW-PASS',
    rc_highpass: 'RC HIGH-PASS',
    voltage_divider: 'VOLTAGE DIVIDER',
    inverting_opamp: 'INVERTING AMPLIFIER',
  };

  const line = {
    fill: 'none',
    stroke: '#7485a9',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const wire = points => <polyline points={points} {...line} />;

  const ground = (x, y) => (
    <g stroke="#55e6c1" strokeWidth="2">
      <line x1={x} y1={y} x2={x} y2={y + 8} />
      <line x1={x - 10} y1={y + 8} x2={x + 10} y2={y + 8} />
      <line x1={x - 6} y1={y + 13} x2={x + 6} y2={y + 13} />
      <line x1={x - 2} y1={y + 18} x2={x + 2} y2={y + 18} />
    </g>
  );

  const resistor = (x1, x2, y, label, value) => (
    <g>
      <line x1={x1} y1={y} x2={x1 + 12} y2={y} {...line} />
      <rect
        x={x1 + 12}
        y={y - 8}
        width={Math.max(1, x2 - x1 - 24)}
        height="16"
        rx="3"
        fill="#192742"
        stroke="#55e6c1"
        strokeWidth="2"
      />
      <line x1={x2 - 12} y1={y} x2={x2} y2={y} {...line} />
      <text x={(x1 + x2) / 2} y={y - 15} textAnchor="middle" className="schematic-label">
        {label}
      </text>
      <text x={(x1 + x2) / 2} y={y + 27} textAnchor="middle" className="schematic-value">
        {value}
      </text>
    </g>
  );

  const capacitor = (x, y1, y2, label, value) => (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y1 + 18} {...line} />
      <line x1={x - 15} y1={y1 + 18} x2={x + 15} y2={y1 + 18}
        stroke="#55e6c1" strokeWidth="3" />
      <line x1={x - 15} y1={y1 + 28} x2={x + 15} y2={y1 + 28}
        stroke="#55e6c1" strokeWidth="3" />
      <line x1={x} y1={y1 + 28} x2={x} y2={y2} {...line} />
      <text x={x + 23} y={y1 + 25} className="schematic-label">{label}</text>
      <text x={x + 23} y={y1 + 43} className="schematic-value">{value}</text>
    </g>
  );

  const node = (x, y) => <circle cx={x} cy={y} r="4" fill="#55e6c1" />;

  return (
    <div className="schematic">
      <div className="schematic-top">
        <div>
          <span className="eyebrow">CIRCUIT BLUEPRINT</span>
          <h3>{titles[template]}</h3>
        </div>
        <span className="live-tag">● LIVE VALUES</span>
      </div>

      <svg viewBox="0 0 440 220" role="img"
        aria-label={`${titles[template]} schematic with current component values`}>
        <defs>
          <marker id="signal-arrow" markerWidth="7" markerHeight="7"
            refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#55e6c1" />
          </marker>
        </defs>

        {template === 'rc_lowpass' && (
          <>
            {wire('25,75 60,75')}
            {resistor(60, 200, 75, 'R', fmt(params.R, 'Ω'))}
            {wire('200,75 325,75 375,75')}
            {node(325, 75)}
            {capacitor(325, 75, 160, 'C', fmt(params.C, 'F'))}
            {wire('325,160 325,180')}
            {ground(325, 180)}
            <text x="22" y="59" className="schematic-label">Vin</text>
            <text x="365" y="59" className="schematic-label">Vout</text>
          </>
        )}

        {template === 'rc_highpass' && (
          <>
            {wire('25,75 40,75')}
            {capacitor(65, 57, 75, 'C', fmt(params.C, 'F'))}
            {wire('65,103 65,125 100,125')}
            {resistor(100, 235, 125, 'R', fmt(params.R, 'Ω'))}
            {wire('235,125 325,125 375,125')}
            {node(325, 125)}
            {wire('325,125 325,165')}
            {ground(325, 165)}
            <text x="22" y="59" className="schematic-label">Vin</text>
            <text x="365" y="109" className="schematic-label">Vout</text>
          </>
        )}

        {template === 'voltage_divider' && (
          <>
            {wire('110,25 110,40')}
            <rect x="97" y="40" width="26" height="50" rx="3"
              fill="#192742" stroke="#55e6c1" strokeWidth="2" />
            <text x="140" y="59" className="schematic-label">R1</text>
            <text x="140" y="77" className="schematic-value">{fmt(params.R1, 'Ω')}</text>
            {wire('110,90 110,120 220,120')}
            {node(220, 120)}
            {wire('220,120 365,120')}
            <text x="365" y="104" className="schematic-label">Vout</text>
            {wire('220,120 220,140')}
            <rect x="207" y="140" width="26" height="43" rx="3"
              fill="#192742" stroke="#55e6c1" strokeWidth="2" />
            <text x="240" y="159" className="schematic-label">R2</text>
            <text x="240" y="177" className="schematic-value">{fmt(params.R2, 'Ω')}</text>
            {wire('220,183 220,190')}
            {ground(220, 190)}
            <text x="65" y="18" className="schematic-label">Vin</text>
          </>
        )}

        {template === 'inverting_opamp' && (
          <>
            {wire('20,90 90,90')}
            {resistor(90, 190, 90, 'Rin', fmt(params.Rin, 'Ω'))}
            {wire('190,90 225,90')}
            {node(225, 90)}
            <polygon points="225,100 225,180 310,140"
              fill="#192742" stroke="#55e6c1" strokeWidth="2" />
            <text x="239" y="126" fill="#dce6ff" fontSize="14">−</text>
            <text x="239" y="158" fill="#dce6ff" fontSize="14">+</text>
            {wire('225,165 205,165 205,190')}
            {ground(205, 190)}
            {wire('310,140 370,140')}
            <text x="366" y="124" className="schematic-label">Vout</text>
            {wire('350,140 350,40 275,40')}
            {resistor(275, 365, 40, 'Rf', fmt(params.Rf, 'Ω'))}
            {wire('275,40 275,90 225,90')}
            <text x="20" y="74" className="schematic-label">Vin</text>
          </>
        )}
      </svg>

      <p className="schematic-note">
        Conceptual schematic · Values update with your controls. Verify component
        connections before building physical circuits.
      </p>
    </div>
  );
}

function App() {
  const [prompt, setPrompt] = useState(examples[0].prompt);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [health, setHealth] = useState({});
  const [showInput, setShowInput] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [zoomReset, setZoomReset] = useState(0);

  const sliderTimer = useRef(null);
  const requestSeq = useRef(0);
  const currentTemplate = useRef(null);

  useEffect(() => {
    axios.get(`${API}/health`)
      .then(response => setHealth(response.data))
      .catch(() => setHealth({ status: 'offline' }));

    return () => {
      if (sliderTimer.current) clearTimeout(sliderTimer.current);
      requestSeq.current++;
    };
  }, []);

  async function analyze(text = prompt) {
    const cleanText = text.trim();
    if (cleanText.length < 3 || busy) return;

    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    requestSeq.current++;

    setBusy(true);
    setErr('');
    setPrompt(text);

    try {
      const result = (
        await axios.post(`${API}/analyze`, { prompt: cleanText })
      ).data;

      currentTemplate.current = result.template;
      setData(result);
      setZoomReset(n => n + 1);
    } catch (error) {
      setErr(error.response?.data?.detail || 'Backend unavailable. Start FastAPI on port 8000.');
    } finally {
      setBusy(false);
    }
  }

  function change(key, rawValue) {
    if (!data || !circuitConfig()) return;

    const field = circuitConfig().fields.find(item => item.key === key);
    if (!field) return;

    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;

    const clamped = Math.max(field.min, Math.min(field.max, value));
    const stepped = Math.round((clamped - field.min) / field.step) * field.step + field.min;
    const precision = field.step < 0.000001 ? 12 : 6;
    const safeValue = Number(stepped.toFixed(precision));

    const template = data.template;
    const params = { ...data.params, [key]: safeValue };

    setData(old => old ? { ...old, params } : old);
    setErr('');

    if (sliderTimer.current) clearTimeout(sliderTimer.current);

    const seq = ++requestSeq.current;

    sliderTimer.current = setTimeout(async () => {
      try {
        const result = (
          await axios.post(`${API}/simulate`, { template, params })
        ).data;

        if (seq === requestSeq.current) {
          setData(result);
        }
      } catch (error) {
        if (seq === requestSeq.current) {
          setErr(error.response?.data?.detail || 'Simulation failed for this value.');
        }
      }
    }, 220);
  }

  function circuitConfig() {
    return data ? cfg[data.template] : null;
  }

  function resetValues() {
    if (!data) return;

    const preset = examples.find(example => example.template === data.template);
    if (!preset) return;

    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    requestSeq.current++;

    const template = preset.template;
    const params = { ...preset.defaults };
    const seq = requestSeq.current;

    setData(old => old ? { ...old, params } : old);
    setErr('');

    sliderTimer.current = setTimeout(async () => {
      try {
        const result = (
          await axios.post(`${API}/simulate`, { template, params })
        ).data;

        if (seq === requestSeq.current) setData(result);
      } catch (error) {
        if (seq === requestSeq.current) {
          setErr(error.response?.data?.detail || 'Could not reset the simulation.');
        }
      }
    }, 0);
  }

  const circuit = circuitConfig();
  const params = data?.params || {};

  const cutoff =
    data && ['rc_lowpass', 'rc_highpass'].includes(data.template)
      ? 1 / (2 * Math.PI * params.R * params.C)
      : null;

  const dividerOutput =
    data?.template === 'voltage_divider'
      ? params.Vin * params.R2 / (params.R1 + params.R2)
      : null;

  const gain =
    data?.template === 'inverting_opamp'
      ? -params.Rf / params.Rin
      : null;

  const output = data?.waveform?.output || [];
  const input = data?.waveform?.input || [];
  const times = data?.waveform?.time || [];

  const peakToPeak = output.length
    ? Math.max(...output) - Math.min(...output)
    : 0;

  const outputMax = output.length ? Math.max(...output) : 0;
  const outputMin = output.length ? Math.min(...output) : 0;

  const metrics = data
    ? [
        {
          label: 'Peak-to-peak output',
          value: fmt(peakToPeak, 'V'),
          hint: 'Maximum minus minimum',
        },
        {
          label: 'Maximum output',
          value: fmt(outputMax, 'V'),
          hint: 'Highest sampled value',
        },
        {
          label: 'Minimum output',
          value: fmt(outputMin, 'V'),
          hint: 'Lowest sampled value',
        },
        cutoff !== null
          ? {
              label: 'Cutoff frequency',
              value: fmt(cutoff, 'Hz'),
              hint: 'Calculated from R and C',
            }
          : dividerOutput !== null
            ? {
                label: 'Ideal output',
                value: fmt(dividerOutput, 'V'),
                hint: 'Ideal unloaded divider',
              }
            : {
                label: 'Ideal gain',
                value: `${gain.toFixed(3)}×`,
                hint: '−Rf / Rin',
              },
      ]
    : [];

  return (
    <main>
      <header>
        <div className="brand">
          <b>CD</b>
          <span>
            CIRCUIT DOCTOR
            <small>INTERACTIVE ENGINEERING LAB</small>
          </span>
        </div>

        <div className="health">
          <span className={`health-dot ${health.status === 'offline' ? 'off' : 'on'}`} />
          API
          <span className={`health-dot ${health.ngspice ? 'on' : 'off'}`} />
          ngspice
          <span className={`health-dot ${health.ollama ? 'on' : 'off'}`} />
          Ollama
        </div>
      </header>

      <section className="hero">
        <label>HACKTOBER @ NITH / ENGINEERING LAB</label>
        <h1>
          Understand circuits.
          <br />
          <span>Experiment freely.</span>
        </h1>
        <p>
          Describe a circuit, inspect its schematic and waveform, and explore
          how component values affect its behaviour.
        </p>
      </section>

      <section className="card prompt-card">
        <label>01 / DESCRIBE YOUR CIRCUIT</label>

        <textarea
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          rows="3"
          placeholder="Example: RC low-pass filter with R=1k and C=100nF"
        />

        <button
          className="primary"
          disabled={busy || prompt.trim().length < 3}
          onClick={() => analyze()}
        >
          {busy ? 'Analyzing…' : '➜ Analyze circuit'}
        </button>

        <div className="preset-heading">
          <span>QUICK EXPERIMENTS</span>
          <span>Choose a template</span>
        </div>

        <div className="preset-grid">
          {examples.map(example => (
            <button
              key={example.name}
              className={`preset ${data?.template === example.template ? 'selected' : ''}`}
              onClick={() => analyze(example.prompt)}
              disabled={busy}
            >
              <span className="preset-icon">{example.icon}</span>
              <span>
                <strong>{example.name}</strong>
                <small>{example.prompt}</small>
              </span>
              <span className="preset-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>

      {err && <div className="error" role="alert">{err}</div>}

      {busy && (
        <div className="loading" role="status">
          <span className="loading-dot" />
          Preparing your circuit and calculating its response…
        </div>
      )}

      {data && circuit && (
        <>
          <div className="heading">
            <div>
              <label>02 / EXPERIMENT WORKSPACE</label>
              <h2>{circuit.title}</h2>
              <p>{circuit.description}</p>
            </div>

            <span className="engine-badge">
              <span className={`health-dot ${data.waveform.source === 'ngspice' ? 'on' : 'off'}`} />
              {data.waveform.source === 'ngspice'
                ? 'NGSPICE · VERIFIED ENGINE'
                : 'ANALYTICAL FALLBACK'}
            </span>
          </div>

          <div className="metric-grid">
            {metrics.map(metric => (
              <div className="metric card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.hint}</small>
              </div>
            ))}
          </div>

          <div className="workspace-grid">
            <section className="card schematic-card">
              <div className="section-title">
                <div>
                  <label>LIVE CIRCUIT</label>
                  <h3>Schematic view</h3>
                </div>
                <span className="live-tag">● UPDATED</span>
              </div>

              <CircuitDiagram template={data.template} params={params} />
            </section>

            <section className="card controls-card">
              <div className="section-title">
                <div>
                  <label>LIVE PARAMETERS</label>
                  <h3>Component controls</h3>
                </div>

                <button
                  className="secondary"
                  onClick={resetValues}
                  disabled={busy}
                >
                  Reset values
                </button>
              </div>

              {circuit.fields.map(field => (
                <div className="slider" key={field.key}>
                  <div className="slider-heading">
                    <label htmlFor={`control-${field.key}`}>
                      {field.label}
                    </label>

                    <div className="parameter-value">
                      <input
                        id={`value-${field.key}`}
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={params[field.key] ?? ''}
                        onChange={event => {
                          if (event.target.value !== '') {
                            change(field.key, event.target.value);
                          }
                        }}
                        aria-label={`${field.label} numeric value`}
                      />
                      <span>{field.unit}</span>
                    </div>
                  </div>

                  <input
                    id={`control-${field.key}`}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={Math.max(
                      field.min,
                      Math.min(field.max, params[field.key])
                    )}
                    onChange={event => change(field.key, event.target.value)}
                    aria-label={`${field.label} slider`}
                  />

                  <div className="range-labels">
                    <span>{fmt(field.min, field.unit)}</span>
                    <span>{fmt(field.max, field.unit)}</span>
                  </div>
                </div>
              ))}

              <div className="control-tip">
                <span>↗</span>
                <p>
                  Edit a value or move a slider. Changes rerun the simulation
                  without calling the language model.
                </p>
              </div>
            </section>
          </div>

          <section className="card plot-card">
            <div className="section-title">
              <div>
                <label>03 / SIMULATION OUTPUT</label>
                <h3>Time-domain waveform</h3>
                <p>Hover over the traces for sampled voltage and time values.</p>
              </div>

              <button
                className="secondary"
                onClick={() => setZoomReset(n => n + 1)}
              >
                ↺ Reset zoom
              </button>
            </div>

            <div className="signal-toggles">
              <button
                className={showInput ? 'signal active-input' : 'signal'}
                onClick={() => setShowInput(value => !value)}
              >
                <span className="signal-line input-line" />
                Input signal {showInput ? '✓' : ''}
              </button>

              <button
                className={showOutput ? 'signal active-output' : 'signal'}
                onClick={() => setShowOutput(value => !value)}
              >
                <span className="signal-line output-line" />
                Output signal {showOutput ? '✓' : ''}
              </button>
            </div>

            <Plot
              key={zoomReset}
              data={[
                {
                  x: times.map(t => t * 1000),
                  y: input,
                  name: 'Input',
                  mode: 'lines',
                  type: 'scatter',
                  visible: showInput,
                  line: { color: '#8295c9', width: 2 },
                  hovertemplate: 'Time: %{x:.3f} ms<br>Input: %{y:.4f} V<extra></extra>',
                },
                {
                  x: times.map(t => t * 1000),
                  y: output,
                  name: 'Output',
                  mode: 'lines',
                  type: 'scatter',
                  visible: showOutput,
                  line: { color: '#55e6c1', width: 2.5 },
                  hovertemplate: 'Time: %{x:.3f} ms<br>Output: %{y:.4f} V<extra></extra>',
                },
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#aeb9d3', family: 'Inter, system-ui, sans-serif' },
                margin: { l: 55, r: 18, t: 15, b: 55 },
                xaxis: {
                  title: 'Time (ms)',
                  gridcolor: '#26304a',
                  zerolinecolor: '#3a4662',
                },
                yaxis: {
                  title: 'Voltage (V)',
                  gridcolor: '#26304a',
                  zerolinecolor: '#3a4662',
                },
                legend: { orientation: 'h', y: -0.22 },
                hovermode: 'x unified',
                uirevision: 'circuit-doctor-waveform',
              }}
              config={{
                responsive: true,
                displaylogo: false,
                scrollZoom: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
              }}
              style={{ width: '100%', height: 370 }}
              useResizeHandler
            />
          </section>

          <section className="card explanation-card">
            <label>04 / ENGINEERING NOTES</label>
            <h3>What your circuit is doing</h3>
            <p>{data.explanation}</p>

            {data.warnings?.map((warning, index) => (
              <p className="warning" key={index}>⚠ {warning}</p>
            ))}

            <details>
              <summary>Inspect simulation details</summary>
              <p><strong>Template:</strong> <code>{data.template}</code></p>
              <p><strong>Waveform source:</strong> {data.waveform.source}</p>
              <p><strong>Samples:</strong> {times.length}</p>
              <p>
                <strong>Parameters:</strong>{' '}
                {Object.entries(params).map(([key, value]) =>
                  `${key}=${fmt(
                    value,
                    circuit.fields.find(field => field.key === key)?.unit || ''
                  )}`
                ).join(' · ')}
              </p>
            </details>
          </section>
        </>
      )}

      <footer>
        <span>BUILT FOR HACKTOBER · NITH</span>
        <span>OPEN SOURCE / LOCAL-FIRST / EDUCATIONAL</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);