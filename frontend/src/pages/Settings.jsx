import { Settings as SettingsIcon, Sliders, Volume2, Shield, Monitor, Zap } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
        <p className="text-sm text-text-secondary mt-1">Configure your AI engine and interface preferences</p>
      </div>

      <div className="space-y-6">
        {/* Audio Engine Settings */}
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-background-secondary/30 flex items-center space-x-3">
            <Zap className="text-primary" size={20} />
            <h3 className="font-bold text-text-primary">Audio Engine</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Ultra-Low Latency Mode</h4>
                <p className="text-xs text-text-secondary mt-1">Prioritize speed over complex verification steps</p>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-background-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Spectral Subtraction</h4>
                <p className="text-xs text-text-secondary mt-1">Enable secondary noise suppression layer (Legacy)</p>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-background-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Thresholds */}
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-background-secondary/30 flex items-center space-x-3">
            <Shield className="text-success" size={20} />
            <h3 className="font-bold text-text-primary">Security & Verification</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <h4 className="text-sm font-semibold text-text-primary">Enforcement Strictness</h4>
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">High</span>
              </div>
              <input type="range" className="w-full accent-primary h-1.5 bg-background-secondary rounded-lg appearance-none cursor-pointer" defaultValue="75" />
              <p className="text-[10px] text-text-secondary uppercase tracking-tighter">Higher strictness reduces background leakage but may clip quiet speech.</p>
            </div>
          </div>
        </div>

        {/* Interface Settings */}
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-background-secondary/30 flex items-center space-x-3">
            <Monitor className="text-warning" size={20} />
            <h3 className="font-bold text-text-primary">Interface</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Color Theme</label>
                <select className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary appearance-none">
                  <option>Tokyo Night (Default)</option>
                  <option>Midnight</option>
                  <option>Carbon</option>
                  <option>Frost</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Vis. Intensity</label>
                <select className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary appearance-none">
                  <option>High (60fps)</option>
                  <option>Medium (30fps)</option>
                  <option>Low (Minimalist)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button className="px-6 py-2.5 bg-primary text-background font-bold rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all">
          Save Changes
        </button>
      </div>
    </div>
  );
}
