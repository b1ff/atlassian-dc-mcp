import { z } from 'zod';
import { OpenAPI, ProjectService, PullRequestsService, RepositoryService } from './bitbucket-client/index.js';
import { request as __request } from './bitbucket-client/core/request.js';
import { handleApiOperation } from '@atlassian-dc-mcp/common';
import { simplifyBitbucketPRComments } from './pr-comment-mapper.js';
import { simplifyBitbucketPRChanges } from './pr-changes-mapper.js';

export class BitbucketService {
  constructor(host: string, token: string, fullBaseUrl?: string) {
    OpenAPI.BASE = fullBaseUrl ?? `https://${host}/rest`;
    OpenAPI.TOKEN = token;
    OpenAPI.VERSION = '1.0';
  }

  /**
   * Get commits for a repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param path Optional path to filter commits by
   * @param since Optional commit ID to retrieve commits after
   * @param until Optional commit ID to retrieve commits before
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with commits data
   */
  async getCommits(projectKey: string, repositorySlug: string, path?: string, since?: string, until?: string,
    limit: number = 25
  ) {
    return handleApiOperation(
      () => RepositoryService.getCommits(
        projectKey,
        repositorySlug,
        undefined, // avatarScheme
        path,
        undefined, // withCounts
        undefined, // followRenames
        until,
        undefined, // avatarSize
        since,
        undefined, // merges
        undefined, // ignoreMissing
        0, // start
        limit
      ),
      'Error fetching commits'
    );
  }

  /**
   * Get a list of projects
   * @param name Optional filter by project name
   * @param permission Optional filter by permission
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with projects data
   */
  async getProjects(name?: string, permission?: string, start?: number, limit: number = 25) {
    return handleApiOperation(
      () => ProjectService.getProjects(name, permission, start, limit),
      'Error fetching projects'
    );
  }

  /**
   * Get a specific project by key
   * @param projectKey The project key
   * @returns Promise with project data
   */
  async getProject(projectKey: string) {
    return handleApiOperation(
      () => ProjectService.getProject(projectKey),
      'Error fetching project'
    );
  }

  /**
   * Get repositories for a project
   * @param projectKey The project key
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with repositories data
   */
  async getRepositories(projectKey: string, start?: number, limit: number = 25) {
    return handleApiOperation(
      () => ProjectService.getRepositories(projectKey, start, limit),
      'Error fetching repositories'
    );
  }

  /**
   * Get a specific repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @returns Promise with repository data
   */
  async getRepository(projectKey: string, repositorySlug: string) {
    return handleApiOperation(
      () => ProjectService.getRepository(projectKey, repositorySlug),
      'Error fetching repository'
    );
  }

  async getPullRequestCommentsAndActions(projectKey: string, repositorySlug: string, pullRequestId: string, start?: number,
    limit: number = 25
  ) {
    const result = await handleApiOperation(
      () => PullRequestsService.getActivities(
        projectKey,
        pullRequestId,
        repositorySlug,
        undefined,
        undefined,
        start,
        limit
      ),
      'Error fetching pull request comments'
    );

    // Apply simplification if the API call was successful
    if (result.success && result.data) {
      const simplifiedData = simplifyBitbucketPRComments(result.data);
      return {
        success: true,
        data: simplifiedData
      };
    }

    return result;
  }

  /**
   * Get pull request changes
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param sinceId Optional since commit hash to stream changes for a RANGE arbitrary change scope
   * @param changeScope Optional scope: 'UNREVIEWED' for unreviewed changes, 'RANGE' for changes between commits, 'ALL' for all changes (default)
   * @param untilId Optional until commit hash to stream changes for a RANGE arbitrary change scope
   * @param withComments Optional flag to include comment counts (default: true)
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with PR changes data
   */
  async getPullRequestChanges(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    sinceId?: string,
    changeScope?: string,
    untilId?: string,
    withComments?: string,
    start?: number,
    limit: number = 25
  ) {
    const result = await handleApiOperation(
      () => PullRequestsService.streamChanges1(
        projectKey,
        pullRequestId,
        repositorySlug,
        sinceId,
        changeScope,
        untilId,
        withComments,
        start,
        limit
      ),
      'Error fetching pull request changes'
    );

    // Apply simplification if the API call was successful
    if (result.success && result.data) {
      const simplifiedData = simplifyBitbucketPRChanges(result.data);
      return {
        ...result,
        data: simplifiedData
      };
    }

    return result;
  }

  /**
   * Post a comment to a pull request
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param text The comment text
   * @param parentId Optional parent comment ID for replies
   * @param filePath Optional file path for file-specific comments
   * @param line Optional line number for line-specific comments
   * @param lineType Optional line type ('ADDED', 'REMOVED', 'CONTEXT') for line comments
   * @returns Promise with created comment data
   */
  async postPullRequestComment(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    text: string,
    parentId?: number,
    filePath?: string,
    line?: number,
    lineType?: 'ADDED' | 'REMOVED' | 'CONTEXT'
  ) {
    const comment: any = {
      text
    };

    // Add parent reference for replies
    if (parentId) {
      comment.parent = { id: parentId };
    }

    // Add anchor for file/line comments
    if (filePath) {
      comment.anchor = {
        path: filePath,
        diffType: 'EFFECTIVE'
      };

      // Add line-specific anchor properties
      if (line !== undefined && lineType) {
        comment.anchor.line = line;
        comment.anchor.lineType = lineType;
        comment.anchor.fileType = 'TO'; // Default to destination file
      }
    }

    return handleApiOperation(
      () => PullRequestsService.createComment2(
        projectKey,
        pullRequestId,
        repositorySlug,
        comment
      ),
      'Error posting pull request comment'
    );
  }


  /**
   * Get text diff for a specific file in a pull request
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param path The path to the file which should be diffed
   * @param contextLines Optional number of context lines to include around added/removed lines
   * @param sinceId Optional since commit hash to stream a diff between two arbitrary hashes
   * @param srcPath Optional previous path to the file, if the file has been copied, moved or renamed
   * @param diffType Optional type of diff being requested
   * @param untilId Optional until commit hash to stream a diff between two arbitrary hashes
   * @param whitespace Optional whitespace flag which can be set to 'ignore-all'
   * @returns Promise with text diff data
   */
  async getPullRequestDiff(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    path: string,
    contextLines?: string,
    sinceId?: string,
    srcPath?: string,
    diffType?: string,
    untilId?: string,
    whitespace?: string
  ) {
    return handleApiOperation(
      () => __request(OpenAPI, {
        method: 'GET',
        url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path}',
        path: {
          'path': path,
          'projectKey': projectKey,
          'pullRequestId': pullRequestId,
          'repositorySlug': repositorySlug,
        },
        query: {
          'contextLines': contextLines,
          'sinceId': sinceId,
          'srcPath': srcPath,
          'diffType': diffType,
          'untilId': untilId,
          'whitespace': whitespace,
        },
        headers: {
          'Accept': 'text/plain'
        },
        errors: {
          400: `If the request was malformed.`,
          401: `The currently authenticated user has insufficient permissions to view the repository or pull request.`,
          404: `The repository or pull request does not exist.`,
        },
      }),
      'Error fetching pull request diff'
    );
  }

  static validateConfig(): string[] {
    // Check for BITBUCKET_HOST or its alternative BITBUCKET_API_BASE_PATH
    const requiredEnvVars = ['BITBUCKET_API_TOKEN'] as const;
    const missingVars: string[] = requiredEnvVars.filter(varName => !process.env[varName]);

    // Special handling for BITBUCKET_HOST with BITBUCKET_API_BASE_PATH as an alternative
    if (!process.env.BITBUCKET_HOST && !process.env.BITBUCKET_API_BASE_PATH) {
      missingVars.push('BITBUCKET_HOST or BITBUCKET_API_BASE_PATH');
    }

    return missingVars;
  }
}

export const bitbucketToolSchemas = {
  getProjects: {
    name: z.string().optional().describe("Filter projects by name"),
    permission: z.string().optional().describe("Filter projects by permission"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().default(25).describe("Number of items to return")
  },
  getProject: {
    projectKey: z.string().describe("The project key")
  },
  getRepositories: {
    projectKey: z.string().describe("The project key"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().default(25).describe("Number of items to return")
  },
  getRepository: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug")
  },
  getCommits: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    path: z.string().optional().describe("Optional path to filter commits by"),
    since: z.string().optional().describe("The commit ID (exclusively) to retrieve commits after"),
    until: z.string().optional().describe("The commit ID (inclusively) to retrieve commits before"),
    limit: z.number().optional().default(25).describe("Number of items to return")
  },
  getPullRequestComments: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().default(25).describe("Number of items to return")
  },
  getPullRequestChanges: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    sinceId: z.string().optional().describe("The since commit hash to stream changes for a RANGE arbitrary change scope"),
    changeScope: z.string().optional().describe("UNREVIEWED for unreviewed changes, RANGE for changes between commits, ALL for all changes (default)"),
    untilId: z.string().optional().describe("The until commit hash to stream changes for a RANGE arbitrary change scope"),
    withComments: z.string().optional().describe("true to apply comment counts in the changes (default), false to stream changes without comment counts"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().default(25).describe("Number of items to return")
  },
  postPullRequestComment: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    text: z.string().describe("The comment text"),
    parentId: z.number().optional().describe("Parent comment ID for replies"),
    filePath: z.string().optional().describe("File path for file-specific comments"),
    line: z.number().optional().describe("Line number for line-specific comments"),
    lineType: z.enum(['ADDED', 'REMOVED', 'CONTEXT']).optional().describe("Line type for line comments")
  },
  getPullRequestDiff: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    path: z.string().describe("The path to the file which should be diffed. Note: Before getting diff, use getPullRequestChanges to understand what files were changed in the PR"),
    contextLines: z.string().optional().describe("Number of context lines to include around added/removed lines in the diff"),
    sinceId: z.string().optional().describe("The since commit hash to stream a diff between two arbitrary hashes"),
    srcPath: z.string().optional().describe("The previous path to the file, if the file has been copied, moved or renamed"),
    diffType: z.string().optional().describe("The type of diff being requested"),
    untilId: z.string().optional().describe("The until commit hash to stream a diff between two arbitrary hashes"),
    whitespace: z.string().optional().describe("Optional whitespace flag which can be set to 'ignore-all'")
  }
};
