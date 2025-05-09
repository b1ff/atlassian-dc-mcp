# Atlassian Bitbucket Data Center MCP

This package provides a Machine Comprehension Protocol (MCP) server for interacting with Atlassian Bitbucket Data Center edition.

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

Note: Set `BITBUCKET_HOST` variable only to domain + port without protocol (e.g., `your-instance.atlassian.net`). The https protocol is assumed.

## Features

- Access repository information
- Get file contents
- Browse branches and commits
- Get pull request information
- Search and filter repositories

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the packages/bitbucket directory with the following variables:
   ```
   BITBUCKET_HOST=your-bitbucket-instance.atlassian.net
   BITBUCKET_API_TOKEN=your-personal-access-token
   ```

   To create a personal access token:
   - In Bitbucket, select your profile picture at the bottom left
   - Select **Manage Account** > **HTTP access tokens**
   - Select **Create token** and give it a name
   - Set appropriate permissions for the token
   - Copy the token and store it securely (you won't be able to see it again)

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

#### 5. bitbucket_getPullRequests

Get pull requests for a repository from the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `state` (string, optional): Filter by PR state (OPEN, MERGED, DECLINED)
- `limit` (number, optional): Maximum number of results to return
- `start` (number, optional): Starting index for pagination

#### 6. bitbucket_getFilesFromPath

Get file names from a specific path in a repository in the Bitbucket Data Center instance.

Parameters:
- `projectKey` (string, required): The project key
- `repositorySlug` (string, required): The repository slug
- `path` (string, required): Path to the file in the repository
- `limit` (number, optional): Maximum number of results to return
