interface InboxPRUser {
  name: string;
  emailAddress?: string;
  displayName?: string;
}

interface InboxPRRef {
  id: string;
  displayId: string;
  latestCommit?: string;
  repository?: {
    slug: string;
    project?: {
      key: string;
    };
  };
}

interface InboxPRReviewer {
  user: InboxPRUser;
  approved: boolean;
  status: string;
}

interface InboxPullRequest {
  id: number;
  title: string;
  description?: string;
  state: string;
  draft?: boolean;
  createdDate: number;
  updatedDate: number;
  author?: {
    user: InboxPRUser;
  };
  fromRef: InboxPRRef;
  toRef: InboxPRRef;
  reviewers?: InboxPRReviewer[];
  properties?: {
    commentCount?: number;
    openTaskCount?: number;
  };
  links?: {
    self?: { href: string }[];
  };
}

interface InboxPRResponse {
  values: InboxPullRequest[];
  size: number;
  isLastPage: boolean;
  start: number;
  limit: number;
  nextPageStart?: number;
}

// Simplified interfaces
interface SimplifiedInboxPR {
  id: number;
  title: string;
  description?: string;
  state: string;
  draft: boolean;
  createdDate: number;
  updatedDate: number;
  link?: string;
  author?: {
    name: string;
    displayName?: string;
  };
  fromRef: string;
  toRef: string;
  repository: {
    slug: string;
    projectKey: string;
  };
  reviewers: {
    name: string;
    approved: boolean;
    status: string;
  }[];
  commentCount: number;
  openTaskCount: number;
}

export interface SimplifiedInboxPRResponse {
  pullRequests: SimplifiedInboxPR[];
  summary: {
    totalCount: number;
    byRepository: Record<string, number>;
  };
  isLastPage: boolean;
  nextPageStart?: number;
}

// Type guards
function isInboxPRResponse(obj: unknown): obj is InboxPRResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as InboxPRResponse).values) &&
    typeof (obj as InboxPRResponse).isLastPage === 'boolean'
  );
}

function isInboxPullRequest(obj: unknown): obj is InboxPullRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as InboxPullRequest).id === 'number' &&
    typeof (obj as InboxPullRequest).title === 'string' &&
    typeof (obj as InboxPullRequest).state === 'string'
  );
}

function simplifyInboxPR(pr: InboxPullRequest): SimplifiedInboxPR {
  const repo = pr.toRef?.repository ?? pr.fromRef?.repository;
  const link = pr.links?.self?.[0]?.href;

  return {
    id: pr.id,
    title: pr.title,
    ...(pr.description !== undefined && { description: pr.description }),
    state: pr.state,
    draft: pr.draft ?? false,
    createdDate: pr.createdDate,
    updatedDate: pr.updatedDate,
    ...(link && { link }),
    ...(pr.author?.user && {
      author: {
        name: pr.author.user.name,
        ...(pr.author.user.displayName && { displayName: pr.author.user.displayName }),
      },
    }),
    fromRef: pr.fromRef?.displayId ?? pr.fromRef?.id,
    toRef: pr.toRef?.displayId ?? pr.toRef?.id,
    repository: {
      slug: repo?.slug ?? 'unknown',
      projectKey: repo?.project?.key ?? 'unknown',
    },
    reviewers: (pr.reviewers ?? []).map(r => ({
      name: r.user.name,
      approved: r.approved,
      status: r.status,
    })),
    commentCount: pr.properties?.commentCount ?? 0,
    openTaskCount: pr.properties?.openTaskCount ?? 0,
  };
}

export function simplifyInboxPullRequests(response: unknown): SimplifiedInboxPRResponse | unknown {
  if (!isInboxPRResponse(response)) {
    return response;
  }

  const pullRequests: SimplifiedInboxPR[] = [];

  for (const pr of response.values) {
    if (isInboxPullRequest(pr)) {
      pullRequests.push(simplifyInboxPR(pr));
    }
  }

  if (pullRequests.length === 0 && response.values.length > 0) {
    return response;
  }

  const byRepository: Record<string, number> = {};
  for (const pr of pullRequests) {
    const repoKey = `${pr.repository.projectKey}/${pr.repository.slug}`;
    byRepository[repoKey] = (byRepository[repoKey] ?? 0) + 1;
  }

  return {
    pullRequests,
    summary: {
      totalCount: pullRequests.length,
      byRepository,
    },
    isLastPage: response.isLastPage,
    ...(response.nextPageStart !== undefined && { nextPageStart: response.nextPageStart }),
  };
}
