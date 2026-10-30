import type { NextConfig } from 'next';
const nextConfig: NextConfig = { poweredByHeader: false, output: 'standalone', distDir: process.env.NEXT_DIST_DIR || '.next', typescript: { tsconfigPath: process.env.NODE_ENV === 'production' ? 'tsconfig.build.json' : 'tsconfig.json' }, turbopack: { root: process.cwd() } };
export default nextConfig;
