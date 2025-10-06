# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an npm monorepo providing Model Context Protocol (MCP) servers for Atlassian Data Center products (Jira, Confluence, Bitbucket). Each package is a standalone MCP server that can be installed via `npx` or used in Claude Desktop.

## Architecture

**Monorepo Structure:**
- `packages/common/` - Shared utilities (`handleApiOperation`, `formatToolResponse`, `createMcpServer`)
- `packages/jira/` - Jira MCP server with auto-generated API client
- `packages/confluence/` - Confluence MCP server with auto-generated API client
- `packages/bitbucket/` - Bitbucket MCP server with auto-generated API client

**Key Patterns:**
- Each package has `src/index.ts` as entry point that defines MCP tools and connects the server
- Each package has a service class (e.g., `JiraService`) that wraps the auto-generated client
- Auto-generated clients are in `*/src/*-client/` directories (DO NOT manually edit these files)
- Common error handling via `handleApiOperation` from `@atlassian-dc-mcp/common`
- Tool schemas defined alongside service methods using Zod

**Environment Configuration:**
Each service supports two config approaches:
1. `*_HOST` (domain+port without protocol) + `*_API_TOKEN`
2. `*_API_BASE_PATH` (full API URL) + `*_API_TOKEN`

The `/api/latest/` or `/rest/api` paths are added automatically in code.

## Common Commands

### Build
```bash
npm run build                                    # Build all packages (builds common first)
npm run build --workspace=@atlassian-dc-mcp/jira # Build specific package
```

### Testing
```bash
npm run test                                     # Run all tests
npm run test --workspace=@atlassian-dc-mcp/jira  # Test specific package
npx jest -t 'test name' --workspace=@atlassian-dc-mcp/jira # Run single test
```

### Development
```bash
npm run dev:jira                                 # Run Jira server with hot-reload
npm run dev:confluence                           # Run Confluence server
npm run dev:bitbucket                            # Run Bitbucket server
```

### Debugging
```bash
npm run debug                                    # Debug with mcp-live-debug
npm run debug:verbose                            # Debug with verbose output
npm run inspect --workspace=@atlassian-dc-mcp/jira    # Use MCP inspector (built code)
npm run inspect:dev --workspace=@atlassian-dc-mcp/jira # Use MCP inspector (dev mode)
```

### Dependencies
```bash
npm install <package> --workspace=@atlassian-dc-mcp/jira # Install to specific package
npm install <package> -W                                 # Install to root
```

### Publishing (CI)
```bash
npm run publish:ci                               # Lerna version + publish
```

## Code Style Guidelines

**TypeScript:**
- Use strong typing, avoid `any`
- Classes max 300 lines, functions max 35 lines
- Import order: external deps → internal packages → local imports

**Error Handling:**
- Always use `handleApiOperation` utility from common package
- Returns `ApiErrorResponse<T>` with `{success, data?, error?, details?}`

**Naming:**
- PascalCase: classes, interfaces
- camelCase: variables, functions

**Composition:**
- Prefer small, composable functions and classes
- Extract common code to avoid duplication

**Comments:**
- Only explain non-obvious solutions
- Avoid generic comments

## Important Notes

- **Auto-generated clients**: Files in `*/src/*-client/` directories are auto-generated. Never manually edit them. Regenerate if API changes.
- **Build order**: The `common` package must build first as other packages depend on it. The root build script handles this.
- **Lerna configuration**: Uses conventional commits, publishes to npm with public access.
