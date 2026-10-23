import type { RunState } from '@/lib/types';
import { cn } from '@/lib/utils';

const LABELS: Record<RunState, string> = {
  running: 'en fonctionnement',
  stopped: 'arrêtée',
  error: 'en erreur',
  unknown: 'état inconnu',
};

export function StateBadge({ state, className }: { state: RunState; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs', className)}>
      <span
        className="size-2 rounded-full"
        style={{
          backgroundColor:
            state === 'running' ? 'var(--color-success)' : state === 'error' ? 'var(--color-destructive)' : state === 'stopped' ? 'var(--color-muted-foreground)' : 'var(--color-warning)',
        }}
        aria-hidden
      />
      {LABELS[state]}
    </span>
  );
}
