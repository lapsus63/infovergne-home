import { createFileRoute } from '@tanstack/react-router';

import { DocPage, docHead } from '@/components/doc-page';
import { docQuery } from '@/lib/queries';

export const Route = createFileRoute('/wiki/$space/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(docQuery('wiki', params.space, params.slug)),
  head: ({ loaderData }) => docHead(loaderData),
  component: WikiPage,
});

function WikiPage() {
  const { space, slug } = Route.useParams();
  return <DocPage type="wiki" space={space} slug={slug} />;
}
