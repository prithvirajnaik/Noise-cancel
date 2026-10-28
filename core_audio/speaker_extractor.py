"""Target speaker extraction with VoxLock: keeps only the enrolled voice, even while others talk over it.

Unlike the gate in audio_stream.py (which mutes the whole mic when the voice doesn't match), this runs a
causal neural extractor on every chunk and outputs just the enrolled speaker's speech.
"""
import os
import threading

import numpy as np
import soundfile as sf

SR = 16000
MIN_SAMPLE_SEC = 3.0


class SpeakerExtractor:
    def __init__(self, enroll_path="enrollment.wav", precision="int8-full", threads=2):
        self.enroll_path = enroll_path
        self.precision = precision
        self.threads = threads
        self.vl = None
        self.sample = None
        self.stream = None
        self.error = None
        self._lock = threading.Lock()

    @property
    def is_ready(self):
        return self.vl is not None

    @property
    def is_enrolled(self):
        return self.sample is not None

    def load(self):
        """Load the model (downloads ~70 MB on first use) and any saved enrollment. Blocking."""
        try:
            import voxlock
            self.vl = voxlock.VoxLock(precision=self.precision, threads=self.threads)
            if os.path.exists(self.enroll_path):
                self.sample = voxlock.load_audio(self.enroll_path)
                self.reset()
        except Exception as e:
            self.error = str(e)

    def reset(self):
        """Fresh stream locked to the enrolled voice. Call before audio starts flowing."""
        with self._lock:
            self.stream = self.vl.stream(self.sample) if self.vl is not None and self.sample is not None else None

    def enroll(self, sample):
        """Save a recording of the user talking alone and switch the live stream to it.

        The new stream is first run over the enrollment audio itself (output discarded): a stream that starts
        from an empty state in the middle of speech can mistake the target for background.
        """
        sample = np.asarray(sample, np.float32)
        if len(sample) < MIN_SAMPLE_SEC * SR:
            raise ValueError("enrollment must be at least 3 s")
        sf.write(self.enroll_path, sample, SR)
        new = self.vl.stream(sample)
        new.push(sample)
        with self._lock:
            self.sample, self.stream = sample, new

    def push(self, chunk):
        """16 kHz float32 samples in, the extracted samples that are ready out (variable length, ~24 ms behind)."""
        with self._lock:
            if self.stream is None:
                return np.zeros(0, np.float32)
            return self.stream.push(chunk)
