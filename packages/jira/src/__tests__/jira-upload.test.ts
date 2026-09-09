import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AttachmentGatewaySide } from '@atlassian-dc-mcp/common';
import { JiraService } from '../jira-service.js';
import { IssueService } from '../jira-client/index.js';

jest.mock('../jira-client/index.js', () => ({
  AttachmentService: {},
  IssueService: {
    addAttachment: jest.fn(),
  },
  MyselfService: {},
  SearchService: {},
  OpenAPI: { BASE: '', TOKEN: '', VERSION: '' },
}));

describe('JiraService.uploadAttachment', () => {
  let service: JiraService;
  let root: string;
  const uploadSide = (): AttachmentGatewaySide => ({ enabled: true, roots: [fs.realpathSync.native(root)], maxBytes: 1024 });

  beforeEach(() => {
    service = new JiraService('test-host', 'test-token', undefined, () => 25);
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-mcp-jup-'));
    jest.clearAllMocks();
    (IssueService.addAttachment as jest.Mock).mockResolvedValue([{ id: '1', filename: 'a.txt' }]);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('uploads a file resolved within the upload root', async () => {
    fs.writeFileSync(path.join(root, 'a.txt'), 'hello');

    const result = await service.uploadAttachment('PROJ-1', 'a.txt', uploadSide());

    expect(result.success).toBe(true);
    expect(IssueService.addAttachment).toHaveBeenCalledTimes(1);
    const [issueKey, formData] = (IssueService.addAttachment as jest.Mock).mock.calls[0];
    expect(issueKey).toBe('PROJ-1');
    expect(formData.file.name).toBe('a.txt');
  });

  it('rejects an absolute path outside the root', async () => {
    const result = await service.uploadAttachment('PROJ-1', '/etc/passwd', uploadSide());
    expect(result.success).toBe(false);
    expect(IssueService.addAttachment).not.toHaveBeenCalled();
  });

  it('rejects a symlink inside the root', async () => {
    const target = path.join(root, 'real.txt');
    fs.writeFileSync(target, 'secret');
    fs.symlinkSync(target, path.join(root, 'link.txt'));

    const result = await service.uploadAttachment('PROJ-1', 'link.txt', uploadSide());
    expect(result.success).toBe(false);
    expect(IssueService.addAttachment).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit', async () => {
    fs.writeFileSync(path.join(root, 'big.txt'), 'x'.repeat(2048));

    const result = await service.uploadAttachment('PROJ-1', 'big.txt', uploadSide());
    expect(result.success).toBe(false);
    expect(IssueService.addAttachment).not.toHaveBeenCalled();
  });
});
