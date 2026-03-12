# Atlassian Confluence Data Center MCP

This package provides a Machine Comprehension Protocol (MCP) server for interacting with Atlassian Confluence Data Center edition.

## Features

- Get content by ID
- Search for content using CQL (Confluence Query Language)
- Create new content (pages, blog posts)
- Update existing content

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the packages/confluence directory with the following variables:
   ```
   # Either CONFLUENCE_HOST or CONFLUENCE_API_BASE_PATH must be set
   CONFLUENCE_HOST=your-confluence-instance.atlassian.net
   CONFLUENCE_API_TOKEN=your-personal-access-token

   # Optional: Use one of the following approaches:
   # 1. If your Confluence instance hosted on the subpath:
   # CONFLUENCE_API_BASE_PATH=https://your-confluence-instance.atlassian.net/sub-path

   # 2. Or continue using CONFLUENCE_HOST with the default API path (/rest):
   # CONFLUENCE_HOST=your-confluence-instance.atlassian.net
    ```

   Note: You have two options for configuring the API URL:

   1. Set `CONFLUENCE_API_BASE_PATH` to the full API URL (e.g., "https://host.com/rest/api" or "https://host.com/wiki/rest/api").
      When this is set, the `CONFLUENCE_HOST` variable is ignored.

   2. Set `CONFLUENCE_HOST` only, which will use the default API path (/rest).

   3. Confluence uses `/rest` as a path part always, so it will be added automatically, no need to add it manually.

   To create a personal access token:
   - In Confluence, select your profile picture at the top right
   - Select **Settings** > **Personal Access Tokens**
   - Select **Create token** and give it a name
   - Copy the token and store it securely (you won't be able to see it again)

## Usage

Start the MCP server:

```
npm run build
npm start
```

Or for development with auto-reload:

```
npm run dev
```

## Testing

Run the test suite from the package directory:

```
npm run test
```

Or from the repository root:

```
npm run test --workspace=@atlassian-dc-mcp/confluence
```

### Available Tools

#### 1. confluence_getContent

Get Confluence Data Center content by ID.

Parameters:
- `contentId` (string, required): The ID of the content to retrieve
- `expand` (string, optional): Comma-separated list of properties to expand (e.g., "body.storage,version")

#### 2. confluence_searchContent

Search for content in Confluence Data Center using CQL.

Parameters:
- `cql` (string, required): Confluence Query Language search string
- `limit` (number, optional): Maximum number of results to return
- `start` (number, optional): Start index for pagination
- `expand` (string, optional): Comma-separated list of properties to expand

#### 3. confluence_createContent

Create new content in Confluence Data Center.

Parameters:
- `title` (string, required): Title of the content
- `spaceKey` (string, required): Space key where content will be created
- `type` (string, default: "page"): Content type (page, blogpost, etc)
- `content` (string, required): Content body in Confluence Data Center's storage format (XML-based storage format)
- `parentId` (string, optional): ID of the parent page (if creating a child page)

#### 4. confluence_updateContent

Update existing content in Confluence Data Center.

Parameters:
- `contentId` (string, required): ID of the content to update
- `title` (string, optional): New title of the content
- `content` (string, optional): New content body in Confluence Data Center's storage format (XML-based)
- `version` (number, required): New version number (must be incremented from current version)
- `versionComment` (string, optional): Comment for this version
