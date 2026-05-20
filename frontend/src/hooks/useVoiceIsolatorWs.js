import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceIsolatorWs(url = 'ws://localhost:8000/ws') {
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
  });
  
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
          is_enrolled: data.is_enrolled
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

  return { status, devices, defaultDevices, sendCommand };
}
