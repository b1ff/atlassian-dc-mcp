import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_MAX_ATTACHMENT_BYTES,
  resolveAttachmentGateway,
  resolveDownloadDestination,
  resolveUploadSource,
} from '../attachment-gateway.js';
import type { ProductDefinition } from '../config/source.js';

const PRODUCT: ProductDefinition = {
  id: 'jira',
  envVars: { host: 'JIRA_HOST', apiBasePath: 'JIRA_API_BASE_PATH', token: 'JIRA_API_TOKEN', defaultPageSize: 'JIRA_DEFAULT_PAGE_SIZE' },
};

const silentWarn = () => undefined;

describe('resolveAttachmentGateway', () => {
  let root: string;
  let realRoot: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-gw-'));
    realRoot = fs.realpathSync.native(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('is disabled by default', () => {
    const gw = resolveAttachmentGateway(PRODUCT, { env: {}, warn: silentWarn });
    expect(gw.upload.enabled).toBe(false);
    expect(gw.download.enabled).toBe(false);
  });

  it('stays disabled when enabled but no valid root is configured', () => {
    const gw = resolveAttachmentGateway(PRODUCT, {
      env: { JIRA_ATTACHMENTS_UPLOAD_ENABLED: 'true' },
      warn: silentWarn,
    });
    expect(gw.upload.enabled).toBe(false);
  });

  it('enables upload with a canonical root and default size limit', () => {
    const gw = resolveAttachmentGateway(PRODUCT, {
      env: { JIRA_ATTACHMENTS_UPLOAD_ENABLED: 'true', JIRA_ATTACHMENTS_UPLOAD_ROOTS: root },
      warn: silentWarn,
    });
    expect(gw.upload.enabled).toBe(true);
    expect(gw.upload.roots).toEqual([realRoot]);
    expect(gw.upload.maxBytes).toBe(DEFAULT_MAX_ATTACHMENT_BYTES);
  });

  it('uses JIRA_ATTACHMENTS_DIR as a shared exchange root and honours size overrides', () => {
    const gw = resolveAttachmentGateway(PRODUCT, {
      env: {
        JIRA_ATTACHMENTS_UPLOAD_ENABLED: 'true',
        JIRA_ATTACHMENTS_DOWNLOAD_ENABLED: '1',
        JIRA_ATTACHMENTS_DIR: root,
        JIRA_ATTACHMENTS_MAX_UPLOAD_BYTES: '1024',
      },
      warn: silentWarn,
    });
    expect(gw.upload.roots).toEqual([realRoot]);
    expect(gw.download.roots).toEqual([realRoot]);
    expect(gw.upload.maxBytes).toBe(1024);
  });
});

describe('resolveUploadSource', () => {
  let root: string;
  const side = () => ({ enabled: true, roots: [fs.realpathSync.native(root)], maxBytes: 100 });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-up-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('resolves a regular file inside the root', async () => {
    fs.writeFileSync(path.join(root, 'a.txt'), 'hi');
    const { absolutePath, size } = await resolveUploadSource({ requestedPath: 'a.txt', side: side() });
    expect(absolutePath).toBe(path.join(fs.realpathSync.native(root), 'a.txt'));
    expect(size).toBe(2);
  });

  it('rejects absolute paths', async () => {
    await expect(resolveUploadSource({ requestedPath: '/etc/passwd', side: side() })).rejects.toThrow('not absolute');
  });

  it('rejects traversal outside the root', async () => {
    await expect(resolveUploadSource({ requestedPath: '../secret', side: side() })).rejects.toThrow('within the configured');
  });

  it('rejects a symlink leaf', async () => {
    const target = path.join(root, 'real.txt');
    fs.writeFileSync(target, 'secret');
    fs.symlinkSync(target, path.join(root, 'link.txt'));
    await expect(resolveUploadSource({ requestedPath: 'link.txt', side: side() })).rejects.toThrow('symlink');
  });

  it('rejects a path that escapes via a symlinked directory', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-out-'));
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'x');
    fs.symlinkSync(outside, path.join(root, 'escape'));
    await expect(resolveUploadSource({ requestedPath: 'escape/secret.txt', side: side() })).rejects.toThrow('outside');
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it('rejects a non-regular file (directory)', async () => {
    fs.mkdirSync(path.join(root, 'sub'));
    await expect(resolveUploadSource({ requestedPath: 'sub', side: side() })).rejects.toThrow('non-regular');
  });

  it('rejects a file over the size limit', async () => {
    fs.writeFileSync(path.join(root, 'big.txt'), 'x'.repeat(200));
    await expect(resolveUploadSource({ requestedPath: 'big.txt', side: side() })).rejects.toThrow('exceeds the configured upload limit');
  });

  it('throws when upload is disabled', async () => {
    await expect(
      resolveUploadSource({ requestedPath: 'a.txt', side: { enabled: false, roots: [], maxBytes: 100 } }),
    ).rejects.toThrow('disabled');
  });
});

describe('resolveDownloadDestination', () => {
  let root: string;
  const side = () => ({ enabled: true, roots: [fs.realpathSync.native(root)], maxBytes: 100 });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-dd-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('resolves a basename into the download root', async () => {
    const dest = await resolveDownloadDestination({ requestedName: 'out.bin', side: side() });
    expect(dest).toBe(path.join(fs.realpathSync.native(root), 'out.bin'));
  });

  it('strips directory components from the requested name', async () => {
    const dest = await resolveDownloadDestination({ requestedName: '../../etc/passwd', side: side() });
    expect(dest).toBe(path.join(fs.realpathSync.native(root), 'passwd'));
  });

  it('throws when saving is disabled', async () => {
    await expect(
      resolveDownloadDestination({ requestedName: 'out.bin', side: { enabled: false, roots: [], maxBytes: 100 } }),
    ).rejects.toThrow('disabled');
  });
});
