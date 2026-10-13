import Link from 'next/link';
import { loadCatalog, StorefrontConfigError } from '../lib/api';

// Rendered per request so that `next build` does not need the API to be running.
export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  let catalog: Awaited<ReturnType<typeof loadCatalog>>;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    if (error instanceof StorefrontConfigError) {
      return (
        <section className="notice" role="alert">
          <h1>Storefront is not configured</h1>
          <p>{error.message}</p>
        </section>
      );
    }
    throw error;
  }

  const { projects } = catalog;

  return (
    <section>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p className="muted">No projects yet</p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`}>{project.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
