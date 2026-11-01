import { z } from 'zod';
import { handleApiOperation } from '@atlassian-dc-mcp/common';
import { ProjectService, VersionService } from './jira-client/index.js';
import type { VersionBean } from './jira-client/models/VersionBean.js';

const VERSION_ORDER_FIELDS = ['sequence', 'name', 'startDate', 'releaseDate'] as const;
const VERSION_ORDERS = VERSION_ORDER_FIELDS.flatMap((field) => [field, `-${field}`] as const);

type VersionOrder = (typeof VERSION_ORDERS)[number];

export interface VersionFields {
  name?: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  released?: boolean;
  archived?: boolean;
}

export interface GetProjectVersionsParams {
  projectKey: string;
  query?: string;
  released?: boolean;
  archived?: boolean;
  orderBy?: VersionOrder;
  startAt?: number;
  maxResults: number;
}

export interface CreateVersionParams extends VersionFields {
  projectKey: string;
  name: string;
}

export interface UpdateVersionParams extends VersionFields {
  versionId: string;
}

/**
 * Drops the self link and the locale-formatted duplicates of the ISO dates (userReleaseDate,
 * userStartDate): a project easily has hundreds of versions, and these fields carry no extra information.
 */
function toVersionSummary(version: VersionBean) {
  const { self, expand, userReleaseDate, userStartDate, ...summary } = version;
  return summary;
}

function matchesFilters(version: VersionBean, params: GetProjectVersionsParams) {
  const query = params.query?.toLowerCase();
  return (!query || (version.name ?? '').toLowerCase().includes(query))
    && (params.released === undefined || Boolean(version.released) === params.released)
    && (params.archived === undefined || Boolean(version.archived) === params.archived);
}

function sortVersions(versions: VersionBean[], orderBy: VersionOrder = 'sequence') {
  const descending = orderBy.startsWith('-');
  const field = orderBy.replace(/^-/, '') as (typeof VERSION_ORDER_FIELDS)[number];
  if (field === 'sequence') {
    // Jira already returns project versions in their sequence order.
    return descending ? [...versions].reverse() : versions;
  }
  const direction = descending ? -1 : 1;
  return [...versions].sort((a, b) => {
    const left = a[field];
    const right = b[field];
    if (left === right) return 0;
    // Versions without a value stay at the end in both directions.
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return left.localeCompare(right) * direction;
  });
}

/**
 * Lists the versions of a project. Jira Data Center ignores name and status filters on its
 * paginated version endpoint, so the full list is fetched once and filtered and paged here.
 */
export async function getProjectVersions(params: GetProjectVersionsParams) {
  return handleApiOperation(async () => {
    // The generated client types this endpoint as a single VersionBean, but it returns an array.
    const all = (await ProjectService.getProjectVersions(params.projectKey)) as unknown as VersionBean[];
    const matching = sortVersions(all.filter((version) => matchesFilters(version, params)), params.orderBy);
    const startAt = params.startAt ?? 0;
    const values = matching.slice(startAt, startAt + params.maxResults).map(toVersionSummary);
    return {
      total: matching.length,
      startAt,
      maxResults: params.maxResults,
      isLast: startAt + values.length >= matching.length,
      values,
    };
  }, 'Error getting project versions');
}

export async function getVersion(versionId: string) {
  return handleApiOperation(
    async () => toVersionSummary(await VersionService.getVersion(versionId)),
    'Error getting version'
  );
}

function definedFields(fields: VersionFields): VersionFields {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

export async function createVersion(params: CreateVersionParams) {
  const { projectKey, ...fields } = params;
  return handleApiOperation(
    async () => toVersionSummary(await VersionService.createVersion({ project: projectKey, ...definedFields(fields) })),
    'Error creating version'
  );
}

export async function updateVersion(params: UpdateVersionParams) {
  const { versionId, ...fields } = params;
  return handleApiOperation(async () => {
    const changes = definedFields(fields);
    if (Object.keys(changes).length === 0) {
      throw new Error('Nothing to update: provide at least one version field to change');
    }
    return toVersionSummary(await VersionService.updateVersion(versionId, changes));
  }, 'Error updating version');
}

export const VERSION_DELETE_FLAG = 'JIRA_VERSION_DELETE_ENABLED';

/**
 * Deleting a version removes it from every issue that uses it, which the API cannot undo, so the
 * tool is only registered when the operator opts in. The flag is read once at startup.
 */
export function isVersionDeleteEnabled(env: Record<string, string | undefined> = process.env) {
  const value = env[VERSION_DELETE_FLAG]?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export interface DeleteVersionParams {
  versionId: string;
  moveFixIssuesTo?: string;
  moveAffectedIssuesTo?: string;
}

/** Reports how many issues used the version, so the caller sees what the deletion touched. */
export async function deleteVersion(params: DeleteVersionParams) {
  const { versionId, moveFixIssuesTo, moveAffectedIssuesTo } = params;
  return handleApiOperation(async () => {
    const counts = await VersionService.getVersionRelatedIssues(versionId);
    await VersionService.delete1(versionId, {
      ...(moveFixIssuesTo ? { moveFixIssuesTo: Number(moveFixIssuesTo) } : {}),
      ...(moveAffectedIssuesTo ? { moveAffectedIssuesTo: Number(moveAffectedIssuesTo) } : {}),
    });
    return {
      deleted: versionId,
      issuesFixedCount: counts?.issuesFixedCount ?? 0,
      issuesAffectedCount: counts?.issuesAffectedCount ?? 0,
      fixIssuesMovedTo: moveFixIssuesTo ?? null,
      affectedIssuesMovedTo: moveAffectedIssuesTo ?? null,
    };
  }, 'Error deleting version');
}

// A factory rather than a shared constant: the JSON Schema conversion turns a reused Zod instance
// into a $ref to its first occurrence, which some MCP clients do not resolve.
const isoDate = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format');
const numericId = () => z.string().regex(/^\d+$/, 'Expected a numeric version id');

const versionFieldSchemas = {
  description: z.string().optional().describe("Version description"),
  startDate: isoDate().optional().describe("Start date in YYYY-MM-DD format"),
  releaseDate: isoDate().optional().describe("Release date in YYYY-MM-DD format"),
  released: z.boolean().optional().describe("Whether the version is released"),
  archived: z.boolean().optional().describe("Whether the version is archived"),
};

export const versionToolSchemas = {
  getProjectVersions: {
    projectKey: z.string().describe("Project key (e.g., PROJ)"),
    query: z.string().optional().describe("Only return versions whose name contains this text (case-insensitive)"),
    released: z.boolean().optional().describe("Only return released (true) or unreleased (false) versions"),
    archived: z.boolean().optional().describe("Only return archived (true) or unarchived (false) versions"),
    orderBy: z.enum(VERSION_ORDERS as [VersionOrder, ...VersionOrder[]]).optional()
      .describe("Sort order: sequence (default, as shown in Jira), name, startDate or releaseDate; prefix with '-' for descending"),
    startAt: z.number().optional().describe("Index of the first matching version to return"),
    maxResults: z.number().optional().describe("Maximum number of versions to return"),
  },
  getVersion: {
    versionId: z.string().describe("Numeric version id (found via jira_getProjectVersions)"),
  },
  createVersion: {
    projectKey: z.string().describe("Project key (e.g., PROJ)"),
    name: z.string().describe("Version name, unique within the project"),
    ...versionFieldSchemas,
  },
  updateVersion: {
    versionId: z.string().describe("Numeric version id (found via jira_getProjectVersions)"),
    name: z.string().optional().describe("New version name, unique within the project"),
    ...versionFieldSchemas,
  },
  deleteVersion: {
    versionId: numericId().describe("Numeric id of the version to delete (found via jira_getProjectVersions)"),
    moveFixIssuesTo: numericId().optional()
      .describe("Numeric id of a version in the same project that receives this version's Fix Version issues. If omitted, the version is just removed from those issues."),
    moveAffectedIssuesTo: numericId().optional()
      .describe("Numeric id of a version in the same project that receives this version's Affects Version issues. If omitted, the version is just removed from those issues."),
  },
};
