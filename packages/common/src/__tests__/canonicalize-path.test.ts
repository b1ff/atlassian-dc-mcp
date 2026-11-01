import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalizePath } from '../canonicalize-path.js';

describe('canonicalizePath', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses native realpath for synchronous roots and asynchronous candidates', async () => {
    const sync = jest.spyOn(fs.realpathSync, 'native').mockReturnValue('canonical');
    const async = jest.spyOn(fs.realpath, 'native').mockImplementation((_target, callback) => {
      (callback as (error: null, resolved: string) => void)(null, 'canonical');
    });

    expect(canonicalizePath('root', 'sync')).toBe('canonical');
    await expect(canonicalizePath('candidate')).resolves.toBe('canonical');
    expect(sync).toHaveBeenCalledWith('root');
    expect(async).toHaveBeenCalledWith('candidate', expect.any(Function));
  });

  it('propagates resolution errors in both modes', async () => {
    const missing = path.join(os.tmpdir(), 'dc-mcp-missing', 'leaf');
    expect(() => canonicalizePath(missing, 'sync')).toThrow();
    await expect(canonicalizePath(missing)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
