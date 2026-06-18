import { z } from 'zod';
import { ContentResourceService, OpenAPI, SearchService, UserService } from './confluence-client/index.js';
import { handleApiOperation, resolveOpenApiBase } from '@atlassian-dc-mcp/common';
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

  constructor(
    host: string | undefined,
    token: string | (() => string | undefined),
    apiBasePath?: string,
    getPageSize: () => number = getDefaultPageSize,
  ) {
    OpenAPI.BASE = resolveOpenApiBase({
      host,
      apiBasePath,
      defaultBasePath: CONFLUENCE_PRODUCT.defaultApiBasePath ?? '',
      strippableSuffixes: CONFLUENCE_PRODUCT.apiBasePathStrippableSuffixes,
    });
    OpenAPI.TOKEN = resolveToken(token, 'Missing required environment variable: CONFLUENCE_API_TOKEN');
    OpenAPI.VERSION = '1.0';
    this.getPageSize = getPageSize;
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
    version: z.number().describe("New version number (must be incremented)"),
    versionComment: z.string().optional().describe("Comment for this version"),
    output: z.enum(['ack', 'full']).optional().describe("Return a compact acknowledgement or the full API response. Defaults to ack.")
  },
  searchSpaces: {
    searchText: z.string().describe("Text to search for in Confluence Data Center space names or descriptions. Quotes and backslashes are escaped for CQL; pass the literal search phrase only (do not pre-escape)."),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand"),
    excerpt: z.enum(['none', 'highlight']).optional().describe("Excerpt mode for search results. Defaults to none.")
  }
};
