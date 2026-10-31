import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AttachmentGatewaySide } from '@atlassian-dc-mcp/common';
import { ConfluenceService } from '../confluence-service.js';
import { AttachmentsService } from '../confluence-client/index.js';

jest.mock('../confluence-client/index.js', () => ({
  AttachmentsService: {
    getAttachments: jest.fn(),
    createAttachments: jest.fn(),
    updateData: jest.fn(),
  },
  ContentResourceService: {},
  SearchService: {},
  UserService: {},
  OpenAPI: { BASE: '', TOKEN: '', VERSION: '', HEADERS: undefined },
}));

describe('ConfluenceService.uploadAttachment', () => {
  let service: ConfluenceService;
  let root: string;
  const uploadSide = (): AttachmentGatewaySide => ({ enabled: true, roots: [fs.realpathSync.native(root)], maxBytes: 1024 });

  beforeEach(() => {
    service = new ConfluenceService('test-host', 'test-token');
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-cup-'));
    jest.clearAllMocks();
    (AttachmentsService.createAttachments as jest.Mock).mockResolvedValue({ results: [{ id: '1', title: 'a.txt' }] });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('uploads a file resolved within the upload root', async () => {
    fs.writeFileSync(path.join(root, 'a.txt'), 'hello');

    const result = await service.uploadAttachment('42', 'a.txt', uploadSide());

    expect(result.success).toBe(true);
    expect(AttachmentsService.createAttachments).toHaveBeenCalledTimes(1);
    const formData = (AttachmentsService.createAttachments as jest.Mock).mock.calls[0][4];
    expect(formData.file.name).toBe('a.txt');
  });

  it('sends the given content type with the file part', async () => {
    fs.writeFileSync(path.join(root, 'diagram.drawio'), '<mxfile/>');

    const result = await service.uploadAttachment(
      '42', 'diagram.drawio', uploadSide(), 'Main Flow', 'draw.io diagram',
      undefined, undefined, undefined, undefined, 'application/vnd.jgraph.mxfile',
    );

    expect(result.success).toBe(true);
    const formData = (AttachmentsService.createAttachments as jest.Mock).mock.calls[0][4];
    expect(formData.file.name).toBe('Main Flow');
    expect(formData.file.type).toBe('application/vnd.jgraph.mxfile');
    expect(formData.comment).toBe('draw.io diagram');
  });

  it('keeps content type, comment and minorEdit when uploading a new version', async () => {
    fs.writeFileSync(path.join(root, 'diagram.png'), 'png');
    (AttachmentsService.getAttachments as jest.Mock).mockResolvedValue({ results: [{ id: '7' }] });
    (AttachmentsService.updateData as jest.Mock).mockResolvedValue({ id: '7' });

    const result = await service.uploadAttachment(
      '42', 'diagram.png', uploadSide(), 'Main Flow.png', 'Main Flow exported to image',
      true, undefined, undefined, true, 'image/png',
    );

    expect(result.success).toBe(true);
    expect(AttachmentsService.createAttachments).not.toHaveBeenCalled();
    const [attachmentId, contentId, formData] = (AttachmentsService.updateData as jest.Mock).mock.calls[0];
    expect(attachmentId).toBe('7');
    expect(contentId).toBe('42');
    expect(formData.file.type).toBe('image/png');
    expect(formData.comment).toBe('Main Flow exported to image');
    expect(formData.minorEdit).toBe(true);
  });

  it('rejects an absolute path outside the root', async () => {
    const result = await service.uploadAttachment('42', '/etc/passwd', uploadSide());
    expect(result.success).toBe(false);
    expect(AttachmentsService.createAttachments).not.toHaveBeenCalled();
  });

  it('rejects a symlink inside the root', async () => {
    const target = path.join(root, 'real.txt');
    fs.writeFileSync(target, 'secret');
    fs.symlinkSync(target, path.join(root, 'link.txt'));

    const result = await service.uploadAttachment('42', 'link.txt', uploadSide());
    expect(result.success).toBe(false);
    expect(AttachmentsService.createAttachments).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit', async () => {
    fs.writeFileSync(path.join(root, 'big.txt'), 'x'.repeat(2048));

    const result = await service.uploadAttachment('42', 'big.txt', uploadSide());
    expect(result.success).toBe(false);
    expect(AttachmentsService.createAttachments).not.toHaveBeenCalled();
  });
});
