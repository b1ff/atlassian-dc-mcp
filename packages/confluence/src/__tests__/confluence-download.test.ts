import type { AttachmentGatewaySide } from '@atlassian-dc-mcp/common';
import { z } from 'zod';
import { DEFAULT_MAX_ATTACHMENT_BYTES } from '@atlassian-dc-mcp/common';
import { ConfluenceService, confluenceToolSchemas } from '../confluence-service.js';
import { AttachmentsService } from '../confluence-client/index.js';

const DISABLED_DOWNLOAD: AttachmentGatewaySide = { enabled: false, roots: [], maxBytes: 25 * 1024 * 1024 };

jest.mock('../confluence-client/index.js', () => ({
  AttachmentsService: {
    getAttachments: jest.fn(),
  },
  ContentResourceService: {},
  SearchService: {},
  UserService: {},
  OpenAPI: { BASE: '', TOKEN: '', VERSION: '' },
}));

function mockFetchText(text: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'text/plain' },
    arrayBuffer: async () => Buffer.from(text),
  }) as unknown as typeof fetch;
}

describe('ConfluenceService.downloadAttachmentFromContent', () => {
  let service: ConfluenceService;

  beforeEach(() => {
    service = new ConfluenceService('test-host', 'test-token');
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  it('builds an absolute download URL from the relative _links.download and returns content', async () => {
    (AttachmentsService.getAttachments as jest.Mock).mockResolvedValue({
      results: [
        { title: 'doc.txt', metadata: { mediaType: 'text/plain' }, _links: { download: '/download/attachments/123/doc.txt?version=1' } },
      ],
    });
    mockFetchText('file body');

    const result = await service.downloadAttachmentFromContent({ contentId: '123', filename: 'doc.txt', returnContent: 'text', downloadSide: DISABLED_DOWNLOAD });

    expect(AttachmentsService.getAttachments).toHaveBeenCalledWith('123', undefined, 'doc.txt');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-host/download/attachments/123/doc.txt?version=1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ contentId: '123', count: 1 });
    expect(result.data!.attachments[0]).toMatchObject({ filename: 'doc.txt', content: 'file body', mediaType: 'text/plain' });
  });

  it('downloads all attachments when no filename is given', async () => {
    (AttachmentsService.getAttachments as jest.Mock).mockResolvedValue({
      results: [
        { title: 'a.txt', _links: { download: '/download/attachments/123/a.txt' } },
        { title: 'b.txt', _links: { download: '/download/attachments/123/b.txt' } },
      ],
    });
    mockFetchText('x');

    const result = await service.downloadAttachmentFromContent({ contentId: '123', downloadSide: DISABLED_DOWNLOAD });

    expect(result.success).toBe(true);
    expect(result.data!.count).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns a failure when the content has no matching attachment', async () => {
    (AttachmentsService.getAttachments as jest.Mock).mockResolvedValue({ results: [] });

    const result = await service.downloadAttachmentFromContent({ contentId: '123', filename: 'missing.txt', downloadSide: DISABLED_DOWNLOAD });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No attachment named "missing.txt"');
  });

  it('refuses to save to disk when downloads are disabled', async () => {
    const result = await service.downloadAttachmentFromContent({ contentId: '123', filename: 'doc.txt', save: true, downloadSide: DISABLED_DOWNLOAD });

    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('confluence_downloadAttachment tool schema', () => {
  const schema = z.object(confluenceToolSchemas.downloadAttachment);

  it("offers 'image' alongside the data modes", () => {
    for (const mode of ['none', 'base64', 'text', 'image']) {
      expect(schema.safeParse({ contentId: '123', returnContent: mode }).success).toBe(true);
    }
    expect(schema.safeParse({ contentId: '123', returnContent: 'jpeg' }).success).toBe(false);
  });

  it('bounds maxInlineBytes by what can be downloaded at all', () => {
    // A model told "exceeds inline cap" retries with a bigger number; past the
    // download ceiling there are no bytes to have, so the ask is rejected rather
    // than silently promising a payload nothing can deliver.
    expect(schema.safeParse({ contentId: '123', maxInlineBytes: DEFAULT_MAX_ATTACHMENT_BYTES }).success).toBe(true);
    expect(schema.safeParse({ contentId: '123', maxInlineBytes: DEFAULT_MAX_ATTACHMENT_BYTES + 1 }).success).toBe(false);
    expect(schema.safeParse({ contentId: '123', maxInlineBytes: 0 }).success).toBe(false);
    expect(schema.safeParse({ contentId: '123', maxInlineBytes: 1.5 }).success).toBe(false);
    expect(schema.safeParse({ contentId: '123', maxInlineBytes: Number.POSITIVE_INFINITY }).success).toBe(false);
  });
});
