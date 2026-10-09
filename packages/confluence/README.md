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

   ### Attachment filesystem access (opt-in)

   By default this server is an API-only client: the attachment tools never read from or write to the local filesystem, and `confluence_uploadAttachment` is **not even registered**. `confluence_downloadAttachment` is always available but can only return file bytes inline (base64/text) — it cannot touch local disk.

   Local filesystem access is opt-in and confined to operator-configured directories that the model cannot choose:

   ```
   # Enable each direction separately (default: false)
   CONFLUENCE_ATTACHMENTS_UPLOAD_ENABLED=true
   CONFLUENCE_ATTACHMENTS_DOWNLOAD_ENABLED=true

   # Allowed roots (os path-separator list). Uploads may only read from these,
   # downloads may only write into the first configured download root.
   CONFLUENCE_ATTACHMENTS_UPLOAD_ROOTS=/srv/confluence-exchange/in
   CONFLUENCE_ATTACHMENTS_DOWNLOAD_ROOTS=/srv/confluence-exchange/out

   # Convenience: a single dedicated exchange directory used as both roots
   CONFLUENCE_ATTACHMENTS_DIR=/srv/confluence-exchange

   # Hard per-file size limits in bytes (default: 25 MiB)
   CONFLUENCE_ATTACHMENTS_MAX_UPLOAD_BYTES=26214400
   CONFLUENCE_ATTACHMENTS_MAX_DOWNLOAD_BYTES=26214400
   ```

   Guardrails applied when enabled:
   - A direction only activates when its flag is set **and** at least one root resolves; otherwise the tool stays disabled and a warning is logged.
   - Roots are canonicalized (realpath) at startup. Requested paths are relative to a root; absolute paths and `..` segments are rejected, and a path that escapes a root through a symlinked directory is refused.
   - Uploads reject symlinks and non-regular files (FIFOs, devices, directories).
   - Downloads never overwrite an existing file (including a symlink) — they use an exclusive write.
   - Both directions enforce the configured hard size limit.

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

### Attachments are untrusted content

An attachment is third-party content that anyone with write access to the Confluence instance can upload. Whatever one contains is data to be reported, never instructions to be followed.

`returnContent: 'image'` renders an attachment for the model to look at, which is a wider surface than the other modes: instructions painted into pixels are invisible to text-level prompt-injection filters, and a human skimming the transcript will not read them either ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)). That is why rendering is a separate, explicitly requested mode — `'base64'` and `'text'` return the bytes as data and render nothing, so a workflow that only moves a file elsewhere (e.g. re-uploading it to a Jira issue) never puts the image in front of the model.

To bound that surface and stay inside host limits, image blocks are:

- **sniffed, not trusted** — the format comes from the file's magic number rather than the uploader-declared media type, so a mislabelled file, an HTML error page, or an SSO login page served with a `200` is skipped instead of rendered;
- **limited to PNG, JPEG, GIF and WEBP** — the only formats the model vision APIs accept; anything else (SVG, HEIC, BMP, TIFF) stays out;
- **capped** at 3,750,000 bytes per image (base64 grows that to the 5 MB the model APIs accept) and 20 images per result;
- **labelled** with `attachments[i] "<name>" (<type>, <size>)`, so every image maps back to its JSON entry. The filename is quoted and, before that, stripped of the double quote itself along with control and format characters, then length-capped — so a name can neither break the line nor close its own quotes to forge a second label;
- **the only place bytes travel** — in this mode the JSON entry never carries `content`. A rendered image has its bytes in its block and nowhere else, so the payload is never shipped twice; an attachment that is *not* rendered, for any of the reasons above, gets no bytes either and reports `imageOmittedReason` instead. Base64 sitting in the serialised text is counted as text and costs roughly 60x the tokens of the block that shows the same pixels, which is enough on its own to push a result past the host's size limit — and it buys nothing when nothing can be looked at. Ask for those bytes with `returnContent: 'base64'`.

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
- `parentId` (string, optional): ID of the new parent page (moves the page under this parent; must be different from `contentId`; uses Confluence `ancestors`, same as `createContent` `parentId`)
- `output` (`ack` | `full`, optional): Return a compact acknowledgement or the full API response. Defaults to `ack`.

#### 5. confluence_searchSpace

Search for Confluence spaces by name text.

Parameters:
- `searchText` (string, required): Text to search for in space names or descriptions
- `limit` (number, optional): Maximum number of results to return. Defaults to `CONFLUENCE_DEFAULT_PAGE_SIZE` or `25`.
- `start` (number, optional): Start index for pagination
- `expand` (string, optional): Comma-separated list of properties to expand
- `excerpt` (`none` | `highlight`, optional): Excerpt mode for search results. Defaults to `none`.

#### 6. confluence_uploadAttachment

Upload a local file as an attachment to a Confluence content (page). Only registered when filesystem uploads are enabled (see [Attachment filesystem access](#attachment-filesystem-access-opt-in)).

Parameters:
- `contentId` (string, required): ID of the content (page) to attach the file to
- `sourcePath` (string, required): Path to the file to upload, **relative to a server-configured upload directory**. Absolute paths and `..` segments are rejected; symlinks and non-regular files are refused.
- `filename` (string, optional): Override for the attachment filename (defaults to the basename of `sourcePath`)
- `comment` (string, optional): Comment describing the attachment
- `minorEdit` (boolean, optional): If true, no notification email is sent to watchers
- `hidden` (boolean, optional): If true, no notification email or activity stream entry is generated
- `allowDuplicated` (boolean, optional): Allow upload even if an attachment with the same filename already exists
- `versionIfExists` (boolean, optional): If true and an attachment with the same filename already exists, upload as a new version instead of failing

#### 7. confluence_downloadAttachment

Download one or more attachments from a Confluence content (page). Returns metadata only unless `returnContent` asks for the bytes — as data with `base64`/`text`, or as a viewable image with `image`. Useful for inspecting a file, looking at a screenshot or mockup, or moving a file elsewhere (e.g. re-uploading to a Jira issue). When filesystem downloads are enabled (see [Attachment filesystem access](#attachment-filesystem-access-opt-in)), it can also save into the server-configured download directory.

Parameters:
- `contentId` (string, required): ID of the content (page) whose attachment(s) to download
- `filename` (string, optional): Exact filename of a single attachment to download. If omitted, all attachments on the content are downloaded.
- `returnContent` (`none` | `base64` | `text` | `image`, optional): Whether and how to embed the file bytes in the response. Defaults to `none` (metadata only — no bytes). `base64` embeds the bytes in the JSON payload as data; `text` embeds them decoded as UTF-8; `image` renders a PNG/JPEG/GIF/WEBP attachment as a viewable MCP image block so the model can actually look at it, and returns no bytes in the JSON at all — an attachment it cannot render reports `imageOmittedReason`, and `base64` is how you get that one's bytes. See [Attachments are untrusted content](#attachments-are-untrusted-content).
- `maxInlineBytes` (number, optional): Maximum bytes to embed inline when `returnContent` is `base64`/`text`/`image`. Larger files are omitted from the inline content and the entry carries a `contentOmittedReason` instead, so a retry with a higher value gets them. Defaults to 1 MiB and may not exceed 25 MiB, the ceiling on what can be downloaded at all — past that there are no bytes to have, so the request is rejected rather than promising a payload nothing can deliver. Applies to all three modes alike. Rendering has its own separate limit (below), so raising this never renders an image larger than 3,750,000 bytes; re-request that one with `base64` if you need its bytes.
- `save` (boolean, optional): Save the attachment(s) into the server-configured download directory. Requires filesystem downloads to be enabled; existing files are never overwritten. *(Only available when downloads are enabled.)*
- `saveName` (string, optional): File name (no directories) to use when saving a single attachment; defaults to the attachment's own name. *(Only available when downloads are enabled.)*
