import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const features = [
    "Real-Time Speaker Verification",
    "AI Voice Prioritization",
    "Noise Suppression",
    "Ultra Low Latency"
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col font-sans">
      {/* Animated Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <header className="h-20 flex items-center justify-between px-8 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
              <path d="M12 4L12 20M17 8L17 16M7 8L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">Isolator AI</span>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium text-text-secondary">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#demo" className="hover:text-primary transition-colors">Technology</a>
          <Link to="/dashboard" className="text-text-primary hover:text-primary transition-colors">App</Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center z-10 px-6 mt-[-4rem]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl text-center"
        >
          <div className="inline-flex items-center space-x-2 glass px-3 py-1.5 rounded-full mb-8 border border-border/50">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">v2.0 Beta Live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-text-secondary tracking-tight leading-[1.1] mb-6">
            Focused Voice Communication<br />Powered by AI.
          </h1>
          
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Real-time speaker verification that isolates your voice while suppressing unwanted speech and environmental distractions.
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <Link to="/dashboard">
              <button className="group relative px-6 py-3 bg-primary text-background font-semibold rounded-lg overflow-hidden flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-primary/20">
                <span>Launch Dashboard</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-6 py-3 glass text-text-primary font-semibold rounded-lg flex items-center space-x-2 hover:bg-card transition-all">
              <Play size={18} />
              <span>Watch Demo</span>
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl w-full"
        >
          {features.map((f, i) => (
            <div key={i} className="flex items-center space-x-3 glass p-4 rounded-xl border border-border/40 hover:-translate-y-1 transition-transform duration-300">
              <CheckCircle2 size={18} className="text-primary" />
              <span className="text-sm font-medium text-text-secondary">{f}</span>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
