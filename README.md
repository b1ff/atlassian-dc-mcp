

[![MSeeP.ai Security Assessment Badge](https://mseep.net/pr/b1ff-atlassian-dc-mcp-badge.png)](https://mseep.ai/app/b1ff-atlassian-dc-mcp)

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/2a87ecc6-e53a-4a21-b63e-ede9b6a2bc4a)

# Atlassian Data Center MCP

> **Note:** This is a community-maintained project and is **not affiliated with, endorsed by, or supported by Atlassian**.
> Use at your own discretion.

This project provides a Model Context Protocol (MCP) integration for Atlassian Data Center products, including Jira, Confluence, and Bitbucket.

## Quick Setup

Each package ships an interactive `setup` subcommand that stores your credentials in the most secure place available on your OS. Run it once per product:

```bash
npx @atlassian-dc-mcp/jira setup
npx @atlassian-dc-mcp/confluence setup
npx @atlassian-dc-mcp/bitbucket setup
```

The setup CLI prompts for host, API base path, default page size, and API token. Before saving, it validates obvious input mistakes and performs a timed authenticated request to the selected Atlassian product, so a bad host, base path, or token is caught during setup.

### CLI flags and non-interactive mode

Setup accepts flags so you can prefill values or skip prompts entirely (useful for scripted bootstrap, CI, or remote sessions). Run `npx @atlassian-dc-mcp/<product> setup --help` for the full list.

| Flag | Short | Description |
|------|-------|-------------|
| `--host <value>` | `-H` | Host, e.g. `jira.example.com` |
| `--api-base-path <value>` | `-b` | API base path or full URL |
| `--token <value>` | `-t` | API token |
| `--default-page-size <n>` | `-s` | Default page size (positive integer) |
| `--non-interactive` | `-n` | Skip prompts; fail if a required value cannot be resolved |
| `--help` | `-h` | Show usage and exit |

In interactive mode, any flag you pass prefills its prompt (so e.g. `--host` skips the host prompt but still asks for the rest). In `--non-interactive` mode, setup resolves anything missing from existing configuration (process env, `~/.atlassian-dc-mcp/<product>.env`, or macOS Keychain) and exits non-zero if a host (or full-URL `--api-base-path`) and token cannot be found. An existing token is reused when `--token` is omitted.

```bash
# Scripted, no prompts, write everything from flags
npx @atlassian-dc-mcp/jira setup --non-interactive \
  --host jira.example.com \
  --token "$JIRA_TOKEN"

# Re-validate the existing token without re-entering it
npx @atlassian-dc-mcp/jira setup --non-interactive --host jira.example.com
```

Credential validation behaves differently between modes: interactive mode offers retry/save-anyway prompts on failure, while `--non-interactive` exits with code 1 on the first validation failure so it can be used as a CI gate.

Token storage:

- **macOS** — written to the login Keychain via `/usr/bin/security` (service `atlassian-dc-mcp`, account `<product>-token`).
- **Linux** — written to `~/.atlassian-dc-mcp/<product>.env` with POSIX mode `0600` (read/write for your user only; other local user accounts cannot read it).
- **Windows** — written to `%USERPROFILE%\.atlassian-dc-mcp\<product>.env`. Node passes the mode bits but Windows ignores them, so the file inherits the ACL of your user profile directory — typically readable only by your user, SYSTEM, and Administrators.

Non-secret fields (host, API base path, default page size) are always written to the home file — `~/.atlassian-dc-mcp/<product>.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\<product>.env` on Windows. After a successful Keychain write, the token line is cleared from the home file so there is never a second copy in a less-secure place.

Once setup has run, the MCP servers can boot with no environment variables at all:

```json
{
  "mcpServers": {
    "atlassian-jira-dc": { "command": "npx", "args": ["-y", "@atlassian-dc-mcp/jira"] },
    "atlassian-confluence-dc": { "command": "npx", "args": ["-y", "@atlassian-dc-mcp/confluence"] },
    "atlassian-bitbucket-dc": { "command": "npx", "args": ["-y", "@atlassian-dc-mcp/bitbucket"] }
  }
}
```

You can still pass credentials via environment variables or `ATLASSIAN_DC_MCP_CONFIG_FILE` as shown in the sections below — they take precedence over values saved by setup.

## Configuration Sources & Precedence

At startup, each MCP server resolves each config key by walking sources in this order and taking the first non-empty value:

| Priority | Source | Reads | Written by setup |
|---------:|--------|-------|------------------|
| 100 | `process.env` (`JIRA_*`, `CONFLUENCE_*`, `BITBUCKET_*`) | all keys | — |
| 80  | env file — `ATLASSIAN_DC_MCP_CONFIG_FILE` or `./.env` | all keys | — |
| 60  | home file — `~/.atlassian-dc-mcp/<product>.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\<product>.env` on Windows (mode `0600` on POSIX; Windows inherits the user-profile ACL) | all keys | host, apiBasePath, defaultPageSize (always); token (non-darwin or keychain fallback) |
| 40  | macOS Keychain — service `atlassian-dc-mcp`, account `<product>-token` | token only | token (darwin only) |

Notes:

- Process env wins over everything, so you can always override a stored credential for one session.
- `ATLASSIAN_DC_MCP_CONFIG_FILE` must be an absolute path; if set and missing, the server fails fast.
- Keychain reads are cached at init (one `execFileSync` per product-token), so tool calls never shell out.
- If a higher-priority source shadows the value setup is about to save, setup prints a warning naming the env var so you can unset it.
- Atlassian API requests time out after 30 seconds by default. Set `ATLASSIAN_DC_MCP_REQUEST_TIMEOUT_MS` to a positive millisecond value to override it.

## Claude Desktop Configuration

[Official Anthropic quick start guide](https://modelcontextprotocol.io/docs/getting-started/intro)

To use these MCP connectors with Claude Desktop, add the following to your Claude Desktop configuration.

Set `*_HOST` variables only to domain + port without protocol (e.g., `your-instance.atlassian.net`). The https protocol is assumed.

Alternatively, you can use `*_API_BASE_PATH` variables instead of `*_HOST` to specify the complete API base URL including protocol (e.g., `https://your-instance.atlassian.net/rest`). Note that the `/api/latest/` part is static and added automatically in the code, so you don't need to include it in the `*_API_BASE_PATH` values.

You can leave only the services you need in the configuration.

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
    },
    "atlassian-confluence-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/confluence"],
      "env": {
        "CONFLUENCE_HOST": "your-confluence-host",
        "CONFLUENCE_API_TOKEN": "your-token"
      }
    },
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

You can also use the alternative API base path configuration:

```json
{
  "mcpServers": {
    "atlassian-jira-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/jira"],
      "env": {
        "JIRA_API_BASE_PATH": "https://your-jira-host/rest",
        "JIRA_API_TOKEN": "your-token"
      }
    },
    "atlassian-confluence-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/confluence"],
      "env": {
        "CONFLUENCE_API_BASE_PATH": "https://your-confluence-host/rest",
        "CONFLUENCE_API_TOKEN": "your-token"
      }
    },
    "atlassian-bitbucket-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/bitbucket"],
      "env": {
        "BITBUCKET_API_BASE_PATH": "https://your-bitbucket-host/rest",
        "BITBUCKET_API_TOKEN": "your-token"
      }
    }
  }
}
```

## Shared External Config File

If you want multiple MCP hosts or tools on one machine to reuse the same Atlassian credentials, put the existing `JIRA_*`, `CONFLUENCE_*`, and `BITBUCKET_*` variables into one dotenv-style file and point each MCP server at it with `ATLASSIAN_DC_MCP_CONFIG_FILE`.

The path must be absolute. Direct environment variables still override values from the shared file.

Example shared file:

```dotenv
JIRA_HOST=your-jira-host
JIRA_API_TOKEN=your-jira-token
JIRA_DEFAULT_PAGE_SIZE=50

CONFLUENCE_HOST=your-confluence-host
CONFLUENCE_API_TOKEN=your-confluence-token

BITBUCKET_HOST=your-bitbucket-host
BITBUCKET_API_TOKEN=your-bitbucket-token
BITBUCKET_DEFAULT_PAGE_SIZE=50
```

Claude Desktop example using one shared file:

```json
{
  "mcpServers": {
    "atlassian-jira-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/jira"],
      "env": {
        "ATLASSIAN_DC_MCP_CONFIG_FILE": "/Users/your-user/.config/atlassian-dc-mcp.env"
      }
    },
    "atlassian-confluence-dc": {
      "command": "npx",
      "args": ["-y", "@atlassian-dc-mcp/confluence"],
      "env": {
        "ATLASSIAN_DC_MCP_CONFIG_FILE": "/Users/your-user/.config/atlassian-dc-mcp.env"
      }
    },
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

Windows example path:

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

## Claude Code CLI Configuration

To use these MCP connectors with [Claude Code](https://docs.anthropic.com/en/docs/claude-code), add MCP servers using the `claude mcp add` command.

You can add servers at the project scope (stored in `.mcp.json`) or user scope (`-s user`). Adjust the scope and included services to your needs.

```bash
# Jira
claude mcp add atlassian-jira-dc \
  -e JIRA_HOST=your-jira-host \
  -e JIRA_API_TOKEN=your-token \
  -- npx -y @atlassian-dc-mcp/jira

# Confluence
claude mcp add atlassian-confluence-dc \
  -e CONFLUENCE_HOST=your-confluence-host \
  -e CONFLUENCE_API_TOKEN=your-token \
  -- npx -y @atlassian-dc-mcp/confluence

# Bitbucket
claude mcp add atlassian-bitbucket-dc \
  -e BITBUCKET_HOST=your-bitbucket-host \
  -e BITBUCKET_API_TOKEN=your-token \
  -- npx -y @atlassian-dc-mcp/bitbucket
```

You can also use `*_API_BASE_PATH` instead of `*_HOST` (same as the Claude Desktop examples above):

```bash
claude mcp add atlassian-jira-dc \
  -e JIRA_API_BASE_PATH=https://your-jira-host/rest \
  -e JIRA_API_TOKEN=your-token \
  -- npx -y @atlassian-dc-mcp/jira
```

To add servers at user scope (available across all projects):

```bash
claude mcp add -s user atlassian-jira-dc \
  -e JIRA_HOST=your-jira-host \
  -e JIRA_API_TOKEN=your-token \
  -- npx -y @atlassian-dc-mcp/jira
```

To use the shared config file instead of passing credentials inline:

```bash
claude mcp add atlassian-jira-dc \
  -e ATLASSIAN_DC_MCP_CONFIG_FILE=/Users/your-user/.config/atlassian-dc-mcp.env \
  -- npx -y @atlassian-dc-mcp/jira
```

Windows PowerShell example:

```powershell
claude mcp add atlassian-jira-dc `
  -e ATLASSIAN_DC_MCP_CONFIG_FILE=C:\Users\your-user\AppData\Roaming\atlassian-dc-mcp.env `
  -- npx -y @atlassian-dc-mcp/jira
```

### Generating API Tokens

For Data Center installations, you'll need to generate Personal Access Tokens (PAT) for each service:

#### Jira Data Center
1. Log in to your Jira instance
2. Go to Profile > Personal Access Tokens
3. Click "Create token"
4. Give it a meaningful name and set appropriate permissions
5. Copy the generated token immediately (it won't be shown again)

#### Confluence Data Center
1. Log in to your Confluence instance
2. Go to Settings > Personal Access Tokens
3. Click "Create token"
4. Name your token and set required permissions
5. Save and copy the token (only shown once)

#### Bitbucket Data Center
1. Log in to Bitbucket
2. Go to Manage Account > HTTP access tokens
3. Click "Create token"
4. Set a name and permissions
5. Generate and copy the token immediately

Store these tokens securely and use them in your Claude Desktop configuration as shown above.

## Overview

The Atlassian DC MCP allows AI assistants to interact with Atlassian products through a standardized interface. It provides tools for:

- **Jira**: Search, view, and create issues
- **Confluence**: Access and manage content
- **Bitbucket**: Interact with repositories and code

## Prerequisites

- Node.js 18 or higher
- npm 7 or higher (for workspaces support)
- Atlassian Data Center instance or Cloud instance
- API tokens for the Atlassian products you want to use

## Installation

Clone the repository:

```bash
git clone https://github.com/b1ff/atlassian-dc-mcp.git
cd atlassian-dc-mcp
```

## Development

This project is structured as an npm monorepo using workspaces. The workspaces are organized in the `packages/` directory, with separate packages for each Atlassian product integration.

### Installing Dependencies

To install all dependencies for all packages in the monorepo:

```bash
npm install
```

This will install:
- Root-level dependencies defined in the root `package.json`
- All dependencies for each package in the workspaces

To install a dependency for a specific package:

```bash
npm install <package-name> --workspace=@atlassian-dc-mcp/jira
```

To install a dependency at the root level:

```bash
npm install <package-name> -W
```

### Building the Project

To build all packages:

```bash
npm run build
```

To build a specific package:

```bash
npm run build --workspace=@atlassian-dc-mcp/jira
```

### Running in Development Mode

To run a specific package in development mode:

```bash
npm run dev:jira     # For Jira
npm run dev:confluence  # For Confluence
npm run dev:bitbucket   # For Bitbucket
```

## Configuration

For production use, prefer the [Quick Setup](#quick-setup) CLI above — it writes to the macOS Keychain (for tokens) and the home file for non-secret fields (`~/.atlassian-dc-mcp/<product>.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\<product>.env` on Windows) automatically.

For local development, create a `.env` file in the root directory, or a shared dotenv-style file anywhere on disk and point `ATLASSIAN_DC_MCP_CONFIG_FILE` to it, with the following variables:

```
# Jira configuration - choose one of these options:
JIRA_HOST=your-jira-host
# OR
JIRA_API_BASE_PATH=https://your-jira-host/rest
# Note: part /api/2/search/ is added automatically, do not include it
JIRA_API_TOKEN=your-api-token

# Confluence configuration - choose one of these options:
CONFLUENCE_HOST=your-confluence-host
# OR
CONFLUENCE_API_BASE_PATH=https://your-confluence-host/rest
# Note: part /rest/api is added automatically, do not include it
CONFLUENCE_API_TOKEN=your-api-token

# Bitbucket configuration - choose one of these options:
BITBUCKET_HOST=your-bitbucket-host
# OR
BITBUCKET_API_BASE_PATH=https://your-bitbucket-host/rest
# Note: part /api/latest/ is added automatically, do not include it
BITBUCKET_API_TOKEN=your-api-token
```

Resolution order for each key is `process.env` → `ATLASSIAN_DC_MCP_CONFIG_FILE` (or `./.env`) → home file (`~/.atlassian-dc-mcp/<product>.env` on macOS/Linux, `%USERPROFILE%\.atlassian-dc-mcp\<product>.env` on Windows) → macOS Keychain. See [Configuration Sources & Precedence](#configuration-sources--precedence) above.

## License

[MIT](LICENSE)
