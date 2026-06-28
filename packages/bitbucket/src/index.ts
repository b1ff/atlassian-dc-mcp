import { connectServer, createMcpServer, formatToolResponse, initializeRuntimeConfig } from '@atlassian-dc-mcp/common';
import { BitbucketService, bitbucketToolSchemas } from './bitbucket-service.js';
import { getBitbucketRuntimeConfig, getDefaultPageSize } from './config.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

initializeRuntimeConfig();

const missingVars = BitbucketService.validateConfig();
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const bitbucketConfig = getBitbucketRuntimeConfig();
const bitbucketService = new BitbucketService(
  bitbucketConfig.host,
  () => getBitbucketRuntimeConfig().token,
  bitbucketConfig.apiBasePath,
  getDefaultPageSize,
);

const server = createMcpServer({
  name: "atlassian-bitbucket-mcp",
  version
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
  "Get a specific pull request by ID. Returns full details including title, description, reviewers, participants, author, source/target branches, current state, and version (needed for bitbucket_updatePullRequest).",
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
  async ({ projectKey, repositorySlug, pullRequestId, start, limit, output }) => {
    const result = await bitbucketService.getPullRequestCommentsAndActions(projectKey, repositorySlug, pullRequestId, start, limit, output);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getPullRequestChanges",
  "Get the changes for a Bitbucket pull request",
  bitbucketToolSchemas.getPullRequestChanges,
  async ({ projectKey, repositorySlug, pullRequestId, sinceId, changeScope, untilId, withComments, start, limit, output }) => {
    const result = await bitbucketService.getPullRequestChanges(projectKey, repositorySlug, pullRequestId, sinceId, changeScope, untilId, withComments, start, limit, output);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getUser",
  "Get a Bitbucket user by their slug, or search for users by name/email to discover their slug. Use this to resolve userSlug for bitbucket_submitPullRequestReview when it is not already known from a comment response or PR participant list.",
  bitbucketToolSchemas.getUser,
  async ({ userSlug, filter }) => {
    const result = await bitbucketService.getUser(userSlug, filter);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_postPullRequestComment",
  "Post a comment to a Bitbucket pull request. Use pending: true to create a draft comment that is only visible to you until you call bitbucket_submitPullRequestReview. NOTE: pending only works when filePath is provided (file-level or inline comments). True top-level PR comments (no filePath) are always posted live and cannot be drafted. Use severity: 'BLOCKER' to post the comment as a task — tasks must be resolved before the PR can be merged.",
  bitbucketToolSchemas.postPullRequestComment,
  async ({ projectKey, repositorySlug, pullRequestId, text, parentId, filePath, startLine, startLineType, line, lineType, pending, severity, output }) => {
    const result = await bitbucketService.postPullRequestComment(projectKey, repositorySlug, pullRequestId, text, parentId, filePath, startLine, startLineType, line, lineType, pending, severity, output);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_updatePullRequestComment",
  "Update an existing pull request comment. Use to edit text, change severity, or change state. On a BLOCKER (task) comment, state: 'RESOLVED' ticks the task. NOTE: this is the task-tick, not the thread-level 'Resolve' button on regular comment threads — that is a separate concept (CommentThread.resolved) and is not exposed by this endpoint. Requires the current 'version' from optimistic locking; fetch it via bitbucket_getPR_CommentsAndAction or use the version returned when the comment was created.",
  bitbucketToolSchemas.updatePullRequestComment,
  async ({ projectKey, repositorySlug, pullRequestId, commentId, version, text, state, severity, output }) => {
    const result = await bitbucketService.updatePullRequestComment(projectKey, repositorySlug, pullRequestId, commentId, version, text, state, severity, output);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_submitPullRequestReview",
  "Submit a pull request review, publishing all pending (draft) comments and setting the reviewer's verdict. This is equivalent to clicking 'Submit Review' in the Bitbucket UI. Use after posting comments with pending: true. To resolve userSlug: (1) check author.slug in any comment you posted this session, (2) check the reviewers/participants array from bitbucket_getPullRequest, or (3) call bitbucket_getUser with a name/email filter as a last resort.",
  bitbucketToolSchemas.submitPullRequestReview,
  async ({ projectKey, repositorySlug, pullRequestId, userSlug, status, lastReviewedCommit }) => {
    const result = await bitbucketService.submitPullRequestReview(projectKey, repositorySlug, pullRequestId, userSlug, status, lastReviewedCommit);
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
  async ({ projectKey, repositorySlug, title, description, fromRefId, toRefId, reviewers, draft, output }) => {
    const result = await bitbucketService.createPullRequest(projectKey, repositorySlug, title, description, fromRefId, toRefId, reviewers, draft, output);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_updatePullRequest",
  "Update the title, description, reviewers, destination branch or draft status of an existing pull request. IMPORTANT: You MUST first call bitbucket_getPullRequest to get the current 'version' number — this is required for optimistic locking and the call will fail without it. The reviewers parameter replaces ALL existing reviewers. If you want to preserve existing reviewers, include those from the current PR details along with any new ones you want to add.",
  bitbucketToolSchemas.updatePullRequest,
  async ({ projectKey, repositorySlug, pullRequestId, version, title, description, reviewers, draft, output }) => {
    const result = await bitbucketService.updatePullRequest(projectKey, repositorySlug, pullRequestId, version, title, description, reviewers, draft, output);
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

server.tool(
  "bitbucket_getDashboardPullRequests",
  "Get pull requests from the Bitbucket dashboard across all repositories. Useful for finding all PRs where you are the author, reviewer, or participant without specifying a project or repository.",
  bitbucketToolSchemas.getDashboardPullRequests,
  async ({ role, state, closedSince, order, start, limit }) => {
    const result = await bitbucketService.getDashboardPullRequests(role, state, closedSince, order, start, limit);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getWebhooks",
  "List webhooks configured on a Bitbucket repository. Requires REPO_ADMIN permission. Optionally filter by event ID and include invocation statistics.",
  bitbucketToolSchemas.getWebhooks,
  async ({ projectKey, repositorySlug, event, statistics }) => {
    const result = await bitbucketService.getWebhooks(projectKey, repositorySlug, event, statistics);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_getWebhook",
  "Get a single Bitbucket repository webhook by its ID. Requires REPO_ADMIN permission.",
  bitbucketToolSchemas.getWebhook,
  async ({ projectKey, repositorySlug, webhookId, statistics }) => {
    const result = await bitbucketService.getWebhook(projectKey, repositorySlug, webhookId, statistics);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_createWebhook",
  "Create a webhook on a Bitbucket repository. Requires REPO_ADMIN permission. Provide the target URL and a list of event IDs to subscribe to (e.g. 'repo:refs_changed', 'pr:opened', 'pr:merged').",
  bitbucketToolSchemas.createWebhook,
  async ({ projectKey, repositorySlug, name, url, events, active, secret, sslVerificationRequired }) => {
    const result = await bitbucketService.createWebhook(projectKey, repositorySlug, name, url, events, active, secret, sslVerificationRequired);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_updateWebhook",
  "Update an existing Bitbucket repository webhook. Requires REPO_ADMIN permission. This replaces the webhook configuration, including its event set, so pass the full desired name/url/events.",
  bitbucketToolSchemas.updateWebhook,
  async ({ projectKey, repositorySlug, webhookId, name, url, events, active, secret, sslVerificationRequired }) => {
    const result = await bitbucketService.updateWebhook(projectKey, repositorySlug, webhookId, name, url, events, active, secret, sslVerificationRequired);
    return formatToolResponse(result);
  }
);

server.tool(
  "bitbucket_deleteWebhook",
  "Delete a webhook from a Bitbucket repository by its ID. Requires REPO_ADMIN permission.",
  bitbucketToolSchemas.deleteWebhook,
  async ({ projectKey, repositorySlug, webhookId }) => {
    const result = await bitbucketService.deleteWebhook(projectKey, repositorySlug, webhookId);
    return formatToolResponse(result);
  }
);

await connectServer(server);
