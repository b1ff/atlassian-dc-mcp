import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { ToolAnnotations } from '@modelcontextprotocol/server';
export * from './api-error-handler.js'
export * from './attachment-download.js'
export * from './attachment-gateway.js'
export * from './attachment-tool-response.js'
export * from './config/index.js';
export * from './tool-response.js'
export { runSetup, runSetupCli } from './setup-cli.js';
export { describeValidationError } from './setup/describe-error.js';
export { parseSetupArgs, printSetupHelp, SetupArgsError, type ParsedSetupArgs } from './setup/args.js';

export const readOnlyToolAnnotations: ToolAnnotations = { readOnlyHint: true };

// Error handler helper
export const handleError = (error: Error) => {
  console.error("Server error:", error);
  process.exit(1);
};

// Create a base server setup function
export function createMcpServer(options: {
  name: string;
  version: string;
}) {
  return new McpServer({
    name: options.name,
    version: options.version
  });
}

export async function connectServer(server: McpServer) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
