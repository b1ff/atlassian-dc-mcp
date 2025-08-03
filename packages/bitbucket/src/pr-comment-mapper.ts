interface BitbucketUserLinks {
  self: Array<{
    href: string;
  }>;
}

interface BitbucketUser {
  name: string;
  emailAddress: string;
  active: boolean;
  displayName: string;
  id: number;
  slug: string;
  type: string;
  links: BitbucketUserLinks;
}

interface CommentAnchor {
  fromHash: string;
  toHash: string;
  line: number;
  lineType: string;
  fileType: string;
  path: string;
  diffType: string;
  orphaned: boolean;
}

interface CommentProperties {
  repositoryId: number;

  [key: string]: unknown; // Allow additional properties
}

interface PermittedOperations {
  editable: boolean;
  transitionable: boolean;
  deletable: boolean;
}

interface Comment {
  properties: CommentProperties;
  id: number;
  version: number;
  text: string;
  author: BitbucketUser;
  createdDate: number;
  updatedDate: number;
  comments: Comment[]; // Nested comments have the same structure
  anchor?: CommentAnchor;
  threadResolved: boolean;
  severity: string;
  state: string;
  permittedOperations: PermittedOperations;
}

interface DiffDestination {
  components: string[];
  parent: string;
  name: string;
  extension: string;
  toString: string;
}

interface DiffLine {
  destination: number;
  source: number;
  line: string;
  truncated: boolean;
  commentIds?: number[];
}

interface DiffSegment {
  type: string;
  lines: DiffLine[];
  truncated: boolean;
}

interface DiffHunk {
  sourceLine: number;
  sourceSpan: number;
  destinationLine: number;
  destinationSpan: number;
  segments: DiffSegment[];
  truncated: boolean;
}

interface DiffProperties {
  toHash: string;
  current: boolean;
  fromHash: string;
}

interface Diff {
  destination: DiffDestination;
  hunks: DiffHunk[];
  truncated: boolean;
  properties?: DiffProperties;
}

interface PRActivity {
  id: number;
  createdDate: number;
  user: BitbucketUser;
  action: string;
  commentAction?: string;
  comment?: Comment;
  commentAnchor?: CommentAnchor;
  diff?: Diff;
}

// This represents the actual API response structure (without the ApiErrorResponse wrapper)
// Note: We use 'unknown[]' for values to handle the mismatch between the generated
// RestPullRequestActivity type (which is empty) and the actual API response structure
export interface BitbucketPRApiResponse {
  size?: number;
  limit?: number;
  isLastPage?: boolean;
  values?: unknown[]; // Will be validated with type guards in the implementation
  start?: number;
  nextPageStart?: number;
}

// Simplified types for the output
interface SimplifiedUser {
  name: string;
  displayName: string;
}

interface SimplifiedAnchor {
  line: number;
  path: string;
  fileType?: string;
}

interface SimplifiedComment {
  id: number;
  text: string;
  author: SimplifiedUser;
  createdDate: number;
  anchor?: SimplifiedAnchor;
  threadResolved: boolean;
  state: string;
}

interface SimplifiedActivity {
  id: number;
  createdDate: number;
  user: SimplifiedUser;
  action: string;
  commentAction?: string;
  comment?: SimplifiedComment;
}

export interface SimplifiedPRResponse {
  isLastPage: boolean;
  activities: SimplifiedActivity[];
  summary: {
    totalActivities: number;
    prAuthor?: SimplifiedUser;
    commentCount: number;
    unresolvedCount: number;
  };
}

// Type guard functions to validate object structure
function isBitbucketUser(obj: unknown): obj is BitbucketUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).emailAddress === 'string' &&
    typeof (obj as any).active === 'boolean' &&
    typeof (obj as any).displayName === 'string' &&
    typeof (obj as any).id === 'number' &&
    typeof (obj as any).slug === 'string' &&
    typeof (obj as any).type === 'string' &&
    typeof (obj as any).links === 'object'
  );
}

function isCommentAnchor(obj: unknown): obj is CommentAnchor {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).fromHash === 'string' &&
    typeof (obj as any).toHash === 'string' &&
    typeof (obj as any).line === 'number' &&
    typeof (obj as any).lineType === 'string' &&
    typeof (obj as any).fileType === 'string' &&
    typeof (obj as any).path === 'string' &&
    typeof (obj as any).diffType === 'string' &&
    typeof (obj as any).orphaned === 'boolean'
  );
}

function isComment(obj: unknown): obj is Comment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'number' &&
    typeof (obj as any).version === 'number' &&
    typeof (obj as any).text === 'string' &&
    isBitbucketUser((obj as any).author) &&
    typeof (obj as any).createdDate === 'number' &&
    typeof (obj as any).updatedDate === 'number' &&
    Array.isArray((obj as any).comments) &&
    typeof (obj as any).threadResolved === 'boolean' &&
    typeof (obj as any).severity === 'string' &&
    typeof (obj as any).state === 'string' &&
    typeof (obj as any).properties === 'object' &&
    typeof (obj as any).permittedOperations === 'object'
  );
}

function isPRActivity(obj: unknown): obj is PRActivity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'number' &&
    typeof (obj as any).createdDate === 'number' &&
    isBitbucketUser((obj as any).user) &&
    typeof (obj as any).action === 'string'
  );
}

function simplifyUser(user: BitbucketUser): SimplifiedUser {
  return {
    name: user.name,
    displayName: user.displayName
  };
}

function simplifyAnchor(anchor: CommentAnchor): SimplifiedAnchor {
  return {
    line: anchor.line,
    path: anchor.path,
    fileType: anchor.fileType
  };
}

function simplifyComment(comment: Comment): SimplifiedComment {
  return {
    id: comment.id,
    text: comment.text,
    author: simplifyUser(comment.author),
    createdDate: comment.createdDate,
    ...(comment.anchor && { anchor: simplifyAnchor(comment.anchor) }),
    threadResolved: comment.threadResolved,
    state: comment.state
  };
}

function simplifyActivity(activity: PRActivity): SimplifiedActivity {
  return {
    id: activity.id,
    createdDate: activity.createdDate,
    user: simplifyUser(activity.user),
    action: activity.action,
    ...(activity.commentAction && { commentAction: activity.commentAction }),
    ...(activity.comment && { comment: simplifyComment(activity.comment) })
  };
}

export function simplifyBitbucketPRComments(response: BitbucketPRApiResponse): SimplifiedPRResponse | BitbucketPRApiResponse {
  const activities: SimplifiedActivity[] = [];

  // Process each activity with type guard validation
  for (const activity of response.values || []) {
    if (isPRActivity(activity)) {
      activities.push(simplifyActivity(activity));
    }
    // If type guard fails, we skip the invalid activity but continue processing
  }

  // If no valid activities were found, return the original response
  if (activities.length === 0 && (response.values || []).length > 0) {
    return response;
  }

  // Find PR author (usually the one who OPENED the PR)
  const prAuthor = activities.find(a => a.action === 'OPENED')?.user;

  // Count comments and unresolved threads
  const comments = activities.filter(a => a.action === 'COMMENTED' && a.comment);
  const unresolvedCount = comments.filter(a => a.comment && !a.comment.threadResolved).length;

  return {
    isLastPage: response.isLastPage ?? true,
    activities,
    summary: {
      totalActivities: activities.length,
      ...(prAuthor && { prAuthor }),
      commentCount: comments.length,
      unresolvedCount
    }
  };
}

export function getCommentSummary(response: BitbucketPRApiResponse): string[] {
  const commentSummaries: string[] = [];

  for (const activity of response.values || []) {
    // Use type guard to validate activity structure
    if (isPRActivity(activity) && activity.action === 'COMMENTED' && activity.comment) {
      // Additional validation for comment structure
      if (isComment(activity.comment)) {
        const comment = activity.comment;
        commentSummaries.push(
          `${comment.author.displayName} on ${comment.anchor?.path || 'PR'}:${comment.anchor?.line || ''}: ${comment.text}`
        );
      }
    }
    // If type guard fails, we skip the invalid activity but continue processing
  }

  return commentSummaries;
}
