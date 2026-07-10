import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeRuntimeConfig } from '@atlassian-dc-mcp/common';
import { JiraService, jiraToolSchemas } from '../jira-service.js';
import { IssueService, OpenAPI, SearchService } from '../jira-client/index.js';
import { request as __request } from '../jira-client/core/request.js';

jest.mock('../jira-client/core/request.js', () => ({
  request: jest.fn(),
}));

jest.mock('../jira-client/index.js', () => ({
  IssueService: {
    getTransitions: jest.fn(),
    doTransition: jest.fn(),
    getIssue: jest.fn(),
    editIssue: jest.fn(),
    createIssue: jest.fn(),
    getComments: jest.fn(),
    addComment: jest.fn(),
  },
  SearchService: {
    searchUsingSearchRequest: jest.fn(),
  },
  OpenAPI: {
    BASE: '',
    TOKEN: '',
    VERSION: '',
  },
}));

describe('JiraService', () => {
  let jiraService: JiraService;
  const mockIssueKey = 'PROJ-123';

  beforeEach(() => {
    jiraService = new JiraService('test-host', 'test-token', undefined, () => 25);
    jest.clearAllMocks();
  });

  describe('getTransitions', () => {
    it('should successfully get available transitions for an issue', async () => {
      const mockTransitionsData = {
        transitions: [
          {
            id: '21',
            name: 'Start Progress',
            to: {
              id: '3',
              name: 'In Progress',
              statusCategory: { name: 'In Progress' },
            },
          },
          {
            id: '31',
            name: 'Done',
            to: {
              id: '4',
              name: 'Done',
              statusCategory: { name: 'Done' },
            },
          },
        ],
      };
      (IssueService.getTransitions as jest.Mock).mockResolvedValue(mockTransitionsData);

      const result = await jiraService.getTransitions(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockTransitionsData);
      expect(IssueService.getTransitions).toHaveBeenCalledWith(mockIssueKey);
    });

    it('should return empty transitions array when no transitions available', async () => {
      const mockTransitionsData = {
        transitions: [],
      };
      (IssueService.getTransitions as jest.Mock).mockResolvedValue(mockTransitionsData);

      const result = await jiraService.getTransitions(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockTransitionsData);
      expect(result.data?.transitions).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Issue not found');
      (IssueService.getTransitions as jest.Mock).mockRejectedValue(mockError);

      const result = await jiraService.getTransitions(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue not found');
    });

    it('should handle permission errors', async () => {
      const mockError = new Error('Insufficient permissions to view transitions');
      (IssueService.getTransitions as jest.Mock).mockRejectedValue(mockError);

      const result = await jiraService.getTransitions('RESTRICTED-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to view transitions');
    });
  });

  describe('token optimization paths', () => {
    it('uses the default field profile and page size for search', async () => {
      const mockSearchResults = { issues: [] };
      (SearchService.searchUsingSearchRequest as jest.Mock).mockResolvedValue(mockSearchResults);

      const result = await jiraService.searchIssues('project = TEST');

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockSearchResults);
      expect(SearchService.searchUsingSearchRequest).toHaveBeenCalledWith({
        jql: 'project = TEST',
        maxResults: 25,
        fields: ['summary', 'description', 'status', 'assignee', 'reporter', 'priority', 'issuetype', 'labels', 'updated'],
        expand: undefined,
        startAt: undefined,
      });
    });

    it('honors explicit search fields and maxResults', async () => {
      const mockSearchResults = { issues: [] };
      (SearchService.searchUsingSearchRequest as jest.Mock).mockResolvedValue(mockSearchResults);

      await jiraService.searchIssues('project = TEST', 20, ['changelog'], 5, ['summary', 'status']);

      expect(SearchService.searchUsingSearchRequest).toHaveBeenCalledWith({
        jql: 'project = TEST',
        maxResults: 5,
        fields: ['summary', 'status'],
        expand: ['changelog'],
        startAt: 20,
      });
    });

    it('uses the richer default field profile for single issue reads', async () => {
      const mockIssue = { key: mockIssueKey };
      (IssueService.getIssue as jest.Mock).mockResolvedValue(mockIssue);

      const result = await jiraService.getIssue(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockIssue);
      expect(IssueService.getIssue).toHaveBeenCalledWith(mockIssueKey, undefined, [
        'summary',
        'description',
        'status',
        'assignee',
        'reporter',
        'priority',
        'issuetype',
        'labels',
        'updated',
        'parent',
        'subtasks',
      ]);
    });

    it('honors explicit issue fields', async () => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ key: mockIssueKey });

      await jiraService.getIssue(mockIssueKey, 'renderedFields', ['summary', 'status']);

      expect(IssueService.getIssue).toHaveBeenCalledWith(mockIssueKey, 'renderedFields', ['summary', 'status']);
    });

    it('uses the package default page size for issue comments', async () => {
      const mockComments = { comments: [] };
      (IssueService.getComments as jest.Mock).mockResolvedValue(mockComments);

      const result = await jiraService.getIssueComments(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockComments);
      expect(IssueService.getComments).toHaveBeenCalledWith(mockIssueKey, undefined, '25', undefined, undefined);
    });

    it('forwards explicit issue comment pagination', async () => {
      (IssueService.getComments as jest.Mock).mockResolvedValue({ comments: [] });

      await jiraService.getIssueComments(mockIssueKey, 'renderedBody', 10, 20);

      expect(IssueService.getComments).toHaveBeenCalledWith(mockIssueKey, 'renderedBody', '10', undefined, '20');
    });
  });

  describe('getIssueDevelopmentInfo', () => {
    it('resolves the numeric issue id then requests pull requests by default', async () => {
      const mockDevInfo = { detail: [{ pullRequests: [] }] };
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ id: '1314681', key: mockIssueKey });
      (__request as jest.Mock).mockResolvedValue(mockDevInfo);

      const result = await jiraService.getIssueDevelopmentInfo(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockDevInfo);
      expect(IssueService.getIssue).toHaveBeenCalledWith(mockIssueKey, undefined, ['id']);
      expect(__request).toHaveBeenCalledWith(OpenAPI, {
        method: 'GET',
        url: '/dev-status/1.0/issue/detail',
        query: { issueId: '1314681', applicationType: 'stash', dataType: 'pullrequest' },
      });
    });

    it('honors explicit dataType and applicationType', async () => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ id: '42' });
      (__request as jest.Mock).mockResolvedValue({});

      await jiraService.getIssueDevelopmentInfo(mockIssueKey, 'repository', 'github');

      expect(__request).toHaveBeenCalledWith(OpenAPI, {
        method: 'GET',
        url: '/dev-status/1.0/issue/detail',
        query: { issueId: '42', applicationType: 'github', dataType: 'repository' },
      });
    });

    it('fails without calling dev-status when the numeric id is missing', async () => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ key: mockIssueKey });

      const result = await jiraService.getIssueDevelopmentInfo(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe(`Could not resolve numeric id for issue ${mockIssueKey}`);
      expect(__request).not.toHaveBeenCalled();
    });

    it('surfaces dev-status request errors', async () => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ id: '1314681' });
      (__request as jest.Mock).mockRejectedValue(new Error('View Development Tools permission required'));

      const result = await jiraService.getIssueDevelopmentInfo(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('View Development Tools permission required');
    });
  });

  describe('transitionIssue', () => {
    it('should successfully transition an issue to a new status', async () => {
      (IssueService.doTransition as jest.Mock).mockResolvedValue(undefined);

      const result = await jiraService.transitionIssue({
        issueKey: mockIssueKey,
        transitionId: '21',
      });

      expect(result.success).toBe(true);
      expect(IssueService.doTransition).toHaveBeenCalledWith(mockIssueKey, {
        transition: { id: '21' },
      });
    });

    it('should successfully transition with additional fields', async () => {
      (IssueService.doTransition as jest.Mock).mockResolvedValue(undefined);

      const result = await jiraService.transitionIssue({
        issueKey: mockIssueKey,
        transitionId: '31',
        fields: {
          resolution: { name: 'Done' },
          comment: { body: 'Closing this issue' },
        },
      });

      expect(result.success).toBe(true);
      expect(IssueService.doTransition).toHaveBeenCalledWith(mockIssueKey, {
        transition: { id: '31' },
        fields: {
          resolution: { name: 'Done' },
          comment: { body: 'Closing this issue' },
        },
      });
    });

    it('should handle invalid transition ID errors', async () => {
      const mockError = new Error('Invalid transition ID');
      (IssueService.doTransition as jest.Mock).mockRejectedValue(mockError);

      const result = await jiraService.transitionIssue({
        issueKey: mockIssueKey,
        transitionId: '999',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid transition ID');
    });

    it('should handle missing required fields errors', async () => {
      const mockError = new Error('Resolution field is required');
      (IssueService.doTransition as jest.Mock).mockRejectedValue(mockError);

      const result = await jiraService.transitionIssue({
        issueKey: mockIssueKey,
        transitionId: '31',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resolution field is required');
    });

    it('should handle permission errors', async () => {
      const mockError = new Error('User does not have permission to transition this issue');
      (IssueService.doTransition as jest.Mock).mockRejectedValue(mockError);

      const result = await jiraService.transitionIssue({
        issueKey: 'RESTRICTED-1',
        transitionId: '21',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have permission to transition this issue');
    });

    it('should handle issue not found errors', async () => {
      const mockError = new Error('Issue does not exist');
      (IssueService.doTransition as jest.Mock).mockRejectedValue(mockError);

      const result = await jiraService.transitionIssue({
        issueKey: 'NONEXISTENT-999',
        transitionId: '21',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue does not exist');
    });
  });

  describe('constructor base URL resolution', () => {
    it('builds BASE from host + default /rest when apiBasePath is missing', () => {
      new JiraService('jira.example.com', 'test-token');
      expect(OpenAPI.BASE).toBe('https://jira.example.com/rest');
    });

    it('strips accidentally-included /api/2 suffix from saved apiBasePath', () => {
      new JiraService('jira.example.com', 'test-token', '/rest/api/2');
      expect(OpenAPI.BASE).toBe('https://jira.example.com/rest');
    });

    it('accepts a fully-qualified apiBasePath as an override', () => {
      new JiraService('ignored.example.com', 'test-token', 'https://real.example.com/rest');
      expect(OpenAPI.BASE).toBe('https://real.example.com/rest');
    });
  });

  describe('validateConfig', () => {
    const originalEnv = process.env;
    const originalPlatform = process.platform;
    let tempDir: string;
    let tempHome: string;
    let homedirSpy: jest.SpyInstance;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.ATLASSIAN_DC_MCP_CONFIG_FILE;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_HOST;
      delete process.env.JIRA_API_BASE_PATH;
      delete process.env.JIRA_DEFAULT_PAGE_SIZE;
      tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-validate-config-home-'));
      homedirSpy = jest.spyOn(os, 'homedir').mockReturnValue(tempHome);
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jira-validate-config-'));
      initializeRuntimeConfig({ cwd: tempDir });
    });

    afterEach(() => {
      homedirSpy.mockRestore();
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
      fs.rmSync(tempHome, { recursive: true, force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return empty array when all required env vars are present', () => {
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_HOST = 'test-host';

      const missingVars = JiraService.validateConfig();
      expect(missingVars).toEqual([]);
    });

    it('should return missing vars when JIRA_API_TOKEN is missing', () => {
      delete process.env.JIRA_API_TOKEN;
      process.env.JIRA_HOST = 'test-host';

      const missingVars = JiraService.validateConfig();
      expect(missingVars).toContain('JIRA_API_TOKEN');
    });

    it('should return missing vars when both host options are missing', () => {
      process.env.JIRA_API_TOKEN = 'test-token';
      delete process.env.JIRA_HOST;
      delete process.env.JIRA_API_BASE_PATH;

      const missingVars = JiraService.validateConfig();
      expect(missingVars).toContain('JIRA_HOST or JIRA_API_BASE_PATH');
    });

    it('should accept JIRA_API_BASE_PATH as alternative to JIRA_HOST', () => {
      process.env.JIRA_API_TOKEN = 'test-token';
      delete process.env.JIRA_HOST;
      process.env.JIRA_API_BASE_PATH = 'https://test-host/rest';

      const missingVars = JiraService.validateConfig();
      expect(missingVars).toEqual([]);
    });

    it('should accept required config from the shared config file', () => {
      const sharedConfigPath = path.join(tempDir, 'shared.env');
      fs.writeFileSync(sharedConfigPath, 'JIRA_HOST=file-host\nJIRA_API_TOKEN=file-token\n');
      process.env.ATLASSIAN_DC_MCP_CONFIG_FILE = sharedConfigPath;

      const missingVars = JiraService.validateConfig();
      expect(missingVars).toEqual([]);
    });
  });

  describe('getIssueAttachments', () => {
    it('lists attachment metadata successfully with full normalization', async () => {
      const mockIssue = {
        fields: {
          attachment: [
            {
              id: 10001,
              filename: 'report.pdf',
              mimeType: 'application/pdf',
              size: 2048,
              created: '2026-01-01T00:00:00.000Z',
              author: { name: 'jdoe', displayName: 'Jane Doe', emailAddress: 'jdoe@example.com' },
              thumbnail: 'https://test-host/secure/thumbnail/10001/_thumb_10001.png',
            },
            {
              id: 10002,
              filename: 'notes.txt',
              mimeType: 'text/plain',
              size: 128,
              created: '2026-01-02T00:00:00.000Z',
              author: { name: 'asmith', displayName: 'Al Smith' },
            },
          ],
        },
      };
      (IssueService.getIssue as jest.Mock).mockResolvedValue(mockIssue);

      const result = await jiraService.getIssueAttachments(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        issueKey: mockIssueKey,
        attachments: [
          {
            id: '10001',
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            created: '2026-01-01T00:00:00.000Z',
            author: { name: 'jdoe', displayName: 'Jane Doe' },
            hasThumbnail: true,
          },
          {
            id: '10002',
            filename: 'notes.txt',
            mimeType: 'text/plain',
            size: 128,
            created: '2026-01-02T00:00:00.000Z',
            author: { name: 'asmith', displayName: 'Al Smith' },
            hasThumbnail: false,
          },
        ],
      });
    });

    it.each([
      ['fields.attachment is undefined', { fields: {} }],
      ['fields is missing entirely', {}],
    ])('returns an empty list when %s', async (_label, mockIssue) => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue(mockIssue);

      const result = await jiraService.getIssueAttachments(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ issueKey: mockIssueKey, attachments: [] });
    });

    it('requests only the attachment field', async () => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ fields: { attachment: [] } });

      await jiraService.getIssueAttachments(mockIssueKey);

      expect(IssueService.getIssue).toHaveBeenCalledWith(mockIssueKey, undefined, ['attachment']);
    });

    it('normalizes an attachment with only an id, defaulting filename and omitting other optional keys', async () => {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({
        fields: { attachment: [{ id: 55 }] },
      });

      const result = await jiraService.getIssueAttachments(mockIssueKey);

      expect(result.success).toBe(true);
      const [attachment] = result.data?.attachments ?? [];
      expect(attachment).toEqual({ id: '55', filename: '', hasThumbnail: false });
      expect(attachment).not.toHaveProperty('mimeType');
      expect(attachment).not.toHaveProperty('size');
      expect(attachment).not.toHaveProperty('created');
      expect(attachment).not.toHaveProperty('author');
    });

    it('returns a failure envelope for a not-found issue', async () => {
      const notFoundError = new Error('Issue does not exist');
      Object.assign(notFoundError, {
        status: 404,
        statusText: 'Not Found',
        body: { errorMessages: ['Issue Does Not Exist'] },
      });
      (IssueService.getIssue as jest.Mock).mockRejectedValue(notFoundError);

      const result = await jiraService.getIssueAttachments(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error getting issue attachments: 404 Not Found');
      expect(result.details).toEqual({ errorMessages: ['Issue Does Not Exist'] });
    });

    it('returns a failure envelope for a permission error (401/403)', async () => {
      const forbiddenError = new Error('Forbidden');
      Object.assign(forbiddenError, {
        status: 403,
        statusText: 'Forbidden',
        body: { errorMessages: ['You do not have permission to view this issue'] },
      });
      (IssueService.getIssue as jest.Mock).mockRejectedValue(forbiddenError);

      const result = await jiraService.getIssueAttachments(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error getting issue attachments: 403 Forbidden');
      expect(result.details).toEqual({ errorMessages: ['You do not have permission to view this issue'] });
    });
  });

  describe('downloadIssueAttachment', () => {
    const mockAttachmentId = '10001';
    const originalFetch = global.fetch;
    const originalMaxBytesEnv = process.env.JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES;

    function toArrayBuffer(buf: Buffer): ArrayBuffer {
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }

    function mockAttachmentsList(attachments: Array<Record<string, unknown>>) {
      (IssueService.getIssue as jest.Mock).mockResolvedValue({ fields: { attachment: attachments } });
    }

    function mockFetchResponse(overrides: {
      ok?: boolean;
      status?: number;
      statusText?: string;
      arrayBuffer?: () => Promise<ArrayBuffer>;
      text?: () => Promise<string>;
    }) {
      const response = {
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => new ArrayBuffer(0),
        text: async () => '',
        ...overrides,
      };
      (global.fetch as jest.Mock).mockResolvedValue(response);
      return response;
    }

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      if (originalMaxBytesEnv === undefined) {
        delete process.env.JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES;
      } else {
        process.env.JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES = originalMaxBytesEnv;
      }
    });

    it('downloads a text attachment and preserves exact UTF-8 bytes', async () => {
      const content = 'Hello, JIRA attachment download! 日本語テスト';
      const buf = Buffer.from(content, 'utf8');
      mockAttachmentsList([{ id: 10001, filename: 'notes.txt', mimeType: 'text/plain', size: buf.byteLength }]);
      mockFetchResponse({ arrayBuffer: async () => toArrayBuffer(buf) });

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(true);
      expect(result.data?.encoding).toBe('base64');
      expect(result.data?.size).toBe(buf.byteLength);
      expect(result.data?.filename).toBe('notes.txt');
      expect(result.data?.mimeType).toBe('text/plain');
      expect(Buffer.from(result.data?.data ?? '', 'base64').toString('utf8')).toBe(content);
    });

    it('downloads non-UTF-8 binary bytes byte-for-byte', async () => {
      const original = Buffer.from([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xfe]);
      mockAttachmentsList([{ id: 10001, filename: 'image.png', mimeType: 'image/png', size: original.byteLength }]);
      mockFetchResponse({ arrayBuffer: async () => toArrayBuffer(original) });

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(true);
      const decoded = Buffer.from(result.data?.data ?? '', 'base64');
      expect(decoded.equals(original)).toBe(true);
    });

    it('uses the configured base path and bearer auth header, refusing redirects', async () => {
      const buf = Buffer.from('x');
      mockAttachmentsList([{ id: 10001, filename: 'x.txt', size: buf.byteLength }]);
      mockFetchResponse({ arrayBuffer: async () => toArrayBuffer(buf) });

      await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const expectedUrl = `${OpenAPI.BASE.replace(/\/rest\/?$/, '')}/secure/attachment/${encodeURIComponent('10001')}/${encodeURIComponent('x.txt')}`;
      expect(url).toBe(expectedUrl);
      expect(options).toMatchObject({
        redirect: 'error',
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('encodes filenames with spaces, unicode, and special characters in the URL', async () => {
      const filename = 'my report (final) ✓ & notes #1.pdf';
      const buf = Buffer.from('content');
      mockAttachmentsList([{ id: 10001, filename, size: buf.byteLength }]);
      mockFetchResponse({ arrayBuffer: async () => toArrayBuffer(buf) });

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(true);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(
        `${OpenAPI.BASE.replace(/\/rest\/?$/, '')}/secure/attachment/${encodeURIComponent('10001')}/${encodeURIComponent(filename)}`
      );
      expect(result.data?.filename).toBe(filename);
    });

    it('rejects an attachment id that is not on the issue, never calling fetch', async () => {
      mockAttachmentsList([{ id: 10001, filename: 'a.txt' }]);

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, 'not-real-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not-real-id');
      expect(result.error).toContain(mockIssueKey);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns a failure envelope when the issue is not found during metadata fetch, never calling fetch', async () => {
      const notFoundError = new Error('Issue does not exist');
      Object.assign(notFoundError, {
        status: 404,
        statusText: 'Not Found',
        body: { errorMessages: ['Issue Does Not Exist'] },
      });
      (IssueService.getIssue as jest.Mock).mockRejectedValue(notFoundError);

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error downloading issue attachment: 404 Not Found');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('surfaces an HTTP failure from the download request', async () => {
      mockAttachmentsList([{ id: 10001, filename: 'a.txt' }]);
      mockFetchResponse({ ok: false, status: 403, statusText: 'Forbidden', text: async () => 'Forbidden by policy' });

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error downloading issue attachment: 403 Forbidden');
      expect(result.details).toBe('Forbidden by policy');
    });

    it('surfaces a network failure (rejected fetch) from the download request', async () => {
      mockAttachmentsList([{ id: 10001, filename: 'a.txt' }]);
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('fetch failed');
      expect(result.details).toBeUndefined();
    });

    it('rejects a download when metadata size exceeds the configured limit, never calling fetch', async () => {
      process.env.JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES = '16';
      mockAttachmentsList([{ id: 10001, filename: 'big.bin', size: 17 }]);

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('16');
      expect(result.error).toContain('JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects a download when the actual bytes exceed the configured limit after fetching', async () => {
      process.env.JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES = '16';
      mockAttachmentsList([{ id: 10001, filename: 'big.bin' }]); // size absent from metadata
      const oversized = Buffer.alloc(32, 0x41);
      mockFetchResponse({ arrayBuffer: async () => toArrayBuffer(oversized) });

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('16');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('proceeds with the download when metadata size is absent and actual bytes are under the limit', async () => {
      mockAttachmentsList([{ id: 10001, filename: 'small.bin' }]); // size absent from metadata
      const small = Buffer.from('small payload');
      mockFetchResponse({ arrayBuffer: async () => toArrayBuffer(small) });

      const result = await jiraService.downloadIssueAttachment(mockIssueKey, mockAttachmentId);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(small.byteLength);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('jiraToolSchemas attachment schemas', () => {
    it('exposes issueKey as a required string for getIssueAttachments', () => {
      const { issueKey } = jiraToolSchemas.getIssueAttachments;
      expect(issueKey.safeParse('PROJ-123').success).toBe(true);
      expect(issueKey.safeParse(123).success).toBe(false);
      expect(issueKey.safeParse(undefined).success).toBe(false);
    });

    it('exposes issueKey and attachmentId as required strings for downloadIssueAttachment', () => {
      const { issueKey, attachmentId } = jiraToolSchemas.downloadIssueAttachment;
      expect(issueKey.safeParse('PROJ-123').success).toBe(true);
      expect(issueKey.safeParse(123).success).toBe(false);
      expect(attachmentId.safeParse('10001').success).toBe(true);
      expect(attachmentId.safeParse(10001).success).toBe(false);
      expect(attachmentId.safeParse(undefined).success).toBe(false);
    });
  });
});
