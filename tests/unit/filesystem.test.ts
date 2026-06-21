// Tests for filesystem-main.ts — resolvePath (path-traversal guard) + Filesystem CRUD.
// File I/O uses a real temporary directory so assertions test actual behaviour.
import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as realFs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetPath } = vi.hoisted(() => ({
  mockGetPath: vi.fn((_: string) => '/tmp/fs-default'),
}));

vi.mock('electron', () => ({
  app: { getPath: mockGetPath, getName: () => 'TestApp', on: () => {} },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  BrowserWindow: class {
    static getAllWindows() { return []; }
    isDestroyed() { return false; }
  },
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

const tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'cap-fs-test-'));

let resolvePath: (filePath: string, directory?: string) => string;
let Filesystem: new () => InstanceType<typeof import('../../src/template-electron/src/system/static/capacitor-api/filesystem-main.js')['Filesystem']>;

beforeAll(async () => {
  mockGetPath.mockImplementation(() => tmpDir);
  const mod = await import('../../src/template-electron/src/system/static/capacitor-api/filesystem-main.js');
  resolvePath = mod.resolvePath;
  Filesystem  = mod.Filesystem;
});

afterAll(() => { realFs.rmSync(tmpDir, { recursive: true, force: true }); });

// ── resolvePath ───────────────────────────────────────────────────────────────

describe('resolvePath — no directory (absolute mode)', () => {
  it('returns the path resolved from cwd when no directory given', () => {
    const result = resolvePath('/tmp/myfile.txt');
    expect(result).toBe('/tmp/myfile.txt');
  });
});

describe('resolvePath — with directory enum', () => {
  it('DATA directory resolves under userData (tmpDir)', () => {
    const result = resolvePath('file.txt', 'DATA');
    expect(result).toBe(path.join(tmpDir, 'file.txt'));
  });

  it('DOCUMENTS directory resolves under documents path', () => {
    const result = resolvePath('doc.pdf', 'DOCUMENTS');
    expect(result).toContain('doc.pdf');
  });

  it('unknown directory falls back to userData', () => {
    const result = resolvePath('x.json', 'UNKNOWN_DIR');
    expect(result).toBe(path.join(tmpDir, 'x.json'));
  });

  it('nested path within DATA stays inside base', () => {
    const result = resolvePath('subdir/file.txt', 'DATA');
    expect(result).toBe(path.join(tmpDir, 'subdir', 'file.txt'));
  });

  it('resolving exactly the base directory is allowed', () => {
    expect(() => resolvePath('', 'DATA')).not.toThrow();
  });
});

describe('resolvePath — path traversal guard (security)', () => {
  it('throws for "../../../etc/passwd" traversal', () => {
    expect(() => resolvePath('../../../etc/passwd', 'DATA')).toThrow('Path traversal');
  });

  it('throws for path that escapes via ..',  () => {
    expect(() => resolvePath('../outside.txt', 'DATA')).toThrow('Path traversal');
  });

  it('throws when nested path still escapes', () => {
    expect(() => resolvePath('sub/../../outside.txt', 'DATA')).toThrow('Path traversal');
  });

  it('does NOT throw for a safe subdirectory path', () => {
    expect(() => resolvePath('safe/nested/file.txt', 'DATA')).not.toThrow();
  });
});

// ── Filesystem CRUD ───────────────────────────────────────────────────────────

describe('Filesystem.writeFile / readFile', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('writes and reads a UTF-8 text file', async () => {
    await fs.writeFile({ path: path.join(tmpDir, 'hello.txt'), data: 'hello', encoding: 'utf8' });
    const { data } = await fs.readFile({ path: path.join(tmpDir, 'hello.txt'), encoding: 'utf8' });
    expect(data).toBe('hello');
  });

  it('writes and reads a base64 binary file (no encoding)', async () => {
    const b64 = Buffer.from('binary data').toString('base64');
    await fs.writeFile({ path: path.join(tmpDir, 'bin.dat'), data: b64 });
    const { data } = await fs.readFile({ path: path.join(tmpDir, 'bin.dat') });
    expect(data).toBe(b64);
  });

  it('returns uri pointing to the written file', async () => {
    const { uri } = await fs.writeFile({ path: path.join(tmpDir, 'uri-test.txt'), data: 'x', encoding: 'utf8' });
    expect(uri).toMatch(/^file:\/\//);
    expect(uri).toContain('uri-test.txt');
  });

  it('writeFile with recursive=true creates intermediate directories', async () => {
    const nested = path.join(tmpDir, 'a', 'b', 'c', 'deep.txt');
    await fs.writeFile({ path: nested, data: 'deep', encoding: 'utf8', recursive: true });
    expect(realFs.existsSync(nested)).toBe(true);
  });

  it('readFile throws mapped error for missing file', async () => {
    await expect(fs.readFile({ path: path.join(tmpDir, 'missing.txt'), encoding: 'utf8' }))
      .rejects.toThrow('File does not exist');
  });
});

describe('Filesystem.appendFile', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('appends text to an existing file', async () => {
    const p = path.join(tmpDir, 'append.txt');
    await fs.writeFile({ path: p, data: 'line1\n', encoding: 'utf8' });
    await fs.appendFile({ path: p, data: 'line2\n', encoding: 'utf8' });
    const { data } = await fs.readFile({ path: p, encoding: 'utf8' });
    expect(data).toBe('line1\nline2\n');
  });
});

describe('Filesystem.deleteFile', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('deletes an existing file', async () => {
    const p = path.join(tmpDir, 'to-delete.txt');
    realFs.writeFileSync(p, 'bye');
    await fs.deleteFile({ path: p });
    expect(realFs.existsSync(p)).toBe(false);
  });

  it('throws mapped error when deleting non-existent file', async () => {
    await expect(fs.deleteFile({ path: path.join(tmpDir, 'ghost.txt') }))
      .rejects.toThrow('File does not exist');
  });
});

describe('Filesystem.mkdir / rmdir', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('creates a directory', async () => {
    const d = path.join(tmpDir, 'newdir');
    await fs.mkdir({ path: d });
    expect(realFs.statSync(d).isDirectory()).toBe(true);
  });

  it('mkdir recursive=true creates nested directories', async () => {
    const d = path.join(tmpDir, 'x', 'y', 'z');
    await fs.mkdir({ path: d, recursive: true });
    expect(realFs.existsSync(d)).toBe(true);
  });

  it('rmdir removes an empty directory', async () => {
    const d = path.join(tmpDir, 'rmme');
    realFs.mkdirSync(d);
    await fs.rmdir({ path: d });
    expect(realFs.existsSync(d)).toBe(false);
  });

  it('rmdir recursive removes directory with contents', async () => {
    const d = path.join(tmpDir, 'rmme-full');
    realFs.mkdirSync(d);
    realFs.writeFileSync(path.join(d, 'file.txt'), 'x');
    await fs.rmdir({ path: d, recursive: true });
    expect(realFs.existsSync(d)).toBe(false);
  });
});

describe('Filesystem.readdir', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('lists files and directories in a folder', async () => {
    const d = path.join(tmpDir, 'ls-test');
    realFs.mkdirSync(d, { recursive: true });
    realFs.writeFileSync(path.join(d, 'a.txt'), 'x');
    realFs.mkdirSync(path.join(d, 'sub'));

    const { files } = await fs.readdir({ path: d }) as { files: { name: string; type: string }[] };
    const names = files.map((f) => f.name).sort();
    expect(names).toContain('a.txt');
    expect(names).toContain('sub');
    const aFile = files.find((f) => f.name === 'a.txt');
    expect(aFile?.type).toBe('file');
    const sub = files.find((f) => f.name === 'sub');
    expect(sub?.type).toBe('directory');
  });
});

describe('Filesystem.stat', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('returns file metadata for an existing file', async () => {
    const p = path.join(tmpDir, 'stat-test.txt');
    realFs.writeFileSync(p, 'hello stat');
    const result = await fs.stat({ path: p }) as { type: string; size: number; uri: string };
    expect(result.type).toBe('file');
    expect(result.size).toBe(10);
    expect(result.uri).toMatch(/^file:\/\//);
  });

  it('returns directory metadata', async () => {
    const d = path.join(tmpDir, 'stat-dir');
    realFs.mkdirSync(d, { recursive: true });
    const result = await fs.stat({ path: d }) as { type: string };
    expect(result.type).toBe('directory');
  });

  it('throws mapped error for missing path', async () => {
    await expect(fs.stat({ path: path.join(tmpDir, 'no-such.txt') }))
      .rejects.toThrow('File does not exist');
  });
});

describe('Filesystem.getUri', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('returns file:// URI for an absolute path', async () => {
    const p = path.join(tmpDir, 'uri.txt');
    const result = await fs.getUri({ path: p });
    expect(result.uri).toMatch(/^file:\/\//);
    expect(result.path).toBe(p);
  });
});

describe('Filesystem.rename / copy', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('renames a file', async () => {
    const src = path.join(tmpDir, 'rename-src.txt');
    const dst = path.join(tmpDir, 'rename-dst.txt');
    realFs.writeFileSync(src, 'content');
    await fs.rename({ from: src, to: dst });
    expect(realFs.existsSync(src)).toBe(false);
    expect(realFs.existsSync(dst)).toBe(true);
  });

  it('copies a file', async () => {
    const src = path.join(tmpDir, 'copy-src.txt');
    const dst = path.join(tmpDir, 'copy-dst.txt');
    realFs.writeFileSync(src, 'content-copy');
    await fs.copy({ from: src, to: dst });
    expect(realFs.readFileSync(dst, 'utf-8')).toBe('content-copy');
    // source still exists
    expect(realFs.existsSync(src)).toBe(true);
  });

  it('copy from=to returns immediately without error', async () => {
    const p = path.join(tmpDir, 'same.txt');
    realFs.writeFileSync(p, 'x');
    await expect(fs.copy({ from: p, to: p })).resolves.toBeDefined();
  });

  it('copy throws when destination contains source path', async () => {
    const src = path.join(tmpDir, 'copy-parent');
    const dst = path.join(tmpDir, 'copy-parent', 'child');
    realFs.mkdirSync(src, { recursive: true });
    await expect(fs.copy({ from: src, to: dst })).rejects.toThrow();
  });
});

describe('Filesystem.checkPermissions / requestPermissions', () => {
  let fs: InstanceType<typeof Filesystem>;
  beforeEach(() => { fs = new Filesystem(); });

  it('checkPermissions always returns granted', async () => {
    expect(await fs.checkPermissions()).toEqual({ publicStorage: 'granted' });
  });

  it('requestPermissions always returns granted', async () => {
    expect(await fs.requestPermissions()).toEqual({ publicStorage: 'granted' });
  });
});
