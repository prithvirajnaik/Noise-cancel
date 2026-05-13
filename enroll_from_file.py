import sys
import os
import torchaudio
import numpy as np

# Adjust path to import from core_audio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core_audio.voice_isolation import VoiceIsolator

def main():
    if len(sys.argv) < 2:
        print("Usage: python enroll_from_file.py <path_to_audio_file>")
        print("Example: python enroll_from_file.py my_voice.wav")
        sys.exit(1)
        
    audio_path = sys.argv[1]
    
    if not os.path.exists(audio_path):
        print(f"Error: File '{audio_path}' not found.")
        sys.exit(1)
        
    print(f"Loading audio file: {audio_path}")
    
    import soundfile as sf
    import torch
    
    try:
        # Load using soundfile (much more reliable on Windows than torchaudio backends)
        waveform_np, sr = sf.read(audio_path)
        # Ensure it's a 2D array [time, channels]
        if waveform_np.ndim == 1:
            waveform_np = waveform_np.reshape(-1, 1)
            
        # Convert to torchaudio's expected [channels, time] format
        waveform = torch.from_numpy(waveform_np.T).float()
    except Exception as e:
        print(f"Failed to load audio: {e}")
        sys.exit(1)
        
    # Convert to mono if stereo
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
        
    # Convert to 1D numpy array for the isolator
    audio_data = waveform.squeeze().numpy()
    
    print("Initializing Voice Isolator engine...")
    isolator = VoiceIsolator()
    isolator.load_model()
    
    print(f"Processing {len(audio_data) / sr:.2f} seconds of audio...")
    # This will generate the embedding and automatically save it to voice_profile.pt
    isolator.enroll(audio_data, sr)
    
    print("\nSuccess! Your voice profile has been saved to 'voice_profile.pt'.")
    print("You can now start the web app, and it will automatically load your profile!")

if __name__ == "__main__":
    main()
