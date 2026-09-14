import type { CallToolResult, ImageContent, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { ApiErrorResponse } from './api-error-handler.js';
import type { AttachmentContentEncoding, AttachmentDownloadResult } from './attachment-download.js';
import { formatToolResponse } from './tool-response.js';

/** Bytes needed to recognise every signature below; WEBP's tag ends at byte 12. */
const SNIFF_BASE64_CHARS = 16;

/** Magic numbers of the formats the model vision APIs accept, as hex prefixes. */
const MAGIC_PREFIXES: ReadonlyArray<readonly [mimeType: string, hexPrefix: string]> = [
  ['image/png', '89504e470d0a1a0a'],
  ['image/jpeg', 'ffd8ff'],
  ['image/gif', '47494638'],
];

/**
 * Largest image we will render. Base64 grows bytes by 4/3, so this keeps one block
 * under the 5 MB per-image payload the model APIs accept. It bounds rendering only:
 * how many bytes may be embedded at all is the caller's `maxInlineBytes`.
 */
export const MAX_IMAGE_BYTES = 3_750_000;

/** Past 20 images a result approaches the request-size limit and gets downscaled. */
const MAX_IMAGE_BLOCKS = 20;

/** Longest filename we will echo into a label, in code points, before an ellipsis. */
const MAX_LABEL_FILENAME_CHARS = 120;

/**
 * Make an untrusted filename safe to interpolate into a raw text block.
 *
 * Everywhere else a filename reaches the model JSON-escaped inside the serialised
 * result. A label is plain text, so a name carrying a newline could forge a second
 * label and an instruction after it - the exact channel that making rendering
 * opt-in was meant to keep narrow. Strip control and format characters (bidi
 * overrides and zero-width joiners included), collapse whitespace, and cap length.
 */
function labelFilename(filename: string): string {
  const flattened = filename.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim();
  // Cap by code point, not UTF-16 unit: cutting an astral character (an emoji in a
  // filename) in half leaves a lone surrogate, which UTF-8 encoding downstream
  // turns into U+FFFD or rejects outright.
  const codePoints = [...flattened];
  return codePoints.length > MAX_LABEL_FILENAME_CHARS
    ? `${codePoints.slice(0, MAX_LABEL_FILENAME_CHARS).join('')}…`
    : flattened;
}

/**
 * Identify the image format from the bytes themselves.
 *
 * `mediaType` is whatever the uploader declared (or the `content-type` header), so
 * it can name a format the bytes are not: a JPEG uploaded as `.png`, an SSO login
 * page served with a 200, a real PNG stored as `application/octet-stream`. The
 * model APIs reject a declared/actual mismatch, and in Claude Code the rejected
 * block stays in session history and fails every later request in the session.
 *
 * Sniffing doubles as the format allowlist: vision APIs accept only PNG, JPEG, GIF
 * and WEBP, so SVG, HEIC, BMP, TIFF and friends match nothing and stay out.
 */
function sniffImageMediaType(base64: string): string | undefined {
  const head = Buffer.from(base64.slice(0, SNIFF_BASE64_CHARS), 'base64');
  const hex = head.toString('hex');
  const magic = MAGIC_PREFIXES.find(([, prefix]) => hex.startsWith(prefix));
  if (magic) {
    return magic[0];
  }
  // WEBP is a RIFF container: 'RIFF' <4-byte size> 'WEBP'; bytes 8-11 start at hex 16.
  return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250' ? 'image/webp' : undefined;
}

/**
 * Whether an attachment the caller asked to see can be rendered, and as what.
 *
 * What the file *is* is decided before the budget checks, so a non-image past the
 * block cap is told it is not an image rather than blaming the cap.
 */
function classifyImage(
  attachment: AttachmentDownloadResult,
  content: string,
  blocksLeft: number,
): { mimeType: string } | { reason: string } {
  const mimeType = sniffImageMediaType(content);
  if (!mimeType) {
    return { reason: `Not a PNG, JPEG, GIF or WEBP image (declared ${attachment.mediaType ?? 'no media type'}); the bytes are in this entry as base64` };
  }
  const bytes = Buffer.byteLength(content, 'base64');
  if (bytes > MAX_IMAGE_BYTES) {
    return { reason: `Image is ${bytes} bytes, over the ${MAX_IMAGE_BYTES} byte render limit; the bytes are in this entry as base64` };
  }
  if (blocksLeft <= 0) {
    return { reason: `Only the first ${MAX_IMAGE_BLOCKS} images are rendered; narrow the request with 'filename'. The bytes are in this entry as base64` };
  }
  return { mimeType };
}

/**
 * Turn one attachment into its JSON entry plus the blocks that carry its bytes.
 *
 * The bytes go in exactly one place, but only when there are two places to choose
 * between: an image actually delivered as a block loses `content` from its JSON
 * entry, because `formatToolResponse` serialises the whole result and a second
 * base64 copy costs ~60x the tokens of the block itself, which pushes a 300 KB PNG
 * past the host's result-size limit. An attachment that was *not* rendered keeps
 * its bytes - there is no duplicate to avoid, and the caller already paid to
 * download them - so it reads exactly as `returnContent: 'base64'` would.
 */
function renderAttachment(
  attachment: AttachmentDownloadResult,
  index: number,
  blocksLeft: number,
): { entry: AttachmentDownloadResult; blocks: (TextContent | ImageContent)[] } {
  const content = attachment.content;
  if (attachment.encoding !== 'base64' || typeof content !== 'string' || content.length === 0) {
    return { entry: attachment, blocks: [] };
  }

  const classified = classifyImage(attachment, content, blocksLeft);
  if ('reason' in classified) {
    return { entry: { ...attachment, imageOmittedReason: classified.reason }, blocks: [] };
  }

  // `encoding` goes with the bytes it describes; contentDeliveredAs tells the story now.
  const { content: _delivered, encoding: _describesContent, ...entry } = attachment;
  const { mimeType } = classified;
  return {
    entry: { ...entry, mediaType: mimeType, contentDeliveredAs: 'image' },
    blocks: [
      // Without a label the model cannot map image N back to attachments[i] once an
      // entry is skipped or two attachments share a filename.
      { type: 'text', text: `attachments[${index}] ${labelFilename(attachment.filename)} (${mimeType}, ${attachment.size} bytes)` },
      { type: 'image', data: content, mimeType },
    ],
  };
}

/**
 * Format an attachment download result, delivering images as viewable blocks when
 * the caller asked for `returnContent: 'image'`.
 *
 * `formatToolResponse` serialises everything into a single text block, so an image
 * downloaded with `returnContent: 'base64'` reaches the model as a base64 string it
 * cannot look at. Screenshots and mockups are a common reason to fetch an attachment
 * at all, so `'image'` renders them instead. That is deliberately a separate mode:
 * an attachment is untrusted third-party content, and rendering it puts pixels in
 * front of the model that can carry instructions no text-level prompt-injection
 * filter or human transcript review will see. `'base64'` stays bytes-only.
 */
export const formatAttachmentToolResponse = (
  result: ApiErrorResponse<{ count?: number; attachments?: AttachmentDownloadResult[] }>,
  returnContent?: AttachmentContentEncoding,
): CallToolResult => {
  const attachments = result.data?.attachments;
  if (returnContent !== 'image' || !result.success || !Array.isArray(attachments)) {
    return formatToolResponse(result);
  }

  let blocksLeft = MAX_IMAGE_BLOCKS;
  const entries: AttachmentDownloadResult[] = [];
  const blocks: (TextContent | ImageContent)[] = [];
  for (const [index, attachment] of attachments.entries()) {
    const rendered = renderAttachment(attachment, index, blocksLeft);
    entries.push(rendered.entry);
    if (rendered.blocks.length > 0) {
      blocks.push(...rendered.blocks);
      blocksLeft -= 1;
    }
  }

  const payload = { ...result, data: { ...result.data, attachments: entries } };
  return { content: [...formatToolResponse(payload).content, ...blocks] };
};
