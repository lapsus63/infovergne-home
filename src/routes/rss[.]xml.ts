import { createFileRoute } from '@tanstack/react-router';

import { buildFeed } from '@/lib/rss.server';

export const Route = createFileRoute('/rss.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => buildFeed(new URL(request.url).origin, null),
    },
  },
});
