import { useState, useEffect, useRef, useCallback } from 'react';

// Served by the Python backend: talk to the same host/port. Vite dev server (5173): backend on 8000.
const DEFAULT_WS_URL = window.location.port === '5173'
  ? 'ws://localhost:8000/ws'
  : `ws://${window.location.host}/ws`;

export function useVoiceIsolatorWs(url = DEFAULT_WS_URL) {
  const [status, setStatus] = useState({
    connected: false,
    running: false,
    status_msg: "Disconnected",
    rms_in: 0,
    rms_out: 0,
    sim: 0,
    prox: 0,
    is_ready: false,
    is_enrolled: false,
    calibrating: false,
    enabled: true,
    mode: "noise",
    model_loaded: false,
    enrolled: false,
    enrolling: false,
    rtf: 0,
    latency_ms: 0,
  });
  const [params, setParams] = useState({ beta: 0.7, smooth: 0.9, gain: 1.0, enabled: true });
  
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [defaultDevices, setDefaultDevices] = useState({ in: 0, out: 0 });
  const ws = useRef(null);

  const connect = useCallback(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setStatus(s => ({ ...s, connected: true, status_msg: "Connected" }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        setDevices(data.devices);
        setDefaultDevices({ in: data.default_in, out: data.default_out });
        if (data.params) setParams(data.params);
      } else if (data.type === 'status') {
        setStatus(s => ({
          ...s,
          running: data.running,
          status_msg: data.status_msg,
          rms_in: data.rms_in,
          rms_out: data.rms_out,
          sim: data.sim,
          prox: data.prox,
          is_ready: data.is_ready,
          is_enrolled: data.is_enrolled,
          calibrating: data.calibrating,
          enabled: data.enabled,
          mode: data.mode,
          model_loaded: data.model_loaded,
          enrolled: data.enrolled,
          enrolling: data.enrolling,
          rtf: data.rtf,
          latency_ms: data.latency_ms
        }));
      }
    };

    ws.current.onclose = () => {
      setStatus(s => ({ ...s, connected: false, running: false, status_msg: "Disconnected" }));
      setTimeout(connect, 2000);
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  const sendCommand = (cmd) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(cmd));
    }
  };

  return { status, devices, defaultDevices, params, sendCommand };
}
