/**
 * Serialise a service result into the single text block every tool returns.
 *
 * Lives in a leaf module rather than the barrel so modules that build on it
 * (see attachment-tool-response.ts) can import it without an ESM cycle.
 *
 * The return type is left inferred rather than widened to `CallToolResult`: this
 * always produces exactly one text block, and callers read `content[0].text`.
 */
export const formatToolResponse = (result: unknown) => ({
  content: [{
    type: 'text' as const,
    text: JSON.stringify(result)
  }]
});
