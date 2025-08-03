import { z } from 'zod';
import { OpenAPI, ProjectService, PullRequestsService, RepositoryService } from './bitbucket-client/index.js';
import { handleApiOperation } from '@atlassian-dc-mcp/common';
import { simplifyBitbucketPRComments } from './pr-comment-mapper.js';

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
  }
};
