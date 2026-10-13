// tsc does not copy .d.ts inputs to dist, so the generated schema is copied next to the emitted declarations.

import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/generated/schema.d.ts', import.meta.url));
const dest = fileURLToPath(new URL('../dist/generated/schema.d.ts', import.meta.url));
mkdirSync(fileURLToPath(new URL('../dist/generated/', import.meta.url)), { recursive: true });
copyFileSync(src, dest);
