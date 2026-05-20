import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings, Mic2, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const links = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/profiles', icon: <Users size={20} />, label: 'Profiles' },
    { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-background-secondary border-r border-border flex flex-col relative">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Hexagon className="text-primary mr-3" size={24} />
        <span className="font-bold text-lg text-text-primary tracking-wide">Isolator AI</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 relative">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-md transition-all duration-200 relative ${
                isActive 
                  ? 'bg-card text-primary shadow-sm border border-border/50' 
                  : 'text-text-secondary hover:bg-card/40 hover:text-text-primary border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="mr-3">{link.icon}</span>
                <span className="font-medium text-sm">{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute -left-4 w-1 h-6 bg-primary rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center p-3 glass rounded-lg">
          <Mic2 className="text-success mr-3" size={18} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Engine Status</span>
            <span className="text-sm font-semibold text-success">Online & Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
