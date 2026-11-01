import { registerPullRequestCommentsTool } from '../register-pr-comments-tool.js';

describe('pull request comments tool', () => {
  it.each([true, false, undefined])('forwards includeResolved=%s to the service', async (includeResolved) => {
    const server = { registerTool: jest.fn() };
    const service = {
      getPullRequestCommentsAndActions: jest.fn().mockResolvedValue({ success: true, data: { values: [] } }),
    };
    registerPullRequestCommentsTool(server, service);
    const [name, { inputSchema }, handler] = server.registerTool.mock.calls[0];
    const args = inputSchema.parse({
      projectKey: 'TEST',
      repositorySlug: 'repo',
      pullRequestId: '123',
      start: 10,
      limit: 20,
      output: 'full',
      includeResolved,
    });

    const result = await handler(args);

    expect(name).toBe('bitbucket_getPR_CommentsAndAction');
    expect(service.getPullRequestCommentsAndActions).toHaveBeenCalledWith(
      'TEST', 'repo', '123', 10, 20, 'full', includeResolved,
    );
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true, data: { values: [] } });
  });
});
