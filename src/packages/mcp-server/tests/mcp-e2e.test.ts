import { describe, it, expect } from 'vitest';
import { createFullMCPServer } from '../src/index.js';
import type { JsonRpcRequest } from '../src/jsonrpc.js';

// End-to-end verification that the SDD flow works through the *JSON-RPC wire*
// path (the same `handleJsonRpc` the stdio transport drives), not just by
// calling tool handlers directly — i.e. that the 61 tools behave over MCP the
// way they do on the CLI.

const server = createFullMCPServer();
let nextId = 1;

function req(method: string, params?: Record<string, unknown>): JsonRpcRequest {
  return { jsonrpc: '2.0', id: nextId++, method, params };
}

async function call(name: string, args: Record<string, unknown>): Promise<{ isError: boolean; text: string }> {
  const res = await server.handleJsonRpc(req('tools/call', { name, arguments: args }));
  const result = res.result as { content: Array<{ text: string }>; isError?: boolean };
  return { isError: Boolean(result.isError), text: result.content[0]?.text ?? '' };
}

describe('MCP E2E — JSON-RPC wire path', () => {
  it('initialize returns server info and capabilities', async () => {
    const res = await server.handleJsonRpc(req('initialize'));
    const result = res.result as { serverInfo: { name: string }; capabilities: { tools: unknown } };
    expect(result.serverInfo.name).toBeTruthy();
    expect(result.capabilities.tools).toBeDefined();
  });

  it('tools/list exposes all 61 tools with input schemas', async () => {
    const res = await server.handleJsonRpc(req('tools/list'));
    const result = res.result as { tools: Array<{ name: string; inputSchema: { type: string } }> };
    expect(result.tools).toHaveLength(61);
    for (const t of result.tools) {
      expect(t.name).toMatch(/\w+\.\w+/);
      expect(t.inputSchema.type).toBe('object');
    }
  });

  it('drives requirements → design → codegen over the wire', async () => {
    // 1. Parse a requirements document.
    const listed = await call('sdd.requirements.list', {
      markdown: [
        '## REQ-USR-001: User Registration',
        '**要件**: WHEN a visitor submits the signup form, THE system SHALL create a user account.',
        '## REQ-USR-002: User Login',
        '**要件**: THE system SHALL issue a session token.',
      ].join('\n'),
    });
    expect(listed.isError).toBe(false);
    const reqs = JSON.parse(listed.text) as Array<{ id: string; title: string; text: string; pattern: string }>;
    expect(reqs).toHaveLength(2);

    // 2. Generate a design from the parsed requirements.
    const designed = await call('sdd.design.generate', { requirements: reqs });
    expect(designed.isError).toBe(false);
    const design = JSON.parse(designed.text) as { sections: Array<{ components: Array<{ name: string; methods: Array<{ name: string }> }> }> };
    const component = design.sections[0].components[0];
    expect(component.name).toBeTruthy();
    expect(component.methods.length).toBeGreaterThan(0);

    // 3. Generate code for that component.
    const generated = await call('sdd.codegen.generate', { name: component.name, templateType: 'class' });
    expect(generated.isError).toBe(false);
    const code = JSON.parse(generated.text) as { code: string };
    expect(code.code).toContain(`class ${component.name}`);
  });

  it('maps an unknown method to a JSON-RPC error', async () => {
    const res = await server.handleJsonRpc(req('no/such/method'));
    expect(res.error?.code).toBe(-32601);
  });

  it('reports a failing tool as isError with a real message', async () => {
    // Wrong shape (string, not array) → the handler throws; the wire response
    // must surface the real error, never the old generic "Core package not
    // available" string.
    const bad = await call('sdd.design.generate', { requirements: 'not-an-array' });
    expect(bad.isError).toBe(true);
    expect(bad.text).not.toContain('Core package not available');
    expect(bad.text).toMatch(/map is not a function/);
  });
});
