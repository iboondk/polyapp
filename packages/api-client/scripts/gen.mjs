// Regenerates src/generated/schema.d.ts from contracts/openapi.yaml.
// The output is deterministic: running this twice produces byte-identical files.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const specUrl = new URL('../../../contracts/openapi.yaml', import.meta.url);
const outFile = fileURLToPath(new URL('../src/generated/schema.d.ts', import.meta.url));
const HEADER = '/* Generated from contracts/openapi.yaml by scripts/gen.mjs. Do not edit. */\n';

const ast = await openapiTS(specUrl);
const body = astToString(ast);

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, HEADER + body);
console.log(`wrote ${fileURLToPath(new URL('../src/generated/schema.d.ts', import.meta.url))}`);
