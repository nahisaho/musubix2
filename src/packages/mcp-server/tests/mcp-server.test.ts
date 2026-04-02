import { describe, it, expect } from 'vitest';
import {
  MCPToolRegistry,
  MCPServer,
  PlatformAdapterFactory,
  createMCPServer,
  createMCPToolRegistry,
} from '../src/index.js';
import type { ToolDefinition, ToolHandler } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(
  name: string,
  category: string,
  handler?: ToolHandler,
): { definition: ToolDefinition; handler: ToolHandler } {
  return {
    definition: {
      name,
      description: `${name} tool`,
      parameters: [{ name: 'input', type: 'string', description: 'input value', required: true }],
      category,
    },
    handler: handler ?? (async () => ({ success: true, data: `${name} executed` })),
  };
}

// ---------------------------------------------------------------------------
// DES-MCP-001: MCPToolRegistry
// ---------------------------------------------------------------------------

describe('DES-MCP-001: MCPToolRegistry', () => {
  it('should register and retrieve a tool', () => {
    const registry = createMCPToolRegistry();
    const { definition, handler } = makeTool('test-tool', 'sdd');
    registry.register(definition, handler);

    expect(registry.get('test-tool')).toEqual(definition);
    expect(registry.count()).toBe(1);
  });

  it('should return undefined for unknown tool', () => {
    const registry = new MCPToolRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should unregister a tool', () => {
    const registry = new MCPToolRegistry();
    const { definition, handler } = makeTool('removable', 'sdd');
    registry.register(definition, handler);

    expect(registry.unregister('removable')).toBe(true);
    expect(registry.get('removable')).toBeUndefined();
    expect(registry.count()).toBe(0);
  });

  it('should return false when unregistering an unknown tool', () => {
    const registry = new MCPToolRegistry();
    expect(registry.unregister('missing')).toBe(false);
  });

  it('should list all tools', () => {
    const registry = new MCPToolRegistry();
    registry.register(makeTool('a', 'sdd').definition, makeTool('a', 'sdd').handler);
    registry.register(makeTool('b', 'codegen').definition, makeTool('b', 'codegen').handler);

    const all = registry.list();
    expect(all).toHaveLength(2);
  });

  it('should filter tools by category', () => {
    const registry = new MCPToolRegistry();
    registry.register(makeTool('a', 'sdd').definition, makeTool('a', 'sdd').handler);
    registry.register(makeTool('b', 'codegen').definition, makeTool('b', 'codegen').handler);
    registry.register(makeTool('c', 'sdd').definition, makeTool('c', 'sdd').handler);

    const sdd = registry.list('sdd');
    expect(sdd).toHaveLength(2);
    expect(sdd.every((d) => d.category === 'sdd')).toBe(true);
  });

  it('should return sorted categories', () => {
    const registry = new MCPToolRegistry();
    registry.register(makeTool('z', 'workflow').definition, makeTool('z', 'workflow').handler);
    registry.register(makeTool('a', 'agent').definition, makeTool('a', 'agent').handler);
    registry.register(makeTool('m', 'codegen').definition, makeTool('m', 'codegen').handler);

    expect(registry.getCategories()).toEqual(['agent', 'codegen', 'workflow']);
  });

  it('should invoke a registered tool handler', async () => {
    const registry = new MCPToolRegistry();
    const handler: ToolHandler = async (params) => ({
      success: true,
      data: `hello ${params['name']}`,
    });
    registry.register(makeTool('greet', 'sdd').definition, handler);

    const result = await registry.invoke('greet', { name: 'world' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('hello world');
  });

  it('should return error result for unknown tool invocation', async () => {
    const registry = new MCPToolRegistry();
    const result = await registry.invoke('missing', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool not found');
  });

  it('should catch handler errors and return error result', async () => {
    const registry = new MCPToolRegistry();
    const handler: ToolHandler = async () => {
      throw new Error('boom');
    };
    registry.register(makeTool('fail', 'sdd').definition, handler);

    const result = await registry.invoke('fail', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });
});

// ---------------------------------------------------------------------------
// DES-MCP-001: MCPServer
// ---------------------------------------------------------------------------

describe('DES-MCP-001: MCPServer', () => {
  it('should create with default options', () => {
    const server = createMCPServer();
    const info = server.getInfo();
    expect(info.name).toBe('musubix2-mcp');
    expect(info.version).toBe('0.1.0');
    expect(info.platform).toBe('generic');
    expect(info.toolCount).toBe(0);
  });

  it('should accept custom options', () => {
    const server = new MCPServer({ name: 'custom', version: '2.0.0', platform: 'claude-code' });
    const info = server.getInfo();
    expect(info.name).toBe('custom');
    expect(info.version).toBe('2.0.0');
    expect(info.platform).toBe('claude-code');
  });

  it('should register a tool and update tool count', () => {
    const server = createMCPServer();
    const { definition, handler } = makeTool('my-tool', 'sdd');
    server.registerTool(definition, handler);
    expect(server.getInfo().toolCount).toBe(1);
  });

  it('should register tools in batch', () => {
    const server = createMCPServer();
    server.registerBatch([makeTool('a', 'sdd'), makeTool('b', 'codegen'), makeTool('c', 'agent')]);
    expect(server.getInfo().toolCount).toBe(3);
  });

  it('should handle requests by delegating to registry', async () => {
    const server = createMCPServer();
    const handler: ToolHandler = async () => ({ success: true, data: 42 });
    server.registerTool(makeTool('calc', 'sdd').definition, handler);

    const result = await server.handleRequest('calc', {});
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });

  it('should return error for unknown tool requests', async () => {
    const server = createMCPServer();
    const result = await server.handleRequest('nope', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool not found');
  });

  it('should return tool manifest with all definitions', () => {
    const server = createMCPServer();
    server.registerBatch([makeTool('x', 'sdd'), makeTool('y', 'agent')]);

    const manifest = server.getToolManifest();
    expect(manifest).toHaveLength(2);
    expect(manifest.map((d) => d.name).sort()).toEqual(['x', 'y']);
  });

  it('should expose the underlying registry', () => {
    const server = createMCPServer();
    const registry = server.getRegistry();
    expect(registry).toBeInstanceOf(MCPToolRegistry);
  });
});

// ---------------------------------------------------------------------------
// DES-MCP-001: PlatformAdapterFactory
// ---------------------------------------------------------------------------

describe('DES-MCP-001: PlatformAdapterFactory', () => {
  it('should create claude-code config', () => {
    const config = PlatformAdapterFactory.create('claude-code');
    expect(config.adapter).toBe('claude-code');
    expect(config.capabilities).toEqual(['tool_use', 'streaming', 'context_window']);
  });

  it('should create copilot config', () => {
    const config = PlatformAdapterFactory.create('copilot');
    expect(config.adapter).toBe('copilot');
    expect(config.capabilities).toEqual(['tool_use', 'multi_turn']);
  });

  it('should create cursor config', () => {
    const config = PlatformAdapterFactory.create('cursor');
    expect(config.adapter).toBe('cursor');
    expect(config.capabilities).toEqual(['tool_use', 'inline_edit']);
  });

  it('should create generic config', () => {
    const config = PlatformAdapterFactory.create('generic');
    expect(config.adapter).toBe('generic');
    expect(config.capabilities).toEqual(['tool_use']);
  });
});
