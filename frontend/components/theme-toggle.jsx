'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const CYCLE = { light: 'dark', dark: 'system', system: 'light' };
const LABELS = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' };
const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme] ?? Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(CYCLE[theme] ?? 'system')}
      title={`${LABELS[theme]} — click to switch`}
      aria-label={LABELS[theme]}
      suppressHydrationWarning
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-soft-border bg-background text-cool-gray hover:text-midnight-ink hover:bg-cloud-gray transition-colors ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
