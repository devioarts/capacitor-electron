// File-mode trust helpers for the packaged app renderer.
import * as path from 'path';
import { fileURLToPath } from 'url';

function isInsideDir(parentDir: string, candidatePath: string): boolean {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Return whether a file:// URL points inside the packaged app root.
 *
 * In production file mode the preload bridge is trusted only for app-owned
 * renderer files under resources/app. `fileURLToPath()` performs URL decoding
 * before the path check, so encoded traversal such as `%2e%2e` cannot bypass the
 * root boundary.
 */
export function isTrustedFileUrl(url: string, appRoot: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') return false;
    return isInsideDir(appRoot, fileURLToPath(parsed));
  } catch {
    return false;
  }
}

export function createFileAppSenderCheck(appRoot: string): (url: string) => boolean {
  return (url) => isTrustedFileUrl(url, appRoot);
}
