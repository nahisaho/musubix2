/**
 * P3-07 / DES-MCP-001: MCP CLI launcher — musubix2 mcp [--transport stdio|sse] [--port 3100]
 */
import type { McpCliOptions } from '../../domain/install/types.js';

export class McpCliLauncher {
  async start(options: McpCliOptions): Promise<void> {
    const { createFullMCPServer, StdioTransport } = await import('@musubix2/mcp-server');
    const server = createFullMCPServer({ name: 'musubix2-mcp', version: '0.4.0' });

    if (options.transport === 'sse') {
      const { SseTransportAdapter } = await import('./sse-transport-bridge.js');
      const adapter = new SseTransportAdapter();
      await adapter.listen({
        port: options.port ?? 3100,
        endpointPath: '/sse',
        messagePath: '/messages',
      }, server as unknown as { start: (transport: unknown) => Promise<void> });
    } else {
      const transport = new StdioTransport();
      await server.start(transport);
      // StdioTransport.start() resolves immediately; without this the CLI's
      // top-level `process.exit()` would kill the server before it handles any
      // request. Block until the client disconnects (stdin EOF).
      await transport.waitForClose();
    }
  }
}
