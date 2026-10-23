import { getSettings, listDocs, listSpaces } from './db.server';

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Flux public : uniquement les contenus publiés et publics d'espaces publics. */
export async function buildFeed(origin: string, spaceSlug: string | null): Promise<Response> {
  const [spaces, docs, settings] = await Promise.all([listSpaces(), listDocs(), getSettings()]);
  const publicSpaces = spaces.filter((s) => s.visibility === 'public');
  const target = spaceSlug ? publicSpaces.find((s) => s.slug === spaceSlug) : null;

  if (spaceSlug && !target) return new Response('Flux introuvable', { status: 404 });

  const allowed = new Set((target ? [target] : publicSpaces).map((s) => s.slug));
  const items = docs
    .filter((doc) => allowed.has(doc.space_slug) && doc.status === 'published' && doc.visibility === 'public')
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 40)
    .map((doc) => {
      const space = spaces.find((s) => s.slug === doc.space_slug)!;
      const link = `${origin}/${space.type === 'blog' ? 'blog' : 'wiki'}/${doc.space_slug}/${doc.slug}`;
      return `    <item>
      <title>${escape(doc.title)}</title>
      <link>${escape(link)}</link>
      <guid isPermaLink="true">${escape(link)}</guid>
      <pubDate>${new Date(doc.published_at).toUTCString()}</pubDate>
      <category>${escape(space.name)}</category>
      <description>${escape(doc.excerpt)}</description>
    </item>`;
    })
    .join('\n');

  const title = target ? `${settings.site_title} — ${target.name}` : settings.site_title;
  const feedUrl = target ? `${origin}/rss/${target.slug}.xml` : `${origin}/rss.xml`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(title)}</title>
    <link>${escape(origin)}</link>
    <description>${escape(settings.site_tagline)}</description>
    <language>fr</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escape(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
