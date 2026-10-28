import { useEffect, useState } from 'react';
import { useVoiceIsolatorWs } from '../hooks/useVoiceIsolatorWs';
import {
  Play, Square, Activity, SlidersHorizontal, Mic, Volume2, Layers, RefreshCw, Settings,
  ShieldCheck, ShieldOff, ChartNoAxesColumn, Waves, Gauge, AudioLines, Zap, Cpu,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import IconBadge from '../components/dashboard/IconBadge';
import { TONES } from '../components/dashboard/tones';
import StatTile, { LevelMeter } from '../components/dashboard/StatTile';
import ParamSlider from '../components/dashboard/ParamSlider';
import DeviceSelect from '../components/dashboard/DeviceSelect';
import Waveform from '../components/dashboard/Waveform';

const MODES = [
  { id: 'noise', label: 'Noise only' },
  { id: 'extract', label: 'My voice only' },
  { id: 'both', label: 'Both' },
];

const secondaryBtn = 'flex w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] px-4 py-2.5 short:py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export default function Dashboard() {
  const { status, devices, defaultDevices, params, sendCommand } = useVoiceIsolatorWs();

  const [deviceIn, setDeviceIn] = useState(defaultDevices.in);
  const [deviceOut, setDeviceOut] = useState(defaultDevices.out);
  const [gain, setGain] = useState(1.0);
  const [beta, setBeta] = useState(0.7);
  const [smooth, setSmooth] = useState(0.9);

  useEffect(() => {
    setGain(params.gain);
    setBeta(params.beta);
    setSmooth(params.smooth);
  }, [params]);

  useEffect(() => {
    if (defaultDevices.in !== undefined) setDeviceIn(defaultDevices.in);
    if (defaultDevices.out !== undefined) setDeviceOut(defaultDevices.out);
  }, [defaultDevices]);

  const handleStart = () => {
    sendCommand({ action: "start", device_in: deviceIn, device_out: deviceOut });
  };

  const handleStop = () => {
    sendCommand({ action: "stop" });
  };

  // noise_server does not report mode / load / latency; those readouts show "—" there
  const modeLabel = MODES.find(m => m.id === status.mode)?.label;
  const hasLoad = status.running && Number.isFinite(status.rtf) && Number.isFinite(status.latency_ms);
  const loadPct = hasLoad ? Math.round(status.rtf * 100) : 0;
  const loadTone = loadPct < 70 ? 'success' : loadPct < 100 ? 'warning' : 'danger';
  const busy = status.calibrating || status.enrolling;
  const statusTone = !status.connected ? 'danger' : busy ? 'warning' : 'success';
  const statusPill = {
    success: 'border-success/30 bg-success-soft',
    warning: 'border-warning/40 bg-warning-soft',
    danger: 'border-danger/40 bg-danger-soft',
  }[statusTone];

  return (
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0 lg:gap-5 short:gap-3">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <IconBadge icon={Activity} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Live Dashboard</h1>
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-semibold text-ink/80">Noise Suppressor</span> · Real-time audio processing and metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={status.running ? handleStop : handleStart}
            className={`flex h-12 items-center gap-2.5 rounded-2xl border-[1.5px] border-line px-6 font-bold text-white transition-all hover:brightness-105 active:translate-y-px ${
              status.running
                ? 'bg-danger shadow-[0_10px_24px_-12px_var(--danger)]'
                : 'bg-primary shadow-[0_10px_24px_-12px_var(--primary)]'
            }`}
          >
            {status.running ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            <span>{status.running ? 'Stop Engine' : 'Start Engine'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-5">
        {/* Real-time analysis */}
        <section className="card flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:col-span-2 lg:min-h-0 short:gap-3 short:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Real-Time Analysis
            </h2>
            <div
              role="status"
              aria-live="polite"
              className={`flex max-w-full items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-sm font-medium text-ink ${statusPill}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONES[statusTone].fill} ${status.connected ? 'animate-pulse' : ''}`} />
              <span className="truncate">{status.status_msg}</span>
            </div>
          </div>

          <div className="relative min-h-75 flex-1 overflow-hidden lg:min-h-0 rounded-2xl border border-hairline bg-sunken">
            <Waveform level={status.rms_out} />
            <p className="absolute inset-x-0 bottom-4 text-center text-xs font-semibold tracking-[0.15em] text-muted">
              CLEANED OUTPUT{modeLabel && <span className="font-medium tracking-normal"> ({modeLabel})</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={Mic} tone="success" label="Input Level">
              <LevelMeter level={status.rms_in * 5} tone="success" label="Input level" />
            </StatTile>
            <StatTile icon={AudioLines} tone="primary" label="Output Level">
              <LevelMeter level={status.rms_out * 5} tone="primary" label="Output level" />
            </StatTile>
            <StatTile icon={Zap} tone="violet" label="Latency">
              <p className="text-2xl font-bold leading-6">{hasLoad ? `${Math.round(status.latency_ms)} ms` : '—'}</p>
            </StatTile>
            <StatTile icon={Cpu} tone="warning" label="Engine Load">
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold leading-6">{hasLoad ? `${loadPct}%` : '—'}</p>
                {hasLoad && (
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                    <div className={`h-full rounded-full ${TONES[loadTone].fill}`} style={{ width: `${Math.min(loadPct, 100)}%` }} />
                  </div>
                )}
              </div>
            </StatTile>
          </div>
        </section>

        {/* Parameters */}
        <aside className="card no-scrollbar min-w-0 p-5 sm:p-6 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto short:p-4">
          <h2 className="mb-5 flex items-center gap-3 text-xl font-bold short:mb-3">
            <SlidersHorizontal className="text-primary" size={22} />
            Parameters
          </h2>

          {/* On desktop the sections spread out to fill the card's height */}
          <div className="space-y-4 lg:flex lg:flex-1 lg:flex-col lg:justify-between lg:gap-3 lg:space-y-0">
            {/* Side by side on short screens to save height */}
            <div className="space-y-4 short:grid short:grid-cols-2 short:gap-3 short:space-y-0">
              <DeviceSelect
              id="input-device"
              icon={Mic}
              label="Input Device"
              value={deviceIn}
              options={devices.inputs}
              onChange={(e) => setDeviceIn(parseInt(e.target.value))}
              disabled={status.running}
            />
              <DeviceSelect
              id="output-device"
              icon={Volume2}
              label="Output Device"
              value={deviceOut}
              options={devices.outputs}
              onChange={(e) => setDeviceOut(parseInt(e.target.value))}
              disabled={status.running}
            />
            </div>

            <div className="space-y-3 border-t border-hairline pt-4 short:space-y-2 short:pt-3">
              <p className="section-label"><Layers size={16} />Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => sendCommand({ action: "set_mode", value: m.id })}
                    disabled={m.id !== 'noise' && !status.enrolled}
                    aria-pressed={status.mode === m.id}
                    className={`rounded-xl border-[1.5px] px-2 py-2.5 text-sm short:py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      status.mode === m.id
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-hairline bg-surface text-ink hover:border-primary'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => sendCommand({ action: "enroll" })}
                disabled={!status.running || !status.model_loaded || status.enrolling}
                className={`${secondaryBtn} border-primary bg-primary-soft text-ink hover:brightness-[0.98]`}
              >
                <RefreshCw size={18} className={`text-primary ${status.enrolling ? 'animate-spin' : ''}`} />
                {status.enrolling
                  ? 'Recording... talk normally, alone'
                  : status.enrolled ? 'Re-enroll my voice (10 s)' : 'Enroll my voice (10 s)'}
              </button>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <span className={`h-2.5 w-2.5 rounded-full ${status.enrolled ? 'bg-success' : !status.model_loaded ? 'bg-warning' : 'bg-muted'}`} />
                  {!status.model_loaded ? 'Model loading...' : status.enrolled ? 'Voice enrolled' : 'Not enrolled'}
                </span>
                {hasLoad && (
                  <span className="font-mono text-xs text-muted">Load {loadPct}% · {Math.round(status.latency_ms)} ms</span>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-hairline pt-4 short:space-y-2 short:pt-3">
              <button
                onClick={() => sendCommand({ action: "calibrate" })}
                disabled={!status.running || status.calibrating}
                className={`${secondaryBtn} border-line bg-surface text-ink hover:bg-sunken`}
              >
                <Settings size={18} className={status.calibrating ? 'animate-spin' : ''} />
                {status.calibrating ? 'Calibrating... stay quiet' : 'Recalibrate Noise (stay quiet)'}
              </button>
              <button
                onClick={() => sendCommand({ action: "set_enabled", value: !status.enabled })}
                aria-pressed={status.enabled}
                className={`${secondaryBtn} ${
                  status.enabled ? 'border-success/50 bg-success-soft text-ink' : 'border-danger/50 bg-danger-soft text-ink'
                }`}
              >
                {status.enabled
                  ? <ShieldCheck size={18} className="text-success" />
                  : <ShieldOff size={18} className="text-danger" />}
                {status.enabled ? 'Noise Suppression: ON' : 'Noise Suppression: OFF (raw mic)'}
              </button>
            </div>

            <div className="space-y-5 border-t border-hairline pt-4 short:space-y-3 short:pt-3">
              <ParamSlider
                id="noise-strength"
                icon={ChartNoAxesColumn}
                label="Noise Strength"
                min={0.3} max={1.2} step={0.05}
                value={beta}
                format={v => v.toFixed(2)}
                onChange={(val) => {
                  setBeta(val);
                  sendCommand({ action: "set_beta", value: val });
                }}
              />
              <ParamSlider
                id="smoothness"
                icon={Waves}
                label="Smoothness"
                min={0.6} max={0.99} step={0.01}
                value={smooth}
                format={v => v.toFixed(2)}
                onChange={(val) => {
                  setSmooth(val);
                  sendCommand({ action: "set_smooth", value: val });
                }}
              />
              <ParamSlider
                id="output-gain"
                icon={Gauge}
                label="Output Gain"
                min={0.5} max={4} step={0.1}
                value={gain}
                format={v => `${v.toFixed(1)}x`}
                onChange={(val) => {
                  setGain(val);
                  sendCommand({ action: "set_gain", value: val });
                }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
