import { createFileRoute } from '@tanstack/react-router';

import { buildFeed } from '@/lib/rss.server';

export const Route = createFileRoute('/rss/$space')({
  server: {
    handlers: {
      GET: async ({ request, params }) => buildFeed(new URL(request.url).origin, params.space.replace(/\.xml$/, '')),
    },
  },
});
