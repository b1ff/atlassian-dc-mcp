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
  "bitbucket_getPullRequests",
  "Get pull requests for a Bitbucket repository",
  bitbucketToolSchemas.getPullRequests,
  async ({ projectKey, repositorySlug, withAttributes, at, withProperties, draft, filterText, state, order, direction, start, limit }) => {
    const result = await bitbucketService.getPullRequests(projectKey, repositorySlug, withAttributes, at, withProperties, draft, filterText, state, order, direction, start, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getPullRequest",
  "Get a specific pull request by ID. Returns full details including title, description, reviewers, participants, author, source/target branches, and current state.",
  bitbucketToolSchemas.getPullRequest,
  async ({ projectKey, repositorySlug, pullRequestId }) => {
    const result = await bitbucketService.getPullRequest(projectKey, repositorySlug, pullRequestId);
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


server.tool(
  "bitbucket_getPullRequestDiff",
  "Get text diff for a specific file in a Bitbucket pull request. Returns plain text diff format. Note: Before getting diff, use getPullRequestChanges to understand what files were changed in the PR",
  bitbucketToolSchemas.getPullRequestDiff,
  async ({ projectKey, repositorySlug, pullRequestId, path, contextLines, sinceId, srcPath, diffType, untilId, whitespace }) => {
    const result = await bitbucketService.getPullRequestDiff(projectKey, repositorySlug, pullRequestId, path, contextLines, sinceId, srcPath, diffType, untilId, whitespace);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_createPullRequest",
  "Create a new pull request in a Bitbucket repository. IMPORTANT: Before creating a PR, use bitbucket_getRequiredReviewers to fetch required reviewers for the source and target branches to ensure the PR is not created without mandatory reviewers.",
  bitbucketToolSchemas.createPullRequest,
  async ({ projectKey, repositorySlug, title, description, fromRefId, toRefId, reviewers }) => {
    const result = await bitbucketService.createPullRequest(projectKey, repositorySlug, title, description, fromRefId, toRefId, reviewers);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_updatePullRequest",
  "Update the title, description, reviewers, destination branch or draft status of an existing pull request. IMPORTANT: The reviewers parameter replaces ALL existing reviewers. If you want to preserve existing reviewers, first fetch the current PR details (using bitbucket_getPullRequests filtered by ID) and include those reviewers along with any new ones you want to add.",
  bitbucketToolSchemas.updatePullRequest,
  async ({ projectKey, repositorySlug, pullRequestId, version, title, description, reviewers }) => {
    const result = await bitbucketService.updatePullRequest(projectKey, repositorySlug, pullRequestId, version, title, description, reviewers);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getRequiredReviewers",
  "Get required reviewers for pull request creation. Returns a set of users who are required reviewers for pull requests created from the given source repository and ref to the given target ref in this repository.",
  bitbucketToolSchemas.getRequiredReviewers,
  async ({ projectKey, repositorySlug, sourceRefId, targetRefId, sourceRepoId, targetRepoId }) => {
    const result = await bitbucketService.getRequiredReviewers(projectKey, repositorySlug, sourceRefId, targetRefId, sourceRepoId, targetRepoId);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getInboxPullRequests",
  "Get pull requests from the authenticated user's inbox that need their review. Returns PRs across all repositories where the user is a reviewer.",
  bitbucketToolSchemas.getInboxPullRequests,
  async ({ start, limit }) => {
    const result = await bitbucketService.getInboxPullRequests(start, limit);
    return formatToolResponse(result);
  }
);

await connectServer(server);
