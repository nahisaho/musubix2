import { describe, it, expect, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import {
  MCPToolRegistry,
  MCPServer,
  PlatformAdapterFactory,
  createMCPServer,
  createMCPToolRegistry,
  MCP_METHODS,
  createJsonRpcResponse,
  createJsonRpcError,
  isJsonRpcRequest,
  InMemoryTransport,
  StdioTransport,
  PromptRegistry,
  ResourceRegistry,
} from '../src/index.js';
import type {
  ToolDefinition,
  ToolHandler,
  JsonRpcRequest,
  JsonRpcResponse,
  MCPPrompt,
  MCPResource,
} from '../src/index.js';

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

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

describe('JSON-RPC helpers', () => {
  it('should create a success response', () => {
    const resp = createJsonRpcResponse(1, { ok: true });
    expect(resp).toEqual({ jsonrpc: '2.0', id: 1, result: { ok: true } });
  });

  it('should create an error response', () => {
    const resp = createJsonRpcError('abc', -32600, 'Invalid Request');
    expect(resp).toEqual({
      jsonrpc: '2.0',
      id: 'abc',
      error: { code: -32600, message: 'Invalid Request' },
    });
  });

  it('should create an error response with data', () => {
    const resp = createJsonRpcError(2, -32000, 'Server error', { detail: 'oops' });
    expect(resp.error?.data).toEqual({ detail: 'oops' });
  });

  it('should validate a correct JsonRpcRequest', () => {
    expect(
      isJsonRpcRequest({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    ).toBe(true);
  });

  it('should validate a request with string id', () => {
    expect(
      isJsonRpcRequest({ jsonrpc: '2.0', id: 'req-1', method: 'tools/list' }),
    ).toBe(true);
  });

  it('should reject non-object values', () => {
    expect(isJsonRpcRequest(null)).toBe(false);
    expect(isJsonRpcRequest('string')).toBe(false);
    expect(isJsonRpcRequest(42)).toBe(false);
  });

  it('should reject objects missing required fields', () => {
    expect(isJsonRpcRequest({ jsonrpc: '2.0', method: 'ping' })).toBe(false); // no id
    expect(isJsonRpcRequest({ jsonrpc: '2.0', id: 1 })).toBe(false); // no method
    expect(isJsonRpcRequest({ jsonrpc: '1.0', id: 1, method: 'ping' })).toBe(false); // wrong version
  });

  it('should expose MCP_METHODS constants', () => {
    expect(MCP_METHODS.INITIALIZE).toBe('initialize');
    expect(MCP_METHODS.TOOLS_LIST).toBe('tools/list');
    expect(MCP_METHODS.TOOLS_CALL).toBe('tools/call');
    expect(MCP_METHODS.PROMPTS_LIST).toBe('prompts/list');
    expect(MCP_METHODS.PROMPTS_GET).toBe('prompts/get');
    expect(MCP_METHODS.RESOURCES_LIST).toBe('resources/list');
    expect(MCP_METHODS.RESOURCES_READ).toBe('resources/read');
    expect(MCP_METHODS.PING).toBe('ping');
  });
});

// ---------------------------------------------------------------------------
// PromptRegistry
// ---------------------------------------------------------------------------

describe('PromptRegistry', () => {
  it('should register and list prompts', () => {
    const reg = new PromptRegistry();
    const prompt: MCPPrompt = { name: 'greet', description: 'Greeting prompt' };
    reg.register(prompt, () => [{ role: 'user', content: { type: 'text', text: 'Hello' } }]);

    expect(reg.list()).toHaveLength(1);
    expect(reg.list()[0].name).toBe('greet');
  });

  it('should get a prompt by name', () => {
    const reg = new PromptRegistry();
    const prompt: MCPPrompt = { name: 'analyze', description: 'Analyze code' };
    reg.register(prompt, () => []);

    expect(reg.get('analyze')).toEqual(prompt);
    expect(reg.get('missing')).toBeUndefined();
  });

  it('should unregister a prompt', () => {
    const reg = new PromptRegistry();
    reg.register({ name: 'temp', description: 'Temp' }, () => []);

    expect(reg.unregister('temp')).toBe(true);
    expect(reg.get('temp')).toBeUndefined();
    expect(reg.unregister('temp')).toBe(false);
  });

  it('should execute a prompt handler with arguments', () => {
    const reg = new PromptRegistry();
    reg.register(
      {
        name: 'review',
        description: 'Code review',
        arguments: [{ name: 'language', description: 'Programming language', required: true }],
      },
      (args) => [
        { role: 'user', content: { type: 'text', text: `Review ${args['language']} code` } },
      ],
    );

    const messages = reg.execute('review', { language: 'TypeScript' });
    expect(messages).toHaveLength(1);
    expect(messages[0].content.text).toBe('Review TypeScript code');
  });

  it('should throw when executing an unknown prompt', () => {
    const reg = new PromptRegistry();
    expect(() => reg.execute('nope', {})).toThrow('Prompt not found: nope');
  });
});

// ---------------------------------------------------------------------------
// ResourceRegistry
// ---------------------------------------------------------------------------

describe('ResourceRegistry', () => {
  it('should register and list resources', () => {
    const reg = new ResourceRegistry();
    const resource: MCPResource = {
      uri: 'file:///config.json',
      name: 'config',
      mimeType: 'application/json',
    };
    reg.register(resource, () => ({
      uri: 'file:///config.json',
      mimeType: 'application/json',
      text: '{}',
    }));

    expect(reg.list()).toHaveLength(1);
    expect(reg.list()[0].uri).toBe('file:///config.json');
  });

  it('should get a resource by URI', () => {
    const reg = new ResourceRegistry();
    const resource: MCPResource = { uri: 'file:///a.txt', name: 'A' };
    reg.register(resource, () => ({ uri: 'file:///a.txt', mimeType: 'text/plain', text: 'A' }));

    expect(reg.get('file:///a.txt')).toEqual(resource);
    expect(reg.get('file:///missing')).toBeUndefined();
  });

  it('should unregister a resource', () => {
    const reg = new ResourceRegistry();
    reg.register({ uri: 'file:///tmp', name: 'tmp' }, () => ({
      uri: 'file:///tmp',
      mimeType: 'text/plain',
      text: '',
    }));

    expect(reg.unregister('file:///tmp')).toBe(true);
    expect(reg.get('file:///tmp')).toBeUndefined();
    expect(reg.unregister('file:///tmp')).toBe(false);
  });

  it('should read resource content', () => {
    const reg = new ResourceRegistry();
    reg.register({ uri: 'file:///data.csv', name: 'data', mimeType: 'text/csv' }, () => ({
      uri: 'file:///data.csv',
      mimeType: 'text/csv',
      text: 'a,b\n1,2',
    }));

    const content = reg.read('file:///data.csv');
    expect(content.text).toBe('a,b\n1,2');
    expect(content.mimeType).toBe('text/csv');
  });

  it('should throw when reading an unknown resource', () => {
    const reg = new ResourceRegistry();
    expect(() => reg.read('file:///nope')).toThrow('Resource not found: file:///nope');
  });
});

// ---------------------------------------------------------------------------
// InMemoryTransport
// ---------------------------------------------------------------------------

describe('InMemoryTransport', () => {
  it('should start and stop without error', async () => {
    const transport = new InMemoryTransport();
    await transport.start();
    await transport.stop();
  });

  it('should collect sent messages', () => {
    const transport = new InMemoryTransport();
    transport.send({ jsonrpc: '2.0', id: 1, result: 'ok' });
    transport.send({ jsonrpc: '2.0', id: 2, result: 'ok2' });

    const messages = transport.getSentMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe(1);
  });

  it('should simulate requests through handler', async () => {
    const transport = new InMemoryTransport();
    transport.onMessage(async (req) => ({
      jsonrpc: '2.0',
      id: req.id,
      result: `handled ${req.method}`,
    }));

    const resp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
    });
    expect(resp.result).toBe('handled ping');
  });

  it('should throw if no handler when simulating request', async () => {
    const transport = new InMemoryTransport();
    await expect(
      transport.simulateRequest({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    ).rejects.toThrow('No handler registered');
  });
});

// ---------------------------------------------------------------------------
// StdioTransport with mock streams
// ---------------------------------------------------------------------------

describe('StdioTransport', () => {
  it('should process newline-delimited JSON from input stream', async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const transport = new StdioTransport(input, output);
    transport.onMessage(async (req) => ({
      jsonrpc: '2.0' as const,
      id: req.id,
      result: `pong-${req.id}`,
    }));

    await transport.start();

    // Write a JSON-RPC request
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 42, method: 'ping' }) + '\n');

    // Read response from output
    const responseText = await new Promise<string>((resolve) => {
      output.once('data', (chunk: Buffer) => resolve(chunk.toString()));
    });

    const parsed = JSON.parse(responseText.trim()) as JsonRpcResponse;
    expect(parsed.id).toBe(42);
    expect(parsed.result).toBe('pong-42');

    await transport.stop();
  });

  it('should handle malformed JSON with parse error', async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const transport = new StdioTransport(input, output);
    transport.onMessage(async (req) => ({
      jsonrpc: '2.0' as const,
      id: req.id,
      result: 'ok',
    }));

    await transport.start();

    input.write('not valid json\n');

    const responseText = await new Promise<string>((resolve) => {
      output.once('data', (chunk: Buffer) => resolve(chunk.toString()));
    });

    const parsed = JSON.parse(responseText.trim()) as JsonRpcResponse;
    expect(parsed.error?.code).toBe(-32700);
    expect(parsed.error?.message).toBe('Parse error');

    await transport.stop();
  });

  it('should skip empty lines', async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const transport = new StdioTransport(input, output);
    transport.onMessage(async (req) => ({
      jsonrpc: '2.0' as const,
      id: req.id,
      result: 'ok',
    }));

    await transport.start();

    // Write empty lines followed by a valid request
    input.write('\n\n');
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'ping' }) + '\n');

    const responseText = await new Promise<string>((resolve) => {
      output.once('data', (chunk: Buffer) => resolve(chunk.toString()));
    });

    const parsed = JSON.parse(responseText.trim()) as JsonRpcResponse;
    expect(parsed.id).toBe(99);

    await transport.stop();
  });
});

// ---------------------------------------------------------------------------
// MCPServer.handleJsonRpc
// ---------------------------------------------------------------------------

describe('MCPServer JSON-RPC handler', () => {
  function makeRequest(method: string, params?: Record<string, unknown>): JsonRpcRequest {
    return { jsonrpc: '2.0', id: 1, method, params };
  }

  it('should handle initialize', async () => {
    const server = createMCPServer({ name: 'test-server', version: '1.0.0' });
    const resp = await server.handleJsonRpc(makeRequest('initialize'));

    expect(resp.error).toBeUndefined();
    const result = resp.result as Record<string, unknown>;
    expect(result['protocolVersion']).toBe('2024-11-05');
    const info = result['serverInfo'] as Record<string, string>;
    expect(info['name']).toBe('test-server');
    expect(info['version']).toBe('1.0.0');
    const caps = result['capabilities'] as Record<string, unknown>;
    expect(caps).toHaveProperty('tools');
    expect(caps).toHaveProperty('prompts');
    expect(caps).toHaveProperty('resources');
  });

  it('should handle ping', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(makeRequest('ping'));
    expect(resp.error).toBeUndefined();
    expect(resp.result).toEqual({});
  });

  it('should handle tools/list', async () => {
    const server = createMCPServer();
    server.registerTool(makeTool('echo', 'util').definition, makeTool('echo', 'util').handler);

    const resp = await server.handleJsonRpc(makeRequest('tools/list'));
    expect(resp.error).toBeUndefined();
    const result = resp.result as { tools: Array<{ name: string }> };
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('echo');
  });

  it('should handle tools/call successfully', async () => {
    const server = createMCPServer();
    const handler: ToolHandler = async () => ({ success: true, data: 'hello world' });
    server.registerTool(makeTool('greet', 'util').definition, handler);

    const resp = await server.handleJsonRpc(
      makeRequest('tools/call', { name: 'greet', arguments: {} }),
    );
    expect(resp.error).toBeUndefined();
    const result = resp.result as { content: Array<{ type: string; text: string }> };
    expect(result.content[0].text).toBe('hello world');
  });

  it('should handle tools/call with non-string data', async () => {
    const server = createMCPServer();
    const handler: ToolHandler = async () => ({ success: true, data: { count: 42 } });
    server.registerTool(makeTool('stats', 'util').definition, handler);

    const resp = await server.handleJsonRpc(
      makeRequest('tools/call', { name: 'stats', arguments: {} }),
    );
    const result = resp.result as { content: Array<{ text: string }> };
    expect(result.content[0].text).toBe('{"count":42}');
  });

  it('should handle tools/call with missing tool', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(
      makeRequest('tools/call', { name: 'missing', arguments: {} }),
    );
    expect(resp.error).toBeUndefined();
    const result = resp.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Tool not found');
  });

  it('should handle tools/call with missing name param', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(makeRequest('tools/call', {}));
    expect(resp.error?.code).toBe(-32602);
    expect(resp.error?.message).toContain('name');
  });

  it('should handle prompts/list', async () => {
    const server = createMCPServer();
    server.prompts.register(
      { name: 'summarize', description: 'Summarize text' },
      () => [{ role: 'user', content: { type: 'text', text: 'Summarize' } }],
    );

    const resp = await server.handleJsonRpc(makeRequest('prompts/list'));
    expect(resp.error).toBeUndefined();
    const result = resp.result as { prompts: Array<{ name: string }> };
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].name).toBe('summarize');
  });

  it('should handle prompts/get', async () => {
    const server = createMCPServer();
    server.prompts.register(
      { name: 'greet', description: 'Greeting' },
      (args) => [{ role: 'user', content: { type: 'text', text: `Hi ${args['name']}` } }],
    );

    const resp = await server.handleJsonRpc(
      makeRequest('prompts/get', { name: 'greet', arguments: { name: 'Alice' } }),
    );
    expect(resp.error).toBeUndefined();
    const result = resp.result as { messages: Array<{ content: { text: string } }> };
    expect(result.messages[0].content.text).toBe('Hi Alice');
  });

  it('should handle prompts/get with missing name', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(makeRequest('prompts/get', {}));
    expect(resp.error?.code).toBe(-32602);
  });

  it('should handle prompts/get with unknown prompt', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(makeRequest('prompts/get', { name: 'nope' }));
    expect(resp.error?.code).toBe(-32602);
    expect(resp.error?.message).toContain('Prompt not found');
  });

  it('should handle resources/list', async () => {
    const server = createMCPServer();
    server.resources.register(
      { uri: 'file:///readme.md', name: 'README' },
      () => ({ uri: 'file:///readme.md', mimeType: 'text/markdown', text: '# Hello' }),
    );

    const resp = await server.handleJsonRpc(makeRequest('resources/list'));
    expect(resp.error).toBeUndefined();
    const result = resp.result as { resources: Array<{ uri: string }> };
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].uri).toBe('file:///readme.md');
  });

  it('should handle resources/read', async () => {
    const server = createMCPServer();
    server.resources.register(
      { uri: 'file:///data.json', name: 'data', mimeType: 'application/json' },
      () => ({ uri: 'file:///data.json', mimeType: 'application/json', text: '{"x":1}' }),
    );

    const resp = await server.handleJsonRpc(
      makeRequest('resources/read', { uri: 'file:///data.json' }),
    );
    expect(resp.error).toBeUndefined();
    const result = resp.result as { contents: Array<{ text: string }> };
    expect(result.contents[0].text).toBe('{"x":1}');
  });

  it('should handle resources/read with missing uri', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(makeRequest('resources/read', {}));
    expect(resp.error?.code).toBe(-32602);
  });

  it('should handle resources/read with unknown uri', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(
      makeRequest('resources/read', { uri: 'file:///nope' }),
    );
    expect(resp.error?.code).toBe(-32602);
    expect(resp.error?.message).toContain('Resource not found');
  });

  it('should return method not found for unknown methods', async () => {
    const server = createMCPServer();
    const resp = await server.handleJsonRpc(makeRequest('unknown/method'));
    expect(resp.error?.code).toBe(-32601);
    expect(resp.error?.message).toContain('Method not found');
  });
});

// ---------------------------------------------------------------------------
// MCPServer with InMemoryTransport end-to-end
// ---------------------------------------------------------------------------

describe('MCPServer + InMemoryTransport end-to-end', () => {
  let server: MCPServer;
  let transport: InMemoryTransport;

  afterEach(async () => {
    await server.stop();
  });

  it('should handle full lifecycle: start → request → stop', async () => {
    server = createMCPServer({ name: 'e2e-server', version: '2.0.0' });
    transport = new InMemoryTransport();
    await server.start(transport);

    // Initialize
    const initResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });
    expect(initResp.error).toBeUndefined();
    const initResult = initResp.result as Record<string, unknown>;
    const info = initResult['serverInfo'] as Record<string, string>;
    expect(info['name']).toBe('e2e-server');

    // Ping
    const pingResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    });
    expect(pingResp.result).toEqual({});

    // Register a tool and call it
    server.registerTool(makeTool('add', 'math').definition, async (params) => ({
      success: true,
      data: `sum=${Number(params['a'] ?? 0) + Number(params['b'] ?? 0)}`,
    }));

    const toolListResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    });
    const tools = (toolListResp.result as { tools: Array<{ name: string }> }).tools;
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('add');

    const toolCallResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'add', arguments: { a: 3, b: 4 } },
    });
    const callResult = toolCallResp.result as { content: Array<{ text: string }> };
    expect(callResult.content[0].text).toBe('sum=7');

    // Register prompt and test
    server.prompts.register(
      { name: 'explain', description: 'Explain code' },
      (args) => [{ role: 'user', content: { type: 'text', text: `Explain: ${args['topic']}` } }],
    );

    const promptResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'prompts/get',
      params: { name: 'explain', arguments: { topic: 'closures' } },
    });
    const promptResult = promptResp.result as {
      messages: Array<{ content: { text: string } }>;
    };
    expect(promptResult.messages[0].content.text).toBe('Explain: closures');

    // Register resource and test
    server.resources.register(
      { uri: 'file:///config.yml', name: 'config', mimeType: 'text/yaml' },
      () => ({ uri: 'file:///config.yml', mimeType: 'text/yaml', text: 'key: value' }),
    );

    const resResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'resources/read',
      params: { uri: 'file:///config.yml' },
    });
    const resResult = resResp.result as { contents: Array<{ text: string }> };
    expect(resResult.contents[0].text).toBe('key: value');

    // Unknown method
    const unknownResp = await transport.simulateRequest({
      jsonrpc: '2.0',
      id: 99,
      method: 'bogus/method',
    });
    expect(unknownResp.error?.code).toBe(-32601);

    await server.stop();
  });

  it('should safely stop when no transport is attached', async () => {
    server = createMCPServer();
    transport = new InMemoryTransport();
    // Don't start, just stop — should not throw
    await server.stop();
  });
});
