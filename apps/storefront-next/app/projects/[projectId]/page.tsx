import { notFound } from 'next/navigation';
import { loadProduct } from '../../../lib/api';

// Rendered per request so that `next build` does not need the API to be running.
export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await loadProduct(projectId);
  if (!project) {
    notFound();
  }

  return (
    <article>
      <h1>{project.name}</h1>
      <dl>
        <dt>ID</dt>
        <dd>{project.id}</dd>
        <dt>Created</dt>
        <dd>{dateFormatter.format(new Date(project.created_at))}</dd>
      </dl>
    </article>
  );
}
