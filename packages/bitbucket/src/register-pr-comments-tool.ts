import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatToolResponse, readOnlyToolAnnotations } from '@atlassian-dc-mcp/common';
import { BitbucketService, bitbucketToolSchemas } from './bitbucket-service.js';

export function registerPullRequestCommentsTool(
  server: Pick<McpServer, 'tool'>,
  service: Pick<BitbucketService, 'getPullRequestCommentsAndActions'>,
): void {
  server.tool(
    'bitbucket_getPR_CommentsAndAction',
    'Get comments for a Bitbucket pull request and other actions, like approvals',
    bitbucketToolSchemas.getPullRequestComments,
    readOnlyToolAnnotations,
    async ({ projectKey, repositorySlug, pullRequestId, start, limit, output, includeResolved }) => {
      const result = await service.getPullRequestCommentsAndActions(
        projectKey, repositorySlug, pullRequestId, start, limit, output, includeResolved,
      );
      return formatToolResponse(result);
    },
  );
}
