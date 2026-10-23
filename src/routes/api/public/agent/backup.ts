import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const payloadSchema = z.object({
  created_at: z.string().optional(),
  size_bytes: z.number().int().nonnegative(),
  status: z.enum(['ok', 'failed']),
  message: z.string().max(500).default(''),
});

function authorized(request: Request): boolean {
  const secret = process.env['AGENT_KEY'];
  if (!secret) return false;
  const provided = request.headers.get('x-agent-key') ?? '';
  return provided.length === secret.length && provided === secret;
}

export const Route = createFileRoute('/api/public/agent/backup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return new Response('Clé agent invalide', { status: 401 });
        const db = await import('@/lib/db.server');
        const settings = await db.getSettings();
        return Response.json({ cron: settings.backup_cron, keep: settings.backup_keep });
      },
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response('Clé agent invalide', { status: 401 });
        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response('Charge utile invalide', { status: 400 });

        const db = await import('@/lib/db.server');
        await db.upsertRow('backups', {
          id: crypto.randomUUID(),
          created_at: parsed.data.created_at ?? new Date().toISOString(),
          size_bytes: parsed.data.size_bytes,
          status: parsed.data.status,
          message: parsed.data.message,
        });
        return Response.json({ ok: true });
      },
    },
  },
});
