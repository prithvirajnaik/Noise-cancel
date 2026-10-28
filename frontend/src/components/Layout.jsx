import { Outlet } from 'react-router-dom';
import Decorations from './Decorations';

export default function Layout() {
  return (
    // On desktop the page is exactly one screen tall; phones scroll normally
    <div className="relative min-h-screen w-full text-ink font-sans lg:h-screen lg:overflow-hidden">
      <Decorations />
      <main className="relative mx-auto flex w-full max-w-[1500px] flex-col px-4 py-6 sm:px-8 lg:h-full lg:py-5 lg:short:py-3">
        <Outlet />
      </main>
    </div>
  );
}
