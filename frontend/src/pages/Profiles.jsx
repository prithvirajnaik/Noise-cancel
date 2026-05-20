import { motion } from 'framer-motion';
import { User, Plus, Trash2, ShieldCheck, Clock } from 'lucide-react';

export default function Profiles() {
  const profiles = [
    { id: 1, name: 'Main User', date: '2026-05-13', embeddings: 33, active: true },
    { id: 2, name: 'Guest Speaker', date: '2026-05-12', embeddings: 28, active: false },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Voice Profiles</h2>
          <p className="text-sm text-text-secondary mt-1">Manage and enroll target speaker identities</p>
        </div>
        <button className="flex items-center space-x-2 bg-primary text-background px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-all">
          <Plus size={18} />
          <span>New Profile</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <motion.div
            key={profile.id}
            whileHover={{ y: -4 }}
            className="glass rounded-xl p-6 border border-border/50 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4">
              {profile.active ? (
                <div className="flex items-center space-x-1 text-success text-[10px] font-bold uppercase tracking-wider bg-success/10 px-2 py-1 rounded-full border border-success/20">
                  <ShieldCheck size={12} />
                  <span>Active</span>
                </div>
              ) : (
                <button className="text-text-secondary hover:text-error transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                <User className="text-text-secondary group-hover:text-primary transition-colors" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-lg">{profile.name}</h3>
                <div className="flex items-center text-text-secondary text-xs mt-1">
                  <Clock size={12} className="mr-1" />
                  <span>Enrolled {profile.date}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background-secondary/50 rounded-lg p-3 border border-border/30">
                <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Embeddings</span>
                <span className="text-primary font-mono font-bold text-xl">{profile.embeddings}</span>
              </div>
              <div className="bg-background-secondary/50 rounded-lg p-3 border border-border/30">
                <span className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Accuracy</span>
                <span className="text-success font-mono font-bold text-xl">98.2%</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border/30 flex items-center justify-between">
              <button className="text-xs font-semibold text-primary hover:underline">View Statistics</button>
              <button className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">Re-train</button>
            </div>
          </motion.div>
        ))}

        {/* Add Profile Placeholder */}
        <motion.div
          whileHover={{ scale: 0.98 }}
          className="border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
            <Plus className="text-text-secondary group-hover:text-primary transition-colors" size={24} />
          </div>
          <span className="text-sm font-semibold text-text-secondary group-hover:text-text-primary">Add New Speaker</span>
        </motion.div>
      </div>
    </div>
  );
}
