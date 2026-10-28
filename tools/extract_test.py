"""Offline go/no-go test for VoxLock target speaker extraction.

Streams a mixture through VoxLock in fixed-size chunks (exactly as the live server will)
and reports the real-time factor. If the clean target is known, also reports SI-SDR.

  # your own voice: records enrollment (talk alone) then a mixture (talk while someone else talks)
  python tools/extract_test.py --record --device 1

  # files: enrollment = target talking alone, mixture = target + others
  python tools/extract_test.py --enroll enroll.wav --mix mixture.wav [--target clean.wav]
"""
import argparse
import os
import time

import numpy as np
import soundfile as sf
import voxlock

SR = voxlock.SR


def si_sdr(est, ref):
    n = min(len(est), len(ref))
    est, ref = est[:n] - est[:n].mean(), ref[:n] - ref[:n].mean()
    s = (est @ ref) / (ref @ ref + 1e-9) * ref
    return 10 * np.log10((s @ s) / ((est - s) @ (est - s) + 1e-9))


def record(seconds, device, prompt):
    import sounddevice as sd
    input(f"\n{prompt}\nPress Enter to start a {seconds}s recording...")
    x = sd.rec(int(seconds * SR), samplerate=SR, channels=1, dtype="float32", device=device)
    sd.wait()
    return x[:, 0]


def run_stream(vl, sample, mix, chunk_ms):
    n = int(SR * chunk_ms / 1000)
    st = vl.stream(sample)
    out, worst, t0 = [], 0.0, time.perf_counter()
    for i in range(0, len(mix), n):
        t = time.perf_counter()
        out.append(st.push(mix[i:i + n]))
        worst = max(worst, time.perf_counter() - t)
    out.append(st.flush())
    total = time.perf_counter() - t0
    return np.concatenate(out)[:len(mix)], total / (len(mix) / SR), worst * 1000


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--enroll"); p.add_argument("--mix"); p.add_argument("--target")
    p.add_argument("--record", action="store_true"); p.add_argument("--device", type=int, default=None)
    p.add_argument("--chunk_ms", type=int, nargs="+", default=[20, 40, 80])
    p.add_argument("--precision", default="int8"); p.add_argument("--threads", type=int, default=1)
    p.add_argument("--out", default="extract_out")
    a = p.parse_args()
    os.makedirs(a.out, exist_ok=True)

    if a.record:
        sample = record(10, a.device, "ENROLLMENT: talk normally, alone, for 10 seconds.")
        mix = record(15, a.device, "MIXTURE: talk while another person (or a video/podcast) talks at the same time.")
        sf.write(os.path.join(a.out, "enroll.wav"), sample, SR)
        sf.write(os.path.join(a.out, "mixture.wav"), mix, SR)
    else:
        sample, mix = voxlock.load_audio(a.enroll), voxlock.load_audio(a.mix)
    target = voxlock.load_audio(a.target) if a.target else None

    print(f"Loading VoxLock ({a.precision}, threads={a.threads})...")
    vl = voxlock.VoxLock(precision=a.precision, threads=a.threads)

    if target is not None:
        print(f"Input mixture SI-SDR vs target: {si_sdr(mix, target):6.2f} dB")
    for ms in a.chunk_ms:
        y, rtf, worst = run_stream(vl, sample, mix, ms)
        path = os.path.join(a.out, f"extracted_{ms}ms.wav")
        sf.write(path, y, SR)
        line = f"chunk {ms:3d} ms: RTF {rtf:.2f}  worst call {worst:5.1f} ms (budget {ms} ms)"
        if target is not None:
            line += f"  output SI-SDR {si_sdr(y, target):6.2f} dB"
        print(line + f"  -> {path}")


if __name__ == "__main__":
    main()
