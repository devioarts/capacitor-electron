import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export default function globalSetup(): void {
  const required = [
    join(repoRoot, 'playground', 'node_modules'),
    join(repoRoot, 'playground', 'electron', 'node_modules'),
    join(repoRoot, 'playground', 'electron', 'dist', 'main.cjs'),
    join(repoRoot, 'playground', 'electron', 'dist', 'preload.cjs'),
  ];

  const missing = required.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(
      [
        'Playwright e2e artifacts are missing. Run `npm run test:e2e` so pretest:e2e can prepare the playground.',
        'Missing:',
        ...missing.map((file) => `  - ${file}`),
      ].join('\n'),
    );
  }
}
