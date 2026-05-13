import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sounddevice as sd

from core_audio.audio_stream import AudioProcessor

app = FastAPI()

# Make sure the web directory exists
os.makedirs("web", exist_ok=True)

# Mount the web directory for static files
app.mount("/static", StaticFiles(directory="web"), name="static")

audio_processor = AudioProcessor()

@app.get("/")
async def root():
    return FileResponse("web/index.html")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Send initial state
    devices = audio_processor.get_devices()
    try:
        # We try to get default input and output indices
        default_in = sd.default.device[0]
        default_out = sd.default.device[1]
    except:
        default_in = 0
        default_out = 0
        
    await websocket.send_json({
        "type": "init",
        "devices": devices,
        "default_in": default_in,
        "default_out": default_out
    })
    
    # Task to continuously send audio status
    async def send_status():
        while True:
            try:
                await websocket.send_json({
                    "type": "status",
                    "running": audio_processor.running,
                    "status_msg": audio_processor.status_msg,
                    "rms_in": float(audio_processor.rms_in),
                    "rms_out": float(audio_processor.rms_out),
                    "sim": float(audio_processor.current_sim),
                    "is_ready": audio_processor.isolator.is_ready,
                    "is_enrolled": len(audio_processor.isolator.target_embeddings) > 0
                })
                await asyncio.sleep(0.1) # 10fps UI update
            except Exception:
                break
                
    status_task = asyncio.create_task(send_status())
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg["action"] == "start":
                audio_processor.start_stream(int(msg["device_in"]), int(msg["device_out"]))
            elif msg["action"] == "stop":
                audio_processor.stop_stream()
            elif msg["action"] == "enroll":
                audio_processor.set_enrolling(True)
            elif msg["action"] == "set_gain":
                audio_processor.output_gain = float(msg["value"])
            elif msg["action"] == "set_threshold":
                audio_processor.isolator.threshold = float(msg["value"])
                
    except WebSocketDisconnect:
        status_task.cancel()
