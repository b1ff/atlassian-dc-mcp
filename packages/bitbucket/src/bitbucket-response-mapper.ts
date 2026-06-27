import {
  BitbucketPRApiResponse,
  filterPullRequestComments,
  getCommentSummary,
  type PullRequestCommentOptions,
  simplifyBitbucketPRComments
} from './pr-comment-mapper.js';
import { getChangesSummary, simplifyBitbucketPRChanges } from './pr-changes-mapper.js';

export type BitbucketOutputMode = 'summary' | 'compact' | 'full';
export type BitbucketMutationOutputMode = 'ack' | 'full';

function getLink(links: any): string | undefined {
  const selfLinks = links?.self;
  if (Array.isArray(selfLinks)) {
    const link = selfLinks.find(item => typeof item?.href === 'string');
    return link?.href;
  }

  if (typeof selfLinks === 'string') {
    return selfLinks;
  }

  return undefined;
}

function hasSummary(value: any): value is { summary: unknown; isLastPage?: boolean } {
  return Boolean(value) && typeof value === 'object' && 'summary' in value;
}

export function shapePullRequestCommentsResponse(
  response: BitbucketPRApiResponse,
  output: BitbucketOutputMode = 'compact',
  options: PullRequestCommentOptions = {}
): Record<string, any> {
  const filteredResponse = filterPullRequestComments(response, options);

  if (output === 'full') {
    return filteredResponse;
  }

  const compact = simplifyBitbucketPRComments(filteredResponse, options);
  if (output === 'compact') {
    return compact;
  }

  return {
    isLastPage: hasSummary(compact) ? compact.isLastPage ?? true : filteredResponse.isLastPage ?? true,
    summary: hasSummary(compact)
      ? compact.summary
      : {
          totalActivities: Array.isArray(filteredResponse.values) ? filteredResponse.values.length : 0,
          commentCount: getCommentSummary(filteredResponse, options).length,
          unresolvedCount: 0,
        },
    items: getCommentSummary(filteredResponse, options),
  };
}

export function shapePullRequestChangesResponse(response: any, output: BitbucketOutputMode = 'compact'): Record<string, any> {
  if (output === 'full') {
    return response;
  }

  const compact = simplifyBitbucketPRChanges(response);
  if (output === 'compact') {
    return compact;
  }

  return {
    ...(typeof response?.fromHash === 'string' ? { fromHash: response.fromHash } : {}),
    ...(typeof response?.toHash === 'string' ? { toHash: response.toHash } : {}),
    ...(typeof response?.properties?.changeScope === 'string' ? { changeScope: response.properties.changeScope } : {}),
    isLastPage: hasSummary(compact) ? compact.isLastPage ?? true : response?.isLastPage ?? true,
    summary: hasSummary(compact)
      ? compact.summary
      : {
          totalChanges: Array.isArray(response?.values) ? response.values.length : 0,
          additions: 0,
          deletions: 0,
          modifications: 0,
          moves: 0,
          filesWithComments: 0,
        },
    items: getChangesSummary(response),
  };
}

export function shapePullRequestAck(pullRequest: any): Record<string, any> {
  const link = getLink(pullRequest?.links);
  return {
    ...(pullRequest?.id !== undefined ? { id: pullRequest.id } : {}),
    ...(pullRequest?.version !== undefined ? { version: pullRequest.version } : {}),
    ...(typeof pullRequest?.title === 'string' ? { title: pullRequest.title } : {}),
    ...(typeof pullRequest?.state === 'string' ? { state: pullRequest.state } : {}),
    ...(typeof pullRequest?.fromRef?.id === 'string' ? { fromRefId: pullRequest.fromRef.id } : {}),
    ...(typeof pullRequest?.toRef?.id === 'string' ? { toRefId: pullRequest.toRef.id } : {}),
    reviewerCount: Array.isArray(pullRequest?.reviewers) ? pullRequest.reviewers.length : 0,
    ...(link ? { link } : {}),
  };
}

export function shapePullRequestCommentAck(comment: any): Record<string, any> {
  const link = getLink(comment?.links);
  return {
    ...(comment?.id !== undefined ? { id: comment.id } : {}),
    ...(comment?.parent?.id !== undefined ? { parentId: comment.parent.id } : {}),
    ...(typeof comment?.state === 'string' ? { state: comment.state } : {}),
    pending: comment?.state === 'PENDING',
    ...(typeof comment?.anchor?.path === 'string'
      ? {
          anchor: {
            path: comment.anchor.path,
            ...(comment.anchor.line !== undefined ? { line: comment.anchor.line } : {}),
            ...(typeof comment.anchor.lineType === 'string' ? { lineType: comment.anchor.lineType } : {}),
            ...(comment.anchor.multilineMarker
              ? {
                  startLine: comment.anchor.multilineMarker.startLine,
                  startLineType: comment.anchor.multilineMarker.startLineType,
                }
              : {}),
          },
        }
      : {}),
    ...(link ? { link } : {}),
  };
}
