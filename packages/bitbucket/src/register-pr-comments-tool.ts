import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { formatToolResponse, readOnlyToolAnnotations } from '@atlassian-dc-mcp/common';
import { BitbucketService, bitbucketToolSchemas } from './bitbucket-service.js';

export function registerPullRequestCommentsTool(
  server: Pick<McpServer, 'registerTool'>,
  service: Pick<BitbucketService, 'getPullRequestCommentsAndActions'>,
): void {
  server.registerTool(
    'bitbucket_getPR_CommentsAndAction',
    {
      description: 'Get comments for a Bitbucket pull request and other actions, like approvals',
      inputSchema: z.object(bitbucketToolSchemas.getPullRequestComments),
      annotations: readOnlyToolAnnotations,
    },
    async ({ projectKey, repositorySlug, pullRequestId, start, limit, output, includeResolved }) => {
      const result = await service.getPullRequestCommentsAndActions(
        projectKey, repositorySlug, pullRequestId, start, limit, output, includeResolved,
      );
      return formatToolResponse(result);
    },
  );
}
