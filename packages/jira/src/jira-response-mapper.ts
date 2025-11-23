import type { IssueBean } from './jira-client/models/IssueBean.js';
import type { SearchResultsBean } from './jira-client/models/SearchResultsBean.js';
import type { CommentJsonBean } from './jira-client/models/CommentJsonBean.js';
import type { UserJsonBean } from './jira-client/models/UserJsonBean.js';

// Simplified types for the output - only essential fields

export interface SimplifiedUser {
  displayName?: string;
  emailAddress?: string;
  active?: boolean;
}

export interface SimplifiedIssueFields {
  summary?: string;
  description?: string;
  status?: {
    name?: string;
    statusCategory?: {
      key?: string;
      name?: string;
    };
  };
  priority?: {
    name?: string;
  };
  issuetype?: {
    name?: string;
    subtask?: boolean;
  };
  assignee?: SimplifiedUser;
  reporter?: SimplifiedUser;
  created?: string;
  updated?: string;
  resolutiondate?: string;
  labels?: string[];
  components?: Array<{ name?: string }>;
  fixVersions?: Array<{ name?: string }>;
  comment?: {
    total?: number;
    comments?: SimplifiedComment[];
  };
  // Allow additional custom fields to pass through
  [key: string]: any;
}

export interface SimplifiedIssue {
  id?: string;
  key?: string;
  fields?: SimplifiedIssueFields;
}

export interface SimplifiedComment {
  id?: string;
  body?: string;
  author?: SimplifiedUser;
  created?: string;
  updated?: string;
}

export interface SimplifiedSearchResults {
  total?: number;
  startAt?: number;
  maxResults?: number;
  issues?: SimplifiedIssue[];
  warningMessages?: string[];
}

export interface SimplifiedCommentsResponse {
  total?: number;
  startAt?: number;
  maxResults?: number;
  comments?: SimplifiedComment[];
}

// Common fields that are typically important in JIRA issues
const COMMON_FIELD_KEYS = new Set([
  'summary',
  'description',
  'status',
  'priority',
  'issuetype',
  'assignee',
  'reporter',
  'created',
  'updated',
  'resolutiondate',
  'labels',
  'components',
  'fixVersions',
  'versions',
  'project',
  'parent',
  'subtasks',
  'comment',
  'attachment',
  'worklog',
  'timetracking',
  'duedate',
  'resolution'
]);

/**
 * Simplifies a UserJsonBean by removing unnecessary fields like avatarUrls and self links
 */
function simplifyUser(user?: UserJsonBean): SimplifiedUser | undefined {
  if (!user) return undefined;

  return {
    displayName: user.displayName,
    emailAddress: user.emailAddress,
    active: user.active
  };
}

/**
 * Simplifies issue fields by:
 * 1. Removing verbose metadata fields (schema, operations, etc.)
 * 2. Simplifying nested user objects
 * 3. Only keeping commonly used fields and custom fields
 */
function simplifyIssueFields(fields?: Record<string, any>): SimplifiedIssueFields | undefined {
  if (!fields) return undefined;

  const simplified: SimplifiedIssueFields = {};

  for (const [key, value] of Object.entries(fields)) {
    // Include common fields and custom fields (customfield_*)
    if (COMMON_FIELD_KEYS.has(key) || key.startsWith('customfield_')) {
      if (key === 'assignee' || key === 'reporter' || key === 'creator') {
        // Simplify user objects
        simplified[key] = simplifyUser(value);
      } else if (key === 'comment' && value?.comments) {
        // Simplify comments array
        simplified.comment = {
          total: value.total,
          comments: value.comments.map((c: any) => simplifyComment(c))
        };
      } else if (key === 'status' && value) {
        // Keep status but simplify structure
        simplified.status = {
          name: value.name,
          statusCategory: value.statusCategory ? {
            key: value.statusCategory.key,
            name: value.statusCategory.name
          } : undefined
        };
      } else if (key === 'priority' && value) {
        // Keep priority but only name
        simplified.priority = {
          name: value.name
        };
      } else if (key === 'issuetype' && value) {
        // Keep issue type but simplify
        simplified.issuetype = {
          name: value.name,
          subtask: value.subtask
        };
      } else if (key === 'components' && Array.isArray(value)) {
        // Simplify components to just names
        simplified.components = value.map((c: any) => ({ name: c.name }));
      } else if (key === 'fixVersions' && Array.isArray(value)) {
        // Simplify versions to just names
        simplified.fixVersions = value.map((v: any) => ({ name: v.name }));
      } else {
        // For other fields, pass through as-is
        simplified[key] = value;
      }
    }
  }

  return simplified;
}

/**
 * Simplifies an IssueBean by removing:
 * - self, schema, names, operations, transitions
 * - editmeta, properties, renderedFields, versionedRepresentations
 * - changelog (unless explicitly needed)
 */
export function simplifyIssue(issue?: IssueBean): SimplifiedIssue | undefined {
  if (!issue) return undefined;

  return {
    id: issue.id,
    key: issue.key,
    fields: simplifyIssueFields(issue.fields)
  };
}

/**
 * Simplifies a CommentJsonBean by removing:
 * - self links, properties, renderedBody
 * - updateAuthor (usually same as author)
 */
export function simplifyComment(comment?: CommentJsonBean): SimplifiedComment | undefined {
  if (!comment) return undefined;

  return {
    id: comment.id,
    body: comment.body,
    author: simplifyUser(comment.author),
    created: comment.created,
    updated: comment.updated
  };
}

/**
 * Simplifies SearchResultsBean by:
 * 1. Removing schema, names, expand fields
 * 2. Simplifying all issues in the results
 */
export function simplifySearchResults(results?: SearchResultsBean): SimplifiedSearchResults | undefined {
  if (!results) return undefined;

  return {
    total: results.total,
    startAt: results.startAt,
    maxResults: results.maxResults,
    issues: results.issues?.map(issue => simplifyIssue(issue)!).filter(i => i),
    warningMessages: results.warningMessages
  };
}

/**
 * Simplifies a comments response by removing unnecessary fields
 */
export function simplifyCommentsResponse(response?: any): SimplifiedCommentsResponse | undefined {
  if (!response) return undefined;

  return {
    total: response.total,
    startAt: response.startAt,
    maxResults: response.maxResults,
    comments: response.comments?.map((c: any) => simplifyComment(c)).filter((c: any) => c)
  };
}

/**
 * Generates a list of essential JIRA fields to request from the API.
 * This can be passed as the 'fields' parameter to reduce payload size at the source.
 */
export function getEssentialFields(): string[] {
  return [
    'summary',
    'description',
    'status',
    'priority',
    'issuetype',
    'assignee',
    'reporter',
    'created',
    'updated',
    'resolutiondate',
    'labels',
    'components',
    'fixVersions',
    'project',
    'comment'
  ];
}
