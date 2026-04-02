// DES-MCP-001: Model Context Protocol Server — Tool registry and dispatch layer

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

  constructor(options?: MCPServerOptions) {
    this.name = options?.name ?? 'musubix2-mcp';
    this.version = options?.version ?? '0.1.0';
    this.platform = options?.platform ?? 'generic';
    this.registry = new MCPToolRegistry();
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
// Factory functions
// ---------------------------------------------------------------------------

export function createMCPServer(options?: MCPServerOptions): MCPServer {
  return new MCPServer(options);
}

export function createMCPToolRegistry(): MCPToolRegistry {
  return new MCPToolRegistry();
}
