// Loads the static electron-init.js payload so CLI copy/update code can inject it into web builds.
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copied to dist/electron-init.js by scripts/build.ts
const bundledInitPath = path.join(__dirname, '..', 'electron-init.js');
const sourceInitPath = path.join(__dirname, '..', 'template-electron', 'src', 'system', 'js', 'electron-init.js');

export const CAP_ELECTRON_INIT_JS = fs.readFileSync(
  fs.existsSync(bundledInitPath) ? bundledInitPath : sourceInitPath,
  'utf-8',
);
