import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertWithinRoots,
  resolveAttachmentGateway,
  resolveDownloadDestination,
  resolveUploadSource,
} from '../attachment-gateway.js';
import type { ProductDefinition } from '../config/source.js';

const PRODUCT: ProductDefinition = {
  id: 'jira',
  envVars: { host: 'JIRA_HOST', apiBasePath: 'JIRA_API_BASE_PATH', token: 'JIRA_API_TOKEN', defaultPageSize: 'JIRA_DEFAULT_PAGE_SIZE' },
};

function gateway(root: string) {
  return resolveAttachmentGateway(PRODUCT, {
    env: {
      JIRA_ATTACHMENTS_DIR: root,
      JIRA_ATTACHMENTS_UPLOAD_ENABLED: 'true',
      JIRA_ATTACHMENTS_DOWNLOAD_ENABLED: 'true',
    },
    warn: () => undefined,
  });
}

describe('attachment path canonicalization', () => {
  let temp: string;

  beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-path-'));
  });

  afterEach(() => {
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 3 });
  });

  it('resolves uploads and downloads with a differently cased configured root', async () => {
    const root = path.join(temp, 'MixedCaseRoot');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'file.txt'), 'hello');
    const configuredRoot = path.join(temp, 'mIXEDcASErOOT');
    const gw = gateway(configuredRoot);
    if (!fs.existsSync(configuredRoot)) {
      // A case-sensitive filesystem must reject the nonexistent spelling.
      expect(gw.upload.enabled).toBe(false);
      expect(gw.download.enabled).toBe(false);
      return;
    }
    expect(gw.upload.enabled).toBe(true);
    const upload = await resolveUploadSource({ requestedPath: 'file.txt', side: gw.upload });
    expect(fs.readFileSync(upload.absolutePath, 'utf8')).toBe('hello');
    const destination = await resolveDownloadDestination({ requestedName: 'out.txt', side: gw.download });
    expect(path.dirname(destination)).toBe(path.dirname(upload.absolutePath));
  });

  it('allows descendants of a configured filesystem root', async () => {
    const gw = gateway(path.parse(temp).root);
    const requestedPath = path.relative(gw.upload.roots[0], path.join(temp, 'file.txt'));
    fs.writeFileSync(path.join(temp, 'file.txt'), 'hello');
    const upload = await resolveUploadSource({ requestedPath, side: gw.upload });
    expect(fs.readFileSync(upload.absolutePath, 'utf8')).toBe('hello');
  });

  it('accepts nonexistent descendants but rejects sibling roots with the same prefix', async () => {
    const root = path.join(temp, 'root');
    fs.mkdirSync(root);
    const roots = gateway(root).upload.roots;
    await expect(assertWithinRoots('new/deep/file.txt', roots)).resolves.toBe(
      path.join(roots[0], 'new/deep/file.txt'),
    );
    const sibling = path.join(temp, 'root-other');
    fs.mkdirSync(sibling);
    fs.symlinkSync(sibling, path.join(root, 'escape'), 'junction');
    await expect(assertWithinRoots('escape/file.txt', roots)).rejects.toThrow('outside');
  });
});
