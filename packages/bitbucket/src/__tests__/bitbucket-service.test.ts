import { BitbucketService } from '../bitbucket-service.js';
import { PullRequestsService } from '../bitbucket-client/index.js';

// Mock the request function
jest.mock('../bitbucket-client/core/request.js', () => ({
  request: jest.fn()
}));

// Mock the PullRequestsService
jest.mock('../bitbucket-client/index.js', () => ({
  PullRequestsService: {
    streamRawDiff2: jest.fn(),
    createComment2: jest.fn(),
    streamChanges1: jest.fn()
  },
  OpenAPI: {
    BASE: '',
    TOKEN: '',
    VERSION: ''
  }
}));

describe('BitbucketService', () => {
  let bitbucketService: BitbucketService;
  const mockProjectKey = 'TEST';
  const mockRepositorySlug = 'test-repo';
  const mockPullRequestId = '123';

  beforeEach(() => {
    bitbucketService = new BitbucketService('test-host', 'test-token');
    jest.clearAllMocks();
  });

  describe('getPullRequestChanges', () => {
    it('should successfully get PR changes', async () => {
      const mockChangesData = {
        values: [
          { path: { toString: 'file.txt' }, type: 'MODIFY' }
        ],
        size: 1,
        isLastPage: true
      };
      (PullRequestsService.streamChanges1 as jest.Mock).mockResolvedValue(mockChangesData);

      const result = await bitbucketService.getPullRequestChanges(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockChangesData);
      expect(PullRequestsService.streamChanges1).toHaveBeenCalledWith(
        mockProjectKey,
        mockPullRequestId,
        mockRepositorySlug,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        25
      );
    });

    it('should successfully get PR changes with all parameters', async () => {
      const mockChangesData = {
        values: [
          { path: { toString: 'file.txt' }, type: 'MODIFY' }
        ],
        size: 1,
        isLastPage: true
      };
      (PullRequestsService.streamChanges1 as jest.Mock).mockResolvedValue(mockChangesData);

      const result = await bitbucketService.getPullRequestChanges(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'abc123',
        'RANGE',
        'def456',
        'true',
        0,
        50
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockChangesData);
      expect(PullRequestsService.streamChanges1).toHaveBeenCalledWith(
        mockProjectKey,
        mockPullRequestId,
        mockRepositorySlug,
        'abc123',
        'RANGE',
        'def456',
        'true',
        0,
        50
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      (PullRequestsService.streamChanges1 as jest.Mock).mockRejectedValue(mockError);

      const result = await bitbucketService.getPullRequestChanges(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('postPullRequestComment', () => {
    it('should successfully post a general PR comment', async () => {
      const mockComment = {
        id: 12345,
        text: 'Test comment',
        author: { displayName: 'Test User' }
      };
      (PullRequestsService.createComment2 as jest.Mock).mockResolvedValue(mockComment);

      const result = await bitbucketService.postPullRequestComment(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'Test comment'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockComment);
      expect(PullRequestsService.createComment2).toHaveBeenCalledWith(
        mockProjectKey,
        mockPullRequestId,
        mockRepositorySlug,
        { text: 'Test comment' }
      );
    });

    it('should successfully post a reply comment', async () => {
      const mockComment = {
        id: 12346,
        text: 'Reply comment',
        author: { displayName: 'Test User' }
      };
      (PullRequestsService.createComment2 as jest.Mock).mockResolvedValue(mockComment);

      const result = await bitbucketService.postPullRequestComment(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'Reply comment',
        123 // parentId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockComment);
      expect(PullRequestsService.createComment2).toHaveBeenCalledWith(
        mockProjectKey,
        mockPullRequestId,
        mockRepositorySlug,
        {
          text: 'Reply comment',
          parent: { id: 123 }
        }
      );
    });

    it('should successfully post a file comment', async () => {
      const mockComment = {
        id: 12347,
        text: 'File comment',
        author: { displayName: 'Test User' }
      };
      (PullRequestsService.createComment2 as jest.Mock).mockResolvedValue(mockComment);

      const result = await bitbucketService.postPullRequestComment(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'File comment',
        undefined, // parentId
        'src/test.js' // filePath
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockComment);
      expect(PullRequestsService.createComment2).toHaveBeenCalledWith(
        mockProjectKey,
        mockPullRequestId,
        mockRepositorySlug,
        {
          text: 'File comment',
          anchor: {
            path: 'src/test.js',
            diffType: 'EFFECTIVE'
          }
        }
      );
    });

    it('should successfully post a line comment', async () => {
      const mockComment = {
        id: 12348,
        text: 'Line comment',
        author: { displayName: 'Test User' }
      };
      (PullRequestsService.createComment2 as jest.Mock).mockResolvedValue(mockComment);

      const result = await bitbucketService.postPullRequestComment(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'Line comment',
        undefined, // parentId
        'src/test.js', // filePath
        42, // line
        'ADDED' // lineType
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockComment);
      expect(PullRequestsService.createComment2).toHaveBeenCalledWith(
        mockProjectKey,
        mockPullRequestId,
        mockRepositorySlug,
        {
          text: 'Line comment',
          anchor: {
            path: 'src/test.js',
            diffType: 'EFFECTIVE',
            line: 42,
            lineType: 'ADDED',
            fileType: 'TO'
          }
        }
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      (PullRequestsService.createComment2 as jest.Mock).mockRejectedValue(mockError);

      const result = await bitbucketService.postPullRequestComment(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'Test comment'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('getPullRequestDiff', () => {
    const { request: mockRequest } = require('../bitbucket-client/core/request.js');

    it('should successfully get raw diff with minimal parameters', async () => {
      const mockRawDiff = 'diff --git a/file.txt b/file.txt\nindex 1234567..abcdefg 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,4 @@\n line1\n line2\n+new line\n line3';
      mockRequest.mockResolvedValue(mockRawDiff);

      const result = await bitbucketService.getPullRequestDiff(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'src/file.txt'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockRawDiff);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(Object), // OpenAPI config
        {
          method: 'GET',
          url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path}',
          path: {
            'path': 'src/file.txt',
            'projectKey': mockProjectKey,
            'pullRequestId': mockPullRequestId,
            'repositorySlug': mockRepositorySlug,
          },
          query: {
            'contextLines': undefined,
            'sinceId': undefined,
            'srcPath': undefined,
            'diffType': undefined,
            'untilId': undefined,
            'whitespace': undefined,
          },
          headers: {
            'Accept': 'text/plain'
          },
          errors: {
            400: `If the request was malformed.`,
            401: `The currently authenticated user has insufficient permissions to view the repository or pull request.`,
            404: `The repository or pull request does not exist.`,
          },
        }
      );
    });

    it('should successfully get raw diff with all parameters', async () => {
      const mockRawDiff = 'diff --git a/old/file.txt b/new/file.txt\nindex 1234567..abcdefg 100644\n--- a/old/file.txt\n+++ b/new/file.txt\n@@ -1,5 +1,6 @@\n line1\n line2\n+new line\n line3\n line4\n line5';
      mockRequest.mockResolvedValue(mockRawDiff);

      const result = await bitbucketService.getPullRequestDiff(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'src/file.txt',
        '5', // contextLines
        'abc123', // sinceId
        'old/file.txt', // srcPath
        'EFFECTIVE', // diffType
        'def456', // untilId
        'ignore-all' // whitespace
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockRawDiff);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(Object), // OpenAPI config
        {
          method: 'GET',
          url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path}',
          path: {
            'path': 'src/file.txt',
            'projectKey': mockProjectKey,
            'pullRequestId': mockPullRequestId,
            'repositorySlug': mockRepositorySlug,
          },
          query: {
            'contextLines': '5',
            'sinceId': 'abc123',
            'srcPath': 'old/file.txt',
            'diffType': 'EFFECTIVE',
            'untilId': 'def456',
            'whitespace': 'ignore-all',
          },
          headers: {
            'Accept': 'text/plain'
          },
          errors: {
            400: `If the request was malformed.`,
            401: `The currently authenticated user has insufficient permissions to view the repository or pull request.`,
            404: `The repository or pull request does not exist.`,
          },
        }
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      mockRequest.mockRejectedValue(mockError);

      const result = await bitbucketService.getPullRequestDiff(
        mockProjectKey,
        mockRepositorySlug,
        mockPullRequestId,
        'src/file.txt'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('validateConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return empty array when all required env vars are present', () => {
      process.env.BITBUCKET_API_TOKEN = 'test-token';
      process.env.BITBUCKET_HOST = 'test-host';

      const missingVars = BitbucketService.validateConfig();
      expect(missingVars).toEqual([]);
    });

    it('should return missing vars when BITBUCKET_API_TOKEN is missing', () => {
      delete process.env.BITBUCKET_API_TOKEN;
      process.env.BITBUCKET_HOST = 'test-host';

      const missingVars = BitbucketService.validateConfig();
      expect(missingVars).toContain('BITBUCKET_API_TOKEN');
    });

    it('should return missing vars when both host options are missing', () => {
      process.env.BITBUCKET_API_TOKEN = 'test-token';
      delete process.env.BITBUCKET_HOST;
      delete process.env.BITBUCKET_API_BASE_PATH;

      const missingVars = BitbucketService.validateConfig();
      expect(missingVars).toContain('BITBUCKET_HOST or BITBUCKET_API_BASE_PATH');
    });

    it('should accept BITBUCKET_API_BASE_PATH as alternative to BITBUCKET_HOST', () => {
      process.env.BITBUCKET_API_TOKEN = 'test-token';
      delete process.env.BITBUCKET_HOST;
      process.env.BITBUCKET_API_BASE_PATH = 'https://test-host/rest';

      const missingVars = BitbucketService.validateConfig();
      expect(missingVars).toEqual([]);
    });
  });
});
