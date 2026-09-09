// Original API response interfaces
interface HitContextLine {
  line: number;
  text: string;
}

interface CodeSearchHit {
  hitContexts?: HitContextLine[][];
}

interface CodeSearchResponse {
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
