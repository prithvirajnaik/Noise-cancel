import React, { useEffect, useRef, useState } from 'react';
import { useVoiceIsolatorWs } from '../hooks/useVoiceIsolatorWs';
import { Play, Square, Settings2, Activity, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { status, devices, defaultDevices, params, sendCommand } = useVoiceIsolatorWs('ws://localhost:8000/ws');
  
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

  const canvasRef = useRef(null);
  const waveHistoryInRef = useRef(new Array(100).fill(0));
  const waveHistoryOutRef = useRef(new Array(100).fill(0));

  // Simple canvas animation loop for visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      // Fix for High DPI screens
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      ctx.clearRect(0, 0, rect.width, rect.height);
      
      const w = rect.width;
      const h = rect.height;
      
      // Update histories (we still keep them for smoothing, but will only use the latest value for the symmetric view)
      const updateHistory = (ref, target) => {
        ref.current.shift();
        const last = ref.current[ref.current.length - 1];
        ref.current.push(last * 0.8 + (target * 4) * 0.2);
      };

      updateHistory(waveHistoryInRef, status.rms_in);
      updateHistory(waveHistoryOutRef, status.rms_out);
      
      // Draw baseline
      ctx.strokeStyle = '#3b426140';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.5); ctx.lineTo(w * 0.9, h * 0.5);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#7d8590';
      ctx.font = '10px Inter font-bold';
      ctx.textAlign = 'center';
      ctx.fillText('CLEANED OUTPUT', w / 2, h * 0.5 - 40);

      // Draw the symmetric "Siri-style" waveform
      const drawSymmetricWave = (amp, color, opacity, scale, weight) => {
        ctx.beginPath();
        ctx.lineWidth = weight;
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        const segments = 80;
        const centerX = w / 2;
        const waveWidth = w * 0.7;
        const step = waveWidth / segments;
        const startX = centerX - waveWidth / 2;
        const time = Date.now() * 0.008;
        
        for (let i = 0; i <= segments; i++) {
          const x = startX + i * step;
          // Gaussian-style envelope: 1 at middle, 0 at ends
          const distFromCenter = Math.abs(i - segments / 2) / (segments / 2);
          const envelope = Math.pow(Math.cos(distFromCenter * Math.PI / 2), 2);
          
          // Multi-frequency wave for complexity
          const noise = (
            Math.sin(i * 0.15 + time) * 0.5 + 
            Math.sin(i * 0.3 - time * 0.5) * 0.3 + 
            Math.sin(i * 0.05 + time * 1.5) * 0.2
          );
          
          const y = h * 0.5 + (noise * amp * (h * 0.4) * scale * envelope);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      const currentAmp = waveHistoryOutRef.current[waveHistoryOutRef.current.length - 1];

      // Draw multiple layers for depth
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#9ece6a';
      drawSymmetricWave(currentAmp, '#9ece6a', 1.0, 1.0, 3);
      
      ctx.shadowBlur = 0;
      drawSymmetricWave(currentAmp, '#7aa2f7', 0.4, 0.7, 1.5); // Fainter underlying tone
      
      ctx.globalAlpha = 1.0;

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [status]);

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

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Live Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Real-time audio processing and metrics</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={status.running ? handleStop : handleStart}
            className={`px-6 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all shadow-lg ${
              status.running 
                ? 'bg-error/10 text-error hover:bg-error/20 border border-error/20 shadow-error/10' 
                : 'bg-primary text-background hover:bg-primary/90 border border-primary/20 shadow-primary/20'
            }`}
          >
            {status.running ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            <span>{status.running ? 'Stop Engine' : 'Start Engine'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        {/* Main Vis Area */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="glass rounded-xl border border-border/50 p-6 flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-text-primary flex items-center">
                <Activity className="mr-2 text-primary" size={18} />
                Real-Time Analysis
              </h3>
              <div className="flex items-center space-x-2 text-xs font-mono glass px-3 py-1 rounded-full">
                <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-success animate-pulse' : 'bg-error'}`} />
                <span className="text-text-secondary">{status.status_msg}</span>
              </div>
            </div>
            
            <div className="flex-1 w-full bg-background-secondary/30 rounded-lg border border-border/30 overflow-hidden relative shadow-inner">
              <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="col-span-1 flex flex-col space-y-6">
          <div className="glass rounded-xl border border-border/50 p-6 h-full">
            <h3 className="font-semibold text-text-primary flex items-center mb-6">
              <Settings2 className="mr-2 text-primary" size={18} />
              Parameters
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Input Device</label>
                <div className="relative">
                  <select 
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none pr-10"
                    value={deviceIn}
                    onChange={(e) => setDeviceIn(parseInt(e.target.value))}
                    disabled={status.running}
                  >
                    {devices.inputs?.map(d => (
                      <option key={d.index} value={d.index}>{d.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Output Device</label>
                <div className="relative">
                  <select 
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none pr-10"
                    value={deviceOut}
                    onChange={(e) => setDeviceOut(parseInt(e.target.value))}
                    disabled={status.running}
                  >
                    {devices.outputs?.map(d => (
                      <option key={d.index} value={d.index}>{d.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-3">
                <button
                  onClick={() => sendCommand({ action: "calibrate" })}
                  disabled={!status.running || status.calibrating}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold border border-border bg-background-secondary text-text-primary hover:border-primary disabled:opacity-40 transition-colors"
                >
                  {status.calibrating ? 'Calibrating... stay quiet' : 'Recalibrate Noise (stay quiet)'}
                </button>
                <button
                  onClick={() => sendCommand({ action: "set_enabled", value: !status.enabled })}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    status.enabled ? 'border-success/30 bg-success/10 text-success' : 'border-error/30 bg-error/10 text-error'
                  }`}
                >
                  {status.enabled ? 'Noise Suppression: ON' : 'Noise Suppression: OFF (raw mic)'}
                </button>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Noise Strength</label>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{beta.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.3" max="1.2" step="0.05"
                  value={beta}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBeta(val);
                    sendCommand({ action: "set_beta", value: val });
                  }}
                  className="w-full accent-primary h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Smoothness</label>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{smooth.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.6" max="0.99" step="0.01"
                  value={smooth}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSmooth(val);
                    sendCommand({ action: "set_smooth", value: val });
                  }}
                  className="w-full accent-primary h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Output Gain</label>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{gain.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="4" step="0.1" 
                  value={gain}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGain(val);
                    sendCommand({ action: "set_gain", value: val });
                  }}
                  className="w-full accent-primary h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
