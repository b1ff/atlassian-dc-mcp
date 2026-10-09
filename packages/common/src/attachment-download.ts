import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

/**
 * How the downloaded bytes should be returned to the caller inline, in addition
 * to (or instead of) being written to disk.
 * - `none`: do not embed the bytes in the response (default)
 * - `base64`: embed base64-encoded bytes in the JSON payload (suitable for binary
 *   files); the bytes stay data and are never rendered for the model to look at
 * - `text`: embed the bytes decoded as UTF-8 text (suitable for text files)
 * - `image`: deliver the bytes as a viewable MCP image block instead of in the
 *   JSON payload, which in this mode carries no bytes at all - an attachment that
 *   cannot be rendered reports `imageOmittedReason` and nothing else. Only for
 *   images the model is meant to *look at*; the pixels become model-visible, so
 *   see the prompt-injection note in the READMEs.
 */
export type AttachmentContentEncoding = 'none' | 'base64' | 'text' | 'image';

/** Default cap for inline content so responses do not balloon. 1 MiB. */
export const DEFAULT_MAX_INLINE_BYTES = 1_048_576;

export interface AttachmentDownloadOptions {
  /**
   * Absolute, already-validated destination path to write the bytes to. Resolving
   * and sandboxing this path is the caller's responsibility (see the attachment
   * gateway); the file is written with an exclusive flag and never overwrites an
   * existing file. When omitted, nothing is written to disk.
   */
  destination?: string;
  /** Whether and how to embed the bytes in the response. Defaults to `none`. */
  returnContent?: AttachmentContentEncoding;
  /** Maximum bytes to embed inline when returnContent is not `none`. */
  maxInlineBytes?: number;
  /** Hard cap on the number of downloaded bytes. Exceeding it aborts the download. */
  maxDownloadBytes?: number;
}

export interface AttachmentDownloadResult {
  filename: string;
  mediaType?: string;
  /** Number of bytes downloaded. */
  size: number;
  /** Absolute path the file was written to, when saving was requested. */
  savedPath?: string;
  /**
   * Inline content, when returnContent is `base64` or `text`. Also set for `image`
   * at this layer, where the bytes are still on their way to a block; the response
   * formatter takes it back out, so it never reaches the model twice.
   */
  content?: string;
  encoding?: 'base64' | 'text';
  /** Set when inline content was requested but omitted (e.g. over the size cap). */
  contentOmittedReason?: string;
  /**
   * Set instead of `content` and `encoding` when the bytes were handed to the model
   * as a separate content block, so this payload carries no second copy of them.
   */
  contentDeliveredAs?: 'image';
  /**
   * Why `returnContent: 'image'` did not render this attachment. The bytes were
   * downloaded and then dropped rather than never fetched, which is what separates
   * this from `contentOmittedReason`; the message names the mode that returns them.
   */
  imageOmittedReason?: string;
}

async function resolveToken(token: string | (() => string | undefined)): Promise<string> {
  const resolved = typeof token === 'function' ? token() : token;
  if (!resolved) {
    throw new Error('Missing API token for attachment download');
  }
  return resolved;
}

/**
 * Reads the response body, enforcing `cap` (when set) without buffering more than
 * the limit. Streams chunk-by-chunk when a web ReadableStream is available and
 * falls back to a buffered read with a post-check otherwise.
 */
async function readBodyWithCap(response: Response, cap: number | undefined, filename: string): Promise<Buffer> {
  const body = response.body as ReadableStream<Uint8Array> | null;
  if (cap !== undefined && body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > cap) {
        await reader.cancel();
        throw new Error(`Attachment "${filename}" exceeds the configured download limit of ${cap} bytes`);
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (cap !== undefined && buffer.length > cap) {
    throw new Error(
      `Attachment "${filename}" size ${buffer.length} bytes exceeds the configured download limit of ${cap} bytes`,
    );
  }
  return buffer;
}

/**
 * Downloads a file from an authenticated Atlassian Data Center URL using a
 * Bearer token, optionally writing it to a pre-validated destination and/or
 * returning its bytes inline.
 *
 * Writing uses an exclusive flag, so an existing file (including a symlink) is
 * never overwritten.
 */
export async function downloadAttachment(params: {
  url: string;
  token: string | (() => string | undefined);
  filename: string;
  mediaType?: string;
  options?: AttachmentDownloadOptions;
}): Promise<AttachmentDownloadResult> {
  const { url, filename, mediaType } = params;
  const options = params.options ?? {};
  const token = await resolveToken(params.token);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      // Attachment download endpoints are XSRF-protected; nocheck bypasses it.
      'X-Atlassian-Token': 'nocheck',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download attachment "${filename}": ${response.status} ${response.statusText}`);
  }

  const cap = options.maxDownloadBytes;
  const declaredLength = Number(response.headers.get('content-length'));
  if (cap !== undefined && Number.isFinite(declaredLength) && declaredLength > cap) {
    throw new Error(
      `Attachment "${filename}" size ${declaredLength} bytes exceeds the configured download limit of ${cap} bytes`,
    );
  }

  const buffer = await readBodyWithCap(response, cap, filename);
  const resolvedMediaType = mediaType ?? response.headers.get('content-type') ?? undefined;

  const result: AttachmentDownloadResult = {
    filename: basename(filename),
    mediaType: resolvedMediaType,
    size: buffer.length,
  };

  if (options.destination) {
    await writeFile(options.destination, buffer, { flag: 'wx' });
    result.savedPath = options.destination;
  }

  const returnContent = options.returnContent ?? 'none';
  if (returnContent !== 'none') {
    const inlineCap = options.maxInlineBytes ?? DEFAULT_MAX_INLINE_BYTES;
    if (buffer.length > inlineCap) {
      result.contentOmittedReason = `File size ${buffer.length} bytes exceeds inline cap of ${inlineCap} bytes`;
    } else {
      result.content = returnContent === 'text' ? buffer.toString('utf-8') : buffer.toString('base64');
      result.encoding = returnContent === 'text' ? 'text' : 'base64';
    }
  }

  return result;
}
