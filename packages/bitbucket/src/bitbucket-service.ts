import { z } from 'zod';
import { OpenAPI, ProjectService, RepositoryService } from './bitbucket-client/index.js';
import { handleApiOperation } from '@atlassian-dc-mcp/common';

export class BitbucketService {
  constructor(host: string, token: string) {
    // Configure the OpenAPI client
    OpenAPI.BASE = `https://${host}/rest`;
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
  async getCommits(projectKey: string, repositorySlug: string, path?: string, since?: string, until?: string, limit: number = 25) {
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
   * Get repositories for a project
   * @param projectKey The project key
   * @param repositorySlug The short name of the repository
   * @param path The path to the file
   * @returns Promise with repositories data
   */
  async getFileContent(projectKey: string, repositorySlug: string, path: string) {
    return handleApiOperation(
      () => ProjectService.getFileContent(projectKey, repositorySlug, path),
      'Error fetching repositories'
    );
  }

  /**
   * Get repositories for a project
   * @param projectKey The project key
   * @param repositorySlug The short name of the repository
   * @param path The path to the file
   * @param limit pagination limit (default: 25)
   * @returns Promise with repositories data
   */
  async getFilesFromPath(projectKey: string, repositorySlug: string, path: string, limit: number = 25) {
    return handleApiOperation(
      () => ProjectService.getFilesFromPath(projectKey, repositorySlug, path, limit),
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

  static validateConfig(): string[] {
    const requiredEnvVars = ['BITBUCKET_HOST', 'BITBUCKET_API_TOKEN'] as const;
    return requiredEnvVars.filter(varName => !process.env[varName]);
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
  getFileContent: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    path: z.string().describe("The path to the file")
  },
  getFilesFromPath: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    path: z.string().describe("The path to the file"),
    limit: z.number().describe("Number of items to return")
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
  }
};
