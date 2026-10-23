import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const payloadSchema = z.object({
  containers: z
    .array(
      z.object({
        name: z.string().min(1),
        state: z.enum(['running', 'stopped', 'error', 'unknown']),
      }),
    )
    .max(500),
});

function authorized(request: Request): boolean {
  const secret = process.env['AGENT_KEY'];
  if (!secret) return false;
  const provided = request.headers.get('x-agent-key') ?? '';
  return provided.length === secret.length && provided === secret;
}

export const Route = createFileRoute('/api/public/agent/status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response('Clé agent invalide', { status: 401 });

        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response('Charge utile invalide', { status: 400 });

        const db = await import('@/lib/db.server');
        const apps = await db.listApps();
        const now = new Date().toISOString();
        const seen = new Map(parsed.data.containers.map((c) => [c.name, c.state]));
        let updated = 0;

        for (const app of apps) {
          if (!app.container_name) continue;
          const state = seen.get(app.container_name) ?? 'stopped';
          await db.upsertRow('apps', { ...app, state, state_at: now });
          updated++;
        }

        const unknown = [...seen.keys()].filter((name) => !apps.some((app) => app.container_name === name));

        return Response.json({ updated, unknownContainers: unknown });
      },
    },
  },
});
