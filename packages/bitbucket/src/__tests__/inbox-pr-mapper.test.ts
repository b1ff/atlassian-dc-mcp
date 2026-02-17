import { simplifyInboxPullRequests, SimplifiedInboxPRResponse } from '../inbox-pr-mapper.js';

describe('simplifyInboxPullRequests', () => {
  const makePR = (overrides: Record<string, unknown> = {}) => ({
    id: 101,
    version: 0,
    title: 'feat: Add user authentication module',
    description: 'Implements OAuth2 login flow',
    state: 'OPEN',
    open: true,
    closed: false,
    draft: false,
    createdDate: 1700000000000,
    updatedDate: 1700001000000,
    locked: false,
    author: {
      user: {
        name: 'jsmith',
        emailAddress: 'jsmith@example.com',
        active: true,
        displayName: 'John Smith',
        id: 1001,
        slug: 'jsmith',
        type: 'NORMAL',
        links: { self: [{ href: 'https://bitbucket.example.com/users/jsmith' }] },
      },
      role: 'AUTHOR',
      approved: false,
      status: 'UNAPPROVED',
    },
    fromRef: {
      id: 'refs/heads/feat/user-auth',
      displayId: 'feat/user-auth',
      latestCommit: 'abc123def456abc123def456abc123def456abc1',
      type: 'BRANCH',
      repository: {
        slug: 'myproject-api',
        id: 100,
        name: 'myproject-api',
        hierarchyId: 'aabb11cc22dd33',
        scmId: 'git',
        state: 'AVAILABLE',
        statusMessage: 'Available',
        forkable: true,
        project: {
          key: 'PROJ',
          id: 10,
          name: 'Project Alpha',
          public: false,
          type: 'NORMAL',
          links: { self: [{ href: 'https://bitbucket.example.com/projects/PROJ' }] },
        },
        public: false,
        archived: false,
        links: {
          clone: [
            { href: 'ssh://git@bitbucket.example.com/proj/myproject-api.git', name: 'ssh' },
            { href: 'https://bitbucket.example.com/scm/proj/myproject-api.git', name: 'http' },
          ],
          self: [{ href: 'https://bitbucket.example.com/projects/PROJ/repos/myproject-api/browse' }],
        },
      },
    },
    toRef: {
      id: 'refs/heads/main',
      displayId: 'main',
      latestCommit: 'def456abc123def456abc123def456abc123def4',
      type: 'BRANCH',
      repository: {
        slug: 'myproject-api',
        id: 100,
        name: 'myproject-api',
        project: { key: 'PROJ', id: 10, name: 'Project Alpha' },
      },
    },
    reviewers: [
      {
        user: { name: 'adoe', displayName: 'Alice Doe', emailAddress: 'adoe@example.com', id: 1002 },
        role: 'REVIEWER',
        approved: false,
        status: 'UNAPPROVED',
      },
      {
        user: { name: 'bjones', displayName: 'Bob Jones', emailAddress: 'bjones@example.com', id: 1003 },
        lastReviewedCommit: 'abc123def456abc123def456abc123def456abc1',
        role: 'REVIEWER',
        approved: true,
        status: 'APPROVED',
      },
      {
        user: { name: 'clee', displayName: 'Carol Lee', emailAddress: 'clee@example.com', id: 1004 },
        role: 'REVIEWER',
        approved: false,
        status: 'UNAPPROVED',
      },
    ],
    participants: [],
    properties: {
      mergeResult: { outcome: 'CLEAN', current: true },
      resolvedTaskCount: 0,
      commentCount: 3,
      openTaskCount: 1,
    },
    links: {
      self: [{ href: 'https://bitbucket.example.com/projects/PROJ/repos/myproject-api/pull-requests/101' }],
    },
    ...overrides,
  });

  const makeResponse = (prs: unknown[] = [makePR()], overrides: Record<string, unknown> = {}) => ({
    values: prs,
    size: prs.length,
    isLastPage: true,
    start: 0,
    limit: 25,
    ...overrides,
  });

  it('should simplify a valid inbox response with real API structure', () => {
    const response = makeResponse();
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests).toHaveLength(1);
    expect(result.pullRequests[0]).toEqual({
      id: 101,
      title: 'feat: Add user authentication module',
      description: 'Implements OAuth2 login flow',
      state: 'OPEN',
      draft: false,
      createdDate: 1700000000000,
      updatedDate: 1700001000000,
      link: 'https://bitbucket.example.com/projects/PROJ/repos/myproject-api/pull-requests/101',
      author: { name: 'jsmith', displayName: 'John Smith' },
      fromRef: 'feat/user-auth',
      toRef: 'main',
      repository: { slug: 'myproject-api', projectKey: 'PROJ' },
      reviewers: [
        { name: 'adoe', approved: false, status: 'UNAPPROVED' },
        { name: 'bjones', approved: true, status: 'APPROVED' },
        { name: 'clee', approved: false, status: 'UNAPPROVED' },
      ],
      commentCount: 3,
      openTaskCount: 1,
    });
    expect(result.summary).toEqual({
      totalCount: 1,
      byRepository: { 'PROJ/myproject-api': 1 },
    });
    expect(result.isLastPage).toBe(true);
  });

  it('should extract the PR link from links.self[0].href', () => {
    const response = makeResponse();
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].link).toBe(
      'https://bitbucket.example.com/projects/PROJ/repos/myproject-api/pull-requests/101'
    );
  });

  it('should omit link when links.self is not present', () => {
    const pr = makePR({ links: undefined });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].link).toBeUndefined();
  });

  it('should include commentCount and openTaskCount from properties', () => {
    const pr = makePR({
      properties: { commentCount: 5, openTaskCount: 2, resolvedTaskCount: 1 },
    });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].commentCount).toBe(5);
    expect(result.pullRequests[0].openTaskCount).toBe(2);
  });

  it('should default commentCount and openTaskCount to 0 when properties missing', () => {
    const pr = makePR({ properties: undefined });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].commentCount).toBe(0);
    expect(result.pullRequests[0].openTaskCount).toBe(0);
  });

  it('should include description when present', () => {
    const response = makeResponse();
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].description).toBe('Implements OAuth2 login flow');
  });

  it('should omit description when not present', () => {
    const pr = makePR({ description: undefined });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].description).toBeUndefined();
  });

  it('should include draft status', () => {
    const pr = makePR({ draft: true });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].draft).toBe(true);
  });

  it('should default draft to false when not present', () => {
    const pr = makePR({ draft: undefined });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].draft).toBe(false);
  });

  it('should handle multiple PRs from different repositories', () => {
    const pr1 = makePR();
    const pr2 = makePR({
      id: 200,
      title: 'fix: Resolve cache invalidation bug',
      fromRef: {
        id: 'refs/heads/fix/cache-bug',
        displayId: 'fix/cache-bug',
        repository: { slug: 'frontend-app', project: { key: 'WEB' } },
      },
      toRef: {
        id: 'refs/heads/main',
        displayId: 'main',
        repository: { slug: 'frontend-app', project: { key: 'WEB' } },
      },
      links: {
        self: [{ href: 'https://bitbucket.example.com/projects/WEB/repos/frontend-app/pull-requests/200' }],
      },
    });
    const pr3 = makePR({ id: 102, title: 'chore: Update dependencies' });

    const response = makeResponse([pr1, pr2, pr3]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests).toHaveLength(3);
    expect(result.summary.totalCount).toBe(3);
    expect(result.summary.byRepository).toEqual({
      'PROJ/myproject-api': 2,
      'WEB/frontend-app': 1,
    });
  });

  it('should handle empty values array', () => {
    const response = makeResponse([]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests).toHaveLength(0);
    expect(result.summary.totalCount).toBe(0);
    expect(result.summary.byRepository).toEqual({});
    expect(result.isLastPage).toBe(true);
  });

  it('should include nextPageStart when not the last page', () => {
    const response = makeResponse([makePR()], {
      isLastPage: false,
      nextPageStart: 25,
    });
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.isLastPage).toBe(false);
    expect(result.nextPageStart).toBe(25);
  });

  it('should not include nextPageStart when it is the last page', () => {
    const response = makeResponse([makePR()]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.isLastPage).toBe(true);
    expect(result.nextPageStart).toBeUndefined();
  });

  it('should handle PR without author', () => {
    const pr = makePR({ author: undefined });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].author).toBeUndefined();
  });

  it('should handle PR without reviewers', () => {
    const pr = makePR({ reviewers: undefined });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].reviewers).toEqual([]);
  });

  it('should return original response for invalid input', () => {
    const invalidResponse = { foo: 'bar' };
    const result = simplifyInboxPullRequests(invalidResponse);

    expect(result).toBe(invalidResponse);
  });

  it('should return original response for null input', () => {
    const result = simplifyInboxPullRequests(null);
    expect(result).toBeNull();
  });

  it('should return original response when values contain no valid PRs', () => {
    const response = makeResponse([{ invalid: true }, { alsoInvalid: true }]);
    const result = simplifyInboxPullRequests(response);

    expect(result).toBe(response);
  });

  it('should use ref id as fallback when displayId is missing', () => {
    const pr = makePR({
      fromRef: {
        id: 'refs/heads/feat/user-auth',
        repository: { slug: 'myproject-api', project: { key: 'PROJ' } },
      },
      toRef: {
        id: 'refs/heads/main',
        repository: { slug: 'myproject-api', project: { key: 'PROJ' } },
      },
    });
    const response = makeResponse([pr]);
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;

    expect(result.pullRequests[0].fromRef).toBe('refs/heads/feat/user-auth');
    expect(result.pullRequests[0].toRef).toBe('refs/heads/main');
  });

  it('should strip extra fields from the real API response', () => {
    const response = makeResponse();
    const result = simplifyInboxPullRequests(response) as SimplifiedInboxPRResponse;
    const pr = result.pullRequests[0];

    expect(pr).not.toHaveProperty('version');
    expect(pr).not.toHaveProperty('open');
    expect(pr).not.toHaveProperty('closed');
    expect(pr).not.toHaveProperty('locked');
    expect(pr).not.toHaveProperty('participants');
    expect(pr).not.toHaveProperty('properties');
    expect(pr).not.toHaveProperty('links');
  });
});
