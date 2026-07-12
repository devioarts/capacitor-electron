#!/usr/bin/env tsx
import { rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve('.');

console.log('→ clean dist/ and template-electron.tar.gz');
await rm(join(root, 'dist'), { recursive: true, force: true });
await rm(join(root, 'template-electron.tar.gz'), { force: true });
console.log('✓ done');
