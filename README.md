[![MSeeP.ai Security Assessment Badge](https://mseep.net/pr/b1ff-atlassian-dc-mcp-badge.png)](https://mseep.ai/app/b1ff-atlassian-dc-mcp)

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/2a87ecc6-e53a-4a21-b63e-ede9b6a2bc4a)

# Atlassian Data Center MCP

This project provides a Model Context Protocol (MCP) integration for Atlassian Data Center products, including Jira, Confluence, and Bitbucket.

## Claude Desktop Configuration

[Official Anthropic quick start guide](https://modelcontextprotocol.io/quickstart/user)

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

Create a `.env` file in the root directory with the following variables:

```
# Jira configuration - choose one of these options:
JIRA_HOST=your-instance.atlassian.net
# OR
JIRA_API_BASE_PATH=https://your-instance.atlassian.net/rest
# Note: part /api/2/search/ is added automatically, do not include it
JIRA_API_TOKEN=your-api-token

# Confluence configuration - choose one of these options:
CONFLUENCE_HOST=your-instance.atlassian.net
# OR
CONFLUENCE_API_BASE_PATH=https://your-instance.atlassian.net/confluence
# Note: part /rest/api is added automatically, do not include it
CONFLUENCE_API_TOKEN=your-api-token

# Bitbucket configuration - choose one of these options:
BITBUCKET_HOST=your-instance.atlassian.net
# OR
BITBUCKET_API_BASE_PATH=https://your-instance.atlassian.net/rest
# Note: part /api/latest/ is added automatically, do not include it
BITBUCKET_API_TOKEN=your-api-token
```

## License

[MIT](LICENSE)
