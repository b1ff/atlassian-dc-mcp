import { File } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';
import { AttachmentsService, ContentResourceService, OpenAPI, SearchService, UserService } from './confluence-client/index.js';
import {
  downloadAttachment,
  handleApiOperation,
  resolveDownloadDestination,
  resolveOpenApiBase,
  resolveUploadSource,
  type AttachmentContentEncoding,
  type AttachmentGatewaySide,
} from '@atlassian-dc-mcp/common';
import { CONFLUENCE_PRODUCT, getDefaultPageSize, getMissingConfig } from './config.js';
import { ConfluenceBodyMode, shapeConfluenceContent } from './confluence-response-mapper.js';

/**
 * Escapes user input for safe use inside a CQL quoted string.
 * Escapes backslash first, then double quote, so that neither can break out of the phrase.
 * Only call once per value; double-escaping would over-escape and break the query.
 */
export function escapeSearchTextForCql(searchText: string): string {
  return searchText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export interface StorageEdit {
  oldStr: string;
  newStr: string;
}

/**
 * Applies exact-match edits to a storage-format body, in order. Each oldStr must occur exactly once
 * in the body as it stands after the previous edits; otherwise nothing is applied and an error is thrown.
 * Splicing by index (not String.replace) keeps `$` sequences in newStr literal.
 */
export function applyStorageEdits(body: string, edits: StorageEdit[]): string {
  return edits.reduce((current, edit, index) => {
    if (!edit.oldStr) {
      throw new Error(`edits[${index}].oldStr must not be empty`);
    }
    const count = current.split(edit.oldStr).length - 1;
    if (count !== 1) {
      const hint = count === 0
        ? ' Copy it from the storage body exactly: storage keeps non-breaking spaces (U+00A0) and XML entities such as &amp;.'
        : ' Include more surrounding text to make it unique.';
      throw new Error(`edits[${index}].oldStr must occur exactly once in the page body, found ${count}.${hint}`);
    }
    const at = current.indexOf(edit.oldStr);
    return current.slice(0, at) + edit.newStr + current.slice(at + edit.oldStr.length);
  }, body);
}

export interface ConfluenceContent {
  id?: string;
  type: string;
  title: string;
  space: {
    key: string;
  };
  body?: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  version?: {
    number: number;
    message?: string;
  };
  ancestors?: Array<{ id: string }>;
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

export class ConfluenceService {
  private readonly getPageSize: () => number;
  private readonly baseUrl: string;
  private readonly tokenProvider: string | (() => string | undefined);

  constructor(
    host: string | undefined,
    token: string | (() => string | undefined),
    apiBasePath?: string,
    getPageSize: () => number = getDefaultPageSize,
  ) {
    const base = resolveOpenApiBase({
      host,
      apiBasePath,
      defaultBasePath: CONFLUENCE_PRODUCT.defaultApiBasePath ?? '',
      strippableSuffixes: CONFLUENCE_PRODUCT.apiBasePathStrippableSuffixes,
    });
    OpenAPI.BASE = base;
    OpenAPI.TOKEN = resolveToken(token, 'Missing required environment variable: CONFLUENCE_API_TOKEN');
    OpenAPI.VERSION = '1.0';
    this.baseUrl = base;
    this.tokenProvider = token;
    this.getPageSize = getPageSize;
  }

  /**
   * Builds an absolute download URL from a Confluence attachment `_links.download`
   * value, which is a path relative to the site base (context path included).
   */
  private buildDownloadUrl(downloadLink: string): string {
    if (/^https?:\/\//i.test(downloadLink)) {
      return downloadLink;
    }
    const base = this.baseUrl.replace(/\/$/, '');
    return `${base}${downloadLink.startsWith('/') ? '' : '/'}${downloadLink}`;
  }
  /**
   * Get a Confluence page by ID
   * @param contentId The ID of the page to retrieve
   * @param expand Optional comma-separated list of properties to expand
   */
  async getContentRaw(contentId: string, expand?: string) {
    const expandValue = expand || 'body.storage';
    const finalExpand = expand && !expand.includes('body.storage')
      ? `${expand},body.storage`
      : expandValue;
    return handleApiOperation(() => ContentResourceService.getContentById(contentId, finalExpand), 'Error getting content');
  }

  async getContent(
    contentId: string,
    expand?: string,
    bodyMode: ConfluenceBodyMode = 'storage',
    maxBodyChars?: number,
    bodyStart?: number,
  ) {
    const result = await this.getContentRaw(contentId, expand);
    if (result.success && result.data) {
      return {
        ...result,
        data: shapeConfluenceContent(result.data, bodyMode, { maxBodyChars, bodyStart }),
      };
    }

    return result;
  }

  /**
   * Search for content in Confluence using CQL
   * @param cql Confluence Query Language string
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async searchContent(cql: string, limit?: number, start?: number, expand?: string, excerpt: 'none' | 'highlight' = 'none') {
    return handleApiOperation(
      () => SearchService.search1(
        undefined,
        expand,
        undefined,
        (limit ?? this.getPageSize()).toString(),
        start?.toString(),
        excerpt,
        cql
      ),
      'Error searching for content'
    );
  }

  /**
   * Create a new page in Confluence
   * @param content The content object to create
   */
  async createContent(content: ConfluenceContent) {
    return handleApiOperation(() => ContentResourceService.createContent(content), 'Error creating content');
  }

  /**
   * Update an existing page in Confluence
   * @param contentId The ID of the content to update
   * @param content The updated content object
   */
  async updateContent(contentId: string, content: ConfluenceContent) {
    return handleApiOperation(() => ContentResourceService.update2(contentId, content), 'Error updating content');
  }

  /**
   * Upload a file as an attachment to a Confluence content entity
   * @param contentId The ID of the content the attachment will be attached to
   * @param sourcePath Path to the file to upload, relative to a server-configured upload directory
   * @param uploadSide Resolved upload gateway (roots, size limit, enabled flag)
   * @param filename Optional override for the attachment filename (defaults to basename of sourcePath)
   * @param comment Optional comment describing the attachment
   * @param minorEdit If true, no notification email will be generated
   * @param hidden If true, no notification email or activity stream entry will be generated
   * @param allowDuplicated Allow upload even if an attachment with the same filename exists
   */
  async uploadAttachment(
    contentId: string,
    sourcePath: string,
    uploadSide: AttachmentGatewaySide,
    filename?: string,
    comment?: string,
    minorEdit?: boolean,
    hidden?: boolean,
    allowDuplicated?: boolean,
    versionIfExists?: boolean,
  ) {
    return handleApiOperation(async () => {
      const { absolutePath } = await resolveUploadSource({ requestedPath: sourcePath, side: uploadSide });
      const buffer = await readFile(absolutePath);
      const name = filename || basename(absolutePath);
      const file = new File([buffer], name);
      // X-Atlassian-Token: nocheck is required for multipart attachment POSTs (XSRF bypass).
      // Set it only for the duration of this call; restore afterwards.
      const prevHeaders = OpenAPI.HEADERS;
      OpenAPI.HEADERS = { 'X-Atlassian-Token': 'nocheck' };
      try {
        if (versionIfExists) {
          const existing = await AttachmentsService.getAttachments(contentId, undefined, name);
          const existingId = (existing as any)?.results?.[0]?.id;
          if (existingId) {
            // MockAttachmentRequest types file as string, but getFormData handles Blob/File via isBlob()
            return await AttachmentsService.updateData(existingId, contentId, { file } as any);
          }
        }
        // MockAttachmentRequest types file as string, but getFormData in request.ts handles Blob/File via isBlob()
        const formData = { file, comment, minorEdit, hidden } as any;
        return await AttachmentsService.createAttachments(
          contentId,
          undefined,
          allowDuplicated ? 'true' : undefined,
          undefined,
          formData,
        );
      } finally {
        OpenAPI.HEADERS = prevHeaders;
      }
    }, 'Error uploading attachment');
  }

  /**
   * Download one or more attachments from a Confluence content entity.
   * @param params.contentId The ID of the content the attachment(s) are on
   * @param params.filename If provided, download only the attachment with this exact filename; otherwise download all attachments on the content
   * @param params.save Whether to write the attachment(s) to the operator-configured download directory
   * @param params.saveName Optional file name (basename only) when saving a single attachment
   * @param params.returnContent Whether/how to embed the bytes inline in the response
   * @param params.maxInlineBytes Inline embedding cap
   * @param params.downloadSide Resolved download gateway (roots, size limit, enabled flag)
   */
  async downloadAttachmentFromContent(params: {
    contentId: string;
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
            'CONFLUENCE_ATTACHMENTS_DOWNLOAD_ENABLED and configure a download directory.',
        );
      }
      const list = await AttachmentsService.getAttachments(params.contentId, undefined, params.filename);
      const results = ((list as any)?.results ?? []) as Array<any>;
      if (results.length === 0) {
        throw new Error(
          params.filename
            ? `No attachment named "${params.filename}" found on content ${params.contentId}`
            : `No attachments found on content ${params.contentId}`,
        );
      }

      const targets = params.filename ? [results[0]] : results;
      const multiple = targets.length > 1;
      const attachments = [];
      for (const attachment of targets) {
        const downloadLink = attachment?._links?.download;
        if (!downloadLink) {
          throw new Error(`Attachment "${attachment?.title ?? params.filename}" has no download link`);
        }
        const name = attachment?.title ?? params.filename ?? 'attachment';
        const mediaType = attachment?.metadata?.mediaType ?? attachment?.extensions?.mediaType;
        let destination: string | undefined;
        if (params.save) {
          const requestedName = multiple ? name : params.saveName ?? name;
          destination = await resolveDownloadDestination({ requestedName, side: params.downloadSide });
        }
        attachments.push(
          await downloadAttachment({
            url: this.buildDownloadUrl(downloadLink),
            token: this.tokenProvider,
            filename: name,
            mediaType,
            options: {
              destination,
              returnContent: params.returnContent,
              maxInlineBytes: params.maxInlineBytes,
              maxDownloadBytes: params.downloadSide.maxBytes,
            },
          }),
        );
      }

      return { contentId: params.contentId, count: attachments.length, attachments };
    }, 'Error downloading attachment');
  }

  /**
   * Search for spaces by text
   * @param searchText Text to search for in space names or descriptions
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async searchSpaces(
    searchText: string,
    limit?: number,
    start?: number,
    expand?: string,
    excerpt: 'none' | 'highlight' = 'none'
  ) {
    // Create a CQL query that searches for spaces
    // The correct syntax for space search is: type=space AND title ~ "searchText"
    const escapedSearchText = escapeSearchTextForCql(searchText);
    const cql = `type=space AND title ~ "${escapedSearchText}"`;

    return handleApiOperation(() => SearchService.search1(
      undefined,
      expand,
      undefined,
      (limit ?? this.getPageSize()).toString(),
      start?.toString(),
      excerpt,
      cql
    ), 'Error searching for spaces');
  }

  async validateSetup(): Promise<void> {
    await UserService.getCurrent();
  }

  static validateConfig(): string[] {
    return getMissingConfig();
  }
}

export const confluenceToolSchemas = {
  getContent: {
    contentId: z.string().describe("Confluence Data Center content ID"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand"),
    bodyMode: z.enum(['storage', 'text', 'none']).optional().describe("How to return the page body. Defaults to storage for backward compatibility."),
    maxBodyChars: z.number().optional().describe("Maximum number of characters to keep when bodyMode is text"),
    bodyStart: z.number().int().optional().describe("Character offset to start the text body slice when bodyMode is text. Non-negative values start from the beginning; negative values start from the end, e.g. -2000 returns the last 2000 characters.")
  },
  searchContent: {
    cql: z.string().describe("Confluence Query Language (CQL) search string for Confluence Data Center"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand"),
    excerpt: z.enum(['none', 'highlight']).optional().describe("Excerpt mode for search results. Defaults to none.")
  },
  createContent: {
    title: z.string().describe("Title of the content"),
    spaceKey: z.string().describe("Space key where content will be created"),
    type: z.string().default("page").describe("Content type (page, blogpost, etc)"),
    content: z.string().describe("Content body in Confluence Data Center \"storage\" format (confluence XML)"),
    parentId: z.string().optional().describe("ID of the parent page (if creating a child page)"),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  updateContent: {
    contentId: z.string().describe("ID of the content to update"),
    title: z.string().optional().describe("New title of the content"),
    content: z.string().optional().describe("New content body in Confluence Data Center storage format (XML-based)"),
    edits: z.array(z.object({
      oldStr: z.string().describe("Text copied exactly from the current storage body; must occur exactly once"),
      newStr: z.string().describe("Replacement text; empty deletes oldStr"),
    })).min(1).optional().describe("Exact find/replace edits applied in order to the current storage body, instead of sending the whole body in content. All or none: if any oldStr is missing or not unique, nothing is saved. Requires version to be the current version + 1. Cannot be combined with content."),
    version: z.number().describe("New version number (must be incremented)"),
    versionComment: z.string().optional().describe("Comment for this version"),
    parentId: z.string().optional().describe("ID of the new parent page (moves the page under this parent; must be different from contentId; same mechanism as createContent parentId)"),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  searchSpaces: {
    searchText: z.string().describe("Text to search for in Confluence Data Center space names or descriptions. Quotes and backslashes are escaped for CQL; pass the literal search phrase only (do not pre-escape)."),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand"),
    excerpt: z.enum(['none', 'highlight']).optional().describe("Excerpt mode for search results. Defaults to none.")
  },
  uploadAttachment: {
    contentId: z.string().describe("ID of the Confluence content (page) to attach the file to"),
    sourcePath: z.string().describe("Path to the file to upload, relative to a server-configured attachment upload directory. Absolute paths and '..' segments are rejected; symlinks and non-regular files are refused."),
    filename: z.string().optional().describe("Override for the attachment filename (defaults to the basename of sourcePath)"),
    comment: z.string().optional().describe("Optional comment describing the attachment"),
    minorEdit: z.boolean().optional().describe("If true, no notification email is sent to watchers"),
    hidden: z.boolean().optional().describe("If true, no notification email or activity stream entry is generated"),
    allowDuplicated: z.boolean().optional().describe("Allow upload even if an attachment with the same filename already exists"),
    versionIfExists: z.boolean().optional().describe("If true and an attachment with the same filename already exists, upload as a new version instead of failing")
  },
  downloadAttachment: {
    contentId: z.string().describe("ID of the Confluence content (page) whose attachment(s) to download"),
    filename: z.string().optional().describe("Exact filename of a single attachment to download. If omitted, all attachments on the content are downloaded."),
    returnContent: z.enum(['none', 'base64', 'text']).optional().describe("Whether to embed the file bytes in the response: 'none' (default), 'base64' for binary, or 'text' for UTF-8 text."),
    maxInlineBytes: z.number().optional().describe("Maximum bytes to embed inline when returnContent is base64/text. Larger files are omitted from the inline content. Defaults to 1 MiB.")
  },
  downloadAttachmentSaveFields: {
    save: z.boolean().optional().describe("Save the attachment(s) into the server-configured download directory. Requires disk downloads to be enabled on the server."),
    saveName: z.string().optional().describe("Optional file name (no directories) to use when saving a single attachment; defaults to the attachment's own name. Existing files are never overwritten.")
  }
};
