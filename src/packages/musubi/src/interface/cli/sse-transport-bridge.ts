/**
 * P3-08 / DES-MCP-002: SSE Transport Adapter with /sse and /messages endpoints.
 */
import type { SseServerOptions } from '../../domain/install/types.js';

/**
 * Bridge that delegates to MCPServer via the SSE transport from @musubix2/mcp-server.
 */
export class SseTransportAdapter {
  async listen(
    options: SseServerOptions,
    server: { start: (transport: unknown) => Promise<void> },
  ): Promise<void> {
    const { SSETransport } = await import('@musubix2/mcp-server');
    const transport = new SSETransport(options.port);

    // The SSETransport already creates an HTTP server on the given port.
    // It exposes /events (GET) and /message (POST) by default.
    // We just start it.
    await server.start(transport);
    console.log(`MCP SSE server listening on http://localhost:${options.port}${options.endpointPath}`);
  }
}
