// Loads the static electron-init.js payload so CLI copy/update code can inject it into web builds.
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copied to dist/electron-init.js by scripts/build.ts
export const CAP_ELECTRON_INIT_JS = fs.readFileSync(
  path.join(__dirname, '..', 'electron-init.js'),
  'utf-8',
);
