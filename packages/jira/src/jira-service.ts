import { z } from 'zod';
import { handleApiOperation, resolveOpenApiBase } from '@atlassian-dc-mcp/common';
import { IssueService, MyselfService, OpenAPI, SearchService } from './jira-client/index.js';
import { request as __request } from './jira-client/core/request.js';
import type { StringList } from './jira-client/models/StringList.js';
import { getDefaultPageSize, getMissingConfig, JIRA_PRODUCT } from './config.js';

const DEFAULT_SEARCH_FIELDS = ['summary', 'description', 'status', 'assignee', 'reporter', 'priority', 'issuetype', 'labels', 'updated'];
const DEFAULT_ISSUE_FIELDS = [...DEFAULT_SEARCH_FIELDS, 'parent', 'subtasks'];

const DEFAULT_MAX_ATTACHMENT_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

type DevelopmentDataType = 'pullrequest' | 'repository' | 'branch';
type DevelopmentApplicationType = 'stash' | 'bitbucket' | 'github' | 'githube';

export interface JiraAttachmentMetadata {
  id: string;
  filename: string;
  mimeType?: string;
  size?: number;
  created?: string;
  author?: { name?: string; displayName?: string };
  hasThumbnail?: boolean;
}
export interface JiraIssueAttachmentsResult {
  issueKey: string;
  attachments: JiraAttachmentMetadata[];
}
export interface JiraAttachmentDownloadResult {
  issueKey: string;
  attachmentId: string;
  filename: string;
  mimeType?: string;
  size: number;
  encoding: 'base64';
  data: string;
}

function toIssueFieldSelection(fields: string[]): Array<StringList> {
  // The generated client types this query param as StringList[], but the API expects repeated string field names.
  return fields as unknown as Array<StringList>;
}

function getMaxAttachmentBytes(): number {
  const parsed = Number.parseInt(process.env.JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ATTACHMENT_DOWNLOAD_BYTES;
}

function getRequestTimeoutMs(): number {
  // Mirrors the request timeout convention of jira-client/core/request.ts, which does not export its helper.
  const raw = process.env.ATLASSIAN_DC_MCP_REQUEST_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS;
}

function resolveToken(token: string | (() => string | undefined), missingTokenMessage: string) {
  return async () => {
    const resolvedToken = typeof token === 'function' ? token() : token;
    if (!resolvedToken) {
      throw new Error(missingTokenMessage);
    }
    return resolvedToken;
  };
}

export class JiraService {
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
      defaultBasePath: JIRA_PRODUCT.defaultApiBasePath ?? '/rest',
      strippableSuffixes: JIRA_PRODUCT.apiBasePathStrippableSuffixes,
    });
    OpenAPI.TOKEN = resolveToken(token, 'Missing required environment variable: JIRA_API_TOKEN');
    OpenAPI.VERSION = '2';
    this.getPageSize = getPageSize;
  }

  async searchIssues(jql: string, startAt?: number, expand?: string[], maxResults?: number, fields?: string[]) {
    return handleApiOperation(() => {
      return SearchService.searchUsingSearchRequest({
        jql,
        maxResults: maxResults ?? this.getPageSize(),
        fields: fields ?? DEFAULT_SEARCH_FIELDS,
        expand,
        startAt
      });
    }, 'Error searching issues');
  }

  async getIssue(issueKey: string, expand?: string, fields?: string[]) {
    return handleApiOperation(
      () => IssueService.getIssue(issueKey, expand, toIssueFieldSelection(fields ?? DEFAULT_ISSUE_FIELDS)),
      'Error getting issue'
    );
  }

  async getIssueComments(issueKey: string, expand?: string, maxResults?: number, startAt?: number) {
    return handleApiOperation(
      () => IssueService.getComments(issueKey, expand, (maxResults ?? this.getPageSize()).toString(), undefined, startAt?.toString()),
      'Error getting issue comments'
    );
  }

  async getIssueAttachments(issueKey: string) {
    return handleApiOperation(async (): Promise<JiraIssueAttachmentsResult> => {
      const attachments = await this.fetchIssueAttachments(issueKey);
      return { issueKey, attachments };
    }, 'Error getting issue attachments');
  }

  async downloadIssueAttachment(issueKey: string, attachmentId: string) {
    return handleApiOperation(async (): Promise<JiraAttachmentDownloadResult> => {
      const attachments = await this.fetchIssueAttachments(issueKey);
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} is not attached to issue ${issueKey}; the issue has ${attachments.length} attachment(s)`);
      }

      const maxBytes = getMaxAttachmentBytes();
      if (typeof attachment.size === 'number' && attachment.size > maxBytes) {
        throw new Error(`Attachment ${attachment.id} is ${attachment.size} bytes, which exceeds the ${maxBytes} byte limit; set JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES to allow larger downloads`);
      }

      // The DC REST API has no attachment content endpoint; the canonical web path is /secure/attachment/<id>/<filename>.
      const webBase = OpenAPI.BASE.replace(/\/rest\/?$/, '');
      const url = `${webBase}/secure/attachment/${encodeURIComponent(attachment.id)}/${encodeURIComponent(attachment.filename)}`;

      const token = typeof OpenAPI.TOKEN === 'function' ? await OpenAPI.TOKEN({ method: 'GET', url }) : OpenAPI.TOKEN;
      if (!token) {
        throw new Error('Missing required environment variable: JIRA_API_TOKEN');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'error',
        signal: AbortSignal.timeout(getRequestTimeoutMs())
      });
      if (!response.ok) {
        const error = new Error(`Failed to download attachment ${attachment.id}: ${response.status} ${response.statusText}`);
        Object.assign(error, {
          status: response.status,
          statusText: response.statusText,
          body: (await response.text()).slice(0, 500)
        });
        throw error;
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) {
        throw new Error(`Attachment ${attachment.id} is ${bytes.byteLength} bytes, which exceeds the ${maxBytes} byte limit; set JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES to allow larger downloads`);
      }

      const result: JiraAttachmentDownloadResult = {
        issueKey,
        attachmentId: attachment.id,
        filename: attachment.filename,
        size: bytes.byteLength,
        encoding: 'base64',
        data: bytes.toString('base64')
      };
      if (attachment.mimeType !== undefined) {
        result.mimeType = attachment.mimeType;
      }
      return result;
    }, 'Error downloading issue attachment');
  }

  async postIssueComment(issueKey: string, comment: string) {
    return handleApiOperation(() => IssueService.addComment(issueKey, undefined, { body: comment }), 'Error posting issue comment');
  }

  async createIssue(params: {
    projectId: string;
    summary: string;
    description: string;
    issueTypeId: string;
    customFields?: Record<string, any>;
  }) {
    return handleApiOperation(async () => {
      const standardFields = {
        project: { key: params.projectId },
        summary: params.summary,
        description: params.description,
        issuetype: { id: params.issueTypeId }
      };

      const fields = params.customFields
        ? { ...standardFields, ...params.customFields }
        : standardFields;

      return IssueService.createIssue(true, { fields });
    }, 'Error creating issue');
  }

  async updateIssue(params: {
    issueKey: string;
    summary?: string;
    description?: string;
    issueTypeId?: string;
    customFields?: Record<string, any>;
  }) {
    return handleApiOperation(async () => {
      const standardFields: Record<string, any> = {};
      if (params.summary !== undefined) {
        standardFields.summary = params.summary;
      }
      if (params.description !== undefined) {
        standardFields.description = params.description;
      }
      if (params.issueTypeId !== undefined) {
        standardFields.issuetype = { id: params.issueTypeId };
      }

      const fields = params.customFields
        ? { ...standardFields, ...params.customFields }
        : standardFields;

      return IssueService.editIssue(params.issueKey, 'true', { fields });
    }, 'Error updating issue');
  }

  async getTransitions(issueKey: string) {
    return handleApiOperation(
      () => IssueService.getTransitions(issueKey),
      'Error getting transitions'
    );
  }

  async getIssueDevelopmentInfo(
    issueKey: string,
    dataType: DevelopmentDataType = 'pullrequest',
    applicationType: DevelopmentApplicationType = 'stash',
  ) {
    return handleApiOperation(async () => {
      const issueId = await this.resolveIssueId(issueKey);
      return __request(OpenAPI, {
        method: 'GET',
        url: '/dev-status/1.0/issue/detail',
        query: { issueId, applicationType, dataType },
      });
    }, 'Error getting issue development info');
  }

  private async resolveIssueId(issueKey: string): Promise<string> {
    // The dev-status API is keyed by the numeric issue id, not the issue key.
    const issue = await IssueService.getIssue(issueKey, undefined, toIssueFieldSelection(['id']));
    if (!issue?.id) {
      throw new Error(`Could not resolve numeric id for issue ${issueKey}`);
    }
    return issue.id;
  }

  private async fetchIssueAttachments(issueKey: string): Promise<JiraAttachmentMetadata[]> {
    const issue = await IssueService.getIssue(issueKey, undefined, toIssueFieldSelection(['attachment']));
    const rawAttachments = (issue.fields?.attachment ?? []) as unknown as Array<Record<string, any>>;

    const attachments: JiraAttachmentMetadata[] = [];
    for (const attachment of rawAttachments) {
      if (attachment?.id === undefined || attachment?.id === null) {
        continue;
      }

      const metadata: JiraAttachmentMetadata = {
        id: String(attachment.id),
        filename: attachment.filename ?? '',
        hasThumbnail: Boolean(attachment.thumbnail)
      };
      if (attachment.mimeType !== undefined) {
        metadata.mimeType = attachment.mimeType;
      }
      if (attachment.size !== undefined) {
        metadata.size = attachment.size;
      }
      if (attachment.created !== undefined) {
        metadata.created = attachment.created;
      }
      if (attachment.author) {
        metadata.author = { name: attachment.author.name, displayName: attachment.author.displayName };
      }

      attachments.push(metadata);
    }

    return attachments;
  }

  async transitionIssue(params: {
    issueKey: string;
    transitionId: string;
    fields?: Record<string, any>;
    customFields?: Record<string, any>;
  }) {
    return handleApiOperation(async () => {
      const requestBody: { transition: { id: string }; fields?: Record<string, any> } = {
        transition: { id: params.transitionId }
      };
      if (params.fields) {
        requestBody.fields = params.fields;
      }
      if (params.customFields) {
        Object.assign(requestBody, params.customFields);
      }
      return IssueService.doTransition(params.issueKey, requestBody);
    }, 'Error transitioning issue');
  }

  async validateSetup(): Promise<void> {
    await MyselfService.getUser();
  }

  static validateConfig(): string[] {
    return getMissingConfig();
  }
}

export const jiraToolSchemas = {
  searchIssues: {
    jql: z.string().describe("JQL query string"),
    maxResults: z.number().optional().describe("Maximum number of results to return"),
    startAt: z.number().optional().describe("Index of the first result to return"),
    expand: z.array(z.string()).optional().describe("Additional sections to expand in the search response, such as renderedFields, names, or schema"),
    fields: z.array(z.string()).optional().describe("Issue field names to include in the response. When omitted, a moderate-detail default field set is used.")
  },
  getIssue: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    expand: z.string().optional().describe("Comma-separated response sections to expand, such as renderedFields, changelog, or transitions"),
    fields: z.array(z.string()).optional().describe("Issue field names to include in the response. When omitted, a moderate-detail default field set is used.")
  },
  getIssueComments: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    expand: z.string().optional().describe("Comma-separated comment expansions, such as renderedBody"),
    maxResults: z.number().optional().describe("Maximum number of comments to return"),
    startAt: z.number().optional().describe("Index of the first comment to return")
  },
  getIssueAttachments: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)")
  },
  downloadIssueAttachment: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    attachmentId: z.string().describe("Numeric attachment ID as returned by jira_getIssueAttachments")
  },
  postIssueComment: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    comment: z.string().describe("Comment text in the format suitable for JIRA DATA CENTER edition (JIRA Wiki Markup).")
  },
  createIssue: {
    projectId: z.string().describe("Project key (despite the parameter name, e.g. TEST)"),
    summary: z.string().describe("Issue summary"),
    description: z.string().describe("Issue description in the format suitable for JIRA DATA CENTER edition (JIRA Wiki Markup)."),
    issueTypeId: z.string().describe("Issue type id (e.g. id of Task, Bug, Story). Should be found first a correct number for specific JIRA installation."),
    customFields: z.record(z.any()).optional().describe("Optional fields merged into the JIRA create payload. Can be used for custom fields and standard fields such as labels. Examples: {'customfield_10001': 'Custom Value', 'priority': {'id': '1'}, 'assignee': {'name': 'john.doe'}, 'labels': ['urgent', 'bug']}")
  },
  updateIssue: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    summary: z.string().optional().describe("New summary (optional)"),
    description: z.string().optional().describe("New description in JIRA Wiki Markup (optional)"),
    issueTypeId: z.string().optional().describe("New issue type id (optional)"),
    customFields: z.record(z.any()).optional().describe("Optional fields merged into the JIRA update payload. Can be used for custom fields and standard fields such as labels. Examples: {'customfield_10001': 'Custom Value', 'priority': {'id': '1'}, 'assignee': {'name': 'john.doe'}, 'labels': ['urgent', 'bug']}")
  },
  getTransitions: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)")
  },
  getIssueDevelopmentInfo: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    dataType: z.enum(['pullrequest', 'repository', 'branch']).optional().describe("Development data to fetch: 'pullrequest' (default), 'repository' (commits), or 'branch'"),
    applicationType: z.enum(['stash', 'bitbucket', 'github', 'githube']).optional().describe("Linked SCM type: 'stash' (Bitbucket Server/Data Center, default), 'bitbucket' (Cloud), 'github', or 'githube' (GitHub Enterprise)")
  },
  transitionIssue: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    transitionId: z.string().describe("The ID of the transition to perform. Use jira_getTransitions to find available transitions and their IDs."),
    fields: z.record(z.any()).optional().describe("Optional fields required by the transition screen. Use jira_getTransitions to see which fields are available for each transition."),
    customFields: z.record(z.any()).optional().describe("Optional fields merged into the JIRA transition payload. Can be used for update operations such as comments. Example: {'update': {'comment': [{'add': {'body': 'text'}}]}}")
  }
};
