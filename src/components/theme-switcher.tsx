import { Monitor, Palette } from 'lucide-react';

import { THEMES, useTheme, type ThemeId } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const options: { id: ThemeId; label: string }[] = [...THEMES.map((t) => ({ id: t.id as ThemeId, label: t.label })), { id: 'system', label: 'Suivre le système' }];

  const currentIndex = options.findIndex((opt) => opt.id === theme);
  const currentLabel = options[currentIndex]?.label ?? 'Terminal sombre';

  const cycleTheme = () => {
    const nextIndex = (currentIndex + 1) % options.length;
    setTheme(options[nextIndex]!.id);
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn('flex items-center gap-2 rounded-md border border-border p-2 text-muted-foreground hover:text-foreground', className)}
      title={currentLabel}
      aria-label={`Thème actuel : ${currentLabel}. Cliquer pour changer.`}
    >
      {theme === 'system' ? <Monitor className="size-4" aria-hidden /> : <Palette className="size-4" aria-hidden />}
    </button>
  );
}
