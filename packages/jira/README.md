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
- Add and update comments on issues
- Link and unlink issues
- Watch and unwatch issues

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

   ### Attachment filesystem access (opt-in)

   By default this server is an API-only client: the attachment tools never read from or write to the local filesystem, and `jira_uploadAttachment` is **not even registered**. `jira_downloadAttachment` is always available but can only return file bytes inline (base64/text) — it cannot touch local disk.

   Local filesystem access is opt-in and confined to operator-configured directories that the model cannot choose:

   ```
   # Enable each direction separately (default: false)
   JIRA_ATTACHMENTS_UPLOAD_ENABLED=true
   JIRA_ATTACHMENTS_DOWNLOAD_ENABLED=true

   # Allowed roots (os path-separator list). Uploads may only read from these,
   # downloads may only write into the first configured download root.
   JIRA_ATTACHMENTS_UPLOAD_ROOTS=/srv/jira-exchange/in
   JIRA_ATTACHMENTS_DOWNLOAD_ROOTS=/srv/jira-exchange/out

   # Convenience: a single dedicated exchange directory used as both roots
   JIRA_ATTACHMENTS_DIR=/srv/jira-exchange

   # Hard per-file size limits in bytes (default: 25 MiB)
   JIRA_ATTACHMENTS_MAX_UPLOAD_BYTES=26214400
   JIRA_ATTACHMENTS_MAX_DOWNLOAD_BYTES=26214400
   ```

   Guardrails applied when enabled:
   - A direction only activates when its flag is set **and** at least one root resolves; otherwise the tool stays disabled and a warning is logged.
   - Roots are canonicalized (realpath) at startup. Requested paths are relative to a root; absolute paths and `..` segments are rejected, and a path that escapes a root through a symlinked directory is refused.
   - Uploads reject symlinks and non-regular files (FIFOs, devices, directories).
   - Downloads never overwrite an existing file (including a symlink) — they use an exclusive write.
   - Both directions enforce the configured hard size limit.

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

### Attachments are untrusted content

An attachment is third-party content that anyone with write access to the Jira instance can upload. Whatever one contains is data to be reported, never instructions to be followed.

`returnContent: 'image'` renders an attachment for the model to look at, which is a wider surface than the other modes: instructions painted into pixels are invisible to text-level prompt-injection filters, and a human skimming the transcript will not read them either ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)). That is why rendering is a separate, explicitly requested mode — `'base64'` and `'text'` return the bytes as data and render nothing, so a workflow that only moves a file elsewhere (e.g. re-uploading it to a Confluence page) never puts the image in front of the model.

To bound that surface and stay inside host limits, image blocks are:

- **sniffed, not trusted** — the format comes from the file's magic number rather than the uploader-declared media type, so a mislabelled file, an HTML error page, or an SSO login page served with a `200` is skipped instead of rendered;
- **limited to PNG, JPEG, GIF and WEBP** — the only formats the model vision APIs accept; anything else (SVG, HEIC, BMP, TIFF) stays out;
- **capped** at 3,750,000 bytes per image (base64 grows that to the 5 MB the model APIs accept) and 20 images per result;
- **labelled** with `attachments[i] "<name>" (<type>, <size>)`, so every image maps back to its JSON entry. The filename is quoted and, before that, stripped of the double quote itself along with control and format characters, then length-capped — so a name can neither break the line nor close its own quotes to forge a second label;
- **the only place bytes travel** — in this mode the JSON entry never carries `content`. A rendered image has its bytes in its block and nowhere else, so the payload is never shipped twice; an attachment that is *not* rendered, for any of the reasons above, gets no bytes either and reports `imageOmittedReason` instead. Base64 sitting in the serialised text is counted as text and costs roughly 60x the tokens of the block that shows the same pixels, which is enough on its own to push a result past the host's size limit — and it buys nothing when nothing can be looked at. Ask for those bytes with `returnContent: 'base64'`.

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

#### 7. jira_updateIssueComment

Update the body of an existing comment on a JIRA issue in the JIRA Data Center edition instance. Use `jira_getIssueComments` to find the comment id.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `commentId` (string, required): The id of the comment to update (found via `jira_getIssueComments`)
- `comment` (string, required): New comment text that replaces the existing body, in format suitable for JIRA Data Center edition (JIRA Wiki Markup)

#### 8. jira_getTransitions

Get the available workflow transitions for a JIRA issue in the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")

#### 9. jira_transitionIssue

Transition a JIRA issue to a new status in the JIRA Data Center edition instance.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `transitionId` (string, required): Transition ID returned by `jira_getTransitions`
- `fields` (object, optional): Additional fields required by the transition screen

#### 10. jira_getIssueLinkTypes

Get the list of available issue link types (e.g., "Blocks", "Relates", "Duplicate") in the JIRA Data Center edition instance. Use this to discover valid link type names before calling `jira_linkIssues`.

Parameters: none

#### 11. jira_linkIssues

Create a link between two JIRA issues in the JIRA Data Center edition instance.

Jira UI labels follow GET `issuelinks`, not the REST POST field names: if GET of an issue contains `outwardIssue`, that issue shows the **outward** phrase (`blocks`); if it contains `inwardIssue`, it shows the **inward** phrase (`is blocked by`). So `inwardIssueKey` is the issue that will display the outward phrase.

Parameters:
- `inwardIssueKey` (string, required): REST inward issue. In the Jira UI **this** issue shows the **outward** phrase (e.g. "blocks", "split to"). For PROJECT-123 to show "blocks PROJECT-456", pass `inwardIssueKey=PROJECT-123`.
- `outwardIssueKey` (string, required): REST outward issue. In the Jira UI **this** issue shows the **inward** phrase (e.g. "is blocked by", "split from"). Same example: `outwardIssueKey=PROJECT-456`.
- `linkType` (string, required): Name of the issue link type to apply (e.g., "Blocks", "Relates"). Use `jira_getIssueLinkTypes` to discover valid names for this JIRA installation.
- `comment` (string, optional): Comment added to the inward issue when the link is created, in JIRA Wiki Markup

#### 12. jira_unlinkIssues

Delete an existing link between two JIRA issues in the JIRA Data Center edition instance.

Parameters:
- `linkId` (string, required): The id of the issue link to delete. Link ids are found in the `issuelinks` field of an issue (retrieve it via `jira_getIssue` with the `issuelinks` field).

#### 13. jira_watchIssue

Add yourself (the authenticated user) as a watcher on a JIRA issue in the JIRA Data Center edition instance. Only the calling user can be added — there is no way to watch an issue on behalf of someone else.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")

#### 14. jira_unwatchIssue

Remove yourself (the authenticated user) as a watcher from a JIRA issue in the JIRA Data Center edition instance. Only the calling user can be removed — there is no way to unwatch an issue on behalf of someone else.

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")

#### 15. jira_uploadAttachment

Upload a local file as an attachment to a JIRA issue. Only registered when filesystem uploads are enabled (see [Attachment filesystem access](#attachment-filesystem-access-opt-in)).

Parameters:
- `issueKey` (string, required): The issue key (e.g., "PROJECT-123")
- `sourcePath` (string, required): Path to the file to upload, **relative to a server-configured upload directory**. Absolute paths and `..` segments are rejected; symlinks and non-regular files are refused.
- `filename` (string, optional): Override for the attachment filename (defaults to the basename of `sourcePath`)

#### 16. jira_downloadAttachment

Download attachment(s) from a JIRA issue, by issue key (optionally filtered by filename) or by a single attachment id. Returns metadata only unless `returnContent` asks for the bytes — as data with `base64`/`text`, or as a viewable image with `image`. Useful for inspecting a file, looking at a screenshot or mockup, or moving a file elsewhere (e.g. re-uploading to a Confluence page). When filesystem downloads are enabled (see [Attachment filesystem access](#attachment-filesystem-access-opt-in)), it can also save into the server-configured download directory.

Parameters:
- `issueKey` (string, optional): The issue key (e.g., "PROJECT-123") whose attachment(s) to download. Provide either `issueKey` or `attachmentId`.
- `attachmentId` (string, optional): Numeric id of a single attachment to download. Provide either `attachmentId` or `issueKey`.
- `filename` (string, optional): When using `issueKey`, download only attachments with this exact filename. If omitted, all attachments on the issue are downloaded.
- `returnContent` (`none` | `base64` | `text` | `image`, optional): Whether and how to embed the file bytes in the response. Defaults to `none` (metadata only — no bytes). `base64` embeds the bytes in the JSON payload as data; `text` embeds them decoded as UTF-8; `image` renders a PNG/JPEG/GIF/WEBP attachment as a viewable MCP image block so the model can actually look at it, and returns no bytes in the JSON at all — an attachment it cannot render reports `imageOmittedReason`, and `base64` is how you get that one's bytes. See [Attachments are untrusted content](#attachments-are-untrusted-content).
- `maxInlineBytes` (number, optional): Maximum bytes to embed inline when `returnContent` is `base64`/`text`/`image`. Larger files are omitted from the inline content and the entry carries a `contentOmittedReason` instead, so a retry with a higher value gets them. Defaults to 1 MiB and may not exceed 25 MiB, the ceiling on what can be downloaded at all — past that there are no bytes to have, so the request is rejected rather than promising a payload nothing can deliver. Applies to all three modes alike. Rendering has its own separate limit (below), so raising this never renders an image larger than 3,750,000 bytes; re-request that one with `base64` if you need its bytes.
- `save` (boolean, optional): Save the attachment(s) into the server-configured download directory. Requires filesystem downloads to be enabled; existing files are never overwritten. *(Only available when downloads are enabled.)*
- `saveName` (string, optional): File name (no directories) to use when saving a single attachment; defaults to the attachment's own name. *(Only available when downloads are enabled.)*
