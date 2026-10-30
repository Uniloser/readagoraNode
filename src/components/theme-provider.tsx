'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
export type ThemePreference = 'system' | 'dark' | 'light';
const ThemeContext = createContext<{ theme: 'dark' | 'light'; preference: ThemePreference; setPreference: (theme: ThemePreference) => void; toggle: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const stored = localStorage.getItem('readagora-theme');
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    } catch { return 'system'; }
  });
  const [systemDark, setSystemDark] = useState(true);
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const syncPreference = (event: Event) => {
      const requested = (event as CustomEvent<unknown>).detail;
      if (requested === 'system' || requested === 'light' || requested === 'dark') setPreferenceState(requested);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== 'readagora-theme') return;
      setPreferenceState(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system');
    };
    window.addEventListener('readagora-theme-change', syncPreference);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('readagora-theme-change', syncPreference);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    const color = theme === 'light' ? '#f5f5f6' : '#000000';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [theme, preference]);
  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try { localStorage.setItem('readagora-theme', next); } catch { /* The in-memory preference still applies if storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent('readagora-theme-change', { detail: next }));
  }, []);
  const toggle = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [setPreference, theme]);
  return <ThemeContext.Provider value={{ theme, preference, setPreference, toggle }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('useTheme must be used within ThemeProvider'); return value; }
