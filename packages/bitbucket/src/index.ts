import { connectServer, createMcpServer, formatToolResponse } from '@atlassian-dc-mcp/common';
import dotenv from 'dotenv';
import { BitbucketService, bitbucketToolSchemas } from './bitbucket-service.js';

// Load environment variables
dotenv.config();

const missingVars = BitbucketService.validateConfig();
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const bitbucketService = new BitbucketService(
  process.env.BITBUCKET_HOST!,
  process.env.BITBUCKET_API_TOKEN!,
  process.env.BITBUCKET_API_BASE_PATH,
);

const server = createMcpServer({
  name: "atlassian-bitbucket-mcp",
  version: "0.1.0"
});

server.tool(
  "bitbucket_getProjects",
  "Get a list of Bitbucket projects",
  bitbucketToolSchemas.getProjects,
  async ({ name, permission, start, limit }) => {
    const result = await bitbucketService.getProjects(name, permission, start, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getProject",
  "Get a specific Bitbucket project by key",
  bitbucketToolSchemas.getProject,
  async ({ projectKey }) => {
    const result = await bitbucketService.getProject(projectKey);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getRepositories",
  "Get repositories for a Bitbucket project",
  bitbucketToolSchemas.getRepositories,
  async ({ projectKey, start, limit }) => {
    const result = await bitbucketService.getRepositories(projectKey, start, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getRepository",
  "Get a specific Bitbucket repository",
  bitbucketToolSchemas.getRepository,
  async ({ projectKey, repositorySlug }) => {
    const result = await bitbucketService.getRepository(projectKey, repositorySlug);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getCommits",
  "Get commits for a Bitbucket repository",
  bitbucketToolSchemas.getCommits,
  async ({ projectKey, repositorySlug, path, since, until, limit }) => {
    const result = await bitbucketService.getCommits(projectKey, repositorySlug, path, since, until, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getPR_CommentsAndAction",
  "Get comments for a Bitbucket pull request and other actions, like approvals",
  bitbucketToolSchemas.getPullRequestComments,
  async ({ projectKey, repositorySlug, pullRequestId, start, limit }) => {
    const result = await bitbucketService.getPullRequestCommentsAndActions(projectKey, repositorySlug, pullRequestId, start, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getPullRequestChanges",
  "Get the changes for a Bitbucket pull request",
  bitbucketToolSchemas.getPullRequestChanges,
  async ({ projectKey, repositorySlug, pullRequestId, sinceId, changeScope, untilId, withComments, start, limit }) => {
    const result = await bitbucketService.getPullRequestChanges(projectKey, repositorySlug, pullRequestId, sinceId, changeScope, untilId, withComments, start, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_postPullRequestComment",
  "Post a comment to a Bitbucket pull request",
  bitbucketToolSchemas.postPullRequestComment,
  async ({ projectKey, repositorySlug, pullRequestId, text, parentId, filePath, line, lineType }) => {
    const result = await bitbucketService.postPullRequestComment(projectKey, repositorySlug, pullRequestId, text, parentId, filePath, line, lineType);
    return formatToolResponse(result);
  }
);

await connectServer(server);
