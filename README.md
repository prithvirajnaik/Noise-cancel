# Voice Isolator Operating Guide

Welcome to the Voice Isolator! This tool uses advanced AI to learn your voice profile and actively strip out background noise and other voices, ensuring that your chat apps only pick up *you*. 

Follow this guide to get everything configured and running perfectly.

---

## 1. Prerequisites (Virtual Audio Cable)

To bridge the clean, isolated audio from this app into your communication software (like Discord, Google Meet, or Zoom), you need a "Virtual Audio Cable." 

**Important:** The app cannot directly inject audio into Discord. It routes the cleaned audio to a virtual output, which Discord then uses as a virtual microphone.

1. Download **VB-Audio Virtual Cable** from [their official website](https://vb-audio.com/Cable/).
2. Extract the downloaded ZIP file and run the installer (make sure to run it as Administrator).
3. Restart your computer if the installer prompts you to do so.

---

## 2. Dashboard Setup

Once the app is running and you have the dashboard open in your browser, configure your devices:

### Device Settings (Bottom Right Card)
1. **Microphone (Input):** Select your actual physical microphone (e.g., "Headset Mic" or "Blue Yeti").
2. **Output (Virtual Cable):** Select **CABLE Input (VB-Audio Virtual Cable)**. 

### Voice Profile Enrollment (Middle Card)
Before the AI can isolate your voice, it needs to know what you sound like.
1. Click the **Start Enrollment** button.
2. The system will prompt you to speak continuously for **5 seconds**.
3. Talk normally—read a paragraph, describe your day, or just count. 
4. Once completed, the status will change to **✅ Voice Profile Loaded**. 

**Tip:** Ensure you are in a relatively quiet environment when enrolling so the AI learns a clean baseline of your voice.

---

## 3. Operating the Engine

Now that your devices are routed and your voice is enrolled, you can start the noise cancellation engine.

### Starting Isolation
1. In the **Control Panel** (Left Card), click **Start Isolation**.
2. The Topbar status will change to **Running** (Green).

### Monitoring Your Audio
While the engine is running, you can monitor its performance in real-time:
- **Input Level (Mic):** Shows the raw volume coming into your physical microphone (including background noise).
- **Isolated Output (Clean):** Shows the volume of the audio being sent to your chat app. If someone else is talking in the background, this bar should remain low while the Input bar spikes.
- **Voice Match Confidence (AI):** Shows how confident the AI is that the current sound is *your* voice. High confidence means your audio is passing through cleanly.

---

## 4. Connecting to Chat Apps (Discord, Zoom, Meet)

Finally, configure your communication app to use the cleaned audio.

1. Open the Audio/Voice settings in your target app (Discord, Google Meet, Zoom, etc.).
2. Set your **Microphone (Input Device)** to **CABLE Output (VB-Audio Virtual Cable)**.
3. Leave your **Speaker (Output Device)** as your normal headphones/speakers.

**You're all set!** Your chat app is now listening to the Voice Isolator instead of your raw microphone. Turn on a vacuum cleaner or have someone talk behind you—they won't be heard!
