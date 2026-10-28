"""Drive ExtractEngine's audio callback at real-time pace with a known mixture (no sound devices needed).

  python tools/engine_test.py --enroll enroll.wav --mix mixture.wav --target clean.wav [--mode extract]
"""
import argparse
import os
import sys
import time

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voxlock  # noqa: E402
from extract_test import si_sdr  # noqa: E402
import extract_server  # noqa: E402


def aligned_si_sdr(y, ref, max_lag):
    """SI-SDR after removing the pipeline delay (best lag in 0..max_lag)."""
    best = (-1e9, 0)
    for lag in range(0, max_lag, 16):
        best = max(best, (si_sdr(y[lag:], ref[:len(ref) - lag]), lag))
    return best


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--enroll", required=True); p.add_argument("--mix", required=True)
    p.add_argument("--target", required=True); p.add_argument("--mode", default="extract")
    p.add_argument("--out", default="engine_out.wav")
    a = p.parse_args()

    eng = extract_server.engine
    eng.extractor.enroll_path = os.path.join(os.path.dirname(os.path.abspath(a.out)), "engine_enroll.wav")
    while not eng.extractor.is_ready and not eng.extractor.error:
        time.sleep(0.2)
    if eng.extractor.error:
        sys.exit(f"model error: {eng.extractor.error}")
    eng.extractor.enroll(voxlock.load_audio(a.enroll))

    mix, target = voxlock.load_audio(a.mix), voxlock.load_audio(a.target)
    eng.set_mode(a.mode)
    eng._begin()
    eng.calibrating_until = 0.0          # skip calibration so the whole clip is scored
    hop, sr = eng.hop, eng.sr
    out = np.zeros((hop, 1), np.float32)
    ys, t0 = [], time.perf_counter()
    for i, s in enumerate(range(0, len(mix) - hop, hop)):
        eng._callback(mix[s:s + hop, None], out, hop, None, None)
        ys.append(out[:, 0].copy())
        lat = (i + 1) * hop / sr - (time.perf_counter() - t0)   # pace like a real 10 ms audio callback
        if lat > 0:
            time.sleep(lat)
    eng.running = False
    y = np.concatenate(ys)
    sf.write(a.out, y, sr)
    score, lag = aligned_si_sdr(y, target[:len(y)], int(0.4 * sr))
    print(f"mode={eng.mode}  input SI-SDR {si_sdr(mix, target):.2f} dB -> output {score:.2f} dB "
          f"(delay {1000 * lag / sr:.0f} ms)  underruns={len(eng._underruns)}  rtf={eng.rtf:.2f}  "
          f"fallback='{eng.fallback_msg}'")


if __name__ == "__main__":
    main()
