import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { downloadAttachment } from '../attachment-download.js';

function mockFetchOnce(
  body: Buffer,
  init?: { ok?: boolean; status?: number; statusText?: string; contentType?: string; contentLength?: string; stream?: boolean },
) {
  const ok = init?.ok ?? true;
  const headers = new Map<string, string>();
  if (init?.contentType) headers.set('content-type', init.contentType);
  if (init?.contentLength) headers.set('content-length', init.contentLength);

  const response: Record<string, unknown> = {
    ok,
    status: init?.status ?? (ok ? 200 : 500),
    statusText: init?.statusText ?? (ok ? 'OK' : 'Error'),
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  };

  if (init?.stream) {
    let sent = false;
    response.body = {
      getReader: () => ({
        read: async () => (sent ? { done: true, value: undefined } : ((sent = true), { done: false, value: new Uint8Array(body) })),
        cancel: async () => undefined,
      }),
    };
  }

  global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe('downloadAttachment', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-dl-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('writes the file to the provided destination and reports metadata', async () => {
    mockFetchOnce(Buffer.from('hello world'), { contentType: 'text/plain' });
    const destination = path.join(tmpDir, 'note.txt');

    const result = await downloadAttachment({
      url: 'https://host/download/x',
      token: 'tok',
      filename: 'note.txt',
      options: { destination },
    });

    expect(global.fetch).toHaveBeenCalledWith('https://host/download/x', {
      headers: { Authorization: 'Bearer tok', 'X-Atlassian-Token': 'nocheck' },
    });
    expect(result.savedPath).toBe(destination);
    expect(result.size).toBe(11);
    expect(fs.readFileSync(destination, 'utf-8')).toBe('hello world');
    expect(result.content).toBeUndefined();
  });

  it('refuses to overwrite an existing destination file', async () => {
    mockFetchOnce(Buffer.from('new content'));
    const destination = path.join(tmpDir, 'exists.txt');
    fs.writeFileSync(destination, 'original');

    await expect(
      downloadAttachment({ url: 'https://host/x', token: 'tok', filename: 'exists.txt', options: { destination } }),
    ).rejects.toThrow();
    expect(fs.readFileSync(destination, 'utf-8')).toBe('original');
  });

  it('returns text content inline when requested', async () => {
    mockFetchOnce(Buffer.from('inline text'));

    const result = await downloadAttachment({
      url: 'https://host/download/x',
      token: () => 'tok',
      filename: 'note.txt',
      options: { returnContent: 'text' },
    });

    expect(result.content).toBe('inline text');
    expect(result.encoding).toBe('text');
    expect(result.savedPath).toBeUndefined();
  });

  it('returns base64 content inline when requested', async () => {
    const bytes = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    mockFetchOnce(bytes);

    const result = await downloadAttachment({
      url: 'https://host/download/x',
      token: 'tok',
      filename: 'blob.bin',
      options: { returnContent: 'base64' },
    });

    expect(result.content).toBe(bytes.toString('base64'));
    expect(result.encoding).toBe('base64');
  });

  it("base64-encodes the bytes for returnContent 'image'", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    mockFetchOnce(bytes, { contentType: 'image/png' });

    const result = await downloadAttachment({
      url: 'https://host/download/x',
      token: 'tok',
      filename: 'shot.png',
      options: { returnContent: 'image' },
    });

    expect(result.content).toBe(bytes.toString('base64'));
    expect(result.encoding).toBe('base64');
  });

  it('honours a maxInlineBytes above the image render limit, for text too', async () => {
    const bigLog = Buffer.alloc(5_000_000, 0x41);
    mockFetchOnce(bigLog, { contentType: 'text/plain' });

    const result = await downloadAttachment({
      url: 'https://host/download/x',
      token: 'tok',
      filename: 'big.log',
      options: { returnContent: 'text', maxInlineBytes: 5_000_000 },
    });

    expect(result.contentOmittedReason).toBeUndefined();
    expect(result.content).toHaveLength(5_000_000);
  });

  it('omits inline content when the file exceeds maxInlineBytes', async () => {
    mockFetchOnce(Buffer.from('123456'));

    const result = await downloadAttachment({
      url: 'https://host/download/x',
      token: 'tok',
      filename: 'big.txt',
      options: { returnContent: 'text', maxInlineBytes: 3 },
    });

    expect(result.content).toBeUndefined();
    expect(result.contentOmittedReason).toContain('exceeds inline cap');
  });

  it('rejects early when content-length exceeds the download cap', async () => {
    mockFetchOnce(Buffer.from('1234567890'), { contentLength: '10' });

    await expect(
      downloadAttachment({ url: 'https://host/x', token: 'tok', filename: 'big.bin', options: { maxDownloadBytes: 5 } }),
    ).rejects.toThrow('exceeds the configured download limit');
  });

  it('aborts a streamed body that exceeds the download cap', async () => {
    mockFetchOnce(Buffer.from('1234567890'), { stream: true });

    await expect(
      downloadAttachment({ url: 'https://host/x', token: 'tok', filename: 'big.bin', options: { maxDownloadBytes: 5 } }),
    ).rejects.toThrow('exceeds the configured download limit');
  });

  it('enforces the cap on a buffered body without content-length', async () => {
    mockFetchOnce(Buffer.from('1234567890'));

    await expect(
      downloadAttachment({ url: 'https://host/x', token: 'tok', filename: 'big.bin', options: { maxDownloadBytes: 5 } }),
    ).rejects.toThrow('exceeds the configured download limit');
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce(Buffer.from(''), { ok: false, status: 404, statusText: 'Not Found' });

    await expect(
      downloadAttachment({ url: 'https://host/x', token: 'tok', filename: 'f.txt' }),
    ).rejects.toThrow('404 Not Found');
  });

  it('throws when no token is available', async () => {
    mockFetchOnce(Buffer.from(''));

    await expect(
      downloadAttachment({ url: 'https://host/x', token: () => undefined, filename: 'f.txt' }),
    ).rejects.toThrow('Missing API token');
  });
});
