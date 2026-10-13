// Registers the <polyapp-projects> custom element.
// vite.config.ts compiles every *.ce.vue file with the plugin's customElement option. That option
// inlines the component styles, but the default export is still a component options object, so it
// must be wrapped with defineCustomElement before customElements.define can accept it.
import { defineCustomElement } from 'vue';
import ProjectsWidget from './ProjectsWidget.ce.vue';

export const ProjectsElement = defineCustomElement(ProjectsWidget);

if (!customElements.get('polyapp-projects')) {
  customElements.define('polyapp-projects', ProjectsElement);
}
