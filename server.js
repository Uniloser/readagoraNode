const fs = require('node:fs');
const path = require('node:path');

const projectRoot = __dirname;
const distDir = process.env.NEXT_DIST_DIR || '.next';
const standaloneServer = path.resolve(projectRoot, distDir, 'standalone', 'server.js');

if (!fs.existsSync(standaloneServer)) {
  throw new Error(`Next.js standalone server not found at ${standaloneServer}. Run npm run build first.`);
}

process.chdir(projectRoot);
require(standaloneServer);
