# import customtkinter as ctk
# import sounddevice as sd
# import threading
# import numpy as np
# import time

# from dsp import NoiseSuppressor

# ctk.set_appearance_mode("dark")
# ctk.set_default_color_theme("blue")


# class AudioApp:
#     def __init__(self, root):
#         self.root = root
#         self.root.title("Noise Suppressor")

#         self.running = False
#         self.stream = None

#         # Default config
#         self.sr = 16000
#         self.frame_ms = 20

#         self.ns = NoiseSuppressor(sr=self.sr, frame_ms=self.frame_ms)

#         # UI
#         self.build_ui()

#     def build_ui(self):
#         self.start_btn = ctk.CTkButton(self.root, text="Start", command=self.toggle)
#         self.start_btn.pack(pady=10)

#         self.status = ctk.CTkLabel(self.root, text="Idle")
#         self.status.pack()

#         # Device selectors
#         devices = sd.query_devices()
#         device_names = [d['name'] for d in devices]

#         self.input_menu = ctk.CTkOptionMenu(self.root, values=device_names)
#         self.input_menu.pack(pady=5)
#         self.input_menu.set(device_names[0])

#         self.output_menu = ctk.CTkOptionMenu(self.root, values=device_names)
#         self.output_menu.pack(pady=5)
#         self.output_menu.set(device_names[1])

#         # Sliders
#         self.beta_slider = ctk.CTkSlider(self.root, from_=0.1, to=1.5, command=self.update_beta)
#         self.beta_slider.set(0.7)
#         self.beta_slider.pack(pady=5)

#         self.smooth_slider = ctk.CTkSlider(self.root, from_=0.5, to=0.99, command=self.update_smooth)
#         self.smooth_slider.set(0.9)
#         self.smooth_slider.pack(pady=5)

#         # Volume display
#         self.input_level = ctk.CTkLabel(self.root, text="Input: 0.0")
#         self.input_level.pack()

#         self.output_level = ctk.CTkLabel(self.root, text="Output: 0.0")
#         self.output_level.pack()

#     def update_beta(self, val):
#         self.ns.beta = float(val)

#     def update_smooth(self, val):
#         self.ns.gain_smooth = float(val)

#     def toggle(self):
#         if not self.running:
#             self.start()
#         else:
#             self.stop()

#     def start(self):
#         self.running = True
#         self.start_btn.configure(text="Stop")
#         self.status.configure(text="Running")

#         threading.Thread(target=self.run_audio, daemon=True).start()

#     def stop(self):
#         self.running = False
#         self.start_btn.configure(text="Start")
#         self.status.configure(text="Stopped")

#         if self.stream:
#             self.stream.close()

#     def run_audio(self):
#         device_in = self.input_menu.get()
#         device_out = self.output_menu.get()

#         devices = sd.query_devices()

#         in_idx = next(i for i, d in enumerate(devices) if d['name'] == device_in)
#         out_idx = next(i for i, d in enumerate(devices) if d['name'] == device_out)

#         hop = self.ns.hop

#         def callback(indata, outdata, frames, time_info, status):
#             if not self.running:
#                 return

#             x = indata[:, 0]
#             y = self.ns.process(x)

#             outdata[:, 0] = y
#             if outdata.shape[1] > 1:
#                 outdata[:, 1] = y

#             # Update UI safely
#             rms_in = np.sqrt(np.mean(x**2))
#             rms_out = np.sqrt(np.mean(y**2))

#             self.root.after(0, lambda: self.input_level.configure(text=f"Input: {rms_in:.3f}"))
#             self.root.after(0, lambda: self.output_level.configure(text=f"Output: {rms_out:.3f}"))

#         self.stream = sd.Stream(
#             device=(in_idx, out_idx),
#             samplerate=self.sr,
#             blocksize=hop,
#             channels=1,
#             callback=callback
#         )

#         with self.stream:
#             while self.running:
#                 time.sleep(0.1)


# if __name__ == "__main__":
#     root = ctk.CTk()
#     app = AudioApp(root)
#     root.geometry("400x500")
#     root.mainloop()


import customtkinter as ctk
import sounddevice as sd
import threading
import numpy as np
import time

from dsp import NoiseSuppressor

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class AudioApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AudioClean")
        self.root.geometry("480x620")

        self.running = False
        self.test_mode = False
        self.stream = None

        self.sr = 16000
        self.ns = NoiseSuppressor(sr=self.sr, frame_ms=20)

        self.build_ui()

    # ---------------- UI ---------------- #
    def build_ui(self):
        main = ctk.CTkFrame(self.root, fg_color="#0f172a")
        main.pack(fill="both", expand=True)

        # Header
        header = ctk.CTkLabel(
            main,
            text="AudioClean",
            font=("Arial", 26, "bold")
        )
        header.pack(pady=(20, 10))

        self.status = ctk.CTkLabel(main, text="Idle", text_color="#94a3b8")
        self.status.pack(pady=(0, 15))

        # -------- Monitor Card -------- #
        monitor_card = ctk.CTkFrame(main, corner_radius=16)
        monitor_card.pack(padx=20, pady=10, fill="x")

        ctk.CTkLabel(monitor_card, text="Live Audio", font=("Arial", 16)).pack(pady=10)

        self.input_bar = ctk.CTkProgressBar(monitor_card, height=12)
        self.input_bar.pack(fill="x", padx=20, pady=8)

        self.output_bar = ctk.CTkProgressBar(monitor_card, height=12)
        self.output_bar.pack(fill="x", padx=20, pady=8)

        # -------- Controls Card -------- #
        control_card = ctk.CTkFrame(main, corner_radius=16)
        control_card.pack(padx=20, pady=10, fill="x")

        ctk.CTkLabel(control_card, text="Controls", font=("Arial", 16)).pack(pady=10)

        btn_frame = ctk.CTkFrame(control_card, fg_color="transparent")
        btn_frame.pack(pady=10)

        self.start_btn = ctk.CTkButton(btn_frame, text="Start", width=120, command=self.toggle)
        self.start_btn.grid(row=0, column=0, padx=5)

        self.calib_btn = ctk.CTkButton(btn_frame, text="Calibrate", width=120, command=self.calibrate)
        self.calib_btn.grid(row=0, column=1, padx=5)

        self.test_btn = ctk.CTkButton(btn_frame, text="Test", width=120, command=self.toggle_test)
        self.test_btn.grid(row=0, column=2, padx=5)

        # -------- Tuning Card -------- #
        tuning_card = ctk.CTkFrame(main, corner_radius=16)
        tuning_card.pack(padx=20, pady=10, fill="x")

        ctk.CTkLabel(tuning_card, text="Tuning", font=("Arial", 16)).pack(pady=10)

        # Noise Strength
        self.beta_label = ctk.CTkLabel(tuning_card, text="Noise Strength: 0.70")
        self.beta_label.pack()

        self.beta_slider = ctk.CTkSlider(tuning_card, from_=0.3, to=1.2, command=self.update_beta)
        self.beta_slider.set(0.7)
        self.beta_slider.pack(fill="x", padx=20, pady=5)

        # Smoothness
        self.smooth_label = ctk.CTkLabel(tuning_card, text="Smoothness: 0.90")
        self.smooth_label.pack()

        self.smooth_slider = ctk.CTkSlider(tuning_card, from_=0.6, to=0.99, command=self.update_smooth)
        self.smooth_slider.set(0.9)
        self.smooth_slider.pack(fill="x", padx=20, pady=5)

    # ---------------- Logic ---------------- #
    def toggle(self):
        if not self.running:
            self.start()
        else:
            self.stop()

    def toggle_test(self):
        self.test_mode = not self.test_mode
        self.test_btn.configure(text="Test ON" if self.test_mode else "Test")

    def update_beta(self, val):
        val = float(val)
        self.ns.beta = val
        self.beta_label.configure(text=f"Noise Strength: {val:.2f}")

    def update_smooth(self, val):
        val = float(val)
        self.ns.gain_smooth = val
        self.smooth_label.configure(text=f"Smoothness: {val:.2f}")

    def start(self):
        self.running = True
        self.start_btn.configure(text="Stop")
        self.status.configure(text="Running", text_color="#22c55e")

        threading.Thread(target=self.run_audio, daemon=True).start()

    def stop(self):
        self.running = False
        self.start_btn.configure(text="Start")
        self.status.configure(text="Stopped", text_color="#ef4444")

        if self.stream:
            self.stream.close()

    def calibrate(self):
        self.status.configure(text="Calibrating...", text_color="#facc15")
        threading.Thread(target=self.run_calibration, daemon=True).start()

    def run_calibration(self):
        hop = self.ns.hop

        def cb(indata, outdata, frames, t, status):
            self.ns.calibrate_noise(indata[:, 0])
            outdata.fill(0)

        with sd.Stream(samplerate=self.sr, blocksize=hop, channels=1, callback=cb):
            time.sleep(1.5)

        self.status.configure(text="Ready", text_color="#22c55e")

    def run_audio(self):
        hop = self.ns.hop

        def callback(indata, outdata, frames, t, status):
            x = indata[:, 0]

            y = x if self.test_mode else self.ns.process(x)

            outdata[:, 0] = y
            if outdata.shape[1] > 1:
                outdata[:, 1] = y

            rms_in = np.sqrt(np.mean(x**2))
            rms_out = np.sqrt(np.mean(y**2))

            self.root.after(0, lambda: self.input_bar.set(min(rms_in * 5, 1)))
            self.root.after(0, lambda: self.output_bar.set(min(rms_out * 5, 1)))

        self.stream = sd.Stream(
            samplerate=self.sr,
            blocksize=hop,
            channels=1,
            callback=callback
        )

        with self.stream:
            while self.running:
                time.sleep(0.1)


if __name__ == "__main__":
    root = ctk.CTk()
    app = AudioApp(root)
    root.mainloop()