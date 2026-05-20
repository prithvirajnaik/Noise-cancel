import numpy as np

class ProximityFilter:
    def __init__(self, sr=16000):
        """
        Filters out background voices based on the 'Proximity Effect'.
        Near-field sources (< 3 inches) exhibit a massive bass boost on directional mics.
        Far-field sources (other people in the room) lack this bass boost, even if loud.
        """
        self.sr = sr
        self.low_band = (50, 250)    # Proximity bass boost region
        self.mid_band = (300, 3000)  # Standard voice region

    def get_proximity_score(self, chunk: np.ndarray) -> float:
        """
        Returns a score representing how 'close' the audio source is.
        Higher score = closer.
        """
        rms = np.sqrt(np.mean(chunk**2))
        if rms < 0.0005:
            return 0.0

        # Apply a window function to reduce spectral leakage
        windowed = chunk * np.hanning(len(chunk))
        
        # Compute FFT magnitude
        spectrum = np.abs(np.fft.rfft(windowed))
        freqs = np.fft.rfftfreq(len(chunk), 1 / self.sr)

        # Extract energy in bands
        low_mask = (freqs >= self.low_band[0]) & (freqs <= self.low_band[1])
        mid_mask = (freqs >= self.mid_band[0]) & (freqs <= self.mid_band[1])

        low_energy = np.sum(spectrum[low_mask])
        mid_energy = np.sum(spectrum[mid_mask])

        if mid_energy < 1e-6:
            return 0.0

        # Ratio typically varies from 0.2 (distant) to 3.0+ (very close)
        ratio = low_energy / mid_energy
        return float(ratio)
