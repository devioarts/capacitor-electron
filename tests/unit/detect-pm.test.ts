// Tests for detectPackageManager (N-1 fix)
// Uses real temporary directories with lockfiles so the detection logic
// is tested against actual filesystem state, not mocks.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectPackageManager } from '../../src/cli/pm.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-electron-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('detectPackageManager', () => {
  it('returns "npm" when no lockfile is present', () => {
    expect(detectPackageManager(tmpDir)).toBe('npm');
  });

  it('detects bun.lock (text lockfile, Bun ≥ 1.2)', () => {
    fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
    expect(detectPackageManager(tmpDir)).toBe('bun');
  });

  it('detects bun.lockb (binary lockfile, Bun < 1.2)', () => {
    fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
    expect(detectPackageManager(tmpDir)).toBe('bun');
  });

  it('prefers bun.lock over bun.lockb when both exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
    fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
    expect(detectPackageManager(tmpDir)).toBe('bun');
  });

  it('detects pnpm-lock.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(tmpDir)).toBe('pnpm');
  });

  it('detects yarn.lock', () => {
    fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
    expect(detectPackageManager(tmpDir)).toBe('yarn');
  });

  it('prefers bun.lock over pnpm-lock.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(tmpDir)).toBe('bun');
  });

  it('prefers pnpm-lock.yaml over yarn.lock', () => {
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
    expect(detectPackageManager(tmpDir)).toBe('pnpm');
  });

  it('returns "npm" for a non-existent directory path', () => {
    expect(detectPackageManager(path.join(tmpDir, 'does-not-exist'))).toBe('npm');
  });
});
