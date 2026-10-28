"""Noise-suppression-only backend for the React dashboard (no voice profile, no torch).

Run:  python -m uvicorn noise_server:app --port 8000
"""
import asyncio
import json
import os
import time

import numpy as np
import sounddevice as sd
import yaml
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from dsp import NoiseSuppressor

BASE = os.path.dirname(os.path.abspath(__file__))


def load_config():
    cfg = {
        "samplerate": 16000, "frame_ms": 20, "calib_sec": 1.5, "highpass_hz": 80,
        "noise_beta": 0.7, "noise_floor": 0.05, "ema_alpha": 0.98, "gain_smooth": 0.9,
        "device_in": None, "device_out": None,
    }
    try:
        with open(os.path.join(BASE, "config.yaml"), "r", encoding="utf-8") as f:
            cfg.update(yaml.safe_load(f) or {})
    except FileNotFoundError:
        pass
    return cfg


class NoiseEngine:
    def __init__(self):
        cfg = load_config()
        self.cfg = cfg
        self.sr = int(cfg["samplerate"])
        self.ns = NoiseSuppressor(
            sr=self.sr, frame_ms=int(cfg["frame_ms"]), beta=cfg["noise_beta"],
            noise_floor=cfg["noise_floor"], ema_alpha=cfg["ema_alpha"],
            gain_smooth=cfg["gain_smooth"], highpass_hz=cfg["highpass_hz"],
        )
        self.hop = self.ns.hop
        self.calib_sec = float(cfg["calib_sec"])

        self.stream = None
        self.running = False
        self.enabled = True          # False = bypass, for A/B comparison
        self.output_gain = 1.0
        self.calibrating_until = 0.0
        self.rms_in = 0.0
        self.rms_out = 0.0
        self.status_msg = "Idle"

    @property
    def calibrating(self):
        return time.time() < self.calibrating_until

    def get_devices(self):
        inputs, outputs = [], []
        for i, d in enumerate(sd.query_devices()):
            if d["max_input_channels"] > 0:
                inputs.append({"index": i, "name": d["name"]})
            if d["max_output_channels"] > 0:
                outputs.append({"index": i, "name": d["name"]})
        return {"inputs": inputs, "outputs": outputs}

    def default_devices(self):
        din, dout = self.cfg.get("device_in"), self.cfg.get("device_out")
        if din is None or dout is None:
            try:
                sd_in, sd_out = sd.default.device
            except Exception:
                sd_in, sd_out = 0, 0
            din = sd_in if din is None else din
            dout = sd_out if dout is None else dout
        return int(din), int(dout)

    def calibrate(self):
        # Reset the noise template so it is learned fresh from the next calib_sec seconds
        self.ns._noise_mag[:] = 1e-3
        self.calibrating_until = time.time() + self.calib_sec

    def start(self, device_in, device_out):
        if self.running:
            self.stop()

        def callback(indata, outdata, frames, time_info, status):
            x = indata[:, 0].copy()
            if len(x) != self.hop:
                x = x[:self.hop] if len(x) > self.hop else np.pad(x, (0, self.hop - len(x)))
            self.rms_in = float(np.sqrt(np.mean(x ** 2)))

            if self.calibrating:
                # Learn the noise template, send silence meanwhile
                self.ns.calibrate_noise(x)
                y = np.zeros_like(x)
            elif self.enabled:
                y = self.ns.process(x)
            else:
                y = x

            y = np.clip(y * self.output_gain, -1.0, 1.0)
            outdata[:, 0] = y
            if outdata.shape[1] > 1:
                outdata[:, 1] = y
            self.rms_out = float(np.sqrt(np.mean(y ** 2)))

        try:
            self.stream = sd.Stream(
                device=(device_in, device_out), samplerate=self.sr, blocksize=self.hop,
                dtype="float32", channels=1, callback=callback,
            )
            self.stream.start()
            self.running = True
            self.calibrate()  # learn the room noise on every start
            self.status_msg = "Running"
        except Exception as e:
            self.status_msg = f"Error: {e}"
            self.running = False
            self.stream = None

    def stop(self):
        self.running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.rms_in = self.rms_out = 0.0
        self.status_msg = "Stopped"


engine = NoiseEngine()
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    din, dout = engine.default_devices()
    await websocket.send_json({
        "type": "init", "devices": engine.get_devices(),
        "default_in": din, "default_out": dout,
        "params": {"beta": engine.ns.beta, "smooth": engine.ns.gain_smooth,
                   "gain": engine.output_gain, "enabled": engine.enabled},
    })

    async def send_status():
        while True:
            try:
                msg = "Calibrating - stay quiet..." if (engine.running and engine.calibrating) else engine.status_msg
                await websocket.send_json({
                    "type": "status", "running": engine.running, "status_msg": msg,
                    "rms_in": engine.rms_in, "rms_out": engine.rms_out,
                    "calibrating": engine.running and engine.calibrating,
                    "enabled": engine.enabled,
                })
                await asyncio.sleep(0.1)
            except Exception:
                break

    status_task = asyncio.create_task(send_status())
    try:
        while True:
            msg = json.loads(await websocket.receive_text())
            action = msg.get("action")
            if action == "start":
                engine.start(int(msg["device_in"]), int(msg["device_out"]))
            elif action == "stop":
                engine.stop()
            elif action == "calibrate" and engine.running:
                engine.calibrate()
            elif action == "set_enabled":
                engine.enabled = bool(msg["value"])
            elif action == "set_gain":
                engine.output_gain = float(msg["value"])
            elif action == "set_beta":
                engine.ns.beta = float(msg["value"])
            elif action == "set_smooth":
                engine.ns.gain_smooth = float(msg["value"])
    except WebSocketDisconnect:
        pass
    finally:
        status_task.cancel()


# Serve the built React app (run `npm run build` in frontend/) from the same port
DIST = os.path.join(BASE, "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str):
        f = os.path.join(DIST, path)
        return FileResponse(f if path and os.path.isfile(f) else os.path.join(DIST, "index.html"))
