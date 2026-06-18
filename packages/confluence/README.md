# Atlassian Confluence Data Center MCP

This package provides a Machine Comprehension Protocol (MCP) server for interacting with Atlassian Confluence Data Center edition.

## Interactive Setup

The easiest way to configure this server is the built-in `setup` subcommand:

```bash
npx @atlassian-dc-mcp/confluence setup
```

It prompts for host, API base path, default page size, and API token, then stores them in the most secure place available:

- **macOS** — token in the login Keychain (service `atlassian-dc-mcp`, account `confluence-token`); host / base path / page size in `~/.atlassian-dc-mcp/confluence.env` (mode `0600`).
- **Linux** — everything in `~/.atlassian-dc-mcp/confluence.env` with POSIX mode `0600` (read/write for your user only).
- **Windows** — everything in `%USERPROFILE%\.atlassian-dc-mcp\confluence.env`. Node passes the mode bits but Windows ignores them, so the file inherits the ACL of your user profile directory (typically readable only by your user, SYSTEM, and Administrators).

After setup, you can launch the server without any environment variables:

```json
{
  "mcpServers": {
    "atlassian-confluence-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/confluence"]
    }
  }
}
```

Environment variables still override stored values — see [Configuration sources](#configuration-sources) below.

### Scripted / non-interactive setup

For CI, remote sessions, or shell scripts, pass values as flags and add `--non-interactive` to skip prompts:

```bash
npx @atlassian-dc-mcp/confluence setup --non-interactive \
  --host confluence.example.com \
  --token "$CONFLUENCE_TOKEN"
```

Available flags: `--host`/`-H`, `--api-base-path`/`-b`, `--token`/`-t`, `--default-page-size`/`-s`, `--non-interactive`/`-n`, `--help`/`-h`. In `--non-interactive` mode, missing values fall back to existing configuration and the run exits non-zero if a host (or full-URL `--api-base-path`) and token cannot be resolved. An existing token is reused when `--token` is omitted. Run `npx @atlassian-dc-mcp/confluence setup --help` for full usage.

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

2. Create a `.env` file in the packages/confluence directory, or put the same values in a shared dotenv file and set `ATLASSIAN_DC_MCP_CONFIG_FILE` to its absolute path:
   ```
   # Either CONFLUENCE_HOST or CONFLUENCE_API_BASE_PATH must be set
   CONFLUENCE_HOST=your-confluence-instance.atlassian.net
   CONFLUENCE_API_TOKEN=your-personal-access-token

   # Optional: Use one of the following approaches:
   # 1. If your Confluence instance hosted on the subpath:
   # CONFLUENCE_API_BASE_PATH=https://your-confluence-instance.atlassian.net/sub-path

   # 2. Or continue using CONFLUENCE_HOST with the default API path (/rest):
   # CONFLUENCE_HOST=your-confluence-instance.atlassian.net

   # Optional: default page size for paginated search tools (fallback: 25)
   CONFLUENCE_DEFAULT_PAGE_SIZE=25
    ```

   Shared file example:
   ```
   CONFLUENCE_HOST=your-confluence-instance.atlassian.net
   CONFLUENCE_API_TOKEN=your-personal-access-token
   CONFLUENCE_DEFAULT_PAGE_SIZE=25
   ```

   Start the server with:
   ```
   ATLASSIAN_DC_MCP_CONFIG_FILE=/absolute/path/to/atlassian-dc-mcp.env npm run dev
   ```

   Windows example:
   ```
   set ATLASSIAN_DC_MCP_CONFIG_FILE=C:\Users\your-user\AppData\Roaming\atlassian-dc-mcp.env
   npm run dev
   ```

   Note: You have two options for configuring the API URL:

   1. Set `CONFLUENCE_API_BASE_PATH` to the full API URL (e.g., "https://host.com/rest/api" or "https://host.com/wiki/rest/api").
      When this is set, the `CONFLUENCE_HOST` variable is ignored.

   2. Set `CONFLUENCE_HOST` only, which will use the default API path (/rest).

   3. Confluence uses `/rest` as a path part always, so it will be added automatically, no need to add it manually.

   See [Configuration sources](#configuration-sources) for the full precedence chain.

   To create a personal access token:
   - In Confluence, select your profile picture at the top right
   - Select **Settings** > **Personal Access Tokens**
   - Select **Create token** and give it a name
   - Copy the token and store it securely (you won't be able to see it again)

## Configuration sources

Each key is resolved by walking these sources in priority order and taking the first non-empty value:

| Priority | Source | Reads | Written by `setup` |
|---------:|--------|-------|--------------------|
| 100 | `process.env` (`CONFLUENCE_HOST`, `CONFLUENCE_API_BASE_PATH`, `CONFLUENCE_API_TOKEN`, `CONFLUENCE_DEFAULT_PAGE_SIZE`) | all keys | — |
| 80  | env file — `ATLASSIAN_DC_MCP_CONFIG_FILE` (absolute path) or `./.env` | all keys | — |
| 60  | home file — `~/.atlassian-dc-mcp/confluence.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\confluence.env` on Windows (mode `0600` on POSIX; Windows inherits the user-profile ACL) | all keys | host, apiBasePath, defaultPageSize (always); token (non-darwin or keychain fallback) |
| 40  | macOS Keychain — service `atlassian-dc-mcp`, account `confluence-token` | token only | token (darwin only) |

`setup` always writes non-secret fields to the home file and tries the keychain first for the token. If a higher-priority source shadows the value being saved, `setup` prints a warning so you can unset the env var.

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
- `bodyMode` (`storage` | `text` | `none`, optional): Response shape for the content body. Defaults to `storage` for backward compatibility.
- `maxBodyChars` (number, optional): Maximum number of characters to keep when `bodyMode=text`
- `bodyStart` (number, optional): Character offset to start the text body slice when `bodyMode=text`. Non-negative values start from the beginning; negative values start from the end, e.g. `-2000` returns the last 2000 characters.

#### 2. confluence_searchContent

Search for content in Confluence Data Center using CQL.

Parameters:
- `cql` (string, required): Confluence Query Language search string
- `limit` (number, optional): Maximum number of results to return. Defaults to `CONFLUENCE_DEFAULT_PAGE_SIZE` or `25`.
- `start` (number, optional): Start index for pagination
- `expand` (string, optional): Comma-separated list of properties to expand
- `excerpt` (`none` | `highlight`, optional): Excerpt mode for search results. Defaults to `none`.

#### 3. confluence_createContent

Create new content in Confluence Data Center.

Parameters:
- `title` (string, required): Title of the content
- `spaceKey` (string, required): Space key where content will be created
- `type` (string, default: "page"): Content type (page, blogpost, etc)
- `content` (string, required): Content body in Confluence Data Center's storage format (XML-based storage format)
- `parentId` (string, optional): ID of the parent page (if creating a child page)
- `output` (`ack` | `full`, optional): Return a compact acknowledgement or the full API response. Defaults to `ack`.

#### 4. confluence_updateContent

Update existing content in Confluence Data Center.

Parameters:
- `contentId` (string, required): ID of the content to update
- `title` (string, optional): New title of the content
- `content` (string, optional): New content body in Confluence Data Center's storage format (XML-based)
- `version` (number, required): New version number (must be incremented from current version)
- `versionComment` (string, optional): Comment for this version
- `output` (`ack` | `full`, optional): Return a compact acknowledgement or the full API response. Defaults to `ack`.

#### 5. confluence_searchSpace

Search for Confluence spaces by name text.

Parameters:
- `searchText` (string, required): Text to search for in space names or descriptions
- `limit` (number, optional): Maximum number of results to return. Defaults to `CONFLUENCE_DEFAULT_PAGE_SIZE` or `25`.
- `start` (number, optional): Start index for pagination
- `expand` (string, optional): Comma-separated list of properties to expand
- `excerpt` (`none` | `highlight`, optional): Excerpt mode for search results. Defaults to `none`.
