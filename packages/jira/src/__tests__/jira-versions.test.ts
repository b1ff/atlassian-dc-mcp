import { z } from 'zod';
import { ProjectService, VersionService } from '../jira-client/index.js';
import {
  createVersion,
  deleteVersion,
  getProjectVersions,
  getVersion,
  isVersionDeleteEnabled,
  updateVersion,
  versionToolSchemas,
} from '../jira-versions.js';

jest.mock('../jira-client/index.js', () => ({
  ProjectService: {
    getProjectVersions: jest.fn(),
  },
  VersionService: {
    getVersion: jest.fn(),
    createVersion: jest.fn(),
    updateVersion: jest.fn(),
    getVersionRelatedIssues: jest.fn(),
    delete1: jest.fn(),
  },
  OpenAPI: { BASE: '', TOKEN: '', VERSION: '' },
}));

const listVersions = ProjectService.getProjectVersions as jest.Mock;
const fetchVersion = VersionService.getVersion as jest.Mock;
const postVersion = VersionService.createVersion as jest.Mock;
const putVersion = VersionService.updateVersion as jest.Mock;
const relatedIssues = VersionService.getVersionRelatedIssues as jest.Mock;
const removeVersion = VersionService.delete1 as jest.Mock;

function bean(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    self: `https://jira.example.com/rest/api/2/version/${id}`,
    id,
    name,
    archived: false,
    released: false,
    projectId: 10000,
    ...extra,
  };
}

const VERSIONS = [
  bean('1', 'GAC_v1.0.0', { released: true, releaseDate: '2026-01-10', userReleaseDate: '10/Jan/26' }),
  bean('2', 'OTC_v2.0.0', { released: true, releaseDate: '2026-03-01', archived: true }),
  bean('3', 'gac_v1.1.0', { released: true, releaseDate: '2026-02-20' }),
  bean('4', 'GAC_v1.2.0'),
];

const names = (result: { data?: { values: Array<{ name?: string }> } }) => result.data?.values.map((v) => v.name);

describe('getProjectVersions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listVersions.mockResolvedValue(VERSIONS);
  });

  it('returns versions in Jira sequence order without the self link and locale dates', async () => {
    const result = await getProjectVersions({ projectKey: 'PROJ', maxResults: 25 });

    expect(listVersions).toHaveBeenCalledWith('PROJ');
    expect(result.success).toBe(true);
    expect(names(result)).toEqual(['GAC_v1.0.0', 'OTC_v2.0.0', 'gac_v1.1.0', 'GAC_v1.2.0']);
    expect(result.data?.values[0]).toEqual({
      id: '1', name: 'GAC_v1.0.0', archived: false, released: true, projectId: 10000, releaseDate: '2026-01-10',
    });
  });

  it('filters by a case-insensitive name query and release state', async () => {
    const result = await getProjectVersions({ projectKey: 'PROJ', query: 'gac', released: true, maxResults: 25 });

    expect(names(result)).toEqual(['GAC_v1.0.0', 'gac_v1.1.0']);
    expect(result.data?.total).toBe(2);
  });

  it('filters by archived state', async () => {
    const result = await getProjectVersions({ projectKey: 'PROJ', archived: false, maxResults: 25 });

    expect(names(result)).toEqual(['GAC_v1.0.0', 'gac_v1.1.0', 'GAC_v1.2.0']);
  });

  it('sorts by release date descending and keeps versions without a date last', async () => {
    const result = await getProjectVersions({ projectKey: 'PROJ', orderBy: '-releaseDate', maxResults: 25 });

    expect(names(result)).toEqual(['OTC_v2.0.0', 'gac_v1.1.0', 'GAC_v1.0.0', 'GAC_v1.2.0']);
  });

  it('reverses the sequence order', async () => {
    const result = await getProjectVersions({ projectKey: 'PROJ', orderBy: '-sequence', maxResults: 25 });

    expect(names(result)).toEqual(['GAC_v1.2.0', 'gac_v1.1.0', 'OTC_v2.0.0', 'GAC_v1.0.0']);
  });

  it('pages over the filtered versions', async () => {
    const first = await getProjectVersions({ projectKey: 'PROJ', maxResults: 3 });
    const second = await getProjectVersions({ projectKey: 'PROJ', startAt: 3, maxResults: 3 });

    expect(first.data).toMatchObject({ total: 4, startAt: 0, maxResults: 3, isLast: false });
    expect(names(second)).toEqual(['GAC_v1.2.0']);
    expect(second.data).toMatchObject({ total: 4, startAt: 3, isLast: true });
  });

  it('surfaces API errors', async () => {
    listVersions.mockRejectedValue({ status: 404, statusText: 'Not Found', body: { errorMessages: ['No project'] } });

    const result = await getProjectVersions({ projectKey: 'NOPE', maxResults: 25 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error getting project versions: 404 Not Found');
    expect(result.details).toEqual({ errorMessages: ['No project'] });
  });
});

describe('getVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the version summary', async () => {
    fetchVersion.mockResolvedValue(VERSIONS[0]);

    const result = await getVersion('1');

    expect(fetchVersion).toHaveBeenCalledWith('1');
    expect(result.data).not.toHaveProperty('self');
    expect(result.data).not.toHaveProperty('userReleaseDate');
    expect(result.data).toMatchObject({ id: '1', name: 'GAC_v1.0.0' });
  });
});

describe('createVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the version in the given project and sends only the provided fields', async () => {
    postVersion.mockResolvedValue(bean('5', 'GAC_v1.3.0', { releaseDate: '2026-11-01' }));

    const result = await createVersion({ projectKey: 'PROJ', name: 'GAC_v1.3.0', releaseDate: '2026-11-01', description: undefined });

    expect(postVersion).toHaveBeenCalledWith({ project: 'PROJ', name: 'GAC_v1.3.0', releaseDate: '2026-11-01' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: '5', name: 'GAC_v1.3.0' });
    expect(result.data).not.toHaveProperty('self');
  });

  it('surfaces duplicate-name errors', async () => {
    postVersion.mockRejectedValue({
      status: 400,
      statusText: 'Bad Request',
      body: { errors: { name: 'A version with this name already exists in this project.' } },
    });

    const result = await createVersion({ projectKey: 'PROJ', name: 'GAC_v1.0.0' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error creating version: 400 Bad Request');
  });
});

describe('updateVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('releases a version with only the given fields', async () => {
    putVersion.mockResolvedValue(bean('4', 'GAC_v1.2.0', { released: true, releaseDate: '2026-10-20' }));

    const result = await updateVersion({ versionId: '4', released: true, releaseDate: '2026-10-20', name: undefined });

    expect(putVersion).toHaveBeenCalledWith('4', { released: true, releaseDate: '2026-10-20' });
    expect(result.data).toMatchObject({ id: '4', released: true, releaseDate: '2026-10-20' });
  });

  it('keeps false values such as un-releasing a version', async () => {
    putVersion.mockResolvedValue(bean('1', 'GAC_v1.0.0'));

    await updateVersion({ versionId: '1', released: false });

    expect(putVersion).toHaveBeenCalledWith('1', { released: false });
  });

  it('rejects an update without fields before calling the API', async () => {
    const result = await updateVersion({ versionId: '4' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Nothing to update: provide at least one version field to change');
    expect(putVersion).not.toHaveBeenCalled();
  });

  it('surfaces permission errors', async () => {
    putVersion.mockRejectedValue({ status: 403, statusText: 'Forbidden', body: {} });

    const result = await updateVersion({ versionId: '4', archived: true });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error updating version: 403 Forbidden');
  });
});

describe('versionToolSchemas', () => {
  it.each(Object.entries(versionToolSchemas))('%s converts to a JSON Schema without $ref', (_, shape) => {
    // Same conversion the MCP server applies when listing tools.
    const jsonSchema = JSON.stringify(z.toJSONSchema(z.object(shape)));

    expect(jsonSchema).not.toContain('$ref');
  });

  it('validates both dates as YYYY-MM-DD', () => {
    const schema = z.object(versionToolSchemas.updateVersion);

    expect(schema.safeParse({ versionId: '1', startDate: '2026-10-01', releaseDate: '2026-10-20' }).success).toBe(true);
    expect(schema.safeParse({ versionId: '1', releaseDate: '20.10.2026' }).success).toBe(false);
    expect(schema.safeParse({ versionId: '1', startDate: '2026/10/01' }).success).toBe(false);
  });
});

describe('deleteVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes the version from its issues when no replacement is given and reports the issue counts', async () => {
    relatedIssues.mockResolvedValue({ issuesFixedCount: 3, issuesAffectedCount: 1 });
    removeVersion.mockResolvedValue(undefined);

    const result = await deleteVersion({ versionId: '4' });

    expect(removeVersion).toHaveBeenCalledWith('4', {});
    expect(result.data).toEqual({
      deleted: '4', issuesFixedCount: 3, issuesAffectedCount: 1, fixIssuesMovedTo: null, affectedIssuesMovedTo: null,
    });
  });

  it('moves fix and affected issues to the given versions as numeric ids', async () => {
    relatedIssues.mockResolvedValue({ issuesFixedCount: 2, issuesAffectedCount: 0 });
    removeVersion.mockResolvedValue(undefined);

    const result = await deleteVersion({ versionId: '4', moveFixIssuesTo: '5', moveAffectedIssuesTo: '6' });

    expect(removeVersion).toHaveBeenCalledWith('4', { moveFixIssuesTo: 5, moveAffectedIssuesTo: 6 });
    expect(result.data).toMatchObject({ fixIssuesMovedTo: '5', affectedIssuesMovedTo: '6' });
  });

  it('does not delete when the version cannot be read', async () => {
    relatedIssues.mockRejectedValue({ status: 404, statusText: 'Not Found', body: {} });

    const result = await deleteVersion({ versionId: '999' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error deleting version: 404 Not Found');
    expect(removeVersion).not.toHaveBeenCalled();
  });

  it('surfaces a rejected replacement', async () => {
    relatedIssues.mockResolvedValue({ issuesFixedCount: 1, issuesAffectedCount: 0 });
    removeVersion.mockRejectedValue({ status: 400, statusText: 'Bad Request', body: { errorMessages: ['Invalid version'] } });

    const result = await deleteVersion({ versionId: '4', moveFixIssuesTo: '4' });

    expect(result.success).toBe(false);
    expect(result.details).toEqual({ errorMessages: ['Invalid version'] });
  });
});

describe('isVersionDeleteEnabled', () => {
  it.each(['true', 'TRUE', ' 1 ', 'yes'])('is enabled by %p', (value) => {
    expect(isVersionDeleteEnabled({ JIRA_VERSION_DELETE_ENABLED: value })).toBe(true);
  });

  it.each([undefined, '', 'false', '0', 'no', 'on'])('stays disabled for %p', (value) => {
    expect(isVersionDeleteEnabled({ JIRA_VERSION_DELETE_ENABLED: value })).toBe(false);
  });

  it('only accepts numeric version ids for deletion', () => {
    const schema = z.object(versionToolSchemas.deleteVersion);

    expect(schema.safeParse({ versionId: '31131', moveFixIssuesTo: '30930' }).success).toBe(true);
    expect(schema.safeParse({ versionId: 'Test-Version' }).success).toBe(false);
  });
});
