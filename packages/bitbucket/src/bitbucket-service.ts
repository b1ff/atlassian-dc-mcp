import { z } from 'zod';
import { OpenAPI, ProjectService, PullRequestsService, RepositoryService } from './bitbucket-client/index.js';
import { request as __request } from './bitbucket-client/core/request.js';
import { handleApiOperation, resolveOpenApiBase } from '@atlassian-dc-mcp/common';
import { simplifyInboxPullRequests } from './inbox-pr-mapper.js';
import { CompareDiffResponse, formatCompareDiffAsUnified } from './compare-diff-mapper.js';
import { BITBUCKET_PRODUCT, getDefaultPageSize, getMissingConfig } from './config.js';
import { fetchMergeability, mergePullRequest, type MergePullRequestParams } from './pr-merge.js';
import {
  declinePullRequest,
  reopenPullRequest,
  type DeclinePullRequestParams,
  type ReopenPullRequestParams,
} from './pr-state.js';
import {
  BitbucketMutationOutputMode,
  BitbucketOutputMode,
  shapePullRequestAck,
  shapePullRequestChangesResponse,
  shapePullRequestCommentAck,
  shapePullRequestCommentsResponse,
} from './bitbucket-response-mapper.js';

function resolveToken(token: string | (() => string | undefined), missingTokenMessage: string) {
  return async () => {
    const resolvedToken = typeof token === 'function' ? token() : token;
    if (!resolvedToken) {
      throw new Error(missingTokenMessage);
    }
    return resolvedToken;
  };
}

type DiffLineType = 'ADDED' | 'REMOVED' | 'CONTEXT';

type BranchDiffOutputMode = 'unified' | 'full';

/**
 * Build a Bitbucket DC inline comment anchor.
 *
 * For a multiline range, Bitbucket DC (>= 9.3.0) requires `multilineMarker` + `multilineSpan`.
 * The legacy `multilineStartLine`/`multilineStartLineType`/`multilineAnchor`/`multilineDestinationRange`
 * fields are silently ignored by the server, which then stores a single-line anchor — so a multiline
 * `​```suggestion` only replaces its first line on Apply. Field names verified against BB DC 9.3.2.
 */
function buildCommentAnchor(params: {
  filePath: string;
  line?: number;
  lineType?: DiffLineType;
  startLine?: number;
  startLineType?: DiffLineType;
}): Record<string, any> {
  const { filePath, line, lineType } = params;
  const anchor: Record<string, any> = { path: filePath, diffType: 'EFFECTIVE' };
  if (line === undefined || !lineType) {
    return anchor;
  }

  if (params.startLine === undefined) {
    anchor.line = line;
    anchor.lineType = lineType;
    anchor.fileType = lineType === 'REMOVED' ? 'FROM' : 'TO';
    return anchor;
  }

  // Normalize so the marker sits on the lower line and `line` on the upper line.
  let startLine = params.startLine;
  let startLineType: DiffLineType = params.startLineType ?? lineType;
  let endLine = line;
  let endLineType: DiffLineType = lineType;
  if (startLine > endLine) {
    [startLine, endLine] = [endLine, startLine];
    [startLineType, endLineType] = [endLineType, startLineType];
  }

  const fileType = endLineType === 'REMOVED' ? 'FROM' : 'TO';
  anchor.line = endLine;
  anchor.lineType = endLineType;
  anchor.fileType = fileType;
  anchor.multilineMarker = { startLine, startLineType };
  anchor.multilineSpan =
    fileType === 'FROM'
      ? { srcSpanStart: startLine, srcSpanEnd: endLine }
      : { dstSpanStart: startLine, dstSpanEnd: endLine };
  return anchor;
}

const SUGGESTION_BLOCK_RE = /```suggestion\b[^\n]*\n([\s\S]*?)```/;

/**
 * Warn when a multi-line `​```suggestion` block is anchored to a single line: Bitbucket only replaces
 * the anchored line on Apply, leaving the rest (duplicated code). Returns undefined when there is no
 * concern. Heuristic — a 1-line anchor with a multi-line suggestion is the common failure shape.
 */
function multilineSuggestionWarning(text: string, startLine?: number): string | undefined {
  if (startLine !== undefined) {
    return undefined;
  }
  const match = SUGGESTION_BLOCK_RE.exec(text);
  if (!match) {
    return undefined;
  }
  const suggestionLineCount = match[1].replace(/\n$/, '').split('\n').length;
  if (suggestionLineCount <= 1) {
    return undefined;
  }
  return (
    'The comment contains a multi-line ```suggestion block but is anchored to a single line. ' +
    'On Apply, Bitbucket replaces only that one line and leaves the rest. To replace multiple lines, ' +
    'set startLine (first replaced line) and line (last replaced line) to span the whole range.'
  );
}

export class BitbucketService {
  private readonly getPageSize: () => number;

  constructor(
    host: string | undefined,
    token: string | (() => string | undefined),
    apiBasePath?: string,
    getPageSize: () => number = getDefaultPageSize,
  ) {
    OpenAPI.BASE = resolveOpenApiBase({
      host,
      apiBasePath,
      defaultBasePath: BITBUCKET_PRODUCT.defaultApiBasePath ?? '/rest',
      strippableSuffixes: BITBUCKET_PRODUCT.apiBasePathStrippableSuffixes,
    });
    OpenAPI.TOKEN = resolveToken(token, 'Missing required environment variable: BITBUCKET_API_TOKEN');
    OpenAPI.VERSION = '1.0';
    this.getPageSize = getPageSize;
  }

  /**
   * Get commits for a repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param path Optional path to filter commits by
   * @param since Optional commit ID to retrieve commits after
   * @param until Optional commit ID to retrieve commits before
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with commits data
   */
  async getCommits(projectKey: string, repositorySlug: string, path?: string, since?: string, until?: string,
    limit?: number
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => RepositoryService.getCommits(
        projectKey,
        repositorySlug,
        undefined, // avatarScheme
        path,
        undefined, // withCounts
        undefined, // followRenames
        until,
        undefined, // avatarSize
        since,
        undefined, // merges
        undefined, // ignoreMissing
        0, // start
        limit ?? this.getPageSize()
      ),
      'Error fetching commits'
    );
  }

  /**
   * Get a list of projects
   * @param name Optional filter by project name
   * @param permission Optional filter by permission
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with projects data
   */
  async getProjects(name?: string, permission?: string, start?: number, limit?: number) {
    return handleApiOperation(
      () => ProjectService.getProjects(name, permission, start, limit ?? this.getPageSize()),
      'Error fetching projects'
    );
  }

  /**
   * Get a specific project by key
   * @param projectKey The project key
   * @returns Promise with project data
   */
  async getProject(projectKey: string) {
    projectKey = projectKey.toUpperCase();
    return handleApiOperation(
      () => ProjectService.getProject(projectKey),
      'Error fetching project'
    );
  }

  /**
   * Get repositories for a project
   * @param projectKey The project key
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with repositories data
   */
  async getRepositories(projectKey: string, start?: number, limit?: number) {
    projectKey = projectKey.toUpperCase();
    return handleApiOperation(
      () => ProjectService.getRepositories(projectKey, start, limit ?? this.getPageSize()),
      'Error fetching repositories'
    );
  }

  /**
   * Get a specific repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @returns Promise with repository data
   */
  async getRepository(projectKey: string, repositorySlug: string) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => ProjectService.getRepository(projectKey, repositorySlug),
      'Error fetching repository'
    );
  }

  /**
   * Get the raw content of a file in a repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param path The path to the file in the repository
   * @param at Optional branch, tag or commit to read the file at. Defaults to the repository default branch
   * @returns Promise with the raw file content
   */
  async getFileContent(projectKey: string, repositorySlug: string, path: string, at?: string) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    // Leading slashes would produce a double slash in the URL and a 404 from Bitbucket.
    const filePath = path.replace(/^\/+/, '');
    return handleApiOperation(
      () => RepositoryService.streamRaw(filePath, projectKey, repositorySlug, at),
      'Error fetching file content'
    );
  }

  async browseRepository(
    projectKey: string,
    repositorySlug: string,
    path = '',
    at?: string,
    start?: number,
    limit?: number
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const browsePath = path.replace(/^\/+/, '');
    const encodedBrowsePath = browsePath.split('/').map(encodeURIComponent).join('/');
    return handleApiOperation(
      () => __request(OpenAPI, {
        method: 'GET',
        url: browsePath
          ? `/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse/${encodedBrowsePath}`
          : '/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse',
        path: { projectKey, repositorySlug },
        query: { at, start, limit: limit ?? this.getPageSize() },
        errors: {
          401: 'The currently authenticated user has insufficient permissions to view the repository.',
          404: 'The repository or requested path does not exist.',
        },
      }),
      'Error browsing repository content'
    );
  }

  /**
   * Create a branch in a repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param name The name of the branch to create
   * @param startPoint The branch, tag or commit the new branch is forked from
   * @returns Promise with the created branch
   */
  async createBranch(projectKey: string, repositorySlug: string, name: string, startPoint: string) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => RepositoryService.createBranch(projectKey, repositorySlug, { name, startPoint }),
      'Error creating branch'
    );
  }

  /**
   * Get pull requests for a repository
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param withAttributes Optional flag to return additional pull request attributes (default: true)
   * @param at Optional fully-qualified branch ID to find pull requests to or from (e.g., refs/heads/master)
   * @param withProperties Optional flag to return additional pull request properties (default: true)
   * @param draft Optional draft status filter
   * @param filterText Optional text filter for title or description
   * @param state Optional state filter (OPEN, DECLINED, MERGED, or ALL; default: OPEN)
   * @param order Optional order (NEWEST or OLDEST; default: NEWEST)
   * @param direction Optional direction relative to repository (INCOMING or OUTGOING; default: INCOMING)
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with pull requests data
   */
  async getPullRequests(
    projectKey: string,
    repositorySlug: string,
    withAttributes?: string,
    at?: string,
    withProperties?: string,
    draft?: string,
    filterText?: string,
    state?: string,
    order?: string,
    direction?: string,
    start?: number,
    limit?: number
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => PullRequestsService.getPage(
        projectKey,
        repositorySlug,
        withAttributes,
        at,
        withProperties,
        draft,
        filterText,
        state,
        order,
        direction,
        start,
        limit ?? this.getPageSize()
      ),
      'Error fetching pull requests'
    );
  }

  /**
   * Get a specific pull request by ID
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The ID of the pull request within the repository
   * @returns Promise with pull request data
   */
  async getPullRequest(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => PullRequestsService.get3(projectKey, pullRequestId, repositorySlug),
      'Error fetching pull request'
    );
  }

  async getPullRequestCommentsAndActions(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    start?: number,
    limit?: number,
    output: BitbucketOutputMode = 'compact',
    includeResolved = false
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const result = await handleApiOperation(
      () => PullRequestsService.getActivities(
        projectKey,
        pullRequestId,
        repositorySlug,
        undefined,
        undefined,
        start,
        limit ?? this.getPageSize()
      ),
      'Error fetching pull request comments'
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: shapePullRequestCommentsResponse(result.data, output, { includeResolved })
      };
    }

    return result;
  }

  /**
   * Get pull request changes
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param sinceId Optional since commit hash to stream changes for a RANGE arbitrary change scope
   * @param changeScope Optional scope: 'UNREVIEWED' for unreviewed changes, 'RANGE' for changes between commits, 'ALL' for all changes (default)
   * @param untilId Optional until commit hash to stream changes for a RANGE arbitrary change scope
   * @param withComments Optional flag to include comment counts (default: true)
   * @param start Optional pagination start
   * @param limit Optional pagination limit (default: 25)
   * @returns Promise with PR changes data
   */
  async getPullRequestChanges(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    sinceId?: string,
    changeScope?: string,
    untilId?: string,
    withComments?: string,
    start?: number,
    limit?: number,
    output: BitbucketOutputMode = 'compact'
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const result = await handleApiOperation(
      () => PullRequestsService.streamChanges1(
        projectKey,
        pullRequestId,
        repositorySlug,
        sinceId,
        changeScope,
        untilId,
        withComments,
        start,
        limit ?? this.getPageSize()
      ),
      'Error fetching pull request changes'
    );

    if (result.success && result.data) {
      return {
        ...result,
        data: shapePullRequestChangesResponse(result.data, output)
      };
    }

    return result;
  }

  /**
   * Post a comment to a pull request
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param text The comment text
   * @param parentId Optional parent comment ID for replies
   * @param filePath Optional file path for file-specific comments
   * @param startLine Optional start line for multiline comments; when provided together with line, creates a range comment
   * @param startLineType Optional line type for the start line; defaults to lineType if omitted
   * @param line Optional end line number for line/multiline comments
   * @param lineType Optional line type ('ADDED', 'REMOVED', 'CONTEXT') for the end line
   * @param pending Optional flag to create a pending (draft) comment, not visible to others until a review is submitted.
   *   Only works when filePath is provided (file-level or inline comments).
   *   Top-level PR comments (no filePath) are always posted live regardless of this flag.
   * @param severity Optional severity for the comment. 'BLOCKER' posts the comment as a task that must be resolved before the PR can be merged. Defaults to 'NORMAL' (regular comment) when omitted.
   * @returns Promise with created comment data
   */
  async postPullRequestComment(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    text: string,
    parentId?: number,
    filePath?: string,
    startLine?: number,
    startLineType?: 'ADDED' | 'REMOVED' | 'CONTEXT',
    line?: number,
    lineType?: 'ADDED' | 'REMOVED' | 'CONTEXT',
    pending?: boolean,
    severity?: 'NORMAL' | 'BLOCKER',
    output: BitbucketMutationOutputMode = 'ack'
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const comment: any = {
      text
    };

    if (severity) {
      comment.severity = severity;
    }

    // Mark comment as pending (draft) — not visible to others until review is submitted
    // Note: Bitbucket DC uses state:'PENDING' not pending:true
    if (pending) {
      comment.state = 'PENDING';
    }

    // Add parent reference for replies
    if (parentId) {
      comment.parent = { id: parentId };
    }

    // Add anchor for file/line comments
    if (filePath) {
      comment.anchor = buildCommentAnchor({ filePath, line, lineType, startLine, startLineType });
    }

    const suggestionWarning = filePath ? multilineSuggestionWarning(text, startLine) : undefined;

    const result = await handleApiOperation(
      () => PullRequestsService.createComment2(
        projectKey,
        pullRequestId,
        repositorySlug,
        comment
      ),
      'Error posting pull request comment'
    );

    if (result.success && result.data && output !== 'full') {
      return {
        ...result,
        data: {
          ...shapePullRequestCommentAck(result.data),
          ...(suggestionWarning ? { warning: suggestionWarning } : {}),
        },
      };
    }

    if (result.success && suggestionWarning) {
      return { ...result, warning: suggestionWarning };
    }

    return result;
  }

  /**
   * Update an existing pull request comment. Use this to edit text, change severity, change state, or
   * resolve/reopen a comment thread. State and thread resolution are independent: `state` is the task
   * state of a BLOCKER comment ('RESOLVED' ticks the task, 'OPEN' un-ticks it), while `threadResolved`
   * toggles the thread-level "Resolve" button. A root BLOCKER comment can hold these independently, so
   * they are sent as separate fields.
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param commentId The comment ID to update
   * @param version The current version of the comment (required for optimistic locking)
   * @param text Optional new comment text
   * @param state Optional new task state. On a BLOCKER comment, 'RESOLVED' ticks the task and 'OPEN' un-ticks it.
   * @param severity Optional new severity. 'BLOCKER' converts a comment into a task, 'NORMAL' converts a task back to a regular comment.
   * @param threadResolved Optional thread resolution. `true` resolves the comment thread, `false` reopens it.
   * @returns Promise with updated comment data
   */
  async updatePullRequestComment(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    commentId: string,
    version: number,
    text?: string,
    state?: 'OPEN' | 'RESOLVED',
    severity?: 'NORMAL' | 'BLOCKER',
    threadResolved?: boolean,
    output: BitbucketMutationOutputMode = 'ack'
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const comment: any = { version };

    if (text !== undefined) {
      comment.text = text;
    }

    if (state) {
      comment.state = state;
    }

    if (severity) {
      comment.severity = severity;
    }

    if (threadResolved !== undefined) {
      comment.threadResolved = threadResolved;
    }

    const result = await handleApiOperation(
      () => PullRequestsService.updateComment2(
        projectKey,
        commentId,
        pullRequestId,
        repositorySlug,
        comment
      ),
      'Error updating pull request comment'
    );

    if (result.success && result.data && output !== 'full') {
      return {
        ...result,
        data: shapePullRequestCommentAck(result.data),
      };
    }

    return result;
  }

  /**
   * Check whether a pull request can be merged. Read-only: reports conflicts and any
   * merge-check vetoes without changing anything.
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @returns Promise with the mergeability status
   */
  async getPullRequestMergeability(projectKey: string, repositorySlug: string, pullRequestId: string) {
    return fetchMergeability(projectKey.toUpperCase(), repositorySlug.toLowerCase(), pullRequestId);
  }

  /**
   * Merge a pull request. Only permitted for repositories (and target branches) the operator
   * allowed through the merge gateway; see merge-gateway.ts. A conflicted or vetoed pull
   * request is refused before the merge request is sent.
   * @param params.version The current pull request version, required for optimistic locking
   * @param params.strategyId Optional merge strategy id (e.g. 'no-ff', 'squash', 'ff')
   * @param params.message Optional merge commit message
   * @param params.gateway The resolved operator merge policy
   * @returns Promise with the merged pull request
   */
  async mergePullRequest(params: MergePullRequestParams) {
    return mergePullRequest({
      ...params,
      projectKey: params.projectKey.toUpperCase(),
      repositorySlug: params.repositorySlug.toLowerCase(),
    });
  }

  /**
   * Decline a pull request. Only permitted for repositories the operator allowed through the
   * decline gateway; see repo-gateway.ts.
   * @param params.version The current pull request version, required for optimistic locking
   * @param params.comment Optional reason, posted as a pull request comment by the same request
   * @param params.gateway The resolved operator decline policy
   * @returns Promise with the declined pull request
   */
  async declinePullRequest(params: DeclinePullRequestParams) {
    return declinePullRequest({
      ...params,
      projectKey: params.projectKey.toUpperCase(),
      repositorySlug: params.repositorySlug.toLowerCase(),
    });
  }

  /**
   * Reopen a declined pull request. Not gated: it restores the state a decline removed.
   * @param params.version The current pull request version, required for optimistic locking
   * @returns Promise with the reopened pull request
   */
  async reopenPullRequest(params: ReopenPullRequestParams) {
    return reopenPullRequest({
      ...params,
      projectKey: params.projectKey.toUpperCase(),
      repositorySlug: params.repositorySlug.toLowerCase(),
    });
  }

  /**
   * Get a user by slug, or search for users by name/email filter
   * @param userSlug Optional exact slug to look up a specific user
   * @param filter Optional search string to find users by name or email
   * @returns Promise with user data
   */
  async getUser(userSlug?: string, filter?: string) {
    if (userSlug) {
      return handleApiOperation(
        () => __request(OpenAPI, {
          method: 'GET',
          url: '/api/latest/users/{userSlug}',
          path: { userSlug },
        }),
        'Error fetching user'
      );
    }
    return handleApiOperation(
      () => __request(OpenAPI, {
        method: 'GET',
        url: '/api/latest/users',
        query: { filter },
      }),
      'Error fetching users'
    );
  }

  /**
   * Submit a pull request review, publishing all pending (draft) comments and updating the reviewer's status.
   * This is the equivalent of clicking "Submit Review" in the Bitbucket UI.
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param userSlug The username/slug of the reviewer submitting the review (the PAT token owner).
   * @param status The review verdict: 'APPROVED', 'NEEDS_WORK', or 'UNAPPROVED'
   * @param lastReviewedCommit Optional last reviewed commit hash (for tracking review progress)
   * @returns Promise with updated participant data
   */
  async submitPullRequestReview(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    userSlug: string,
    status: 'APPROVED' | 'NEEDS_WORK' | 'UNAPPROVED',
    lastReviewedCommit?: string
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const requestBody: any = {
      status,
      ...(lastReviewedCommit ? { lastReviewedCommit } : {})
    };

    return handleApiOperation(
      () => PullRequestsService.updateStatus(
        projectKey,
        userSlug,
        pullRequestId,
        repositorySlug,
        requestBody
      ),
      'Error submitting pull request review'
    );
  }


  /**
   * Get text diff for a specific file in a pull request
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param path The path to the file which should be diffed
   * @param contextLines Optional number of context lines to include around added/removed lines
   * @param sinceId Optional since commit hash to stream a diff between two arbitrary hashes
   * @param srcPath Optional previous path to the file, if the file has been copied, moved or renamed
   * @param diffType Optional type of diff being requested
   * @param untilId Optional until commit hash to stream a diff between two arbitrary hashes
   * @param whitespace Optional whitespace flag which can be set to 'ignore-all'
   * @returns Promise with text diff data
   */
  async getPullRequestDiff(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    path: string,
    contextLines?: string,
    sinceId?: string,
    srcPath?: string,
    diffType?: string,
    untilId?: string,
    whitespace?: string
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => __request(OpenAPI, {
        method: 'GET',
        url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path}',
        path: {
          'path': path,
          'projectKey': projectKey,
          'pullRequestId': pullRequestId,
          'repositorySlug': repositorySlug,
        },
        query: {
          'contextLines': contextLines,
          'sinceId': sinceId,
          'srcPath': srcPath,
          'diffType': diffType,
          'untilId': untilId,
          'whitespace': whitespace,
        },
        headers: {
          'Accept': 'text/plain'
        },
        errors: {
          400: `If the request was malformed.`,
          401: `The currently authenticated user has insufficient permissions to view the repository or pull request.`,
          404: `The repository or pull request does not exist.`,
        },
      }),
      'Error fetching pull request diff'
    );
  }

  /**
   * Get text diff between two branches, with or without an existing pull request.
   *
   * Mirrors the Bitbucket "compare" view: the diff contains changes reachable from
   * `sourceBranch` but not from `targetBranch`.
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param sourceBranch The source branch, tag or commit
   * @param targetBranch Optional target branch, tag or commit. Defaults to the repository default branch
   * @param path Optional file path to limit the diff to a single file
   * @param contextLines Optional number of context lines to include around added/removed lines
   * @param srcPath Optional previous path to the file, if the file has been copied, moved or renamed
   * @param whitespace Optional whitespace flag which can be set to 'ignore-all'
   * @param output Render a unified diff or return the raw RestDiff payload. Defaults to 'unified'
   * @returns Promise with the diff between the two refs
   */
  async getBranchDiff(
    projectKey: string,
    repositorySlug: string,
    sourceBranch: string,
    targetBranch?: string,
    path?: string,
    contextLines?: string,
    srcPath?: string,
    whitespace?: string,
    output: BranchDiffOutputMode = 'unified'
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    // The endpoint is `/compare/diff{path}`: an empty path diffs the whole comparison,
    // a file path must keep its leading slash to stay a separate URL segment.
    const trimmedPath = path?.replace(/^\/+/, '') ?? '';
    return handleApiOperation(
      async () => {
        const diff = await __request<CompareDiffResponse>(OpenAPI, {
          method: 'GET',
          url: '/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/diff{path}',
          path: {
            'path': trimmedPath ? `/${trimmedPath}` : '',
            'projectKey': projectKey,
            'repositorySlug': repositorySlug,
          },
          query: {
            'from': sourceBranch,
            'to': targetBranch,
            'contextLines': contextLines,
            'srcPath': srcPath,
            'whitespace': whitespace,
          },
          errors: {
            401: `The currently authenticated user has insufficient permissions to view the repository.`,
            404: `The repository, or one of the compared refs, does not exist.`,
          },
        });
        return output === 'full' ? diff : formatCompareDiffAsUnified(diff);
      },
      'Error fetching branch diff'
    );
  }

  /**
   * Create a pull request
   * @param projectKey The project key (also used as the destination repository's project)
   * @param repositorySlug The repository slug (also used as the destination repository's slug)
   * @param title The pull request title
   * @param description Optional pull request description
   * @param fromRefId The source branch (e.g., 'refs/heads/feature-branch')
   * @param toRefId The destination branch (e.g., 'refs/heads/main')
   * @param reviewers Optional array of reviewer usernames
   * @param draft Optional flag to create the pull request as a draft
   * @param output Return a compact acknowledgement or the full API response. Defaults to 'ack'.
   * @param fromProjectKey Optional source repository's project key, when it differs from
   *   projectKey (fork-based pull requests). Defaults to projectKey.
   * @param fromRepositorySlug Optional source repository's slug, when it differs from
   *   repositorySlug (fork-based pull requests). Defaults to repositorySlug.
   * @returns Promise with created pull request data
   */
  async createPullRequest(
    projectKey: string,
    repositorySlug: string,
    title: string,
    description: string | undefined,
    fromRefId: string,
    toRefId: string,
    reviewers?: string[],
    draft?: boolean,
    output: BitbucketMutationOutputMode = 'ack',
    fromProjectKey?: string,
    fromRepositorySlug?: string
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const pullRequestData: any = {
      title,
      description,
      fromRef: {
        id: fromRefId,
        repository: {
          slug: (fromRepositorySlug ?? repositorySlug).toLowerCase(),
          project: {
            key: (fromProjectKey ?? projectKey).toUpperCase()
          }
        }
      },
      toRef: {
        id: toRefId,
        repository: {
          slug: repositorySlug,
          project: {
            key: projectKey
          }
        }
      }
    };

    if (reviewers && reviewers.length > 0) {
      pullRequestData.reviewers = reviewers.map(username => ({
        user: {
          name: username
        }
      }));
    }

    if (draft !== undefined) {
      pullRequestData.draft = draft;
    }

    const result = await handleApiOperation(
      () => PullRequestsService.create(projectKey, repositorySlug, pullRequestData),
      'Error creating pull request'
    );

    if (result.success && result.data && output !== 'full') {
      return {
        ...result,
        data: shapePullRequestAck(result.data),
      };
    }

    return result;
  }

  /**
   * Update a pull request
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param pullRequestId The pull request ID
   * @param version The version of the pull request (required for optimistic locking)
   * @param title Optional new title for the pull request
   * @param description Optional new description for the pull request
   * @param reviewers Optional array of reviewer usernames to set
   * @param draft Optional flag to mark the pull request as a draft or ready for review
   * @param output Return a compact acknowledgement or the full API response. Defaults to 'ack'.
   * @returns Promise with updated pull request data
   */
  async updatePullRequest(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: string,
    version: number,
    title?: string,
    description?: string,
    reviewers?: string[],
    draft?: boolean,
    output: BitbucketMutationOutputMode = 'ack'
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    const pullRequestData: any = {
      version
    };

    if (title !== undefined) {
      pullRequestData.title = title;
    }

    if (description !== undefined) {
      pullRequestData.description = description;
    }

    if (reviewers && reviewers.length > 0) {
      pullRequestData.reviewers = reviewers.map(username => ({
        user: {
          name: username
        }
      }));
    }

    if (draft !== undefined) {
      pullRequestData.draft = draft;
    }

    const result = await handleApiOperation(
      () => PullRequestsService.update(projectKey, pullRequestId, repositorySlug, pullRequestData),
      'Error updating pull request'
    );

    if (result.success && result.data && output !== 'full') {
      return {
        ...result,
        data: shapePullRequestAck(result.data),
      };
    }

    return result;
  }

  /**
   * Get required reviewers for PR creation
   * Returns a set of users who are required reviewers for pull requests created from the given source repository
   * and ref to the given target ref in this repository.
   * @param projectKey The project key
   * @param repositorySlug The repository slug
   * @param sourceRefId The ID of the source ref (e.g., 'refs/heads/feature-branch')
   * @param targetRefId The ID of the target ref (e.g., 'refs/heads/main')
   * @param sourceRepoId Optional ID of the repository in which the source ref exists
   * @param targetRepoId Optional ID of the repository in which the target ref exists
   * @returns Promise with required reviewers data
   */
  async getRequiredReviewers(
    projectKey: string,
    repositorySlug: string,
    sourceRefId: string,
    targetRefId: string,
    sourceRepoId?: string,
    targetRepoId?: string
  ) {
    projectKey = projectKey.toUpperCase();
    repositorySlug = repositorySlug.toLowerCase();
    return handleApiOperation(
      () => PullRequestsService.getReviewers(
        projectKey,
        repositorySlug,
        targetRepoId,
        sourceRepoId,
        sourceRefId,
        targetRefId
      ),
      'Error fetching required reviewers'
    );
  }

  /**
   * Get pull requests from the dashboard API (across all repositories)
   * @param role Role filter: AUTHOR (default), REVIEWER, or PARTICIPANT
   * @param state State filter: OPEN (default), DECLINED, or MERGED
   * @param closedSince Optional timestamp (in milliseconds) to filter PRs closed after this date
   * @param order Order: NEWEST (default), OLDEST, or PARTICIPANT
   * @param start Optional pagination start
   * @param limit Pagination limit (defaults to the package page size)
   * @returns Promise with dashboard pull requests data
   */
  async getDashboardPullRequests(
    role: string = 'AUTHOR',
    state: string = 'OPEN',
    closedSince?: number,
    order: string = 'NEWEST',
    start?: number,
    limit?: number
  ) {
    return handleApiOperation(
      () => __request(OpenAPI, {
        method: 'GET',
        url: '/api/1.0/dashboard/pull-requests',
        query: {
          'role': role,
          'state': state,
          'closedSince': closedSince,
          'order': order,
          'start': start,
          'limit': limit ?? this.getPageSize(),
        },
        errors: {
          401: 'The currently authenticated user is not permitted to access the dashboard.',
        },
      }),
      'Error fetching dashboard pull requests'
    );
  }

  /**
   * Get pull requests from the authenticated user's inbox (PRs awaiting review)
   * @param start Optional pagination start
   * @param limit Optional pagination limit (defaults to the package page size)
   * @returns Promise with inbox pull requests data
   */
  async getInboxPullRequests(start?: number, limit?: number) {
    const result = await handleApiOperation(
      () => __request(OpenAPI, {
        method: 'GET',
        url: '/api/latest/inbox/pull-requests',
        query: {
          'start': start,
          'limit': limit ?? this.getPageSize(),
        },
        errors: {
          401: 'The currently authenticated user is not permitted to access the inbox.',
        },
      }),
      'Error fetching inbox pull requests'
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: simplifyInboxPullRequests(result.data),
      };
    }

    return result;
  }

  /**
   * Search code across Bitbucket using the search REST module.
   *
   * The query string supports Bitbucket search modifiers, e.g. `project:TEST`,
   * `repo:projectkey/repositoryslug` (e.g. `repo:TEST/demo`), `ext:js`, so scoping to a
   * project or repository is done inside the query text. Note: `repo:` must include the
   * project key (`repo:KEY/slug`); a bare `repo:slug` is rejected by the server.
   *
   * Note: the `/rest/search` endpoint is a separate Bitbucket REST module that is not part of
   * the generated client, so this is issued via the low-level request helper (same approach as
   * the dashboard/inbox endpoints).
   *
   * @param query The search query (may include modifiers like `repo:`, `project:`, `ext:`)
   * @param limit Optional primary result limit (defaults to the package page size)
   * @param secondaryLimit Optional secondary limit (number of hit contexts per match)
   * @returns Promise with the code search results
   */
  async searchCode(query: string, limit?: number, secondaryLimit?: number) {
    return handleApiOperation(
      () => __request(OpenAPI, {
        method: 'POST',
        url: '/search/latest/search',
        body: {
          query,
          entities: { code: {} },
          limits: {
            primary: limit ?? this.getPageSize(),
            ...(secondaryLimit !== undefined ? { secondary: secondaryLimit } : {}),
          },
        },
        mediaType: 'application/json',
        errors: {
          400: 'The search query was malformed.',
          401: 'The currently authenticated user is not permitted to search.',
        },
      }),
      'Error searching code'
    );
  }

  async validateSetup(): Promise<void> {
    await __request(OpenAPI, {
      method: 'GET',
      url: '/api/latest/dashboard/pull-requests',
      query: { limit: 1 },
    });
  }

  static validateConfig(): string[] {
    return getMissingConfig();
  }
}

export const bitbucketToolSchemas = {
  getProjects: {
    name: z.string().optional().describe("Filter projects by name"),
    permission: z.string().optional().describe("Filter projects by permission"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used.")
  },
  getPullRequests: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    withAttributes: z.string().optional().describe("(optional) defaults to true, whether to return additional pull request attributes"),
    at: z.string().optional().describe("(optional) a fully-qualified branch ID to find pull requests to or from, such as refs/heads/master"),
    withProperties: z.string().optional().describe("(optional) defaults to true, whether to return additional pull request properties"),
    draft: z.string().optional().describe("(optional) If specified, only pull requests matching the supplied draft status will be returned"),
    filterText: z.string().optional().describe("(optional) If specified, only pull requests where the title or description contains the supplied string will be returned"),
    state: z.string().optional().describe("(optional, defaults to OPEN). Supply ALL to return pull request in any state. If a state is supplied only pull requests in the specified state will be returned. Either OPEN, DECLINED or MERGED"),
    order: z.string().optional().describe("(optional, defaults to NEWEST) the order to return pull requests in, either OLDEST (as in: \"oldest first\") or NEWEST"),
    direction: z.string().optional().describe("(optional, defaults to INCOMING) the direction relative to the specified repository. Either INCOMING or OUTGOING"),
    start: z.number().optional().describe("Start number for the page (inclusive). If not passed, first page is assumed"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used.")
  },
  getPullRequest: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The ID of the pull request within the repository")
  },
  getProject: {
    projectKey: z.string().describe("The project key")
  },
  getRepositories: {
    projectKey: z.string().describe("The project key"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used.")
  },
  getRepository: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug")
  },
  getFileContent: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    path: z.string().describe("Path to the file in the repository (e.g. 'src/index.ts')"),
    at: z.string().optional().describe("A branch, tag or commit to read the file at (e.g. 'refs/heads/main', 'feature/x', or a commit id). Defaults to the repository's default branch")
  },
  browseRepository: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    path: z.string().optional().describe("Directory or file path to browse. Omit for the repository root."),
    at: z.string().optional().describe("A branch, tag or commit to browse at. Defaults to the repository's default branch."),
    start: z.number().optional().describe("Pagination start value. Use the corresponding nextPageStart from the previous response."),
    limit: z.number().optional().describe("Maximum directory entries or file lines to return. Defaults to the package page size.")
  },
  createBranch: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    name: z.string().describe("The name of the branch to create, without the 'refs/heads/' prefix (e.g. 'feature/my-branch')"),
    startPoint: z.string().describe("The branch, tag or commit the new branch is forked from (e.g. 'master', 'refs/heads/master', or a commit id)")
  },
  getCommits: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    path: z.string().optional().describe("Optional path to filter commits by"),
    since: z.string().optional().describe("The commit ID (exclusively) to retrieve commits after"),
    until: z.string().optional().describe("The commit ID (inclusively) to retrieve commits before"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used.")
  },
  getPullRequestComments: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used."),
    output: z.enum(['summary', 'compact', 'full']).optional().describe("Choose between summary lines, compact structured output, or the full API payload. Defaults to compact."),
    includeResolved: z.boolean().optional().describe("Include resolved comment threads and their replies. Defaults to false, so resolved threads are omitted.")
  },
  getPullRequestChanges: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    sinceId: z.string().optional().describe("The since commit hash to stream changes for a RANGE arbitrary change scope"),
    changeScope: z.string().optional().describe("UNREVIEWED for unreviewed changes, RANGE for changes between commits, ALL for all changes (default)"),
    untilId: z.string().optional().describe("The until commit hash to stream changes for a RANGE arbitrary change scope"),
    withComments: z.string().optional().describe("true to apply comment counts in the changes (default), false to stream changes without comment counts"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used."),
    output: z.enum(['summary', 'compact', 'full']).optional().describe("Choose between summary lines, compact structured output, or the full API payload. Defaults to compact.")
  },
  postPullRequestComment: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    text: z.string().describe("The comment text"),
    parentId: z.number().optional().describe("Parent comment ID for replies"),
    filePath: z.string().optional().describe("File path for file-specific comments"),
    startLine: z.number().optional().describe("First line of a multiline range. Provide together with 'line' (the last line) to span multiple lines. REQUIRED for a multi-line ```suggestion: the anchored range (startLine..line) is exactly what 'Apply suggestion' replaces — omit it and only the single 'line' is replaced, leaving the rest. Requires Bitbucket DC >= 9.3.0 for multiline suggestions."),
    startLineType: z.enum(['ADDED', 'REMOVED', 'CONTEXT']).optional().describe("Line type for the start line of a multiline range. Defaults to the same value as lineType if omitted."),
    line: z.number().optional().describe("Single-line comments: the line. Multiline: the LAST line of the range (use startLine for the first). For a ```suggestion this is the last replaced line."),
    lineType: z.enum(['ADDED', 'REMOVED', 'CONTEXT']).optional().describe("Line type for 'line' (the end line, or the only line for single-line comments). Use 'ADDED'/'CONTEXT' for the new/target file, 'REMOVED' for the original/source file."),
    pending: z.boolean().optional().describe("If true, creates a pending (draft) comment not visible to others until the review is submitted via bitbucket_submitPullRequestReview. Only works when filePath is provided — top-level PR comments (no filePath) are always posted live."),
    severity: z.enum(['NORMAL', 'BLOCKER']).optional().describe("Comment severity. Use 'BLOCKER' to post the comment as a task that must be resolved before the PR can be merged. Defaults to 'NORMAL' (regular comment)."),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  updatePullRequestComment: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    commentId: z.string().describe("The ID of the comment to update"),
    version: z.number().describe("The current version of the comment, required for optimistic locking. Get it from bitbucket_getPR_CommentsAndAction or from the response of the original post/update."),
    text: z.string().optional().describe("New comment text. Omit to leave unchanged."),
    state: z.enum(['OPEN', 'RESOLVED']).optional().describe("New task state. On a BLOCKER (task) comment, 'RESOLVED' ticks the task and 'OPEN' un-ticks it. This is the task state only — to resolve or reopen the comment thread itself use threadResolved."),
    severity: z.enum(['NORMAL', 'BLOCKER']).optional().describe("New severity. Use 'BLOCKER' to convert a comment into a task, 'NORMAL' to convert it back."),
    threadResolved: z.boolean().optional().describe("Thread resolution. Set true to resolve the comment thread (the 'Resolve' button) or false to reopen it. Independent of state: a BLOCKER comment's task state and its thread resolution can differ."),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  getUser: {
    userSlug: z.string().optional().describe("Exact slug of the user to look up (e.g. 'tdepole'). Use this to confirm a known slug or fetch a user's details."),
    filter: z.string().optional().describe("Search string to find users by name or email. Use this to discover a user's slug when it is not known.")
  },
  submitPullRequestReview: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    userSlug: z.string().describe("The username/slug of the PAT token owner — the same user whose credentials are in BITBUCKET_API_TOKEN. Resolution order: (1) author.slug from any comment posted this session, (2) reviewers/participants array from getPullRequest, (3) bitbucket_getUser with a name/email filter."),
    status: z.enum(['APPROVED', 'NEEDS_WORK', 'UNAPPROVED']).describe("The review verdict: APPROVED, NEEDS_WORK, or UNAPPROVED"),
    lastReviewedCommit: z.string().optional().describe("Optional hash of the last commit reviewed, used to track review progress")
  },
  getPullRequestDiff: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    path: z.string().describe("The path to the file which should be diffed. Note: Before getting diff, use getPullRequestChanges to understand what files were changed in the PR"),
    contextLines: z.string().optional().describe("Number of context lines to include around added/removed lines in the diff"),
    sinceId: z.string().optional().describe("The since commit hash to stream a diff between two arbitrary hashes"),
    srcPath: z.string().optional().describe("The previous path to the file, if the file has been copied, moved or renamed"),
    diffType: z.string().optional().describe("The type of diff being requested"),
    untilId: z.string().optional().describe("The until commit hash to stream a diff between two arbitrary hashes"),
    whitespace: z.string().optional().describe("Optional whitespace flag which can be set to 'ignore-all'")
  },
  getBranchDiff: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    sourceBranch: z.string().describe("The source branch, tag or commit to diff (e.g. 'feature/my-branch'). Changes reachable from here but not from targetBranch are returned"),
    targetBranch: z.string().optional().describe("The target branch, tag or commit to compare against. Defaults to the repository's default branch"),
    path: z.string().optional().describe("Limit the diff to a single file path. Omit to get the diff for every changed file"),
    contextLines: z.string().optional().describe("Number of context lines to include around added/removed lines in the diff"),
    srcPath: z.string().optional().describe("The previous path to the file, if the file has been copied, moved or renamed"),
    whitespace: z.string().optional().describe("Optional whitespace flag which can be set to 'ignore-all'"),
    output: z.enum(['unified', 'full']).optional().describe("Render the comparison as a unified diff or return the raw RestDiff payload. Defaults to unified.")
  },
  createPullRequest: {
    projectKey: z.string().describe("The destination repository's project key"),
    repositorySlug: z.string().describe("The destination repository's slug"),
    title: z.string().describe("The pull request title"),
    description: z.string().optional().describe("The pull request description"),
    fromRefId: z.string().describe("The source branch reference ID (e.g., 'refs/heads/feature-branch')"),
    toRefId: z.string().describe("The destination branch reference ID (e.g., 'refs/heads/main')"),
    draft: z.boolean().optional().describe("If true, the pull request is created as a draft (work-in-progress) and cannot be merged until marked ready."),
    reviewers: z.array(z.string()).optional().describe("Optional array of reviewer usernames (use the 'name' field from Bitbucket user objects, not 'slug')"),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack."),
    fromProjectKey: z.string().optional().describe("The source repository's project key, when creating a fork-based pull request where the source repository differs from the destination repository (projectKey). Defaults to projectKey."),
    fromRepositorySlug: z.string().optional().describe("The source repository's slug, when creating a fork-based pull request where the source repository differs from the destination repository (repositorySlug). Defaults to repositorySlug.")
  },
  updatePullRequest: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    version: z.number().describe("The current version of the pull request (required for optimistic locking). Obtain this by calling bitbucket_getPullRequest first."),
    title: z.string().optional().describe("The new title for the pull request"),
    description: z.string().optional().describe("The new description for the pull request"),
    draft: z.boolean().optional().describe("If provided, sets the draft (work-in-progress) status of the pull request. Pass true to mark as draft, false to mark as ready for review."),
    reviewers: z.array(z.string()).optional().describe("Optional array of reviewer usernames to set (use the 'name' field from Bitbucket user objects, not 'slug')"),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  canMergePullRequest: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID")
  },
  mergePullRequest: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    version: z.number().describe("The current version of the pull request (required for optimistic locking). Fetch it with bitbucket_getPullRequest immediately before merging — the server rejects a stale version, which is what stops a merge of code you have not seen."),
    strategyId: z.string().optional().describe("Merge strategy id, e.g. 'no-ff', 'ff', 'ff-only', 'rebase-no-ff', 'rebase-ff-only', 'squash', 'squash-ff-only'. Omit to use the strategy configured for the repository."),
    message: z.string().optional().describe("Commit message for the merge commit. Omit to let Bitbucket generate it."),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  declinePullRequest: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    version: z.number().describe("The current version of the pull request (required for optimistic locking). Fetch it with bitbucket_getPullRequest immediately before declining; a stale version is rejected with a 409, in which case refetch the version and retry once."),
    comment: z.string().optional().describe("Reason for declining, posted as a pull request comment by the same request. Prefer this over posting a separate comment first: sending both together means a rejected decline leaves no orphaned 'why this was abandoned' comment on a pull request that stayed open."),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  reopenPullRequest: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    pullRequestId: z.string().describe("The pull request ID"),
    version: z.number().describe("The current version of the pull request (required for optimistic locking). Fetch it with bitbucket_getPullRequest immediately before reopening; a stale version is rejected with a 409, in which case refetch the version and retry once."),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  getRequiredReviewers: {
    projectKey: z.string().describe("The project key"),
    repositorySlug: z.string().describe("The repository slug"),
    sourceRefId: z.string().describe("The ID of the source ref (e.g., 'refs/heads/feature-branch')"),
    targetRefId: z.string().describe("The ID of the target ref (e.g., 'refs/heads/main')"),
    sourceRepoId: z.string().optional().describe("Optional ID of the repository in which the source ref exists"),
    targetRepoId: z.string().optional().describe("Optional ID of the repository in which the target ref exists")
  },
  getDashboardPullRequests: {
    role: z.enum(['AUTHOR', 'REVIEWER', 'PARTICIPANT']).optional().default('AUTHOR').describe("Filter by the user's role in the PR: AUTHOR (default), REVIEWER, or PARTICIPANT"),
    state: z.enum(['OPEN', 'DECLINED', 'MERGED']).optional().default('OPEN').describe("Filter by PR state: OPEN (default), DECLINED, or MERGED"),
    closedSince: z.number().optional().describe("Timestamp in milliseconds. If state is not OPEN, return only PRs closed after this date"),
    order: z.enum(['NEWEST', 'OLDEST', 'PARTICIPANT']).optional().default('NEWEST').describe("Order of results: NEWEST (default), OLDEST, or PARTICIPANT"),
    start: z.number().optional().describe("Start number for pagination"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used.")
  },
  getInboxPullRequests: {
    start: z.number().optional().describe("Start number for the page (inclusive). If not passed, first page is assumed"),
    limit: z.number().optional().describe("Number of items to return. If not passed, the package default page size is used.")
  },
  searchCode: {
    query: z.string().describe("The search query. Supports Bitbucket search modifiers, e.g. 'project:TEST authenticate', 'repo:TEST/demo TODO' (the repo modifier must be 'repo:projectkey/repositoryslug'), 'ext:ts useState'. Scope to a project or repository inside the query text."),
    limit: z.number().optional().describe("Maximum number of matching files to return. If not passed, the package default page size is used."),
    secondaryLimit: z.number().optional().describe("Maximum number of hit contexts (matching code snippets) to return per file")
  }
};
