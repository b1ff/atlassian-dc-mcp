import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeRuntimeConfig } from '@atlassian-dc-mcp/common';
import { JiraService } from '../jira-service.js';
import { IssueLinkService, IssueLinkTypeService, IssueService, MyselfService, OpenAPI, SearchService } from '../jira-client/index.js';
import { request as __request } from '../jira-client/core/request.js';

jest.mock('../jira-client/core/request.js', () => ({
  request: jest.fn(),
}));

jest.mock('../jira-client/index.js', () => ({
  IssueService: {
    getTransitions: jest.fn(),
    doTransition: jest.fn(),
    getIssue1: jest.fn(),
    editIssue: jest.fn(),
    createIssue: jest.fn(),
    getComments: jest.fn(),
    addComment: jest.fn(),
    updateComment: jest.fn(),
    addWatcher1: jest.fn(),
    removeWatcher1: jest.fn(),
  },
  SearchService: {
    searchUsingSearchRequest: jest.fn(),
  },
  IssueLinkService: {
    linkIssues: jest.fn(),
    deleteIssueLink: jest.fn(),
  },
  IssueLinkTypeService: {
    getIssueLinkTypes: jest.fn(),
  },
  MyselfService: {
    getUser: jest.fn(),
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
      (IssueService.getIssue1 as jest.Mock).mockResolvedValue(mockIssue);

      const result = await jiraService.getIssue(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockIssue);
      expect(IssueService.getIssue1).toHaveBeenCalledWith(
        mockIssueKey,
        undefined,
        'summary,description,status,assignee,reporter,priority,issuetype,labels,updated,parent,subtasks',
      );
    });

    it('honors explicit issue fields', async () => {
      (IssueService.getIssue1 as jest.Mock).mockResolvedValue({ key: mockIssueKey });

      await jiraService.getIssue(mockIssueKey, 'renderedFields', ['summary', 'status']);

      expect(IssueService.getIssue1).toHaveBeenCalledWith(mockIssueKey, 'renderedFields', 'summary,status');
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

  describe('updateIssueComment', () => {
    it('sends the new body to the addressed comment', async () => {
      const mockComment = { id: '10500', body: 'Updated body' };
      (IssueService.updateComment as jest.Mock).mockResolvedValue(mockComment);

      const result = await jiraService.updateIssueComment(mockIssueKey, '10500', 'Updated body');

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockComment);
      expect(IssueService.updateComment).toHaveBeenCalledWith(mockIssueKey, '10500', undefined, { body: 'Updated body' });
    });

    it('surfaces update errors gracefully', async () => {
      (IssueService.updateComment as jest.Mock).mockRejectedValue(new Error('You do not have permission to edit this comment'));

      const result = await jiraService.updateIssueComment(mockIssueKey, '10500', 'Updated body');

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to edit this comment');
    });
  });

  describe('getIssueDevelopmentInfo', () => {
    it('resolves the numeric issue id then requests pull requests by default', async () => {
      const mockDevInfo = { detail: [{ pullRequests: [] }] };
      (IssueService.getIssue1 as jest.Mock).mockResolvedValue({ id: '1314681', key: mockIssueKey });
      (__request as jest.Mock).mockResolvedValue(mockDevInfo);

      const result = await jiraService.getIssueDevelopmentInfo(mockIssueKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockDevInfo);
      expect(IssueService.getIssue1).toHaveBeenCalledWith(mockIssueKey, undefined, 'id');
      expect(__request).toHaveBeenCalledWith(OpenAPI, {
        method: 'GET',
        url: '/dev-status/1.0/issue/detail',
        query: { issueId: '1314681', applicationType: 'stash', dataType: 'pullrequest' },
      });
    });

    it('honors explicit dataType and applicationType', async () => {
      (IssueService.getIssue1 as jest.Mock).mockResolvedValue({ id: '42' });
      (__request as jest.Mock).mockResolvedValue({});

      await jiraService.getIssueDevelopmentInfo(mockIssueKey, 'repository', 'github');

      expect(__request).toHaveBeenCalledWith(OpenAPI, {
        method: 'GET',
        url: '/dev-status/1.0/issue/detail',
        query: { issueId: '42', applicationType: 'github', dataType: 'repository' },
      });
    });

    it('fails without calling dev-status when the numeric id is missing', async () => {
      (IssueService.getIssue1 as jest.Mock).mockResolvedValue({ key: mockIssueKey });

      const result = await jiraService.getIssueDevelopmentInfo(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe(`Could not resolve numeric id for issue ${mockIssueKey}`);
      expect(__request).not.toHaveBeenCalled();
    });

    it('surfaces dev-status request errors', async () => {
      (IssueService.getIssue1 as jest.Mock).mockResolvedValue({ id: '1314681' });
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

  describe('getIssueLinkTypes', () => {
    it('should return the available issue link types', async () => {
      const mockLinkTypes = {
        issueLinkTypes: [
          { id: '10000', name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
          { id: '10001', name: 'Relates', inward: 'relates to', outward: 'relates to' },
        ],
      };
      (IssueLinkTypeService.getIssueLinkTypes as jest.Mock).mockResolvedValue(mockLinkTypes);

      const result = await jiraService.getIssueLinkTypes();

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockLinkTypes);
      expect(IssueLinkTypeService.getIssueLinkTypes).toHaveBeenCalledWith();
    });

    it('should handle errors when issue linking is disabled', async () => {
      (IssueLinkTypeService.getIssueLinkTypes as jest.Mock).mockRejectedValue(new Error('Issue linking is disabled'));

      const result = await jiraService.getIssueLinkTypes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue linking is disabled');
    });
  });

  describe('linkIssues', () => {
    it('should create a link between two issues', async () => {
      (IssueLinkService.linkIssues as jest.Mock).mockResolvedValue(undefined);

      // POST maps keys 1:1 onto inwardIssue/outwardIssue. Do not swap here;
      // Jira UI labels are documented on the jira_linkIssues tool schema.
      const result = await jiraService.linkIssues({
        inwardIssueKey: 'PROJ-123',
        outwardIssueKey: 'PROJ-456',
        linkType: 'Blocks',
      });

      expect(result.success).toBe(true);
      expect(IssueLinkService.linkIssues).toHaveBeenCalledWith({
        type: { name: 'Blocks' },
        inwardIssue: { key: 'PROJ-123' },
        outwardIssue: { key: 'PROJ-456' },
      });
    });

    it('should include an optional comment on the inward issue', async () => {
      (IssueLinkService.linkIssues as jest.Mock).mockResolvedValue(undefined);

      const result = await jiraService.linkIssues({
        inwardIssueKey: 'PROJ-123',
        outwardIssueKey: 'PROJ-456',
        linkType: 'Relates',
        comment: 'Linking these for tracking',
      });

      expect(result.success).toBe(true);
      expect(IssueLinkService.linkIssues).toHaveBeenCalledWith({
        type: { name: 'Relates' },
        inwardIssue: { key: 'PROJ-123' },
        outwardIssue: { key: 'PROJ-456' },
        comment: { body: 'Linking these for tracking' },
      });
    });

    it('should handle API errors gracefully', async () => {
      (IssueLinkService.linkIssues as jest.Mock).mockRejectedValue(new Error('Issue link type not found'));

      const result = await jiraService.linkIssues({
        inwardIssueKey: 'PROJ-123',
        outwardIssueKey: 'PROJ-456',
        linkType: 'Nonexistent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue link type not found');
    });
  });

  describe('unlinkIssues', () => {
    it('should delete an issue link by id', async () => {
      (IssueLinkService.deleteIssueLink as jest.Mock).mockResolvedValue(undefined);

      const result = await jiraService.unlinkIssues('10500');

      expect(result.success).toBe(true);
      expect(IssueLinkService.deleteIssueLink).toHaveBeenCalledWith('10500');
    });

    it('should handle errors when the link id is invalid', async () => {
      (IssueLinkService.deleteIssueLink as jest.Mock).mockRejectedValue(new Error('Invalid issue link id'));

      const result = await jiraService.unlinkIssues('bad-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid issue link id');
    });
  });

  describe('watchIssue', () => {
    it('should add the calling user as a watcher', async () => {
      (IssueService.addWatcher1 as jest.Mock).mockResolvedValue(undefined);

      const result = await jiraService.watchIssue(mockIssueKey);

      expect(result.success).toBe(true);
      // No userName is passed — the API defaults to the authenticated caller.
      expect(IssueService.addWatcher1).toHaveBeenCalledWith(mockIssueKey);
    });

    it('should handle API errors gracefully', async () => {
      (IssueService.addWatcher1 as jest.Mock).mockRejectedValue(new Error('Issue does not exist'));

      const result = await jiraService.watchIssue(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue does not exist');
    });
  });

  describe('unwatchIssue', () => {
    it('should remove the calling user as a watcher', async () => {
      (MyselfService.getUser as jest.Mock).mockResolvedValue({ name: 'jdoe' });
      (IssueService.removeWatcher1 as jest.Mock).mockResolvedValue(undefined);

      const result = await jiraService.unwatchIssue(mockIssueKey);

      expect(result.success).toBe(true);
      expect(IssueService.removeWatcher1).toHaveBeenCalledWith(mockIssueKey, 'jdoe');
    });

    it('should fail if the current user name cannot be resolved', async () => {
      (MyselfService.getUser as jest.Mock).mockResolvedValue({});

      const result = await jiraService.unwatchIssue(mockIssueKey);

      expect(result.success).toBe(false);
      expect(IssueService.removeWatcher1).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (MyselfService.getUser as jest.Mock).mockResolvedValue({ name: 'jdoe' });
      (IssueService.removeWatcher1 as jest.Mock).mockRejectedValue(new Error('Issue does not exist'));

      const result = await jiraService.unwatchIssue(mockIssueKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue does not exist');
    });
  });
});
