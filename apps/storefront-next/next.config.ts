import type { NextConfig } from 'next';

// The storefront reads the API only on the server, so no output mode or transpilation is set.
// @polyapp/api-client is consumed from its built dist/ (run `pnpm build:client` first).
const nextConfig: NextConfig = {};

export default nextConfig;
