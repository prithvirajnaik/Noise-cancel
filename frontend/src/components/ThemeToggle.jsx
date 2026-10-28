import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      // Storage unavailable (private window etc.): the theme just won't persist
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark(d => !d)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="grid h-12 w-12 place-items-center rounded-2xl border-[1.5px] border-line bg-surface text-ink shadow-sm transition-colors hover:bg-sunken"
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
