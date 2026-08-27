import { File } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';
import {
  downloadAttachment,
  handleApiOperation,
  resolveDownloadDestination,
  resolveOpenApiBase,
  resolveUploadSource,
  type AttachmentContentEncoding,
  type AttachmentGatewaySide,
} from '@atlassian-dc-mcp/common';
import { AttachmentService, IssueLinkService, IssueLinkTypeService, IssueService, MyselfService, OpenAPI, SearchService } from './jira-client/index.js';
import { request as __request } from './jira-client/core/request.js';
import type { StringList } from './jira-client/models/StringList.js';
import { getDefaultPageSize, getMissingConfig, JIRA_PRODUCT } from './config.js';

const DEFAULT_SEARCH_FIELDS = ['summary', 'description', 'status', 'assignee', 'reporter', 'priority', 'issuetype', 'labels', 'updated'];
const DEFAULT_ISSUE_FIELDS = [...DEFAULT_SEARCH_FIELDS, 'parent', 'subtasks'];

type DevelopmentDataType = 'pullrequest' | 'repository' | 'branch';
type DevelopmentApplicationType = 'stash' | 'bitbucket' | 'github' | 'githube';

function toIssueFieldSelection(fields: string[]): Array<StringList> {
  // The generated client types this query param as StringList[], but the API expects repeated string field names.
  return fields as unknown as Array<StringList>;
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
  private readonly tokenProvider: string | (() => string | undefined);

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
    OpenAPI.HEADERS = { 'X-Atlassian-Token': 'no-check' };
    this.tokenProvider = token;
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
      () => IssueService.getIssue1(issueKey, expand, (fields ?? DEFAULT_ISSUE_FIELDS).join(',')),
      'Error getting issue'
    );
  }

  async getIssueComments(issueKey: string, expand?: string, maxResults?: number, startAt?: number) {
    return handleApiOperation(
      () => IssueService.getComments(issueKey, expand, (maxResults ?? this.getPageSize()).toString(), undefined, startAt?.toString()),
      'Error getting issue comments'
    );
  }

  async postIssueComment(issueKey: string, comment: string) {
    return handleApiOperation(() => IssueService.addComment(issueKey, undefined, { body: comment }), 'Error posting issue comment');
  }

  async updateIssueComment(issueKey: string, commentId: string, comment: string) {
    return handleApiOperation(
      () => IssueService.updateComment(issueKey, commentId, undefined, { body: comment }),
      'Error updating issue comment'
    );
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
    const issue = await IssueService.getIssue1(issueKey, undefined, 'id');
    if (!issue?.id) {
      throw new Error(`Could not resolve numeric id for issue ${issueKey}`);
    }
    return issue.id;
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

  async uploadAttachment(issueKey: string, sourcePath: string, uploadSide: AttachmentGatewaySide, filename?: string) {
    return handleApiOperation(async () => {
      const { absolutePath } = await resolveUploadSource({ requestedPath: sourcePath, side: uploadSide });
      const buffer = await readFile(absolutePath);
      const name = filename || basename(absolutePath);
      const file = new File([buffer], name);
      // IssueService types formData as Blob, but the API expects { file } — getFormData handles File via isBlob()
      return IssueService.addAttachment(issueKey, { file } as any);
    }, 'Error uploading attachment');
  }

  /**
   * Download attachments from a JIRA issue, or a single attachment by its id.
   * Exactly one of `attachmentId` or `issueKey` must be provided.
   * @param params.attachmentId Download a single attachment by its numeric id
   * @param params.issueKey Download attachments from this issue (optionally filtered by filename)
   * @param params.filename When using issueKey, download only attachments with this exact filename
   * @param params.save Whether to write the attachment(s) to the operator-configured download directory
   * @param params.saveName Optional file name (basename only) when saving a single attachment
   * @param params.returnContent Whether/how to embed the bytes inline in the response
   * @param params.maxInlineBytes Inline embedding cap
   * @param params.downloadSide Resolved download gateway (roots, size limit, enabled flag)
   */
  async downloadAttachments(params: {
    attachmentId?: string;
    issueKey?: string;
    filename?: string;
    save?: boolean;
    saveName?: string;
    returnContent?: AttachmentContentEncoding;
    maxInlineBytes?: number;
    downloadSide: AttachmentGatewaySide;
  }) {
    return handleApiOperation(async () => {
      if (params.save && !params.downloadSide.enabled) {
        throw new Error(
          'Saving attachments to disk is disabled on this server. Enable it with ' +
            'JIRA_ATTACHMENTS_DOWNLOAD_ENABLED and configure a download directory.',
        );
      }
      const beans = await this.resolveAttachmentBeans(params);
      const multiple = beans.length > 1;
      const attachments = [];
      for (const bean of beans) {
        const url = bean?.content;
        if (!url) {
          throw new Error(`Attachment "${bean?.filename ?? bean?.id}" has no download URL`);
        }
        const filename = bean?.filename ?? String(bean?.id ?? 'attachment');
        let destination: string | undefined;
        if (params.save) {
          const requestedName = multiple ? filename : params.saveName ?? filename;
          destination = await resolveDownloadDestination({ requestedName, side: params.downloadSide });
        }
        attachments.push(
          await downloadAttachment({
            url,
            token: this.tokenProvider,
            filename,
            mediaType: bean?.mimeType,
            options: {
              destination,
              returnContent: params.returnContent,
              maxInlineBytes: params.maxInlineBytes,
              maxDownloadBytes: params.downloadSide.maxBytes,
            },
          }),
        );
      }
      return { count: attachments.length, attachments };
    }, 'Error downloading attachment');
  }

  private async resolveAttachmentBeans(params: {
    attachmentId?: string;
    issueKey?: string;
    filename?: string;
  }): Promise<Array<Record<string, any>>> {
    if (params.attachmentId) {
      const bean = await AttachmentService.getAttachment(params.attachmentId);
      return [bean as Record<string, any>];
    }
    if (!params.issueKey) {
      throw new Error('Either attachmentId or issueKey must be provided');
    }
    const issue = await IssueService.getIssue1(params.issueKey, undefined, 'attachment');
    const all = (((issue as any)?.fields?.attachment) ?? []) as Array<Record<string, any>>;
    const filtered = params.filename ? all.filter((a) => a?.filename === params.filename) : all;
    if (filtered.length === 0) {
      throw new Error(
        params.filename
          ? `No attachment named "${params.filename}" found on issue ${params.issueKey}`
          : `No attachments found on issue ${params.issueKey}`,
      );
    }
    return filtered;
  }

  async getIssueLinkTypes() {
    return handleApiOperation(
      () => IssueLinkTypeService.getIssueLinkTypes(),
      'Error getting issue link types'
    );
  }

  async linkIssues(params: {
    inwardIssueKey: string;
    outwardIssueKey: string;
    linkType: string;
    comment?: string;
  }) {
    return handleApiOperation(() => {
      return IssueLinkService.linkIssues({
        type: { name: params.linkType },
        inwardIssue: { key: params.inwardIssueKey },
        outwardIssue: { key: params.outwardIssueKey },
        ...(params.comment ? { comment: { body: params.comment } } : {}),
      });
    }, 'Error linking issues');
  }

  async unlinkIssues(linkId: string) {
    return handleApiOperation(
      () => IssueLinkService.deleteIssueLink(linkId),
      'Error unlinking issues'
    );
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
  postIssueComment: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    comment: z.string().describe("Comment text in the format suitable for JIRA DATA CENTER edition (JIRA Wiki Markup).")
  },
  updateIssueComment: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    commentId: z.string().describe("The id of the comment to update. Comment ids can be found via jira_getIssueComments."),
    comment: z.string().describe("New comment text that replaces the existing body, in the format suitable for JIRA DATA CENTER edition (JIRA Wiki Markup).")
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
  },
  uploadAttachment: {
    issueKey: z.string().describe("JIRA issue key (e.g., PROJ-123)"),
    sourcePath: z.string().describe("Path to the file to upload, relative to a server-configured attachment upload directory. Absolute paths and '..' segments are rejected; symlinks and non-regular files are refused."),
    filename: z.string().optional().describe("Override for the attachment filename (defaults to the basename of sourcePath)")
  },
  downloadAttachment: {
    issueKey: z.string().optional().describe("JIRA issue key (e.g., PROJ-123) whose attachment(s) to download. Provide either issueKey or attachmentId."),
    attachmentId: z.string().optional().describe("Numeric id of a single attachment to download. Provide either attachmentId or issueKey."),
    filename: z.string().optional().describe("When using issueKey, download only attachments with this exact filename. If omitted, all attachments on the issue are downloaded."),
    returnContent: z.enum(['none', 'base64', 'text']).optional().describe("Whether to embed the file bytes in the response: 'none' (default), 'base64' for binary, or 'text' for UTF-8 text."),
    maxInlineBytes: z.number().optional().describe("Maximum bytes to embed inline when returnContent is base64/text. Larger files are omitted from the inline content. Defaults to 1 MiB.")
  },
  downloadAttachmentSaveFields: {
    save: z.boolean().optional().describe("Save the attachment(s) into the server-configured download directory. Requires disk downloads to be enabled on the server."),
    saveName: z.string().optional().describe("Optional file name (no directories) to use when saving a single attachment; defaults to the attachment's own name. Existing files are never overwritten.")
  },
  getIssueLinkTypes: {},
  linkIssues: {
    inwardIssueKey: z.string().describe("Key of the inward issue (the one the inward link description applies to, e.g. the issue that 'is blocked by'). Example: PROJ-123"),
    outwardIssueKey: z.string().describe("Key of the outward issue (the one the outward link description applies to, e.g. the issue that 'blocks'). Example: PROJ-456"),
    linkType: z.string().describe("Name of the issue link type to apply (e.g. 'Blocks', 'Relates', 'Duplicate'). Use jira_getIssueLinkTypes to discover valid names for this JIRA installation."),
    comment: z.string().optional().describe("Optional comment added to the inward issue when the link is created, in JIRA Wiki Markup.")
  },
  unlinkIssues: {
    linkId: z.string().describe("The id of the issue link to delete. Link ids can be found in the 'issuelinks' field of an issue (retrieve it via jira_getIssue with the 'issuelinks' field).")
  }
};
