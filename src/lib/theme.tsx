import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export const THEMES = [
  { id: 'terminal', label: 'Terminal sombre', mode: 'dark' as const },
  { id: 'slate', label: 'Ardoise sombre', mode: 'dark' as const },
  { id: 'docs', label: 'Documentation claire', mode: 'light' as const },
  { id: 'paper', label: 'Papier technique', mode: 'light' as const },
];

export type ThemeId = (typeof THEMES)[number]['id'] | 'system';

const STORAGE_KEY = 'infovergne-home-theme';

interface Ctx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  resolved: string;
}

const ThemeContext = createContext<Ctx>({ theme: 'terminal', setTheme: () => {}, resolved: 'terminal' });

function resolve(theme: ThemeId): string {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'terminal';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'docs' : 'terminal';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('terminal');
  const [resolved, setResolved] = useState('terminal');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const next = stored ?? 'terminal';
    setThemeState(next);
    setResolved(resolve(next));
  }, []);

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    document.documentElement.dataset['theme'] = r;
    const mode = THEMES.find((t) => t.id === r)?.mode ?? 'dark';
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [theme]);

  const setTheme = (t: ThemeId) => {
    window.localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
