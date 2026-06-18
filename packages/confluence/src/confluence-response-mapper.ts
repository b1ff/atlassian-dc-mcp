export type ConfluenceBodyMode = 'storage' | 'text' | 'none';
export type ConfluenceMutationOutputMode = 'ack' | 'full';

export interface ConfluenceBodySliceOptions {
  maxBodyChars?: number;
  bodyStart?: number;
}

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&(nbsp|amp|lt|gt|quot);|&#39;/g, match => ENTITY_MAP[match] ?? match)
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
    });
}

function sliceText(
  value: string,
  options: ConfluenceBodySliceOptions = {},
): { value: string; truncated?: boolean; originalLength?: number; start?: number; end?: number } {
  const { maxBodyChars, bodyStart } = options;
  const originalLength = value.length;
  const hasExplicitStart = bodyStart !== undefined;
  const resolvedStart = hasExplicitStart && bodyStart < 0
    ? Math.max(originalLength + bodyStart, 0)
    : Math.min(Math.max(bodyStart ?? 0, 0), originalLength);

  const resolvedEnd = maxBodyChars === undefined || maxBodyChars < 1
    ? originalLength
    : Math.min(resolvedStart + maxBodyChars, originalLength);

  if (!hasExplicitStart && resolvedStart === 0 && resolvedEnd === originalLength) {
    return { value };
  }

  const slicedValue = value.slice(resolvedStart, resolvedEnd).trimEnd();
  const end = resolvedStart + slicedValue.length;
  const truncated = resolvedStart > 0 || resolvedEnd < originalLength;

  return {
    value: slicedValue,
    ...(truncated ? { truncated: true, originalLength } : {}),
    ...(hasExplicitStart ? { start: resolvedStart, end } : {}),
  };
}

export function confluenceStorageToText(storageValue: string): string {
  const withLineBreaks = storageValue
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|td|th|blockquote|pre|ul|ol|table|section|article)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(withLineBreaks)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getContentUrl(content: any): string | undefined {
  const self = content?._links?.self;
  if (typeof self === 'string') {
    return self;
  }

  const base = content?._links?.base;
  const webui = content?._links?.webui;
  if (typeof base === 'string' && typeof webui === 'string') {
    return `${base}${webui}`;
  }

  return undefined;
}

export function shapeConfluenceContent(content: any, bodyMode: ConfluenceBodyMode = 'storage', bodySliceOptions?: ConfluenceBodySliceOptions) {
  if (!content || typeof content !== 'object' || bodyMode === 'storage') {
    return content;
  }

  const { body, ...rest } = content as Record<string, any>;

  if (bodyMode === 'none') {
    return rest;
  }

  const storageValue = typeof body?.storage?.value === 'string' ? body.storage.value : undefined;
  if (storageValue === undefined) {
    return rest;
  }

  const textBody = sliceText(confluenceStorageToText(storageValue), bodySliceOptions);
  const { value, ...textBodyMetadata } = textBody;
  return {
    ...rest,
    body: {
      text: {
        value,
        representation: 'text',
        ...textBodyMetadata,
      },
    },
  };
}

export function shapeConfluenceMutationAck(content: any) {
  const url = getContentUrl(content);

  return {
    ...(content?.id !== undefined ? { id: content.id } : {}),
    ...(typeof content?.type === 'string' ? { type: content.type } : {}),
    ...(typeof content?.title === 'string' ? { title: content.title } : {}),
    ...(typeof content?.space?.key === 'string' ? { spaceKey: content.space.key } : {}),
    ...(content?.version?.number !== undefined ? { version: content.version.number } : {}),
    ...(url ? { url } : {}),
  };
}
