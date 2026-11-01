import { realpath, realpathSync } from 'node:fs';

/** Use native realpath in both modes so containment checks compare the same spelling. */
export function canonicalizePath(target: string, mode: 'sync'): string;
export function canonicalizePath(target: string): Promise<string>;
export function canonicalizePath(target: string, mode?: 'sync'): string | Promise<string> {
  if (mode === 'sync') {
    return realpathSync.native(target);
  }
  return new Promise((resolve, reject) => {
    realpath.native(target, (error, resolved) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(resolved);
    });
  });
}
