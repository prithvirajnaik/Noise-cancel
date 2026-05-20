import { Bell, User, Activity } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-16 border-b border-border bg-background-secondary/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="flex items-center space-x-2 bg-card px-3 py-1.5 rounded-full border border-border">
          <Activity size={14} className="text-primary animate-pulse" />
          <span className="text-xs font-mono text-text-secondary">Latency: 12ms</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full text-text-secondary hover:bg-card hover:text-text-primary transition-colors">
          <Bell size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center border-2 border-background shadow-lg shadow-primary/20">
          <User size={16} className="text-white" />
        </div>
      </div>
    </header>
  );
}
