import { z } from 'zod';
import { ContentResourceService, OpenAPI, SearchService } from './confluence-client/index.js';
import { handleApiOperation } from '@atlassian-dc-mcp/common';

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

export class ConfluenceService {
  /**
   * Creates a new ConfluenceService instance
   * @param host The hostname of the Confluence server (e.g., "host.com")
   * @param token The API token for authentication
   * @param fullApiUrl Optional full API URL (e.g., "https://host.com/wiki/"). If provided, host and apiBasePath are ignored.
   */
  constructor(host: string | undefined, token: string, fullApiUrl?: string) {
    if (fullApiUrl) {
      OpenAPI.BASE = fullApiUrl;
    } else if (host) {
      OpenAPI.BASE = `https://${host}`;
    } else {
      throw new Error('Either host or fullApiUrl must be provided');
    }
    OpenAPI.TOKEN = token;
    OpenAPI.VERSION = '1.0';
  }
  /**
   * Get a Confluence page by ID
   * @param contentId The ID of the page to retrieve
   * @param expand Optional comma-separated list of properties to expand
   */
  async getContent(contentId: string, expand?: string) {
    const expandValue = expand || 'body.storage';
    const finalExpand = expand && !expand.includes('body.storage')
      ? `${expand},body.storage`
      : expandValue;
    return handleApiOperation(() => ContentResourceService.getContentById(contentId, finalExpand), 'Error getting content');
  }

  /**
   * Search for content in Confluence using CQL
   * @param cql Confluence Query Language string
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async searchContent(cql: string, limit?: number, start?: number, expand?: string) {
    return handleApiOperation(() => SearchService.search1(undefined, expand, undefined, limit?.toString(), start?.toString(), undefined, cql), 'Error searching for content');
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
  async searchSpaces(searchText: string, limit?: number, start?: number, expand?: string) {
    // Create a CQL query that searches for spaces
    // The correct syntax for space search is: type=space AND title ~ "searchText"
    const escapedSearchText = searchText.replace(/"/g, '\\"');
    const cql = `type=space AND title ~ "${escapedSearchText}"`;

    return handleApiOperation(() => SearchService.search1(
      undefined,
      expand,
      undefined,
      limit?.toString(),
      start?.toString(),
      undefined,
      cql
    ), 'Error searching for spaces');
  }

  static validateConfig(): string[] {
    const missingVars: string[] = [];

    // API token is always required
    if (!process.env.CONFLUENCE_API_TOKEN) {
      missingVars.push('CONFLUENCE_API_TOKEN');
    }

    // Either CONFLUENCE_HOST or CONFLUENCE_API_BASE_PATH must be set
    if (!process.env.CONFLUENCE_HOST && !process.env.CONFLUENCE_API_BASE_PATH) {
      missingVars.push('CONFLUENCE_HOST or CONFLUENCE_API_BASE_PATH');
    }

    return missingVars;
  }
}

export const confluenceToolSchemas = {
  getContent: {
    contentId: z.string().describe("Confluence Data Center content ID"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  searchContent: {
    cql: z.string().describe("Confluence Query Language (CQL) search string for Confluence Data Center"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  createContent: {
    title: z.string().describe("Title of the content"),
    spaceKey: z.string().describe("Space key where content will be created"),
    type: z.string().default("page").describe("Content type (page, blogpost, etc)"),
    content: z.string().describe("Content body in Confluence Data Center \"storage\" format (confluence XML)"),
    parentId: z.string().optional().describe("ID of the parent page (if creating a child page)")
  },
  updateContent: {
    contentId: z.string().describe("ID of the content to update"),
    title: z.string().optional().describe("New title of the content"),
    content: z.string().optional().describe("New content body in Confluence Data Center storage format (XML-based)"),
    version: z.number().describe("New version number (must be incremented)"),
    versionComment: z.string().optional().describe("Comment for this version")
  },
  searchSpaces: {
    searchText: z.string().describe("Text to search for in Confluence Data Center space names or descriptions"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  }
};
