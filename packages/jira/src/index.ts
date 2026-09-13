import { connectServer, createMcpServer, formatToolResponse, initializeRuntimeConfig, resolveAttachmentGateway } from '@atlassian-dc-mcp/common';
import { JiraService, jiraToolSchemas } from './jira-service.js';
import { getDefaultPageSize, getJiraRuntimeConfig, JIRA_PRODUCT } from './config.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

initializeRuntimeConfig();

const missingEnvVars = JiraService.validateConfig();
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const jiraConfig = getJiraRuntimeConfig();
const jiraService = new JiraService(
  jiraConfig.host,
  () => getJiraRuntimeConfig().token,
  jiraConfig.apiBasePath,
  getDefaultPageSize,
);

const server = createMcpServer({
  name: "atlassian-jira-mcp",
  version
});

const jiraInstanceType = "JIRA Data Center edition instance";

server.tool(
  "jira_searchIssues",
  `Search for JIRA issues using JQL in the ${jiraInstanceType}`,
  jiraToolSchemas.searchIssues,
  async ({ jql, expand, startAt, maxResults, fields }) => {
    const result = await jiraService.searchIssues(jql, startAt, expand, maxResults, fields);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_getIssue",
  `Get details of a JIRA issue by its key from the ${jiraInstanceType}`,
  jiraToolSchemas.getIssue,
  async ({ issueKey, expand, fields }) => {
    const result = await jiraService.getIssue(issueKey, expand, fields);
    return formatToolResponse(result);
  }
);

server.tool(
  'jira_getIssueComments',
  `Get comments of a JIRA issue by its key from the ${jiraInstanceType}`,
  jiraToolSchemas.getIssueComments,
  async ({ issueKey, expand, maxResults, startAt }) => {
    const result = await jiraService.getIssueComments(issueKey, expand, maxResults, startAt);
    return formatToolResponse(result);
  });

server.tool(
  "jira_createIssue",
  `Create a new JIRA issue in the ${jiraInstanceType}`,
  jiraToolSchemas.createIssue,
  async (params) => {
    const result = await jiraService.createIssue(params);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_updateIssue",
  `Update an existing JIRA issue in the ${jiraInstanceType}`,
  jiraToolSchemas.updateIssue,
  async (params) => {
    const result = await jiraService.updateIssue(params);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_postIssueComment",
  `Post a comment on a JIRA issue in the ${jiraInstanceType}`,
  jiraToolSchemas.postIssueComment,
  async ({ issueKey, comment }) => {
    const result = await jiraService.postIssueComment(issueKey, comment);
    return formatToolResponse(result);
  }
)

server.tool(
  "jira_updateIssueComment",
  `Update the body of an existing comment on a JIRA issue in the ${jiraInstanceType}. Use jira_getIssueComments to find the comment id.`,
  jiraToolSchemas.updateIssueComment,
  async ({ issueKey, commentId, comment }) => {
    const result = await jiraService.updateIssueComment(issueKey, commentId, comment);
    return formatToolResponse(result);
  }
)

server.tool(
  "jira_getTransitions",
  `Get available status transitions for a JIRA issue in the ${jiraInstanceType}. Returns a list of transitions with their IDs, names, and target statuses.`,
  jiraToolSchemas.getTransitions,
  async ({ issueKey }) => {
    const result = await jiraService.getTransitions(issueKey);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_getIssueDevelopmentInfo",
  `Get linked development information (pull requests, commits, or branches) shown in the Development panel of a JIRA issue in the ${jiraInstanceType}. Defaults to pull requests from Bitbucket.`,
  jiraToolSchemas.getIssueDevelopmentInfo,
  async ({ issueKey, dataType, applicationType }) => {
    const result = await jiraService.getIssueDevelopmentInfo(issueKey, dataType, applicationType);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_transitionIssue",
  `Transition a JIRA issue to a new status in the ${jiraInstanceType}. Use jira_getTransitions first to get available transition IDs.`,
  jiraToolSchemas.transitionIssue,
  async (params) => {
    const result = await jiraService.transitionIssue(params);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_getIssueLinkTypes",
  `Get the list of available issue link types (e.g. Blocks, Relates, Duplicate) in the ${jiraInstanceType}. Use this to discover valid link type names before calling jira_linkIssues.`,
  jiraToolSchemas.getIssueLinkTypes,
  async () => {
    const result = await jiraService.getIssueLinkTypes();
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_linkIssues",
  `Create a link between two JIRA issues in the ${jiraInstanceType}. Direction is easy to invert vs the Jira UI: inwardIssueKey is the issue that DISPLAYS the outward phrase (e.g. 'blocks'); outwardIssueKey displays the inward phrase (e.g. 'is blocked by'). After create, GET the first issue — it must have outwardIssue = the second key. Use jira_getIssueLinkTypes for valid type names.`,
  jiraToolSchemas.linkIssues,
  async (params) => {
    const result = await jiraService.linkIssues(params);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_unlinkIssues",
  `Delete an existing link between two JIRA issues in the ${jiraInstanceType}. Requires the issue link id (found in the 'issuelinks' field of an issue).`,
  jiraToolSchemas.unlinkIssues,
  async ({ linkId }) => {
    const result = await jiraService.unlinkIssues(linkId);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_watchIssue",
  `Add yourself (the authenticated user) as a watcher on a JIRA issue in the ${jiraInstanceType}. Only the calling user can be added; there is no way to watch on behalf of someone else.`,
  jiraToolSchemas.watchIssue,
  async ({ issueKey }) => {
    const result = await jiraService.watchIssue(issueKey);
    return formatToolResponse(result);
  }
);

server.tool(
  "jira_unwatchIssue",
  `Remove yourself (the authenticated user) as a watcher from a JIRA issue in the ${jiraInstanceType}. Only the calling user can be removed; there is no way to unwatch on behalf of someone else.`,
  jiraToolSchemas.unwatchIssue,
  async ({ issueKey }) => {
    const result = await jiraService.unwatchIssue(issueKey);
    return formatToolResponse(result);
  }
);

const attachmentGateway = resolveAttachmentGateway(JIRA_PRODUCT);

// Filesystem-reading upload is only registered when the operator explicitly enables it.
if (attachmentGateway.upload.enabled) {
  server.tool(
    "jira_uploadAttachment",
    `Upload a local file as an attachment to a JIRA issue in the ${jiraInstanceType}. The file must live under the server-configured upload directory; the path is given relative to that directory.`,
    jiraToolSchemas.uploadAttachment,
    async ({ issueKey, sourcePath, filename }) => {
      const result = await jiraService.uploadAttachment(issueKey, sourcePath, attachmentGateway.upload, filename);
      return formatToolResponse(result);
    }
  );
}

// Download always returns content inline (no filesystem access). Saving to disk is
// only offered when the operator enables it, and is confined to the configured directory.
const downloadSaveEnabled = attachmentGateway.download.enabled;
server.tool(
  "jira_downloadAttachment",
  `Download attachment(s) from a JIRA issue in the ${jiraInstanceType}, by issue key (optionally filtered by filename) or by a single attachment id. Returns the file content inline (base64 or text). Useful for inspecting a file or moving it elsewhere (e.g. re-uploading to a Confluence page).${downloadSaveEnabled ? ' Can also save into the server-configured download directory; existing files are never overwritten.' : ' Saving to local disk is disabled on this server.'}`,
  { ...jiraToolSchemas.downloadAttachment, ...(downloadSaveEnabled ? jiraToolSchemas.downloadAttachmentSaveFields : {}) },
  async ({ issueKey, attachmentId, filename, returnContent, maxInlineBytes, save, saveName }: {
    issueKey?: string;
    attachmentId?: string;
    filename?: string;
    returnContent?: 'none' | 'base64' | 'text';
    maxInlineBytes?: number;
    save?: boolean;
    saveName?: string;
  }) => {
    const result = await jiraService.downloadAttachments({
      issueKey,
      attachmentId,
      filename,
      save,
      saveName,
      returnContent,
      maxInlineBytes,
      downloadSide: attachmentGateway.download,
    });
    return formatToolResponse(result);
  }
);

await connectServer(server);
