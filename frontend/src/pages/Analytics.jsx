import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Activity, Shield, Users, Mic } from 'lucide-react';

const data = [
  { name: '10:00', confidence: 85, noise: 20 },
  { name: '10:05', confidence: 88, noise: 25 },
  { name: '10:10', confidence: 92, noise: 15 },
  { name: '10:15', confidence: 78, noise: 40 },
  { name: '10:20', confidence: 95, noise: 10 },
  { name: '10:25', confidence: 89, noise: 22 },
  { name: '10:30', confidence: 94, noise: 12 },
];

const rejectionStats = [
  { name: 'Rejected Voices', value: 124, color: '#f7768e' },
  { name: 'Target Hits', value: 842, color: '#9ece6a' },
  { name: 'Unknown Noise', value: 45, color: '#e0af68' },
];

export default function Analytics() {
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">System Analytics</h2>
        <p className="text-sm text-text-secondary mt-1">Deep insights into AI verification performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Avg. Confidence', value: '91.4%', icon: <Shield size={20} />, color: 'text-primary' },
          { label: 'Noise Rejected', value: '1.2 GB', icon: <Mic size={20} />, color: 'text-error' },
          { label: 'Active Speakers', value: '2', icon: <Users size={20} />, color: 'text-success' },
          { label: 'Latency (p99)', value: '14ms', icon: <Activity size={20} />, color: 'text-warning' },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-background-secondary ${stat.color}`}>{stat.icon}</div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Real-time</span>
            </div>
            <h4 className="text-sm text-text-secondary font-medium">{stat.label}</h4>
            <div className="text-2xl font-bold text-text-primary mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-border/50">
          <h3 className="font-bold text-text-primary mb-6">Verification Confidence Over Time</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7aa2f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7aa2f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3b426140" vertical={false} />
                <XAxis dataKey="name" stroke="#7d8590" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#7d8590" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#24283b', borderColor: '#3b4261', borderRadius: '8px', color: '#c0caf5' }}
                  itemStyle={{ color: '#7aa2f7' }}
                />
                <Area type="monotone" dataKey="confidence" stroke="#7aa2f7" strokeWidth={3} fillOpacity={1} fill="url(#colorConf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-6 border border-border/50">
          <h3 className="font-bold text-text-primary mb-6">Voice Detection Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rejectionStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3b426140" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#3b426120'}}
                  contentStyle={{ backgroundColor: '#24283b', borderColor: '#3b4261', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {rejectionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {rejectionStats.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <span className="text-text-primary font-mono font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
