// Original API response interfaces
interface HitContextLine {
  line: number;
  text: string;
}

interface CodeSearchHit {
  hitContexts?: HitContextLine[][];
}

interface CodeSearchResponse {
  query?: { substituted?: boolean } | null;
  code?: {
    values?: CodeSearchHit[];
  };
}

function isHitContextLine(value: unknown): value is HitContextLine {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as HitContextLine).text === 'string'
  );
}

function isCodeSearchResponse(value: unknown): value is CodeSearchResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const code = (value as CodeSearchResponse).code;
  return typeof code === 'object' && code !== null && Array.isArray(code.values);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

const MAX_CODE_POINT = 0x10ffff;

function decodeNumericEntity(entity: string, match: string): string {
  const isHex = entity.startsWith('#x') || entity.startsWith('#X');
  const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
  if (!Number.isInteger(code) || code < 0 || code > MAX_CODE_POINT) {
    return match;
  }
  return String.fromCodePoint(code);
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      return decodeNumericEntity(entity, match);
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function stripEmphasis(text: string): string {
  return text.replace(/<\/?em>/g, '');
}

/**
 * Bitbucket does not reject a query it cannot parse: it silently runs a different one and
 * only reports that in the response. Detect it so callers never act on results for a query
 * they did not ask for.
 */
export function describeUnhonoredQuery(response: unknown): string | undefined {
  if (typeof response !== 'object' || response === null || !('query' in response)) {
    return undefined;
  }

  const { query } = response as CodeSearchResponse;

  if (query === null) {
    return (
      'Bitbucket could not interpret the search query, so no results were returned. This ' +
      'usually means a modifier named a project or repository that does not exist or is not ' +
      'visible to you. Check the project key and repository slug, then retry.'
    );
  }

  if (query?.substituted) {
    return (
      'Bitbucket could not parse the search query as written and silently ran a different ' +
      'one, so the results would answer a different question. The usual cause is an explicit ' +
      'AND between a search term and a modifier: write "foo project:KEY" instead of ' +
      '"foo AND project:KEY". Reserve AND, OR and NOT for combining search terms.'
    );
  }

  return undefined;
}

/**
 * Bitbucket renders snippet text for its web UI: matched terms are wrapped in `<em>` and the
 * text is HTML-escaped. Undo both so the returned snippets match the actual file contents.
 */
export function cleanCodeSearchSnippets(response: unknown): unknown {
  if (!isCodeSearchResponse(response)) {
    return response;
  }

  const values = response.code!.values!.map((hit) => {
    if (!Array.isArray(hit.hitContexts)) {
      return hit;
    }
    return {
      ...hit,
      hitContexts: hit.hitContexts.map((block) =>
        Array.isArray(block)
          ? block.map((entry) =>
              isHitContextLine(entry)
                ? { ...entry, text: decodeHtmlEntities(stripEmphasis(entry.text)) }
                : entry
            )
          : block
      ),
    };
  });

  return {
    ...response,
    code: { ...response.code, values },
  };
}
