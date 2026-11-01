import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Bitbucket config', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ATLASSIAN_DC_MCP_CONFIG_FILE;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bitbucket-config-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Windows refuses to remove a directory that is still the process cwd.
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the configured page size when the env var is a positive integer', async () => {
    process.env.BITBUCKET_DEFAULT_PAGE_SIZE = '40';

    const { getDefaultPageSize } = await import('../config.js');

    expect(getDefaultPageSize()).toBe(40);
  });

  it('falls back to 25 when the env var is invalid', async () => {
    process.env.BITBUCKET_DEFAULT_PAGE_SIZE = '-1';

    const { getDefaultPageSize } = await import('../config.js');

    expect(getDefaultPageSize()).toBe(25);
  });

  it('reads the page size from the shared config file', async () => {
    const sharedConfigPath = path.join(tempDir, 'shared.env');
    fs.writeFileSync(sharedConfigPath, 'BITBUCKET_HOST=file-host\nBITBUCKET_API_TOKEN=file-token\nBITBUCKET_DEFAULT_PAGE_SIZE=35\n');
    process.env.ATLASSIAN_DC_MCP_CONFIG_FILE = sharedConfigPath;

    const { getBitbucketRuntimeConfig, getDefaultPageSize } = await import('../config.js');

    expect(getDefaultPageSize()).toBe(35);
    expect(getBitbucketRuntimeConfig().token).toBe('file-token');
  });

  it('keeps env values higher priority than the shared config file', async () => {
    const sharedConfigPath = path.join(tempDir, 'shared.env');
    fs.writeFileSync(sharedConfigPath, 'BITBUCKET_HOST=file-host\nBITBUCKET_API_TOKEN=file-token\nBITBUCKET_DEFAULT_PAGE_SIZE=35\n');
    process.env.ATLASSIAN_DC_MCP_CONFIG_FILE = sharedConfigPath;
    process.env.BITBUCKET_DEFAULT_PAGE_SIZE = '45';

    const { getDefaultPageSize } = await import('../config.js');

    expect(getDefaultPageSize()).toBe(45);
  });
});
