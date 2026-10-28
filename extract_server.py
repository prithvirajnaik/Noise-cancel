"""Noise suppression + "my voice only" target speaker extraction backend for the React dashboard.

Modes:  noise   - dsp.py noise suppression only (same as noise_server.py)
        extract - VoxLock keeps only the enrolled voice (also removes background noise)
        both    - VoxLock, then dsp.py as a light post-filter

Run:  python -m uvicorn extract_server:app --port 8000
"""
import asyncio
import json
import os
import queue
import threading
import time

import numpy as np
import sounddevice as sd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from core_audio.speaker_extractor import SpeakerExtractor
from dsp import NoiseSuppressor
from noise_server import BASE, NoiseEngine

MODES = ("noise", "extract", "both")
CHUNK_MS = 40            # VoxLock chunk size (RTF ~0.5 on 2 threads, int8-full)
PREFILL_MS = 80          # jitter buffer before extracted audio starts playing
MAX_BUFFER_MS = 250      # drop old audio above this to keep latency bounded
ENROLL_SEC = 10
UNDERRUN_LIMIT = 20      # underruns within UNDERRUN_WINDOW_S that trigger the fallback
UNDERRUN_WINDOW_S = 5.0


class OutBuffer:
    """Thread-safe FIFO of float32 samples."""

    def __init__(self):
        self._buf = np.zeros(0, np.float32)
        self._lock = threading.Lock()

    def __len__(self):
        return len(self._buf)

    def write(self, x):
        with self._lock:
            self._buf = np.concatenate([self._buf, x])

    def read(self, n):
        with self._lock:
            if len(self._buf) < n:
                return None
            out, self._buf = self._buf[:n], self._buf[n:]
            return out

    def trim(self, keep):
        with self._lock:
            if len(self._buf) > keep:
                self._buf = self._buf[-keep:]

    def clear(self):
        with self._lock:
            self._buf = np.zeros(0, np.float32)


class ExtractEngine(NoiseEngine):
    def __init__(self):
        super().__init__()
        cfg = self.cfg
        # Separate suppressor for post-filtering extracted audio: its noise template is learned from the
        # extractor's output (much quieter residual noise than the raw mic)
        self.post_ns = NoiseSuppressor(
            sr=self.sr, frame_ms=int(cfg["frame_ms"]), beta=0.5,
            noise_floor=cfg["noise_floor"], ema_alpha=cfg["ema_alpha"],
            gain_smooth=cfg["gain_smooth"], highpass_hz=0,
        )
        self.extractor = SpeakerExtractor(enroll_path=os.path.join(BASE, "enrollment.wav"))
        self.mode = "noise"
        self.fallback_msg = ""
        self.enrolling = False
        self.enroll_buf = []
        self.enroll_msg = ""
        self.rtf = 0.0

        self._in_q = queue.Queue()
        self._out = OutBuffer()
        self._primed = False
        self._underruns = []
        self._worker = None
        self._chunk = int(self.sr * CHUNK_MS / 1000)
        threading.Thread(target=self.extractor.load, daemon=True).start()

    # ---------- state ----------
    @property
    def extracting(self):
        return self.mode in ("extract", "both") and self.extractor.is_ready and self.extractor.is_enrolled

    @property
    def latency_ms(self):
        if not self.extracting:
            return 1000.0 * self.ns.frame_len / self.sr
        return 24.0 + CHUNK_MS + 1000.0 * len(self._out) / self.sr

    def set_mode(self, mode):
        if mode not in MODES:
            return
        if mode != "noise" and not self.extractor.is_enrolled:
            self.fallback_msg = "Enroll your voice first"
            return
        self.mode = mode
        self.fallback_msg = ""
        self._primed = False
        self._underruns.clear()

    def calibrate(self):
        super().calibrate()
        self.post_ns._noise_mag[:] = 1e-3

    def enroll(self):
        if self.running and self.extractor.is_ready and not self.enrolling:
            self.enroll_buf = []
            self.enrolling = True
            self.enroll_msg = ""

    def _finish_enroll(self, audio):
        try:
            self.extractor.enroll(audio)
            self.enroll_msg = "Voice enrolled"
        except Exception as e:
            self.enroll_msg = f"Enrollment failed: {e}"

    # ---------- extraction worker ----------
    def _work(self):
        pending = np.zeros(0, np.float32)
        while self.running:
            try:
                pending = np.concatenate([pending, self._in_q.get(timeout=0.2)])
            except queue.Empty:
                continue
            while len(pending) >= self._chunk:
                chunk, pending = pending[:self._chunk], pending[self._chunk:]
                t = time.perf_counter()
                y = self.extractor.push(chunk)
                self.rtf = 0.9 * self.rtf + 0.1 * ((time.perf_counter() - t) / (CHUNK_MS / 1000))
                self._out.write(y)
                self._out.trim(int(self.sr * MAX_BUFFER_MS / 1000))

    def _read_extracted(self, n):
        """n extracted samples for the callback, or None while buffering / on underrun."""
        if not self._primed:
            if len(self._out) < int(self.sr * PREFILL_MS / 1000):
                return None
            self._primed = True
        y = self._out.read(n)
        if y is None:
            self._primed = False
            now = time.time()
            self._underruns = [t for t in self._underruns if now - t < UNDERRUN_WINDOW_S] + [now]
            if self.extracting and len(self._underruns) >= UNDERRUN_LIMIT:
                self.mode = "noise"
                self.fallback_msg = "CPU too slow - fell back to noise suppression"
        return y

    # ---------- audio ----------
    def _callback(self, indata, outdata, frames, time_info, status):
        x = indata[:, 0].copy()
        if len(x) != self.hop:
            x = x[:self.hop] if len(x) > self.hop else np.pad(x, (0, self.hop - len(x)))
        self.rms_in = float(np.sqrt(np.mean(x ** 2)))

        # The extractor always runs once enrolled, so its state stays warm and mode switches are instant
        if self.extractor.stream is not None:
            self._in_q.put(x)
        ext = self._read_extracted(self.hop) if self.extractor.stream is not None else None

        if self.enrolling:
            self.enroll_buf.append(x)
            if len(self.enroll_buf) * self.hop >= ENROLL_SEC * self.sr:
                self.enrolling = False
                threading.Thread(target=self._finish_enroll,
                                 args=(np.concatenate(self.enroll_buf),), daemon=True).start()
            y = np.zeros_like(x)
        elif self.calibrating:
            self.ns.calibrate_noise(x)
            if ext is not None:
                self.post_ns.calibrate_noise(ext)
            y = np.zeros_like(x)
        elif not self.enabled:
            y = x
        elif self.extracting:
            if ext is None:
                y = np.zeros_like(x)   # never leak the raw mic (other voices) while buffering
            elif self.mode == "both":
                y = self.post_ns.process(ext)
            else:
                y = ext
        else:
            y = self.ns.process(x)

        y = np.clip(y * self.output_gain, -1.0, 1.0)
        outdata[:, 0] = y
        if outdata.shape[1] > 1:
            outdata[:, 1] = y
        self.rms_out = float(np.sqrt(np.mean(y ** 2)))

    def _begin(self):
        """Reset the pipeline and start the extraction worker (before audio starts flowing)."""
        if self.extractor.is_enrolled:
            self.extractor.reset()   # fresh state before any speech arrives
        self._in_q = queue.Queue()
        self._out.clear()
        self._primed = False
        self._underruns.clear()
        self.running = True
        self._worker = threading.Thread(target=self._work, daemon=True)
        self._worker.start()

    def start(self, device_in, device_out):
        if self.running:
            self.stop()
        try:
            self.stream = sd.Stream(
                device=(device_in, device_out), samplerate=self.sr, blocksize=self.hop,
                dtype="float32", channels=1, callback=self._callback,
            )
            self._begin()
            self.stream.start()
            self.calibrate()
            self.status_msg = "Running"
        except Exception as e:
            self.status_msg = f"Error: {e}"
            self.running = False
            self.stream = None

    def stop(self):
        self.enrolling = False
        self.fallback_msg = ""
        super().stop()


engine = ExtractEngine()
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def status_message():
    if engine.extractor.error:
        return f"Model error: {engine.extractor.error}"
    if engine.enrolling:
        left = ENROLL_SEC - len(engine.enroll_buf) * engine.hop / engine.sr
        return f"Enrolling - talk normally, alone ({left:.0f}s left)"
    if engine.running and engine.calibrating:
        return "Calibrating - stay quiet..."
    if engine.fallback_msg:
        return engine.fallback_msg
    if engine.enroll_msg and engine.running:
        return engine.enroll_msg
    if not engine.extractor.is_ready:
        return "Loading voice model..." if not engine.running else "Running (voice model loading...)"
    return engine.status_msg


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    din, dout = engine.default_devices()
    await websocket.send_json({
        "type": "init", "devices": engine.get_devices(),
        "default_in": din, "default_out": dout,
        "params": {"beta": engine.ns.beta, "smooth": engine.ns.gain_smooth,
                   "gain": engine.output_gain, "enabled": engine.enabled, "mode": engine.mode},
    })

    async def send_status():
        while True:
            try:
                await websocket.send_json({
                    "type": "status", "running": engine.running, "status_msg": status_message(),
                    "rms_in": engine.rms_in, "rms_out": engine.rms_out,
                    "calibrating": engine.running and engine.calibrating,
                    "enabled": engine.enabled, "mode": engine.mode,
                    "model_loaded": engine.extractor.is_ready,
                    "enrolled": engine.extractor.is_enrolled, "enrolling": engine.enrolling,
                    "rtf": engine.rtf if engine.running else 0.0,
                    "latency_ms": engine.latency_ms if engine.running else 0.0,
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
            elif action == "enroll":
                engine.enroll()
            elif action == "set_mode":
                engine.set_mode(msg["value"])
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


DIST = os.path.join(BASE, "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str):
        f = os.path.join(DIST, path)
        return FileResponse(f if path and os.path.isfile(f) else os.path.join(DIST, "index.html"))
