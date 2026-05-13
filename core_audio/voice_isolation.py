import os
import torch
import numpy as np
import torchaudio
from speechbrain.inference.speaker import EncoderClassifier

class VoiceIsolator:
    def __init__(self, device="cpu"):
        self.device = device
        self.classifier = None
        self.target_embeddings = []  # List of embeddings for robust matching
        self.target_embedding = None  # Keep for backward compat checks
        self.is_ready = False
        self.threshold = 0.35

    def load_profile(self):
        profile_path = "voice_profile.pt"
        if os.path.exists(profile_path):
            data = torch.load(profile_path, map_location=self.device)
            if isinstance(data, list):
                self.target_embeddings = data
            else:
                self.target_embeddings = [data]
            self.target_embedding = self.target_embeddings[0]  # backward compat
            print(f"[OK] Loaded voice profile with {len(self.target_embeddings)} sub-embeddings.")

    def load_model(self):
        """Loads the ECAPA-TDNN model from speechbrain"""
        if self.classifier is None:
            print("Downloading/Loading SpeechBrain ECAPA-TDNN Model...")
            self.classifier = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                run_opts={"device": self.device},
                savedir="pretrained_models/spkrec-ecapa-voxceleb"
            )
            self.is_ready = True
            print("Speaker Verification Model Loaded.")
            
        self.load_profile()

    def enroll(self, audio_data: np.ndarray, sr: int, clear_existing: bool = False):
        """
        Multi-embedding enrollment: splits audio into overlapping 3-second segments
        and computes an embedding for each. This captures different vocal characteristics
        (pitch, volume, tone) for much more robust matching.
        """
        if not self.is_ready:
            self.load_model()
        
        # Load existing profile to append to it
        if not self.target_embeddings and not clear_existing:
            self.load_profile()

        # Resample to 16000 if needed
        if sr != 16000:
            tensor = torch.FloatTensor(audio_data).unsqueeze(0)
            tensor = torchaudio.functional.resample(tensor, orig_freq=sr, new_freq=16000)
            audio_data = tensor.squeeze().numpy()
            sr = 16000

        segment_len = int(3.0 * sr)   # 3 second segments
        hop_len = int(1.5 * sr)       # 1.5 second hop (50% overlap)
        
        if clear_existing:
            self.target_embeddings = []
        
        # Also compute one global embedding from the full audio
        full_tensor = torch.FloatTensor(audio_data).unsqueeze(0).to(self.device)
        with torch.no_grad():
            global_emb = self.classifier.encode_batch(full_tensor).squeeze()
            self.target_embeddings.append(global_emb)
        
        # Compute segment embeddings
        pos = 0
        while pos + segment_len <= len(audio_data):
            segment = audio_data[pos:pos + segment_len]
            tensor = torch.FloatTensor(segment).unsqueeze(0).to(self.device)
            with torch.no_grad():
                emb = self.classifier.encode_batch(tensor).squeeze()
                self.target_embeddings.append(emb)
            pos += hop_len
        
        # Handle remaining tail if it's at least 1 second
        if pos < len(audio_data) and (len(audio_data) - pos) >= sr:
            segment = audio_data[pos:]
            tensor = torch.FloatTensor(segment).unsqueeze(0).to(self.device)
            with torch.no_grad():
                emb = self.classifier.encode_batch(tensor).squeeze()
                self.target_embeddings.append(emb)

        self.target_embedding = self.target_embeddings[0]  # backward compat
        
        # Save to disk
        torch.save(self.target_embeddings, "voice_profile.pt")
        print(f"Enrollment complete. Profile now contains {len(self.target_embeddings)} sub-embeddings.")

    def verify_chunk(self, chunk: np.ndarray, sr: int) -> float:
        """
        Compares the audio chunk against ALL stored embeddings and returns the
        maximum similarity score. This ensures that even if your current speaking
        style doesn't match one embedding, it may match another.
        """
        if not self.is_ready or not self.target_embeddings:
            return 1.0  # Let audio pass if not enrolled

        if sr != 16000:
            tensor = torch.FloatTensor(chunk).unsqueeze(0)
            tensor = torchaudio.functional.resample(tensor, orig_freq=sr, new_freq=16000)
        else:
            tensor = torch.FloatTensor(chunk).unsqueeze(0)

        tensor = tensor.to(self.device)
        
        with torch.no_grad():
            emb = self.classifier.encode_batch(tensor).squeeze()
            
            # Compare against every stored embedding, take the max
            max_sim = -1.0
            for ref_emb in self.target_embeddings:
                sim = torch.nn.functional.cosine_similarity(emb, ref_emb, dim=0).item()
                if sim > max_sim:
                    max_sim = sim
            
        return max_sim
