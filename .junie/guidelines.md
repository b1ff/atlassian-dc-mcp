# Atlassian Data Center MCP Development Guidelines

This document provides essential development information for the Atlassian Data Center Model Context Protocol (MCP) project. All agent commands are run under project root, so no need to cd into project root.

## Project Overview

This is a TypeScript monorepo that provides MCP servers for Atlassian Data Center products (Bitbucket, Jira, Confluence). The project uses npm workspaces with Lerna for package management and follows ES module standards.

## Build/Configuration Instructions

### Project Structure
- **Monorepo**: Uses npm workspaces with packages in `packages/*`
- **Package Manager**: Lerna v8+ with conventional commits
- **Module System**: ES modules (`"type": "module"`)
- **TypeScript**: ES2022 target with NodeNext module resolution
- **Packages**: `common`, `bitbucket`, `jira`, `confluence`

### Build Commands
```bash
# Build all packages (common first, then others)
npm run build

# Build specific package
npm run build --workspace=@atlassian-dc-mcp/bitbucket

# Development mode for specific package
npm run dev:bitbucket
npm run dev:jira
npm run dev:confluence
```

### TypeScript Configuration
- **Root tsconfig.json**: Composite build with project references
- **Path mapping**: `@atlassian-dc-mcp/*` maps to `packages/*/src`
- **Strict mode**: Enabled with declaration maps and source maps
- **Individual packages**: Each has its own tsconfig.json extending root config

### Environment Variables
Each package requires specific environment variables:

**Bitbucket**:
- `BITBUCKET_API_TOKEN` (required)
- `BITBUCKET_HOST` or `BITBUCKET_API_BASE_PATH` (one required)

**Jira/Confluence**: Similar patterns (check individual service validateConfig methods)

## Testing Information

### Framework Setup
- **Test Runner**: Jest
- **TypeScript Support**: Requires ts-jest configuration
- **Module System**: ES modules require special Jest configuration

### Required Dependencies for Testing
```bash
# Add to package devDependencies
npm install --save-dev ts-jest @types/jest
```

### Test Structure
- **Location**: `src/__tests__/` directories
- **Naming**: `*.test.ts` files
- **Mocking**: Mock external dependencies and API clients
- **Pattern**: Use Jest's describe/it structure with proper setup/teardown

### Running Tests
```bash
# Run all tests
npm test

# Run tests for specific package
npm run test --workspace=@atlassian-dc-mcp/bitbucket
```

## Development Patterns and Code Style

### Code Organization
- **Service Classes**: Main business logic in service classes (e.g., `BitbucketService`)
- **Client Code**: Auto-generated API clients in `*-client/` directories
- **Common Utilities**: Shared code in `@atlassian-dc-mcp/common` package
- **Schema Validation**: Zod schemas for input validation

### AI Conventions (from AI-CONVENTIONS.md)
- **No Duplication**: Extract common code into functions/classes
- **Composability**: Prefer small, composable functions and classes
- **Size Limits**: Classes ≤ 300 lines, functions ≤ 35 lines
- **Comments**: Avoid generic comments, explain non-obvious solutions

### Service Class Pattern
```typescript
export class ServiceName {
  constructor(host: string, token: string, fullBaseUrl?: string) {
    // Initialize API client configuration
  }

  async methodName(params: ParamTypes): Promise<ResultType> {
    return handleApiOperation(
      () => ClientService.apiMethod(params),
      'Error message'
    );
  }

  static validateConfig(): string[] {
    // Validate required environment variables
    // Return array of missing variables
  }
}

// Export Zod schemas for MCP tool integration
export const serviceToolSchemas = {
  methodName: {
    param: z.string().describe("Parameter description")
  }
};
```

### Error Handling
- Use `handleApiOperation` from common package
- Provide descriptive error messages
- Return consistent result objects with success/error states

### Documentation
- **JSDoc**: Comprehensive parameter and return type documentation
- **Schema Descriptions**: Descriptive Zod schema annotations for MCP tools
- **README**: Each package should have usage examples

### Generated Code
- API client code is auto-generated (contains `/* eslint-disable */`)
- Don't modify generated files directly
- Focus development on service layer and business logic

## Debugging and Development Tools

### Debug Scripts
```bash
# Debug with MCP inspector
npm run debug
npm run debug:verbose

# Development with auto-reload
npm run debug:ts
```

### MCP Inspector
- Use `mcp-inspector` for debugging MCP servers
- Available in package devDependencies
- Inspect tools and resources in development

### Development Workflow
1. Make changes to service files
2. Build the package: `npm run build --workspace=package-name`
3. Test changes: `npm run dev:package-name`
4. Run tests: `npm run test --workspace=package-name`
5. Debug with inspector if needed

## Release Management

### Lerna Configuration
- **Conventional Commits**: Enabled for automated versioning
- **GitHub Releases**: Automated release creation
- **Version Strategy**: Independent package versioning
- **Branch**: Releases from `master` branch

### Release Commands
```bash
# Automated release (CI)
npm run publish:ci

# Manual Lerna commands
npm run lerna version
npm run lerna publish
```

## Package Dependencies

### Common Dependencies
- **@modelcontextprotocol/sdk**: Core MCP functionality
- **zod**: Schema validation
- **dotenv**: Environment variable management
- **node-fetch**: HTTP client for API calls

### Development Dependencies
- **TypeScript**: Language and compiler
- **Jest**: Testing framework
- **ts-jest**: TypeScript Jest integration
- **nodemon**: Development auto-reload
- **@types/node**: Node.js type definitions

## Notes for Advanced Developers

- The project uses TypeScript project references for efficient builds
- Generated API clients are disabled from ESLint (intentional)
- ES modules require careful Jest configuration
- MCP tools require Zod schema exports for proper integration
- Environment variable validation is handled per-service
- The common package provides shared utilities and error handling patterns
