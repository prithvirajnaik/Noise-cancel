import sys
import os
import time
import numpy as np
import sounddevice as sd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core_audio.voice_isolation import VoiceIsolator

SR = 16000
RECORD_SECONDS = 15

def main():
    print("="*50)
    print(" LIVE VOICE ENROLLMENT ")
    print("="*50)
    
    # 1. Select device
    devices = sd.query_devices()
    print("\nAvailable Input Devices:")
    for i, d in enumerate(devices):
        if d['max_input_channels'] > 0:
            marker = " <-- DEFAULT" if i == sd.default.device[0] else ""
            print(f"  [{i}] {d['name']}{marker}")
    
    device_idx = sd.default.device[0]
    if len(sys.argv) > 1:
        try:
            device_idx = int(sys.argv[1])
        except ValueError:
            print("Invalid device index. Using default.")
            
    print(f"\nUsing device [{device_idx}]: {devices[device_idx]['name']}")
    
    # 2. Get ready
    print(f"\nI will now record {RECORD_SECONDS} seconds of audio.")
    print("Please read the following text aloud in your normal speaking voice:\n")
    print('  "The quick brown fox jumps over the lazy dog.')
    print('   I am recording my voice so the AI can learn how I sound.')
    print('   It needs to capture my pitch, my tone, and the acoustics of my room.')
    print('   I will keep talking until the recording is finished so it gets a good sample."\n')
    
    for i in range(3, 0, -1):
        print(f"Starting in {i}...")
        time.sleep(1)
        
    print("\n🔴 RECORDING NOW (Keep speaking!)...")
    
    # 3. Record
    audio = sd.rec(int(SR * RECORD_SECONDS), samplerate=SR, channels=1, dtype='float32', device=device_idx)
    
    # Simple progress bar
    for i in range(RECORD_SECONDS):
        time.sleep(1)
        print(f"  {RECORD_SECONDS - i - 1} seconds left...")
        
    sd.wait()
    audio = audio.squeeze()
    
    rms = np.sqrt(np.mean(audio**2))
    print(f"\nRecording finished. Audio Level (RMS): {rms:.5f}")
    
    if rms < 0.0005:
        print("\nERROR: Audio is too quiet. The mic might be muted or not picking up your voice.")
        print("Please check your microphone and try again.")
        sys.exit(1)
        
    # 4. Enroll
    print("\nProcessing your voice profile...")
    isolator = VoiceIsolator()
    isolator.load_model()
    
    print("\nGenerating multi-embeddings...")
    isolator.enroll(audio, SR)
    
    print("\n✅ SUCCESS! Your live voice profile has been saved.")
    print("You can now restart the web server and test the voice isolation.")

if __name__ == "__main__":
    main()
