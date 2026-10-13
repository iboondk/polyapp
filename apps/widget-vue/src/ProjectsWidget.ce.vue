<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Project } from '@polyapp/api-client';
import { fetchProjects } from './fetchProjects';

type WidgetState = 'loading' | 'error' | 'empty' | 'list';

const props = withDefaults(
  defineProps<{
    apiUrl: string;
    token: string;
    tenantId: string;
    limit?: number;
    heading?: string;
  }>(),
  {
    limit: 5,
    heading: 'Latest projects',
  },
);

const state = ref<WidgetState>('loading');
const projects = ref<Project[]>([]);

let requestId = 0;

async function load(): Promise<void> {
  const current = ++requestId;
  state.value = 'loading';
  try {
    const items = await fetchProjects({
      apiUrl: props.apiUrl,
      token: props.token,
      tenantId: props.tenantId,
      limit: props.limit,
    });
    if (current !== requestId) return; // a newer request has replaced this one
    projects.value = items;
    state.value = items.length === 0 ? 'empty' : 'list';
  } catch {
    if (current !== requestId) return;
    projects.value = [];
    state.value = 'error';
  }
}

watch(
  () => [props.apiUrl, props.token, props.tenantId, props.limit],
  () => {
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <section class="pw-card" aria-labelledby="pw-heading">
    <h2 id="pw-heading" class="pw-heading">{{ heading }}</h2>

    <p v-if="state === 'loading'" class="pw-muted" role="status">Loading projects...</p>
    <p v-else-if="state === 'error'" class="pw-error" role="alert">Could not load projects</p>
    <p v-else-if="state === 'empty'" class="pw-muted">No projects yet</p>
    <ul v-else class="pw-list">
      <li v-for="project in projects" :key="project.id">{{ project.name }}</li>
    </ul>
  </section>
</template>

<style scoped>
.pw-card {
  --pw-text: #1f2328;
  --pw-muted: #59636e;
  --pw-danger: #b42318;
  --pw-border: #d0d7de;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--pw-text);
  border: 1px solid var(--pw-border);
  border-radius: 8px;
  padding: 1rem;
  max-width: 28rem;
}

@media (prefers-color-scheme: dark) {
  .pw-card {
    --pw-text: #e6edf3;
    --pw-muted: #9da7b3;
    --pw-danger: #ff8a80;
    --pw-border: #30363d;
  }
}

.pw-heading {
  font-size: 1.1rem;
  margin: 0 0 0.5rem;
}

.pw-muted {
  color: var(--pw-muted);
  margin: 0;
}

.pw-error {
  color: var(--pw-danger);
  margin: 0;
}

.pw-list {
  margin: 0;
  padding-left: 1.25rem;
}
</style>
