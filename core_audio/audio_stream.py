import sounddevice as sd
import numpy as np
import threading
import time

from core_audio.voice_isolation import VoiceIsolator
from core_audio.proximity import ProximityFilter
from dsp import NoiseSuppressor

class AudioProcessor:
    def __init__(self, sr=16000, frame_ms=20):
        self.sr = sr
        self.frame_ms = frame_ms
        self.frame_len = int(sr * frame_ms / 1000)
        self.hop = self.frame_len // 2
        
        self.stream = None
        self.running = False
        
        self.isolator = VoiceIsolator()
        self.prox_filter = ProximityFilter(sr=sr)
        self.ns = NoiseSuppressor(sr=sr, frame_ms=frame_ms)
        
        # Verification window (1.2s) — needs to be long enough for the AI to hear phonemes
        # ECAPA-TDNN performs poorly and gives unstable scores on very short (<1s) clips
        self.window_sec = 1.2
        self.window_samples = int(sr * self.window_sec)
        self.audio_buffer = np.zeros(self.window_samples, dtype=np.float32)
        
        # Start NON-permissive — audio must be verified before passing through
        self.current_sim = 0.0
        self.current_prox = 0.0
        self.prox_threshold = 0.0 # Default off/low, tunable via UI
        self.enrolling = False
        self.enroll_buffer = []
        
        # Background verification thread state
        self._verify_lock = threading.Lock()
        self._verify_running = False
        self._frame_count = 0
        # Verify every 8 frames (~80ms) for much faster reaction to speaker changes
        self._verify_interval = 8
        
        # Output amplification (default 3x boost)
        self.output_gain = 3.0
        
        # Status for UI
        self.rms_in = 0.0
        self.rms_out = 0.0
        self.status_msg = "Idle"

    def get_devices(self):
        devices = sd.query_devices()
        inputs = []
        outputs = []
        for i, d in enumerate(devices):
            if d['max_input_channels'] > 0:
                inputs.append({'index': i, 'name': d['name']})
            if d['max_output_channels'] > 0:
                outputs.append({'index': i, 'name': d['name']})
        return {'inputs': inputs, 'outputs': outputs}

    def set_enrolling(self, val: bool):
        self.enrolling = val
        if val:
            self.enroll_buffer = []
            self.status_msg = "Enrolling Voice..."

    def _verify_in_background(self, audio_snapshot, sr):
        """Run speaker verification in a background thread so it never blocks audio."""
        try:
            # 1. Proximity Check
            prox_score = self.prox_filter.get_proximity_score(audio_snapshot)
            if prox_score > self.current_prox:
                self.current_prox = self.current_prox * 0.5 + prox_score * 0.5
            else:
                self.current_prox = self.current_prox * 0.8 + prox_score * 0.2

            # 2. Voice Verification
            sim = self.isolator.verify_chunk(audio_snapshot, sr)
            
            # Asymmetric smoothing:
            #   - Fast attack (similarity rises) -> react quickly to UNMUTE when user speaks
            #   - Slow release (similarity drops) -> prevent chopping during brief pauses
            if sim > self.current_sim:
                self.current_sim = self.current_sim * 0.2 + sim * 0.8
            else:
                self.current_sim = self.current_sim * 0.8 + sim * 0.2
            
            # Debug: print to terminal so user can see what scores they get
            action = "PASS" if (self.current_sim >= self.isolator.threshold and self.current_prox >= self.prox_threshold) else "MUTE"
            print(f"[Voice] sim={self.current_sim:.3f} prox={self.current_prox:.2f} -> {action}")
        except Exception as e:
            print(f"Verification error: {e}")
        finally:
            self._verify_running = False

    def start_stream(self, device_in_idx, device_out_idx):
        if self.running:
            self.stop_stream()
            
        self.running = True
        self.status_msg = "Running"
        self._frame_count = 0
        self.current_sim = 0.5 if self.isolator.target_embeddings else 1.0
        self.current_prox = 1.0
        
        # Load model async if not loaded
        if not self.isolator.is_ready:
            threading.Thread(target=self.isolator.load_model).start()
        else:
            self.isolator.load_profile()
            
        def callback(indata, outdata, frames, time_info, status):
            if not self.running:
                outdata.fill(0)
                return

            x = indata[:, 0].copy()
            
            # Measure input level
            rms = np.sqrt(np.mean(x**2))
            self.rms_in = rms
            
            # Record for enrollment
            if self.enrolling:
                self.enroll_buffer.append(x.copy())
                if len(self.enroll_buffer) * self.hop >= self.sr * 5:
                    self.enrolling = False
                    self.status_msg = "Processing Enrollment..."
                    full_audio = np.concatenate(self.enroll_buffer)
                    threading.Thread(target=self._enroll_bg, args=(full_audio,)).start()
                outdata.fill(0)
                self.rms_out = 0.0
                return

            # Start with raw audio
            y = x.copy()

            # Voice Isolation Logic (Only if enrolled)
            if self.isolator.is_ready and self.isolator.target_embeddings:
                self._frame_count += 1
                
                # VAD (Voice Activity Detection):
                # Only shift the verification buffer if there is actual sound.
                # This prevents brief pauses from filling the buffer with silence,
                # which causes a massive similarity drop at the start of every new sentence.
                if rms > 0.0005:
                    self.audio_buffer = np.roll(self.audio_buffer, -self.hop)
                    self.audio_buffer[-self.hop:] = x
                
                # Kick off background verification more frequently
                if self._frame_count % self._verify_interval == 0 and not self._verify_running and rms > 0.0005:
                    self._verify_running = True
                    snapshot = self.audio_buffer.copy()
                    threading.Thread(target=self._verify_in_background, args=(snapshot, self.sr)).start()
                

                # Hard mute: if not your voice, or if it is too far away
                if self.current_sim < self.isolator.threshold or self.current_prox < self.prox_threshold:
                    y = y * 0.0
                    
            # Amplify and clip to prevent distortion
            y = np.clip(y * self.output_gain, -1.0, 1.0)
            
            outdata[:, 0] = y
            if outdata.shape[1] > 1:
                outdata[:, 1] = y
                
            self.rms_out = np.sqrt(np.mean(y**2))

        try:
            self.stream = sd.Stream(
                device=(device_in_idx, device_out_idx),
                samplerate=self.sr,
                blocksize=self.hop,
                channels=1,
                callback=callback
            )
            self.stream.start()
        except Exception as e:
            self.status_msg = f"Error: {str(e)}"
            self.running = False

    def _enroll_bg(self, audio):
        self.isolator.enroll(audio, self.sr)
        self.status_msg = "Enrollment Complete. Ready."

    def stop_stream(self):
        self.running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.status_msg = "Stopped"
