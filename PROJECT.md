# Active Noise Cancelling — Project Documentation

## Overview
A real-time voice isolation system that uses AI (ECAPA-TDNN speaker verification) to let **only your voice** pass through to communication apps like Discord, Google Meet, or Zoom. All other voices and background noise are silenced.

---

## Architecture

```
Browser (Premium Dashboard)
    |
    | WebSocket (JSON messages)
    v
FastAPI Server (app.py)
    |--- Serves React build (frontend/dist)
    |
    v
AudioProcessor (core_audio/audio_stream.py)
    |--- reads mic via sounddevice
    |--- runs NoiseSuppressor (dsp.py)
    |--- runs VoiceIsolator (core_audio/voice_isolation.py)
    |       |--- ECAPA-TDNN model (speechbrain)
    |       |--- multi-embedding profile (voice_profile.pt)
    |--- writes to output device (VB Cable)
```

---

## Folder & File Structure

```
Active-Noise-Cancelling/
├── app.py                    # FastAPI server + WebSocket handler
├── dsp.py                    # Spectral subtraction noise suppressor (legacy, currently bypassed)
├── enroll_from_file.py       # CLI script to generate voice profile from audio file
├── voice_profile.pt          # Your saved voice profile (33 sub-embeddings)
├── config.yaml               # Configuration file (from original project)
├── main.py                   # Original CLI main entry (legacy, not used by web app)
├── test.py / test2.py        # Test scripts (legacy)
│
├── core_audio/
│   ├── audio_stream.py       # Real-time audio processing engine
│   └── voice_isolation.py    # ECAPA-TDNN speaker verification & multi-embedding enrollment
│
├── frontend/                 # Modern React Frontend (Vite + Tailwind)
│   ├── src/                  # Components, Pages, Hooks
│   ├── public/               # Static assets
│   ├── tailwind.config.js    # Premium dark theme config
│   └── index.html            # Main entry
│
├── web/                      # Legacy Vanilla Dashboard (Deprecating)
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── pretrained_models/        # Auto-downloaded ECAPA-TDNN weights (speechbrain)
│   └── spkrec-ecapa-voxceleb/
│
├── .venv/                    # Python virtual environment
└── README.md                 # Operating guide
```

---

## File Details

### `app.py` — FastAPI Server
- Serves the web dashboard at `/`
- Mounts `/static` pointing to the `web/` folder
- Handles WebSocket at `/ws` for:
  - Sending device list and status updates (10fps)
  - Receiving commands: `start`, `stop`, `enroll`, `set_gain`, `set_threshold`
- Wraps numpy floats in `float()` before JSON serialization

### `core_audio/voice_isolation.py` — Voice Isolator Engine
- Loads the **ECAPA-TDNN** model from SpeechBrain for speaker verification
- **Multi-embedding enrollment**: Splits audio into overlapping 3-second segments + one global embedding. Your 48s sample produced 33 sub-embeddings
- **Verification**: Compares live 400ms audio window against all 33 embeddings, returns the maximum cosine similarity
- **Persistence**: Saves profile to `voice_profile.pt`, auto-loads on startup
- **Threshold**: Default 0.55, tunable via UI slider (0.40–0.90)

### `core_audio/audio_stream.py` — Real-Time Audio Processor
- Opens a `sounddevice.Stream` with the selected input/output devices
- Runs the audio callback at ~160 samples per hop (10ms frames, 50% overlap)
- **Background verification**: Kicks off speaker verification in a separate thread every 8 frames (~80ms) to avoid blocking the audio callback
- **Asymmetric smoothing**: Fast attack (0.3/0.7) for both rising and falling similarity scores
- **Hard mute**: When similarity < threshold, output is multiplied by 0.0
- **Output gain**: Amplifies final audio (default 3x, adjustable 1x–8x via slider)
- **Debug logging**: Prints `[Voice] raw=X smoothed=Y thresh=Z -> PASS/MUTE` to terminal

### `enroll_from_file.py` — Offline Voice Enrollment
- CLI script: `python enroll_from_file.py <audio_file.wav>`
- Uses `soundfile` to load audio (avoids torchaudio codec issues on Windows)
- Calls `VoiceIsolator.enroll()` which generates multi-embeddings and saves `voice_profile.pt`

### `dsp.py` — Spectral Subtraction Noise Suppressor
- Original noise suppression engine using spectral subtraction with overlap-add
- Currently **bypassed** in the audio pipeline (raw audio passes through instead)
- Kept in the project for potential future use

### `web/index.html` — Dashboard Layout
- Modern, premium UI structure using Inter font
- Incorporates layout elements designed for glassmorphism and animated backgrounds
- Two-row flexbox layout:
  - Row 1: Control Panel (glowing LED-style monitors + customized sliders + start/stop) + Voice Profile card
  - Row 2: Device Settings (custom styled select dropdowns)
- No enrollment button (profile managed via CLI)

### `web/app.js` — Frontend Logic
- Connects to backend via WebSocket with auto-reconnect
- Populates device dropdowns from backend device list
- Updates level bars with smooth animations, status badge, and profile status at 10fps
- Sends `start`, `stop`, `set_gain`, `set_threshold` commands

### `web/style.css` — Styling
- High-fidelity dark mode with deep slate/navy backgrounds and vibrant neon accents
- Implements glassmorphism (`backdrop-filter`) for cards and floating elements
- Dynamic background elements (animated gradients/glows) and micro-animations on interactive elements
- Custom-styled range sliders and glowing audio monitors
- Responsive: stacks to single column on mobile

---

## How It Works (Flow)

1. **Enrollment** (one-time, offline):
   - Record 15–30s of your voice into a `.wav` file
   - Run `python enroll_from_file.py your_voice.wav`
   - This generates `voice_profile.pt` with 33 sub-embeddings

2. **Runtime**:
   - Start server: `uvicorn app:app --reload`
   - Open `http://127.0.0.1:8000` in browser
   - Select mic and VB Cable output, click Start
   - AI loads your profile and begins verifying every ~80ms
   - Your voice → passes through (similarity > threshold)
   - Other voices → hard muted (similarity < threshold)
   - Clean audio is sent to VB Cable → Discord/Meet reads it as your mic

3. **Tuning** (real-time via dashboard):
   - **Sensitivity slider**: Higher = stricter (rejects more). Lower if your voice is being muted. Raise if others leak through.
   - **Output Gain slider**: Amplifies your voice. Raise if too quiet in Discord.
   - **Terminal debug logs**: Watch `[Voice] raw=X smoothed=Y -> PASS/MUTE` to find the right threshold value.
