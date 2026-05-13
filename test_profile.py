"""
Test script to verify if voice_profile.pt matches your live voice.
Records 5 seconds from your microphone, then compares against your saved profile.

Usage: python test_profile.py
"""
import sys
import os
import numpy as np
import sounddevice as sd
import torch

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core_audio.voice_isolation import VoiceIsolator

SR = 16000
RECORD_SECONDS = 5

def main():
    # 1. Check profile exists
    if not os.path.exists("voice_profile.pt"):
        print("ERROR: voice_profile.pt not found. Run enroll_from_file.py first.")
        sys.exit(1)

    # 2. Load model and profile
    print("Loading AI model and voice profile...")
    isolator = VoiceIsolator()
    isolator.load_model()
    
    num_emb = len(isolator.target_embeddings)
    print(f"Profile loaded: {num_emb} sub-embeddings\n")

    # 3. List devices and let user pick
    devices = sd.query_devices()
    print("Available input devices:")
    for i, d in enumerate(devices):
        if d['max_input_channels'] > 0:
            marker = " <-- DEFAULT" if i == sd.default.device[0] else ""
            print(f"  [{i}] {d['name']}{marker}")
    
    print(f"\nUsing default input device: [{sd.default.device[0]}] {devices[sd.default.device[0]]['name']}")
    print(f"\n--- Speak into your mic for {RECORD_SECONDS} seconds ---")
    print("Recording starts NOW...")

    # 4. Record
    audio = sd.rec(int(SR * RECORD_SECONDS), samplerate=SR, channels=1, dtype='float32')
    sd.wait()
    audio = audio.squeeze()
    
    rms = np.sqrt(np.mean(audio**2))
    print(f"\nRecording done. RMS level: {rms:.5f}")
    if rms < 0.001:
        print("WARNING: Very low audio level detected. Is your mic working?")

    # 5. Test in chunks (simulating real-time)
    print("\n" + "="*60)
    print("RESULTS: Comparing your voice against saved profile")
    print("="*60)
    
    chunk_sec = 0.5  # Test in 500ms chunks
    chunk_len = int(SR * chunk_sec)
    scores = []
    
    for i in range(0, len(audio) - chunk_len, chunk_len):
        chunk = audio[i:i + chunk_len]
        chunk_rms = np.sqrt(np.mean(chunk**2))
        
        if chunk_rms < 0.001:
            print(f"  Chunk {i//chunk_len + 1}: [silence]")
            continue
            
        sim = isolator.verify_chunk(chunk, SR)
        scores.append(sim)
        
        bar_len = int(sim * 30)
        bar = "#" * bar_len + "-" * (30 - bar_len)
        status = "PASS" if sim >= isolator.threshold else "FAIL"
        print(f"  Chunk {i//chunk_len + 1}: sim={sim:.4f} [{bar}] {status}")

    # 6. Summary
    if scores:
        avg = np.mean(scores)
        mn = np.min(scores)
        mx = np.max(scores)
        
        print(f"\n{'='*60}")
        print(f"SUMMARY")
        print(f"{'='*60}")
        print(f"  Chunks tested : {len(scores)}")
        print(f"  Average score : {avg:.4f}")
        print(f"  Min score     : {mn:.4f}")
        print(f"  Max score     : {mx:.4f}")
        print(f"  Threshold     : {isolator.threshold:.2f}")
        print(f"  Pass rate     : {sum(1 for s in scores if s >= isolator.threshold)}/{len(scores)}")
        print()
        
        if avg >= isolator.threshold:
            print("  VERDICT: Profile MATCHES your voice well!")
            print(f"  Recommended threshold: {mn - 0.05:.2f} to {avg:.2f}")
        else:
            print("  VERDICT: Profile does NOT match well enough at current threshold.")
            print(f"  Try lowering threshold to: {mn - 0.05:.2f}")
            print(f"  Or re-enroll with a recording from THIS microphone.")
    else:
        print("\nNo audio detected. Check your microphone.")

if __name__ == "__main__":
    main()
