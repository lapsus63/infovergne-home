import { createFileRoute } from '@tanstack/react-router';

import { DocPage, docHead } from '@/components/doc-page';
import { docQuery } from '@/lib/queries';

export const Route = createFileRoute('/blog/$space/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(docQuery('blog', params.space, params.slug)),
  head: ({ loaderData }) => docHead(loaderData),
  component: BlogPage,
});

function BlogPage() {
  const { space, slug } = Route.useParams();
  return <DocPage type="blog" space={space} slug={slug} />;
}
