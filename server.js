const fs = require('node:fs');
const path = require('node:path');

const projectRoot = __dirname;
// The generated server changes cwd to .next/standalone. Load the application's
// runtime settings first, while its .env files are still resolved from the root.
process.env.NODE_ENV = 'production';
require('@next/env').loadEnvConfig(projectRoot, false);
const distDir = process.env.NEXT_DIST_DIR || '.next';
const standaloneServer = path.resolve(projectRoot, distDir, 'standalone', 'server.js');

if (!fs.existsSync(standaloneServer)) {
  throw new Error(`Next.js standalone server not found at ${standaloneServer}. Run npm run build first.`);
}

process.chdir(projectRoot);
require(standaloneServer);
