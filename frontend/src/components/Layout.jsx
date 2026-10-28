import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-text-primary font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto p-6 scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
}
