// Tests for external-commands-main.ts — allowlisted native process bridge.
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ipcMain } from 'electron';

const { mockLoadConfig } = vi.hoisted(() => ({
  mockLoadConfig: vi.fn(() => ({ cfg: {}, appCfg: {} })),
}));

vi.mock(
  '../../src/template-electron/src/system/shared/functions.js',
  async (importOriginal) => {
    const original = await importOriginal<typeof import('../../src/template-electron/src/system/shared/functions.js')>();
    return { ...original, loadConfig: mockLoadConfig };
  },
);

import { __externalCommandsForTests } from '../../src/template-electron/src/system/static/electron-api/external-commands-main.js';

type IpcHandlers = Map<string, (event: unknown, ...args: unknown[]) => unknown>;

function handlers(): IpcHandlers {
  return (ipcMain as unknown as { __handlers: IpcHandlers }).__handlers;
}

async function run(alias: string, options?: unknown) {
  const handler = handlers().get('externalCommands:run');
  if (!handler) throw new Error('externalCommands:run handler not registered');
  return await handler({ sender: {}, senderFrame: { url: 'file:///index.html' } }, { alias, options });
}

beforeEach(() => {
  mockLoadConfig.mockReset();
  mockLoadConfig.mockReturnValue({ cfg: {}, appCfg: {} });
});

describe('externalCommands IPC registration', () => {
  it('registers run, start, and kill handlers', () => {
    expect(handlers().has('externalCommands:run')).toBe(true);
    expect(handlers().has('externalCommands:start')).toBe(true);
    expect(handlers().has('externalCommands:kill')).toBe(true);
  });
});

describe('externalCommands.run', () => {
  it('rejects unknown aliases', async () => {
    await expect(run('missing')).rejects.toThrow('not configured');
  });

  it('captures stdout, stderr, and exit code', async () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            node: { command: process.execPath, resolve: 'absolute', timeoutMs: 5000 },
          },
        },
      },
    });

    const result = await run('node', {
      args: ['-e', 'process.stdout.write("out"); process.stderr.write("err"); process.exit(7);'],
    }) as {
      exitCode: number;
      stdout: string;
      stderr: string;
      timedOut: boolean;
    };

    expect(result.exitCode).toBe(7);
    expect(result.stdout).toBe('out');
    expect(result.stderr).toBe('err');
    expect(result.timedOut).toBe(false);
  });

  it('writes binary stdin to the child process', async () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            node: { command: process.execPath, resolve: 'absolute', timeoutMs: 5000 },
          },
        },
      },
    });

    const result = await run('node', {
      args: ['-e', 'process.stdin.on("data", c => process.stdout.write(Buffer.from(c).toString("hex")));'],
      stdin: [0x1b, 0x40, 0x0a],
    }) as { exitCode: number; stdout: string };

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('1b400a');
  });

  it('supports base64 stdin', async () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            node: { command: process.execPath, resolve: 'absolute', timeoutMs: 5000 },
          },
        },
      },
    });

    const result = await run('node', {
      args: ['-e', 'process.stdin.on("data", c => process.stdout.write(c.toString("utf8")));'],
      stdinBase64: Buffer.from('receipt').toString('base64'),
    }) as { exitCode: number; stdout: string };

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('receipt');
  });

  it('folds stdin pipe errors into the command result', async () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            node: { command: process.execPath, resolve: 'absolute', timeoutMs: 5000 },
          },
        },
      },
    });

    const result = await run('node', {
      args: ['-e', 'process.exit(0)'],
      stdin: new Uint8Array(1024 * 1024 * 8),
    }) as {
      exitCode: number | null;
      error?: string;
      timedOut: boolean;
    };

    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    if (result.error) expect(result.error).toContain('stdin:');
  });

  it('enforces exact allowedArgs when configured', async () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            node: {
              command: process.execPath,
              resolve: 'absolute',
              allowedArgs: ['--version'],
            },
          },
        },
      },
    });

    await expect(run('node', { args: ['-e', 'process.exit(0)'] })).rejects.toThrow('arg is not allowed');
  });

  it('escalates timed-out commands that ignore SIGTERM', async () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            node: { command: process.execPath, resolve: 'absolute', timeoutMs: 300 },
          },
        },
      },
    });

    const result = await run('node', {
      args: ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);'],
    }) as {
      signal: NodeJS.Signals | null;
      timedOut: boolean;
    };

    expect(result.timedOut).toBe(true);
    if (process.platform === 'win32') {
      expect(result.signal).toBe('SIGTERM');
    } else {
      expect(result.signal).toBe('SIGKILL');
    }
  }, 8_000);
});

describe('external command resolution', () => {
  it('allows PATH commands when command is a bare executable name', () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            calc: { command: 'calc.exe', resolve: 'path', platforms: [process.platform] },
          },
        },
      },
    });

    const resolved = __externalCommandsForTests.resolveExternalCommand('calc', {});
    expect(resolved.command).toBe('calc.exe');
  });

  it('rejects path separators in resolve:path commands', () => {
    mockLoadConfig.mockReturnValue({
      appCfg: {},
      cfg: {
        app: {
          externalCommands: {
            bad: { command: 'tools/calc.exe', resolve: 'path' },
          },
        },
      },
    });

    expect(() => __externalCommandsForTests.resolveExternalCommand('bad', {}))
      .toThrow("resolve: 'path'");
  });
});
