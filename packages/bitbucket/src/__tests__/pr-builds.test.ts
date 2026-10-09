import { DeprecatedService, PullRequestsService } from '../bitbucket-client/index.js';
import { fetchPullRequestBuilds } from '../pr-builds.js';

jest.mock('../bitbucket-client/index.js', () => ({
  PullRequestsService: {
    get3: jest.fn(),
  },
  DeprecatedService: {
    getBuildStatus: jest.fn(),
  },
  OpenAPI: { BASE: '', TOKEN: '', VERSION: '' },
}));

const getPullRequest = PullRequestsService.get3 as jest.Mock;
const getBuildStatus = DeprecatedService.getBuildStatus as jest.Mock;

const HEAD = '0780e1428c06abf1c96ab9cb995d129255511c93';
const OPEN_PR = { id: 42, fromRef: { id: 'refs/heads/feature', latestCommit: HEAD } };

const BUILD = {
  key: 'a1',
  name: 'Builds » demo » PR-42 #1',
  state: 'SUCCESSFUL',
  url: 'https://ci.example.com/job/demo/job/PR-42/1/',
  description: 'This commit looks good.',
  dateAdded: 1791464936354,
};
const E2E = { ...BUILD, key: 'b2', name: 'E2E » demo » PR-42 #1', state: 'FAILED' };
const REVIEW = { ...BUILD, key: 'c3', name: 'AI Code Review » demo » PR-42 #1', state: 'INPROGRESS' };

describe('fetchPullRequestBuilds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists the build statuses of the latest source commit with per-state counts', async () => {
    getPullRequest.mockResolvedValue(OPEN_PR);
    getBuildStatus.mockResolvedValue({ size: 3, isLastPage: true, values: [BUILD, E2E, REVIEW] });

    const result = await fetchPullRequestBuilds('PROJ', 'demo', '42');

    expect(getPullRequest).toHaveBeenCalledWith('PROJ', '42', 'demo');
    expect(getBuildStatus).toHaveBeenCalledWith(HEAD, 'NEWEST', 0, 100);
    expect(result).toEqual({
      success: true,
      data: {
        commitId: HEAD,
        counts: { successful: 1, failed: 1, inProgress: 1, cancelled: 0, unknown: 0 },
        builds: [BUILD, E2E, REVIEW],
      },
    });
  });

  it('counts a build without a recognised state as unknown', async () => {
    getPullRequest.mockResolvedValue(OPEN_PR);
    getBuildStatus.mockResolvedValue({ values: [{ key: 'x' }, { key: 'y', state: 'QUEUED' }] });

    const result = await fetchPullRequestBuilds('PROJ', 'demo', '42');

    expect(result.data?.counts).toEqual({ successful: 0, failed: 0, inProgress: 0, cancelled: 0, unknown: 2 });
  });

  it('returns empty builds when no CI has reported on the commit', async () => {
    getPullRequest.mockResolvedValue(OPEN_PR);
    getBuildStatus.mockResolvedValue({ size: 0, isLastPage: true, values: [] });

    const result = await fetchPullRequestBuilds('PROJ', 'demo', '42');

    expect(result.data).toEqual({
      commitId: HEAD,
      counts: { successful: 0, failed: 0, inProgress: 0, cancelled: 0, unknown: 0 },
      builds: [],
    });
  });

  it('fails without querying builds when the pull request has no source commit', async () => {
    getPullRequest.mockResolvedValue({ id: 42, fromRef: { id: 'refs/heads/feature' } });

    const result = await fetchPullRequestBuilds('PROJ', 'demo', '42');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Pull request 42 has no source commit');
    expect(getBuildStatus).not.toHaveBeenCalled();
  });

  it('reports an API error with the status line', async () => {
    getPullRequest.mockRejectedValue({ status: 404, statusText: 'Not Found', body: { errors: [] } });

    const result = await fetchPullRequestBuilds('PROJ', 'demo', '42');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error fetching pull request builds: 404 Not Found');
    expect(getBuildStatus).not.toHaveBeenCalled();
  });
});
