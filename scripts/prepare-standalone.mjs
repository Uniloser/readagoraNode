import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = process.env.NEXT_DIST_DIR || '.next';
const standaloneDir = path.join(projectRoot, distDir, 'standalone');
const staticDir = path.join(projectRoot, distDir, 'static');
const publicDir = path.join(projectRoot, 'public');

if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error(`Next.js standalone server was not generated at ${standaloneDir}.`);
}

fs.mkdirSync(path.join(standaloneDir, '.next'), { recursive: true });
fs.cpSync(staticDir, path.join(standaloneDir, '.next', 'static'), { recursive: true, force: true });
fs.cpSync(publicDir, path.join(standaloneDir, 'public'), { recursive: true, force: true });
