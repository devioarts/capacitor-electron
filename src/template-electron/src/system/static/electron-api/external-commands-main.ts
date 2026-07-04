// window.Electron.externalCommands bridge for allowlisted native process launches.
import { app, BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadConfig, trustedIpcHandle } from '../../shared/functions';
import type { ExternalCommandConfig, ExternalCommandResult, ExternalCommandRunOptions, ExternalCommandStartResult } from '../../shared/types';

type StreamName = 'stdout' | 'stderr';

type ResolvedExternalCommand = {
  alias: string;
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  stdin?: Buffer;
};

type ActiveCommand = {
  child: ChildProcessWithoutNullStreams;
  result: ExternalCommandResult;
  timer?: NodeJS.Timeout;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_ARGS = 256;
const MAX_ARG_LENGTH = 8192;

const active = new Map<string, ActiveCommand>();

function appBaseDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..', 'app');
}

function appBinDir(): string {
  return path.join(appBaseDir(), 'bin');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function commandConfig(alias: string): ExternalCommandConfig {
  if (!alias || typeof alias !== 'string') throw new Error('External command alias is required');
  const commands = loadConfig().cfg.app?.externalCommands ?? {};
  const cfg = commands[alias];
  if (!cfg) throw new Error(`External command is not configured: ${alias}`);
  if (!isPlainObject(cfg)) throw new Error(`External command config must be an object: ${alias}`);
  if (!cfg.command || typeof cfg.command !== 'string') throw new Error(`External command config requires a command: ${alias}`);
  if (cfg.platforms && !cfg.platforms.includes(process.platform)) {
    throw new Error(`External command is not enabled on ${process.platform}: ${alias}`);
  }
  return cfg;
}

function assertBareCommand(command: string, mode: string): void {
  if (path.isAbsolute(command) || command.includes('/') || command.includes('\\')) {
    throw new Error(`External command using resolve: '${mode}' must be a bare executable name`);
  }
  if (command === '.' || command === '..') throw new Error('External command name is invalid');
}

function resolveCommandPath(alias: string, cfg: ExternalCommandConfig): string {
  const mode = cfg.resolve ?? 'app';
  if (mode === 'app') {
    assertBareCommand(cfg.command, mode);
    const resolved = path.join(appBinDir(), cfg.command);
    if (!fs.existsSync(resolved)) throw new Error(`External command file does not exist: ${alias}`);
    return resolved;
  }
  if (mode === 'path') {
    assertBareCommand(cfg.command, mode);
    return cfg.command;
  }
  if (mode === 'absolute') {
    if (!path.isAbsolute(cfg.command)) throw new Error("External command using resolve: 'absolute' must use an absolute path");
    return path.normalize(cfg.command);
  }
  throw new Error(`Unsupported external command resolve mode: ${String(mode)}`);
}

function resolveCwd(cfg: ExternalCommandConfig): string | undefined {
  if (!cfg.cwd) return undefined;
  if (path.isAbsolute(cfg.cwd)) return path.normalize(cfg.cwd);
  if ((cfg.resolve ?? 'app') === 'app') return path.resolve(appBaseDir(), cfg.cwd);
  return path.resolve(cfg.cwd);
}

function normalizeArgs(alias: string, cfg: ExternalCommandConfig, rawArgs: unknown): string[] {
  if (rawArgs === undefined) return [];
  if (!Array.isArray(rawArgs)) throw new Error('External command args must be an array of strings');
  if (rawArgs.length > MAX_ARGS) throw new Error(`External command has too many args: ${alias}`);

  const args = rawArgs.map((arg) => {
    if (typeof arg !== 'string') throw new Error('External command args must be strings');
    if (arg.length > MAX_ARG_LENGTH) throw new Error(`External command arg is too long: ${alias}`);
    return arg;
  });

  if (cfg.allowedArgs && cfg.allowedArgs.length > 0) {
    const allowed = new Set(cfg.allowedArgs);
    const blocked = args.find((arg) => !allowed.has(arg));
    if (blocked !== undefined) throw new Error(`External command arg is not allowed: ${blocked}`);
  }

  return args;
}

function normalizeStdin(options: ExternalCommandRunOptions): Buffer | undefined {
  if (options.stdin !== undefined) {
    const stdin = options.stdin;
    if (typeof stdin === 'string') return Buffer.from(stdin, 'utf8');
    if (Buffer.isBuffer(stdin)) return stdin;
    if (ArrayBuffer.isView(stdin)) return Buffer.from(stdin.buffer, stdin.byteOffset, stdin.byteLength);
    if (stdin instanceof ArrayBuffer) return Buffer.from(stdin);
    if (Array.isArray(stdin)) {
      for (const value of stdin) {
        if (!Number.isInteger(value) || value < 0 || value > 255) {
          throw new Error('External command stdin byte arrays must contain values from 0 to 255');
        }
      }
      return Buffer.from(stdin);
    }
    throw new Error('External command stdin must be a string, Uint8Array, ArrayBuffer, or number[]');
  }

  if (options.stdinBase64 !== undefined) {
    if (typeof options.stdinBase64 !== 'string') throw new Error('External command stdinBase64 must be a string');
    return Buffer.from(options.stdinBase64, 'base64');
  }

  return undefined;
}

function positiveInteger(value: unknown, fallback: number): number {
  if (value === 0) return 0;
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function resolveExternalCommand(alias: string, options?: ExternalCommandRunOptions): ResolvedExternalCommand {
  const opts = isPlainObject(options) ? options : {};
  const cfg = commandConfig(alias);
  return {
    alias,
    command: resolveCommandPath(alias, cfg),
    args: normalizeArgs(alias, cfg, opts.args),
    cwd: resolveCwd(cfg),
    timeoutMs: positiveInteger(opts.timeoutMs, positiveInteger(cfg.timeoutMs, DEFAULT_TIMEOUT_MS)),
    maxOutputBytes: positiveInteger(cfg.maxOutputBytes, DEFAULT_MAX_OUTPUT_BYTES),
    stdin: normalizeStdin(opts),
  };
}

function senderWindow(e: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender);
}

function emitOutput(win: BrowserWindow | null, id: string, stream: StreamName, text: string): void {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('externalCommands:output', { id, stream, text });
}

function emitExit(win: BrowserWindow | null, result: ExternalCommandResult): void {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('externalCommands:exit', { id: result.id, result: { ...result } });
}

function appendOutput(result: ExternalCommandResult, stream: StreamName, chunk: Buffer, maxBytes: number): string {
  const text = chunk.toString('utf8');
  const key = stream;
  const truncatedKey = stream === 'stdout' ? 'stdoutTruncated' : 'stderrTruncated';
  const currentBytes = Buffer.byteLength(result[key], 'utf8');
  const remaining = Math.max(0, maxBytes - currentBytes);

  if (remaining <= 0) {
    result[truncatedKey] = true;
    return text;
  }

  if (chunk.byteLength <= remaining) {
    result[key] += text;
    return text;
  }

  result[key] += chunk.subarray(0, remaining).toString('utf8');
  result[truncatedKey] = true;
  return text;
}

function spawnExternalCommand(
  resolved: ResolvedExternalCommand,
  win: BrowserWindow | null,
  emitEvents: boolean,
): { child: ChildProcessWithoutNullStreams; result: ExternalCommandResult; done: Promise<ExternalCommandResult> } {
  const id = randomUUID();
  const result: ExternalCommandResult = {
    id,
    pid: null,
    exitCode: null,
    signal: null,
    stdout: '',
    stderr: '',
    stdoutTruncated: false,
    stderrTruncated: false,
    timedOut: false,
  };

  const child = spawn(resolved.command, resolved.args, {
    cwd: resolved.cwd,
    shell: false,
    windowsHide: true,
    stdio: 'pipe',
  });
  result.pid = child.pid ?? null;

  const done = new Promise<ExternalCommandResult>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };

    let timer: NodeJS.Timeout | undefined;
    if (resolved.timeoutMs > 0) {
      timer = setTimeout(() => {
        result.timedOut = true;
        child.kill();
      }, resolved.timeoutMs);
      timer.unref?.();
    }

    active.set(id, { child, result, timer });

    child.stdout.on('data', (chunk: Buffer) => {
      const text = appendOutput(result, 'stdout', chunk, resolved.maxOutputBytes);
      if (emitEvents) emitOutput(win, id, 'stdout', text);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = appendOutput(result, 'stderr', chunk, resolved.maxOutputBytes);
      if (emitEvents) emitOutput(win, id, 'stderr', text);
    });
    child.once('error', (error) => {
      result.error = error.message;
      finish(() => {
        if (timer) clearTimeout(timer);
        active.delete(id);
        if (emitEvents) emitExit(win, result);
        reject(error);
      });
    });
    child.once('close', (exitCode, signal) => {
      result.exitCode = exitCode;
      result.signal = signal;
      finish(() => {
        if (timer) clearTimeout(timer);
        active.delete(id);
        if (emitEvents) emitExit(win, result);
        resolve({ ...result });
      });
    });
  });

  if (resolved.stdin) child.stdin.end(resolved.stdin);
  else child.stdin.end();

  return { child, result, done };
}

trustedIpcHandle('externalCommands:run', async (e, payload: { alias: string; options?: ExternalCommandRunOptions }) => {
  const resolved = resolveExternalCommand(payload?.alias, payload?.options);
  const { done } = spawnExternalCommand(resolved, senderWindow(e), false);
  return await done;
});

trustedIpcHandle('externalCommands:start', (e, payload: { alias: string; options?: ExternalCommandRunOptions }): ExternalCommandStartResult => {
  const resolved = resolveExternalCommand(payload?.alias, payload?.options);
  const { result, done } = spawnExternalCommand(resolved, senderWindow(e), true);
  void done.catch(() => undefined);
  return { id: result.id, pid: result.pid };
});

trustedIpcHandle('externalCommands:kill', (_e, id: string) => {
  const activeCommand = active.get(id);
  if (!activeCommand) return false;
  return activeCommand.child.kill();
});

export const __externalCommandsForTests = {
  appBaseDir,
  appBinDir,
  resolveExternalCommand,
};
