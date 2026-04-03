// DES-MCP-001: Model Context Protocol Server — Tool registry and dispatch layer

// ---------------------------------------------------------------------------
// Re-exports from sub-modules
// ---------------------------------------------------------------------------

export {
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
  MCP_METHODS,
  createJsonRpcResponse,
  createJsonRpcError,
  isJsonRpcRequest,
} from './jsonrpc.js';

export {
  type MCPTransport,
  StdioTransport,
  SSETransport,
  InMemoryTransport,
} from './transport.js';

export {
  type MCPPrompt,
  type MCPPromptMessage,
  type PromptHandler,
  PromptRegistry,
} from './prompts.js';

export {
  type MCPResource,
  type MCPResourceContent,
  type ResourceHandler,
  ResourceRegistry,
} from './resources.js';

// ---------------------------------------------------------------------------
// Internal imports
// ---------------------------------------------------------------------------

import type { JsonRpcRequest, JsonRpcResponse } from './jsonrpc.js';
import { MCP_METHODS, createJsonRpcResponse, createJsonRpcError } from './jsonrpc.js';
import type { MCPTransport } from './transport.js';
import { PromptRegistry } from './prompts.js';
import { ResourceRegistry } from './resources.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToolParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ToolParameter {
  name: string;
  type: ToolParameterType;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

export type PlatformAdapter = 'claude-code' | 'copilot' | 'cursor' | 'generic';

export interface PlatformConfig {
  adapter: PlatformAdapter;
  capabilities: string[];
}

// ---------------------------------------------------------------------------
// MCPToolRegistry
// ---------------------------------------------------------------------------

export class MCPToolRegistry {
  private tools: Map<string, { definition: ToolDefinition; handler: ToolHandler }> = new Map();

  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.definition;
  }

  list(category?: string): ToolDefinition[] {
    const definitions = [...this.tools.values()].map((entry) => entry.definition);
    if (category !== undefined) {
      return definitions.filter((d) => d.category === category);
    }
    return definitions;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const { definition } of this.tools.values()) {
      categories.add(definition.category);
    }
    return [...categories].sort();
  }

  async invoke(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return { success: false, error: `Tool not found: ${name}` };
    }
    try {
      return await entry.handler(params);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  count(): number {
    return this.tools.size;
  }
}

// ---------------------------------------------------------------------------
// MCPServer
// ---------------------------------------------------------------------------

export interface MCPServerOptions {
  name?: string;
  version?: string;
  platform?: PlatformAdapter;
}

export class MCPServer {
  private readonly name: string;
  private readonly version: string;
  private readonly platform: PlatformAdapter;
  private readonly registry: MCPToolRegistry;
  readonly prompts: PromptRegistry;
  readonly resources: ResourceRegistry;
  private transport: MCPTransport | null = null;

  constructor(options?: MCPServerOptions) {
    this.name = options?.name ?? 'musubix2-mcp';
    this.version = options?.version ?? '0.1.0';
    this.platform = options?.platform ?? 'generic';
    this.registry = new MCPToolRegistry();
    this.prompts = new PromptRegistry();
    this.resources = new ResourceRegistry();
  }

  getRegistry(): MCPToolRegistry {
    return this.registry;
  }

  registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    this.registry.register(definition, handler);
  }

  registerBatch(tools: Array<{ definition: ToolDefinition; handler: ToolHandler }>): void {
    for (const tool of tools) {
      this.registry.register(tool.definition, tool.handler);
    }
  }

  async handleRequest(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    return this.registry.invoke(toolName, params);
  }

  getInfo(): { name: string; version: string; toolCount: number; platform: PlatformAdapter } {
    return {
      name: this.name,
      version: this.version,
      toolCount: this.registry.count(),
      platform: this.platform,
    };
  }

  getToolManifest(): ToolDefinition[] {
    return this.registry.list();
  }

  // -----------------------------------------------------------------------
  // MCP Protocol — JSON-RPC handler
  // -----------------------------------------------------------------------

  async handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    switch (request.method) {
      case MCP_METHODS.INITIALIZE:
        return createJsonRpcResponse(request.id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: this.name, version: this.version },
          capabilities: {
            tools: { listChanged: false },
            prompts: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
        });

      case MCP_METHODS.PING:
        return createJsonRpcResponse(request.id, {});

      case MCP_METHODS.TOOLS_LIST:
        return createJsonRpcResponse(request.id, {
          tools: this.registry.list().map((def) => ({
            name: def.name,
            description: def.description,
            inputSchema: {
              type: 'object',
              properties: Object.fromEntries(
                def.parameters.map((p) => [p.name, { type: p.type, description: p.description }]),
              ),
              required: def.parameters.filter((p) => p.required).map((p) => p.name),
            },
          })),
        });

      case MCP_METHODS.TOOLS_CALL: {
        const toolName = request.params?.['name'] as string | undefined;
        if (!toolName) {
          return createJsonRpcError(request.id, -32602, 'Missing required parameter: name');
        }
        const toolParams = (request.params?.['arguments'] as Record<string, unknown>) ?? {};
        const result = await this.registry.invoke(toolName, toolParams);
        if (!result.success) {
          return createJsonRpcResponse(request.id, {
            content: [{ type: 'text', text: result.error ?? 'Unknown error' }],
            isError: true,
          });
        }
        return createJsonRpcResponse(request.id, {
          content: [{ type: 'text', text: typeof result.data === 'string' ? result.data : JSON.stringify(result.data) }],
        });
      }

      case MCP_METHODS.PROMPTS_LIST:
        return createJsonRpcResponse(request.id, { prompts: this.prompts.list() });

      case MCP_METHODS.PROMPTS_GET: {
        const promptName = request.params?.['name'] as string | undefined;
        if (!promptName) {
          return createJsonRpcError(request.id, -32602, 'Missing required parameter: name');
        }
        const prompt = this.prompts.get(promptName);
        if (!prompt) {
          return createJsonRpcError(request.id, -32602, `Prompt not found: ${promptName}`);
        }
        const promptArgs = (request.params?.['arguments'] as Record<string, string>) ?? {};
        try {
          const messages = this.prompts.execute(promptName, promptArgs);
          return createJsonRpcResponse(request.id, { description: prompt.description, messages });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return createJsonRpcError(request.id, -32603, msg);
        }
      }

      case MCP_METHODS.RESOURCES_LIST:
        return createJsonRpcResponse(request.id, { resources: this.resources.list() });

      case MCP_METHODS.RESOURCES_READ: {
        const uri = request.params?.['uri'] as string | undefined;
        if (!uri) {
          return createJsonRpcError(request.id, -32602, 'Missing required parameter: uri');
        }
        try {
          const content = this.resources.read(uri);
          return createJsonRpcResponse(request.id, { contents: [content] });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return createJsonRpcError(request.id, -32602, msg);
        }
      }

      default:
        return createJsonRpcError(request.id, -32601, `Method not found: ${request.method}`);
    }
  }

  // -----------------------------------------------------------------------
  // Transport lifecycle
  // -----------------------------------------------------------------------

  async start(transport: MCPTransport): Promise<void> {
    this.transport = transport;
    transport.onMessage((request) => this.handleJsonRpc(request));
    await transport.start();
  }

  async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.stop();
      this.transport = null;
    }
  }
}

// ---------------------------------------------------------------------------
// PlatformAdapterFactory
// ---------------------------------------------------------------------------

export class PlatformAdapterFactory {
  static create(platform: PlatformAdapter): PlatformConfig {
    switch (platform) {
      case 'claude-code':
        return {
          adapter: 'claude-code',
          capabilities: ['tool_use', 'streaming', 'context_window'],
        };
      case 'copilot':
        return { adapter: 'copilot', capabilities: ['tool_use', 'multi_turn'] };
      case 'cursor':
        return { adapter: 'cursor', capabilities: ['tool_use', 'inline_edit'] };
      case 'generic':
        return { adapter: 'generic', capabilities: ['tool_use'] };
    }
  }
}

// ---------------------------------------------------------------------------
// Catalog, default prompts, and default resources
// ---------------------------------------------------------------------------

export { registerDefaultTools, getToolCategories } from './catalog.js';
export type { ToolCategory } from './catalog.js';
export { registerDefaultPrompts, getDefaultPrompts } from './default-prompts.js';
export { registerDefaultResources, getDefaultResources } from './default-resources.js';

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

import { registerDefaultTools as _registerDefaultTools } from './catalog.js';
import { registerDefaultPrompts as _registerDefaultPrompts } from './default-prompts.js';
import { registerDefaultResources as _registerDefaultResources } from './default-resources.js';

export function createMCPServer(options?: MCPServerOptions): MCPServer {
  return new MCPServer(options);
}

export function createMCPToolRegistry(): MCPToolRegistry {
  return new MCPToolRegistry();
}

/**
 * Create a fully-configured MCP server with all default tools, prompts, and
 * resources pre-registered.
 */
export function createFullMCPServer(options?: MCPServerOptions): MCPServer {
  const server = new MCPServer(options);
  _registerDefaultTools(server);
  _registerDefaultPrompts(server);
  _registerDefaultResources(server);
  return server;
}
