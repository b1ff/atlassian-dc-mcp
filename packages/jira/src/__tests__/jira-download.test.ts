import type { AttachmentGatewaySide } from '@atlassian-dc-mcp/common';
import { z } from 'zod';
import { DEFAULT_MAX_ATTACHMENT_BYTES } from '@atlassian-dc-mcp/common';
import { JiraService, jiraToolSchemas } from '../jira-service.js';
import { AttachmentService, IssueService } from '../jira-client/index.js';

const DISABLED_DOWNLOAD: AttachmentGatewaySide = { enabled: false, roots: [], maxBytes: 25 * 1024 * 1024 };

jest.mock('../jira-client/index.js', () => ({
  AttachmentService: {
    getAttachment: jest.fn(),
  },
  IssueService: {
    getIssue1: jest.fn(),
  },
  MyselfService: {},
  SearchService: {},
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

describe('JiraService.downloadAttachments', () => {
  let service: JiraService;

  beforeEach(() => {
    service = new JiraService('test-host', 'test-token', undefined, () => 25);
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  it('downloads a single attachment by id using its content URL', async () => {
    (AttachmentService.getAttachment as jest.Mock).mockResolvedValue({
      id: '10001',
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      content: 'https://test-host/secure/attachment/10001/report.pdf',
    });
    mockFetchText('pdf-bytes');

    const result = await service.downloadAttachments({ attachmentId: '10001', returnContent: 'text', downloadSide: DISABLED_DOWNLOAD });

    expect(AttachmentService.getAttachment).toHaveBeenCalledWith('10001');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-host/secure/attachment/10001/report.pdf',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ count: 1 });
    expect(result.data!.attachments[0]).toMatchObject({ filename: 'report.pdf', content: 'pdf-bytes' });
  });

  it('downloads all attachments on an issue', async () => {
    (IssueService.getIssue1 as jest.Mock).mockResolvedValue({
      fields: {
        attachment: [
          { id: '1', filename: 'a.txt', content: 'https://test-host/a' },
          { id: '2', filename: 'b.txt', content: 'https://test-host/b' },
        ],
      },
    });
    mockFetchText('x');

    const result = await service.downloadAttachments({ issueKey: 'PROJ-1', downloadSide: DISABLED_DOWNLOAD });

    expect(IssueService.getIssue1).toHaveBeenCalledWith('PROJ-1', undefined, 'attachment');
    expect(result.success).toBe(true);
    expect(result.data!.count).toBe(2);
  });

  it('filters issue attachments by filename', async () => {
    (IssueService.getIssue1 as jest.Mock).mockResolvedValue({
      fields: {
        attachment: [
          { id: '1', filename: 'a.txt', content: 'https://test-host/a' },
          { id: '2', filename: 'b.txt', content: 'https://test-host/b' },
        ],
      },
    });
    mockFetchText('x');

    const result = await service.downloadAttachments({ issueKey: 'PROJ-1', filename: 'b.txt', downloadSide: DISABLED_DOWNLOAD });

    expect(result.success).toBe(true);
    expect(result.data!.count).toBe(1);
    expect(result.data!.attachments[0].filename).toBe('b.txt');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fails when neither attachmentId nor issueKey is provided', async () => {
    const result = await service.downloadAttachments({ downloadSide: DISABLED_DOWNLOAD });
    expect(result.success).toBe(false);
    expect(result.error).toContain('attachmentId or issueKey');
  });

  it('fails when an issue has no matching attachment', async () => {
    (IssueService.getIssue1 as jest.Mock).mockResolvedValue({ fields: { attachment: [] } });

    const result = await service.downloadAttachments({ issueKey: 'PROJ-1', filename: 'x.txt', downloadSide: DISABLED_DOWNLOAD });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No attachment named "x.txt"');
  });
});

describe('jira_downloadAttachment tool schema', () => {
  const schema = z.object(jiraToolSchemas.downloadAttachment);

  it("offers 'image' alongside the data modes", () => {
    for (const mode of ['none', 'base64', 'text', 'image']) {
      expect(schema.safeParse({ issueKey: 'PROJ-1', returnContent: mode }).success).toBe(true);
    }
    expect(schema.safeParse({ issueKey: 'PROJ-1', returnContent: 'jpeg' }).success).toBe(false);
  });

  it('bounds maxInlineBytes by what can be downloaded at all', () => {
    // A model told "exceeds inline cap" retries with a bigger number; past the
    // download ceiling there are no bytes to have, so the ask is rejected rather
    // than silently promising a payload nothing can deliver.
    expect(schema.safeParse({ issueKey: 'PROJ-1', maxInlineBytes: DEFAULT_MAX_ATTACHMENT_BYTES }).success).toBe(true);
    expect(schema.safeParse({ issueKey: 'PROJ-1', maxInlineBytes: DEFAULT_MAX_ATTACHMENT_BYTES + 1 }).success).toBe(false);
    expect(schema.safeParse({ issueKey: 'PROJ-1', maxInlineBytes: 0 }).success).toBe(false);
    expect(schema.safeParse({ issueKey: 'PROJ-1', maxInlineBytes: 1.5 }).success).toBe(false);
    expect(schema.safeParse({ issueKey: 'PROJ-1', maxInlineBytes: Number.POSITIVE_INFINITY }).success).toBe(false);
  });
});
