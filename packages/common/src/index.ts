import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
export * from './api-error-handler.js'

// Helper function to format tool responses
export const formatToolResponse = (result: unknown) => ({
  content: [{
    type: 'text' as const,
    text: JSON.stringify(result)
  }]
});

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
  // seems claude desktop does not support sse at the moment
  // const app = express();
  // let transport: SSEServerTransport | undefined;
  //
  // app.get("/sse", async (req, res) => {
  //   transport = new SSEServerTransport("/messages", res);
  //   await server.connect(transport);
  // });
  //
  // app.post("/messages", async (req, res) => {
  //   await transport?.handlePostMessage(req, res);
  // });
  //
  // // const transport = new StdioServerTransport();
  // // await server.connect(transport);
  // const port = process.env.PORT || "3999";
  // console.log(`Starting server on port ${port}`);
  // await new Promise((resolve, reject) => {
  //   app.listen(parseInt(port), (error) => {
  //     if (error) {
  //       reject(error);
  //       return;
  //     }
  //
  //     console.log(`Server listening on port ${port}`);
  //     resolve(null);
  //   });
  // });


  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
