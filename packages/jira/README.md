# Atlassian Jira Data Center MCP

This package provides a Machine Comprehension Protocol (MCP) server for interacting with Atlassian Jira Data Center edition.

## Interactive Setup

The easiest way to configure this server is the built-in `setup` subcommand:

```bash
npx @atlassian-dc-mcp/jira setup
```

It prompts for host, API base path, default page size, and API token, then stores them in the most secure place available:

- **macOS** — token in the login Keychain (service `atlassian-dc-mcp`, account `jira-token`); host / base path / page size in `~/.atlassian-dc-mcp/jira.env` (mode `0600`).
- **Linux** — everything in `~/.atlassian-dc-mcp/jira.env` with POSIX mode `0600` (read/write for your user only).
- **Windows** — everything in `%USERPROFILE%\.atlassian-dc-mcp\jira.env`. Node passes the mode bits but Windows ignores them, so the file inherits the ACL of your user profile directory (typically readable only by your user, SYSTEM, and Administrators).

After setup, you can launch the server without any environment variables:

```json
{
  "mcpServers": {
    "atlassian-jira-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/jira"]
    }
  }
}
```

Environment variables still override stored values — see [Configuration sources](#configuration-sources) below.

### Scripted / non-interactive setup

For CI, remote sessions, or shell scripts, pass values as flags and add `--non-interactive` to skip prompts:

```bash
npx @atlassian-dc-mcp/jira setup --non-interactive \
  --host jira.example.com \
  --token "$JIRA_TOKEN"
```

Available flags: `--host`/`-H`, `--api-base-path`/`-b`, `--token`/`-t`, `--default-page-size`/`-s`, `--non-interactive`/`-n`, `--help`/`-h`. In `--non-interactive` mode, missing values fall back to existing configuration and the run exits non-zero if a host (or full-URL `--api-base-path`) and token cannot be resolved. An existing token is reused when `--token` is omitted. Run `npx @atlassian-dc-mcp/jira setup --help` for full usage.

## Claude Desktop Configuration

To use this MCP connector with Claude Desktop, add the following to your Claude Desktop configuration:

macOS:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Windows:
```
%APPDATA%\Claude\claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "atlassian-jira-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/jira"],
      "env": {
        "JIRA_HOST": "your-jira-host",
        "JIRA_API_TOKEN": "your-token"
      }
    }
  }
}
```

To reuse one shared dotenv file across multiple tools or MCP hosts, point the server at an absolute file path:

```json
{
  "mcpServers": {
    "atlassian-jira-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/jira"],
      "env": {
        "ATLASSIAN_DC_MCP_CONFIG_FILE": "/Users/your-user/.config/atlassian-dc-mcp.env"
      }
    }
  }
}
```

Windows example:

```json
{
  "mcpServers": {
    "atlassian-jira-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/jira"],
      "env": {
        "ATLASSIAN_DC_MCP_CONFIG_FILE": "C:\\\\Users\\\\your-user\\\\AppData\\\\Roaming\\\\atlassian-dc-mcp.env"
      }
    }
  }
}
```

Note: Set `JIRA_HOST` variable only to domain + port without a protocol (e.g., `your-instance.atlassian.net`). The https protocol is assumed.

Alternatively, you can use `JIRA_API_BASE_PATH` instead of `JIRA_HOST` to specify the complete API base URL including protocol (e.g., `https://your-instance.atlassian.net/rest`). Note that the `/api/2/search/` part is static and added automatically in the code, so you don't need to include it in the `JIRA_API_BASE_PATH` value.

## Features

- Search for issues using JQL (Jira Query Language)
- Get issue details by key
- Get issue comments
- Create and update issues
- Add comments to issues

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the packages/jira directory, or put the same values in a shared dotenv file and set `ATLASSIAN_DC_MCP_CONFIG_FILE` to its absolute path:
   ```
   JIRA_HOST=your-jira-instance.atlassian.net
   # OR alternatively use
   # JIRA_API_BASE_PATH=https://your-jira-instance.atlassian.net/rest
   # Note: /api/latest/ is added automatically, do not include it
   JIRA_API_TOKEN=your-personal-access-token

   # Optional: default page size for paginated read tools (fallback: 25)
   JIRA_DEFAULT_PAGE_SIZE=25
   ```

   See [Configuration sources](#configuration-sources) for the full precedence chain.

   To create a personal access token:
  - In Jira, select your profile picture at the top right
  - Select **Personal Access Tokens**
  - Select **Create token** and give it a name
  - Copy the token and store it securely (you won't be able to see it again)

## Configuration sources

Each key is resolved by walking these sources in priority order and taking the first non-empty value:

| Priority | Source | Reads | Written by `setup` |
|---------:|--------|-------|--------------------|
| 100 | `process.env` (`JIRA_HOST`, `JIRA_API_BASE_PATH`, `JIRA_API_TOKEN`, `JIRA_DEFAULT_PAGE_SIZE`) | all keys | — |
| 80  | env file — `ATLASSIAN_DC_MCP_CONFIG_FILE` (absolute path) or `./.env` | all keys | — |
| 60  | home file — `~/.atlassian-dc-mcp/jira.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\jira.env` on Windows (mode `0600` on POSIX; Windows inherits the user-profile ACL) | all keys | host, apiBasePath, defaultPageSize (always); token (non-darwin or keychain fallback) |
| 40  | macOS Keychain — service `atlassian-dc-mcp`, account `jira-token` | token only | token (darwin only) |

`setup` always writes non-secret fields to the home file and tries the keychain first for the token. If a higher-priority source shadows the value being saved, `setup` prints a warning so you can unset the env var.

## Usage

Start the MCP server:

```
npm run build
```

Or for development with auto-reload:

```
npm run dev
```

### Available Tools

#### 1. jira_searchIssues

Search for JIRA issues using JQL in the JIRA Data Center edition instance.

Parameters:
- `jql` (string, required): JIRA Query Language search string
- `expand` (array, optional): Additional response sections to expand, such as `renderedFields`, `names`, or `schema`
- `startAt` (number, optional): Starting index for pagination
- `maxResults` (number, optional): Maximum number of results to return. Defaults to `JIRA_DEFAULT_PAGE_SIZE` or `25`.
- `fields` (array, optional): Issue field names to return. When omitted, the tool uses a moderate-detail default field set.

#### 2. jira_getIssue

Get details of a JIRA issue by its key from the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `expand` (string, optional): Comma-separated response sections to expand, such as `renderedFields`, `changelog`, or `transitions`
- `fields` (array, optional): Issue field names to return. When omitted, the tool uses the search default field set plus `parent` and `subtasks`.

#### 3. jira_getIssueComments

Get comments for a JIRA issue from the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `expand` (string, optional): Comma-separated comment expansions, such as `renderedBody`
- `maxResults` (number, optional): Maximum number of comments to return. Defaults to `JIRA_DEFAULT_PAGE_SIZE` or `25`.
- `startAt` (number, optional): Starting comment offset for pagination

#### 4. jira_createIssue

Create a new issue in the JIRA Data Center edition instance.

Parameters:
- `projectId` (string, required): Project key (despite the parameter name, e.g., "PROJ")
- `summary` (string, required): Issue summary
- `description` (string, required): Issue description in format suitable for JIRA Data Center edition (JIRA Wiki Markup)
- `issueTypeId` (string, required): ID of the issue type
- `customFields` (object, optional): Additional JIRA fields merged into the issue payload. Can be used for custom fields and standard fields such as `labels`. Example: `{"labels":["urgent","bug"],"customfield_10001":"Custom Value"}`

#### 5. jira_updateIssue

Update an existing issue in the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `summary` (string, optional): New issue summary
- `description` (string, optional): New issue description in format suitable for JIRA Data Center edition (JIRA Wiki Markup)
- `issueTypeId` (string, optional): New issue type ID
- `customFields` (object, optional): Additional JIRA fields merged into the update payload. Can be used for custom fields and standard fields such as `labels`. Example: `{"labels":["urgent","bug"],"customfield_10001":"Custom Value"}`

#### 6. jira_postIssueComment

Add a comment to a JIRA issue in the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `comment` (string, required): Comment text in format suitable for JIRA Data Center edition (JIRA Wiki Markup)

#### 7. jira_getTransitions

Get the available workflow transitions for a JIRA issue in the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")

#### 8. jira_transitionIssue

Transition a JIRA issue to a new status in the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `transitionId` (string, required): Transition ID returned by `jira_getTransitions`
- `fields` (object, optional): Additional fields required by the transition screen

#### 9. jira_getIssueAttachments

Get attachment metadata for a JIRA issue in the JIRA Data Center edition instance. Read-only.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")

Example: `{ "issueKey": "PROJ-123" }`

Returns `{ issueKey, attachments: [...] }` where each attachment carries `id`, `filename`, `mimeType`, `size` (bytes), `created`, a minimal `author` (`name`, `displayName`), and `hasThumbnail`. An issue with no attachments returns an empty `attachments` list. The issue is fetched with an attachment-only field selection, so the response stays compact regardless of issue size.

#### 10. jira_downloadIssueAttachment

Download an attachment from a JIRA issue in the JIRA Data Center edition instance. Read-only.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `attachmentId` (string, required): Numeric attachment ID as returned by `jira_getIssueAttachments`

Example: `{ "issueKey": "PROJ-123", "attachmentId": "10042" }`

Returns `{ issueKey, attachmentId, filename, mimeType, size, encoding: "base64", data }` where `data` is the attachment's raw bytes base64-encoded (byte-for-byte; decode with any standard base64 decoder). The attachment must belong to the specified issue: the tool first lists the issue's own attachments and refuses to download an ID that is not on that list.

Size limit: downloads are capped at 10 MiB by default to bound memory use (base64 inflates payloads by ~33%). Override with the `JIRA_MAX_ATTACHMENT_DOWNLOAD_BYTES` environment variable (plain process environment variable, read directly like `ATLASSIAN_DC_MCP_REQUEST_TIMEOUT_MS`; it does not participate in the config-file/keychain resolution chain). Oversized attachments are rejected from metadata before any download when Jira reports a size, from the response's Content-Length header before the body is buffered, and re-checked against the actual bytes after download.

Security note: attachment access is limited by the permissions of the configured `JIRA_API_TOKEN` — the tool can only list and download attachments on issues that token can read. The download URL is always constructed from the configured Jira host, never from URLs embedded in API responses, and redirects are refused.
