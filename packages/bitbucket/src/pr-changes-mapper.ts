// Original API response interfaces
interface PathInfo {
  components: string[];
  parent: string;
  name: string;
  extension: string;
  toString: string;
}

interface ChangeProperties {
  gitChangeType: string;
  orphanedComments?: number;
  activeComments?: number;
  changeScope?: string;
}

interface ChangeLinks {
  self: (null | string)[];
}

interface PRChange {
  contentId: string;
  fromContentId: string;
  path: PathInfo;
  srcPath?: PathInfo;
  percentUnchanged?: number;
  type: string;
  nodeType?: string;
  executable?: boolean;
  srcExecutable?: boolean;
  links?: ChangeLinks;
  properties: ChangeProperties;
}

interface PRChangesResponse {
  fromHash: string;
  toHash: string;
  properties: {
    changeScope: string;
  };
  values: PRChange[];
  size: number;
  isLastPage: boolean;
  start: number;
  limit: number;
  nextPageStart: number | null;
}

// Simplified interfaces
interface SimplifiedPath {
  name: string;
  path: string;
  extension?: string;
}

interface SimplifiedChange {
  contentId: string;
  path: SimplifiedPath;
  srcPath?: SimplifiedPath;
  type: string;
  gitChangeType: string;
  comments?: number;
}

interface SimplifiedPRChangesResponse {
  fromHash: string;
  toHash: string;
  changeScope: string;
  changes: SimplifiedChange[];
  summary: {
    totalChanges: number;
    additions: number;
    deletions: number;
    modifications: number;
    moves: number;
    filesWithComments: number;
  };
  isLastPage: boolean;
}

// Type guards
function isPathInfo(obj: unknown): obj is PathInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as any).components) &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).toString === 'string'
  );
}

function isPRChange(obj: unknown): obj is PRChange {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).contentId === 'string' &&
    typeof (obj as any).type === 'string' &&
    isPathInfo((obj as any).path) &&
    typeof (obj as any).properties === 'object' &&
    typeof (obj as any).properties.gitChangeType === 'string'
  );
}

function isPRChangesResponse(obj: unknown): obj is PRChangesResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).fromHash === 'string' &&
    typeof (obj as any).toHash === 'string' &&
    Array.isArray((obj as any).values) &&
    typeof (obj as any).isLastPage === 'boolean'
  );
}

// Transformation functions
function simplifyPath(path: PathInfo): SimplifiedPath {
  return {
    name: path.name,
    path: path.toString,
    ...(path.extension && { extension: path.extension })
  };
}

function simplifyChange(change: PRChange): SimplifiedChange {
  const result: SimplifiedChange = {
    contentId: change.contentId,
    path: simplifyPath(change.path),
    type: change.type,
    gitChangeType: change.properties.gitChangeType
  };

  // Add source path for moves/renames
  if (change.srcPath) {
    result.srcPath = simplifyPath(change.srcPath);
  }

  // Add comment count if present
  const commentCount = (change.properties.orphanedComments || 0) + (change.properties.activeComments || 0);
  if (commentCount > 0) {
    result.comments = commentCount;
  }

  return result;
}

export function simplifyBitbucketPRChanges(response: any): SimplifiedPRChangesResponse | any {
  // Validate response structure
  if (!isPRChangesResponse(response)) {
    return response;
  }

  const changes: SimplifiedChange[] = [];

  // Process each change with type guard validation
  for (const change of response.values || []) {
    if (isPRChange(change)) {
      changes.push(simplifyChange(change));
    }
  }

  // If no valid changes were found, return the original response
  if (changes.length === 0 && (response.values || []).length > 0) {
    return response;
  }

  // Calculate summary statistics
  const additions = changes.filter(c => c.type === 'ADD').length;
  const deletions = changes.filter(c => c.type === 'DELETE').length;
  const modifications = changes.filter(c => c.type === 'MODIFY').length;
  const moves = changes.filter(c => c.type === 'MOVE').length;
  const filesWithComments = changes.filter(c => c.comments && c.comments > 0).length;

  return {
    fromHash: response.fromHash,
    toHash: response.toHash,
    changeScope: response.properties.changeScope,
    changes,
    summary: {
      totalChanges: changes.length,
      additions,
      deletions,
      modifications,
      moves,
      filesWithComments
    },
    isLastPage: response.isLastPage
  };
}

export function getChangesSummary(response: any): string[] {
  const changeSummaries: string[] = [];

  for (const change of response.values || []) {
    if (isPRChange(change)) {
      const action = change.type === 'ADD' ? 'Added' :
                    change.type === 'DELETE' ? 'Deleted' :
                    change.type === 'MODIFY' ? 'Modified' :
                    change.type === 'MOVE' ? 'Moved' : change.type;

      let summary = `${action}: ${change.path.toString}`;

      if (change.srcPath && change.type === 'MOVE') {
        summary += ` (from ${change.srcPath.toString})`;
      }

      const commentCount = (change.properties.orphanedComments || 0) + (change.properties.activeComments || 0);
      if (commentCount > 0) {
        summary += ` [${commentCount} comment${commentCount > 1 ? 's' : ''}]`;
      }

      changeSummaries.push(summary);
    }
  }

  return changeSummaries;
}
