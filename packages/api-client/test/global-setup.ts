import { createMockServer } from '@polyapp/mock-api';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    apiUrl: string;
  }
}

// Starts the in-memory mock API on a free port for the whole test run, over real HTTP.
export default async function setup(project: TestProject) {
  const server = await createMockServer({ port: 0 });
  project.provide('apiUrl', server.url);
  return async () => {
    await server.close();
  };
}
