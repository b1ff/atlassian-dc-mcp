# Atlassian Bitbucket Data Center MCP

This package provides a Machine Comprehension Protocol (MCP) server for interacting with Atlassian Bitbucket Data Center edition.

## Interactive Setup

The easiest way to configure this server is the built-in `setup` subcommand:

```bash
npx @atlassian-dc-mcp/bitbucket setup
```

It prompts for host, API base path, default page size, and API token, then stores them in the most secure place available:

- **macOS** — token in the login Keychain (service `atlassian-dc-mcp`, account `bitbucket-token`); host / base path / page size in `~/.atlassian-dc-mcp/bitbucket.env` (mode `0600`).
- **Linux** — everything in `~/.atlassian-dc-mcp/bitbucket.env` with POSIX mode `0600` (read/write for your user only).
- **Windows** — everything in `%USERPROFILE%\.atlassian-dc-mcp\bitbucket.env`. Node passes the mode bits but Windows ignores them, so the file inherits the ACL of your user profile directory (typically readable only by your user, SYSTEM, and Administrators).

After setup, you can launch the server without any environment variables:

```json
{
  "mcpServers": {
    "atlassian-bitbucket-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/bitbucket"]
    }
  }
}
```

Environment variables still override stored values — see [Configuration sources](#configuration-sources) below.

### Scripted / non-interactive setup

For CI, remote sessions, or shell scripts, pass values as flags and add `--non-interactive` to skip prompts:

```bash
npx @atlassian-dc-mcp/bitbucket setup --non-interactive \
  --host bitbucket.example.com \
  --token "$BITBUCKET_TOKEN"
```

Available flags: `--host`/`-H`, `--api-base-path`/`-b`, `--token`/`-t`, `--default-page-size`/`-s`, `--non-interactive`/`-n`, `--help`/`-h`. In `--non-interactive` mode, missing values fall back to existing configuration and the run exits non-zero if a host (or full-URL `--api-base-path`) and token cannot be resolved. An existing token is reused when `--token` is omitted. Run `npx @atlassian-dc-mcp/bitbucket setup --help` for full usage.

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
    "atlassian-bitbucket-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/bitbucket"],
      "env": {
        "BITBUCKET_HOST": "your-bitbucket-host",
        "BITBUCKET_API_TOKEN": "your-token"
      }
    }
  }
}
```

To reuse one shared dotenv file across multiple tools or MCP hosts, point the server at an absolute file path:

```json
{
  "mcpServers": {
    "atlassian-bitbucket-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/bitbucket"],
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
    "atlassian-bitbucket-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/bitbucket"],
      "env": {
        "ATLASSIAN_DC_MCP_CONFIG_FILE": "C:\\\\Users\\\\your-user\\\\AppData\\\\Roaming\\\\atlassian-dc-mcp.env"
      }
    }
  }
}
```

Note: Set `BITBUCKET_HOST` variable only to domain + port without protocol (e.g., `your-instance.atlassian.net`). The https protocol is assumed.

Alternatively, you can use `BITBUCKET_API_BASE_PATH` instead of `BITBUCKET_HOST` to specify the complete API base URL including protocol (e.g., `https://your-instance.atlassian.net/rest`). Note that the `/api/latest/` part is static and added automatically in the code, so you don't need to include it in the `BITBUCKET_API_BASE_PATH` value.

## Features

- Access repository information
- Get file contents
- Browse repository directories and paginated file content
- Browse branches and commits
- Get pull request information
- Check pull request mergeability, and merge pull requests when the operator enables it
- Search and filter repositories

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the packages/bitbucket directory, or put the same values in a shared dotenv file and set `ATLASSIAN_DC_MCP_CONFIG_FILE` to its absolute path:
   ```
   BITBUCKET_HOST=your-bitbucket-instance.atlassian.net
   # OR alternatively use
   # BITBUCKET_API_BASE_PATH=https://your-bitbucket-instance.atlassian.net/rest
   # Note: /api/latest/ is added automatically, do not include it
   BITBUCKET_API_TOKEN=your-personal-access-token

   # Optional: default page size for paginated read tools (fallback: 25)
   BITBUCKET_DEFAULT_PAGE_SIZE=25
   ```

   See [Configuration sources](#configuration-sources) for the full precedence chain.

   ### Merging pull requests (opt-in)

   Merging lands code on a shared branch and cannot be undone through the API, so `bitbucket_mergePullRequest` is **not even registered** by default. `bitbucket_canMergePullRequest` is always available — it is read-only and only reports what is blocking a merge.

   Merging is opt-in and confined to repositories the operator names; the model cannot choose or widen the scope:

   ```
   # Enable merging (default: false)
   BITBUCKET_MERGE_ENABLED=true

   # Required: repositories that may be merged, as "PROJECT/repository-slug".
   # A "PROJECT/*" entry allows every repository in that project. Comma-separated.
   BITBUCKET_MERGE_ALLOWED_REPOS=PROJ/demo,SANDBOX/*

   # Optional: restrict which branches may be merged into. A trailing "*" matches a
   # prefix; bare names are expanded to refs/heads/<name>. Omit to allow any branch
   # in the allowed repositories.
   BITBUCKET_MERGE_ALLOWED_TARGET_REFS=develop,refs/heads/release/*
   ```

   Guardrails applied when enabled:
   - The tool only activates when the flag is set **and** at least one valid repository entry resolves; otherwise it stays unregistered and a warning is logged. Malformed entries (and a `*/*` catch-all) are rejected individually.
   - Every request is checked against the allowlist before any API call — repository first, then the pull request's target branch when target refs are restricted.
   - `version` is a required parameter (optimistic locking). Bitbucket rejects a stale version, so a pull request that changed after you inspected it cannot be merged by accident.
   - The mergeability check runs before the merge: a conflicted or veto-blocked pull request (missing approvals, unresolved tasks, failed builds) is refused without issuing the write, and the veto reasons are returned.
   - Auto-merge (queuing a merge until checks pass) is not exposed.

   ### Declining pull requests (opt-in)

   Declining closes a pull request without merging and notifies every reviewer, so `bitbucket_declinePullRequest` is **not registered** by default either. It has its own flag: allowing declines never implies allowing merges, and vice versa.

   ```
   # Enable declining (default: false)
   BITBUCKET_DECLINE_ENABLED=true

   # Required: repositories that may be declined in, as "PROJECT/repository-slug".
   # A "PROJECT/*" entry allows every repository in that project. Comma-separated.
   BITBUCKET_DECLINE_ALLOWED_REPOS=PROJ/demo,SANDBOX/*
   ```

   The same guardrails apply as for merging: the tool activates only when the flag is set **and** at least one valid repository resolves, the allowlist is checked before any API call, and `version` is required for optimistic locking. There is no target-ref restriction — which branch a pull request would have landed on says nothing about whether abandoning it is safe.

   `bitbucket_reopenPullRequest` is **always registered** and needs no configuration: it restores the state a decline removed, so it is the undo path rather than a destructive one.

   To create a personal access token:
  - In Bitbucket, select your profile picture at the bottom left
  - Select **Manage Account** > **HTTP access tokens**
  - Select **Create token** and give it a name
  - Set appropriate permissions for the token
  - Copy the token and store it securely (you won't be able to see it again)

## Configuration sources

Each key is resolved by walking these sources in priority order and taking the first non-empty value:

| Priority | Source | Reads | Written by `setup` |
|---------:|--------|-------|--------------------|
| 100 | `process.env` (`BITBUCKET_HOST`, `BITBUCKET_API_BASE_PATH`, `BITBUCKET_API_TOKEN`, `BITBUCKET_DEFAULT_PAGE_SIZE`) | all keys | — |
| 80  | env file — `ATLASSIAN_DC_MCP_CONFIG_FILE` (absolute path) or `./.env` | all keys | — |
| 60  | home file — `~/.atlassian-dc-mcp/bitbucket.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\bitbucket.env` on Windows (mode `0600` on POSIX; Windows inherits the user-profile ACL) | all keys | host, apiBasePath, defaultPageSize (always); token (non-darwin or keychain fallback) |
| 40  | macOS Keychain — service `atlassian-dc-mcp`, account `bitbucket-token` | token only | token (darwin only) |

`setup` always writes non-secret fields to the home file and tries the keychain first for the token. If a higher-priority source shadows the value being saved, `setup` prints a warning so you can unset the env var.

## Usage

Or for development with auto-reload:

```
npm run dev
```

### Available Tools

#### 1. bitbucket_getRepositories

Get a list of repositories from the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, optional): Filter repositories by project key
- `limit` (number, optional): Maximum number of results to return
- `start` (number, optional): Starting index for pagination

#### 2. bitbucket_getRepository

Get details of a specific repository from the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, required): The project key (e.g., "PROJECT")
- `repositorySlug` (string, required): The repository slug (e.g., "repo-name")

#### 3. bitbucket_getBranches

Get branches for a repository from the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `filterText` (string, optional): Filter branches by name
- `limit` (number, optional): Maximum number of results to return
- `start` (number, optional): Starting index for pagination

#### 4. bitbucket_getFileContent

Get the content of a file from a repository in the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `path` (string, required): Path to the file in the repository
- `at` (string, optional): Branch, tag or commit to read the file at (defaults to the repository's default branch)

Pointing `path` at a directory returns that directory's git tree listing instead of file content.

#### bitbucket_browseRepository

List a repository directory or read a page of lines from a file without cloning the repository.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `path` (string, optional): Directory or file path. Omit for the repository root
- `at` (string, optional): Branch, tag or commit to browse at (defaults to the repository's default branch)
- `start` (number, optional): Pagination start value. Use the corresponding `nextPageStart` from the previous response
- `limit` (number, optional): Maximum directory entries or file lines to return (defaults to `BITBUCKET_DEFAULT_PAGE_SIZE` or `25`)

Directory responses contain pagination fields under `children`; file responses contain `lines` and pagination fields at the response root. When the corresponding `isLastPage` is false, call the tool again with `start` set to `nextPageStart`.

#### 5. bitbucket_getPullRequests

Get pull requests for a repository from the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `state` (string, optional): Filter by PR state (OPEN, MERGED, DECLINED)
- `limit` (number, optional): Maximum number of results to return
- `start` (number, optional): Starting index for pagination

#### 6. bitbucket_getDashboardPullRequests

Get pull requests from the Bitbucket dashboard across all repositories. Useful for finding all PRs where you are the author, reviewer, or participant without specifying a project or repository.

Parameters:
- `role` (string, optional): Filter by user's role — AUTHOR (default), REVIEWER, or PARTICIPANT
- `state` (string, optional): Filter by PR state — OPEN (default), DECLINED, or MERGED
- `closedSince` (number, optional): Timestamp in milliseconds. If state is not OPEN, return only PRs closed after this date
- `order` (string, optional): Order of results — NEWEST (default), OLDEST, or PARTICIPANT
- `limit` (number, optional): Maximum number of results to return. Defaults to `BITBUCKET_DEFAULT_PAGE_SIZE` or `25`.
- `start` (number, optional): Starting index for pagination

#### 7. bitbucket_canMergePullRequest

Check whether a pull request can be merged. Read-only — always available.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `pullRequestId` (string, required): The pull request ID

Returns `canMerge`, `conflicted`, `outcome`, and `vetoes` (each with a `summary` and `detail`) so you can see what is blocking a merge.

#### 8. bitbucket_mergePullRequest

Merge a pull request. Only registered when merging is enabled for the server — see [Merging pull requests (opt-in)](#merging-pull-requests-opt-in).

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `pullRequestId` (string, required): The pull request ID
- `version` (number, required): The current pull request version, from `bitbucket_getPullRequest`. A stale version is rejected by the server.
- `strategyId` (string, optional): Merge strategy id, e.g. `no-ff`, `ff`, `ff-only`, `rebase-no-ff`, `rebase-ff-only`, `squash`, `squash-ff-only`. Defaults to the repository's configured strategy.
- `message` (string, optional): Merge commit message. Defaults to Bitbucket's generated message.
- `output` (string, optional): `ack` (default) or `full`

#### 9. bitbucket_declinePullRequest

Decline (close without merging) a pull request. Only registered when declining is enabled for the server — see [Declining pull requests (opt-in)](#declining-pull-requests-opt-in).

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `pullRequestId` (string, required): The pull request ID
- `version` (number, required): The current pull request version, from `bitbucket_getPullRequest`. A stale version is rejected with a `409`.
- `comment` (string, optional): Reason for declining, posted as a pull request comment by the same request. Prefer this over posting a separate comment first — sending both together means a rejected decline leaves no orphaned explanation on a pull request that stayed open.
- `output` (string, optional): `ack` (default) or `full`

The acknowledgement carries the new `version`, which is exactly what `bitbucket_reopenPullRequest` needs if the decline has to be undone.

#### 10. bitbucket_reopenPullRequest

Reopen a declined pull request, restoring it to `OPEN`. Always available — no configuration required.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `pullRequestId` (string, required): The pull request ID
- `version` (number, required): The current pull request version, from `bitbucket_getPullRequest`. A stale version — or a pull request that is not `DECLINED` — is rejected with a `409`.
- `output` (string, optional): `ack` (default) or `full`

#### 11. bitbucket_getBranchDiff

Get the diff between two branches, tags or commits — including branches that have **no pull request yet**. Returns the same comparison as the Bitbucket "compare" view: changes reachable from `sourceBranch` but not from `targetBranch`, rendered as a unified diff.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `sourceBranch` (string, required): The source branch, tag or commit (e.g. `feature/my-branch`)
- `targetBranch` (string, optional): The target branch, tag or commit. Defaults to the repository's default branch
- `path` (string, optional): Limit the diff to a single file path. Omit to get the diff for every changed file
- `contextLines` (string, optional): Number of context lines around added/removed lines
- `srcPath` (string, optional): The previous path to the file, if it has been copied, moved or renamed
- `whitespace` (string, optional): Whitespace flag, e.g. `ignore-all`
- `output` (string, optional): `unified` (default) renders a unified diff; `full` returns the raw `RestDiff` payload

Unlike the pull request diff resource, the compare resource only speaks JSON (`Accept: text/plain` is answered with `406`), so the structured payload is folded into a unified diff — roughly a third of the raw JSON size.

Once a pull request exists, prefer `bitbucket_getPullRequestChanges` + `bitbucket_getPullRequestDiff`.

#### 10. bitbucket_createBranch

Create a branch in a repository, forked from a branch, tag or commit.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `name` (string, required): Name of the branch to create, without the `refs/heads/` prefix (e.g. `feature/my-branch`)
- `startPoint` (string, required): The branch, tag or commit the new branch is forked from (e.g. `master`, `refs/heads/master`, or a commit id)

The response contains the new branch's `id` (e.g. `refs/heads/feature/my-branch`), which is what `bitbucket_createPullRequest` expects as `fromRefId`.

## Response Shaping

- Paginated read tools use `BITBUCKET_DEFAULT_PAGE_SIZE` when `limit` is omitted.
- `bitbucket_getPR_CommentsAndAction` and `bitbucket_getPullRequestChanges` support `output=summary|compact|full`. The default is `compact`.
- `bitbucket_postPullRequestComment`, `bitbucket_createPullRequest`, `bitbucket_updatePullRequest`, and `bitbucket_mergePullRequest` support `output=ack|full`. The default is `ack`.
