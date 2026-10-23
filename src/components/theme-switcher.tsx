import { Monitor, Palette } from 'lucide-react';

import { THEMES, useTheme, type ThemeId } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const options: { id: ThemeId; label: string }[] = [...THEMES.map((t) => ({ id: t.id as ThemeId, label: t.label })), { id: 'system', label: 'Suivre le système' }];

  return (
    <label className={cn('flex items-center gap-2 text-sm', className)}>
      {theme === 'system' ? <Monitor className="size-4 text-muted-foreground" aria-hidden /> : <Palette className="size-4 text-muted-foreground" aria-hidden />}
      <span className="sr-only">Thème</span>
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemeId)}
        className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
