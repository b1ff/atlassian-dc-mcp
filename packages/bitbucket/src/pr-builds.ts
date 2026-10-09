import { handleApiOperation } from '@atlassian-dc-mcp/common';
import { DeprecatedService, PullRequestsService } from './bitbucket-client/index.js';

/** The commit build-status resource keeps only the 100 most recent statuses per commit. */
const MAX_BUILD_STATUSES = 100;

type BuildState = 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'CANCELLED' | 'UNKNOWN';

export interface BuildStatus {
  key?: string;
  name?: string;
  state?: BuildState;
  url?: string;
  description?: string;
  dateAdded?: number;
  duration?: number;
  buildNumber?: string;
  testResults?: { successful?: number; failed?: number; skipped?: number };
}

export interface BuildCounts {
  successful: number;
  failed: number;
  inProgress: number;
  cancelled: number;
  unknown: number;
}

export interface PullRequestBuilds {
  commitId: string;
  counts: BuildCounts;
  builds: BuildStatus[];
}

const COUNT_FIELD: Record<BuildState, keyof BuildCounts> = {
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  INPROGRESS: 'inProgress',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
};

function countBuilds(builds: BuildStatus[]): BuildCounts {
  const counts: BuildCounts = { successful: 0, failed: 0, inProgress: 0, cancelled: 0, unknown: 0 };
  for (const build of builds) {
    counts[COUNT_FIELD[build.state ?? 'UNKNOWN'] ?? 'unknown'] += 1;
  }
  return counts;
}

async function fetchLatestSourceCommit(projectKey: string, repositorySlug: string, pullRequestId: string): Promise<string> {
  const pullRequest = await PullRequestsService.get3(projectKey, pullRequestId, repositorySlug) as {
    fromRef?: { latestCommit?: string };
  };
  const latestCommit = pullRequest?.fromRef?.latestCommit;
  if (!latestCommit) {
    throw new Error(`Pull request ${pullRequestId} has no source commit`);
  }
  return latestCommit;
}

/**
 * Build statuses on the pull request's latest source commit — what the pull request's Builds
 * panel shows. Uses the commit-level build-status resource because the repository-scoped one
 * only returns a single status by key and cannot list them.
 */
export async function fetchPullRequestBuilds(projectKey: string, repositorySlug: string, pullRequestId: string) {
  return handleApiOperation<PullRequestBuilds>(async () => {
    const commitId = await fetchLatestSourceCommit(projectKey, repositorySlug, pullRequestId);
    const page = await DeprecatedService.getBuildStatus(commitId, 'NEWEST', 0, MAX_BUILD_STATUSES);
    const builds = (page?.values ?? []) as BuildStatus[];
    return { commitId, counts: countBuilds(builds), builds };
  }, 'Error fetching pull request builds');
}
