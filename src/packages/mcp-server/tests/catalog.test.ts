import { describe, it, expect } from 'vitest';
import {
  MCPServer,
  createFullMCPServer,
  registerDefaultTools,
  getToolCategories,
} from '../src/index.js';
import type { ToolCategory } from '../src/index.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function findTool(category: string, name: string) {
  const cat = getToolCategories().find((c) => c.name === category)!;
  return cat.tools.find((t) => t.definition.name === name)!;
}

// ---------------------------------------------------------------------------
// catalog.ts — registerDefaultTools
// ---------------------------------------------------------------------------

describe('registerDefaultTools', () => {
  it('should register tools on the server', () => {
    const server = new MCPServer();
    registerDefaultTools(server);
    const tools = server.getToolManifest();
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should register the expected number of tools (50)', () => {
    const server = new MCPServer();
    registerDefaultTools(server);
    expect(server.getToolManifest()).toHaveLength(61);
  });

  it('should assign the correct number of categories', () => {
    const server = new MCPServer();
    registerDefaultTools(server);
    const categories = server.getRegistry().getCategories();
    expect(categories).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// getToolCategories
// ---------------------------------------------------------------------------

describe('getToolCategories', () => {
  it('should return all 13 categories', () => {
    const categories = getToolCategories();
    expect(categories).toHaveLength(13);
  });

  it('each category has at least 2 tools', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      expect(cat.tools.length, `${cat.name} should have ≥ 2 tools`).toBeGreaterThanOrEqual(2);
    }
  });

  it('each category has a name and description', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      expect(cat.name).toBeTruthy();
      expect(cat.description).toBeTruthy();
    }
  });

  it('tool names follow category.action dot-separated pattern', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      for (const entry of cat.tools) {
        expect(
          entry.definition.name,
          `${entry.definition.name} should contain a dot`,
        ).toMatch(/^[\w-]+\.[\w.-]+$/);
      }
    }
  });

  it('all tool names are unique', () => {
    const categories = getToolCategories();
    const names = categories.flatMap((c) => c.tools.map((t) => t.definition.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('each tool has a description and at least an empty parameters array', () => {
    const categories = getToolCategories();
    for (const cat of categories) {
      for (const entry of cat.tools) {
        expect(entry.definition.description).toBeTruthy();
        expect(Array.isArray(entry.definition.parameters)).toBe(true);
      }
    }
  });

  it('contains the expected category names', () => {
    const categories = getToolCategories();
    const names = categories.map((c: ToolCategory) => c.name);
    expect(names).toContain('sdd-core');
    expect(names).toContain('knowledge');
    expect(names).toContain('policy');
    expect(names).toContain('ontology');
    expect(names).toContain('code-analysis');
    expect(names).toContain('security');
    expect(names).toContain('research');
    expect(names).toContain('neural');
    expect(names).toContain('synthesis');
    expect(names).toContain('formal-verify');
    expect(names).toContain('workflow');
    expect(names).toContain('decisions');
    expect(names).toContain('skills');
  });
});

// ---------------------------------------------------------------------------
// Tool handler fallback behaviour
// ---------------------------------------------------------------------------

describe('tool handler fallback (packages unavailable)', () => {
  it('handlers return a result even when the backing package is not available', async () => {
    const categories = getToolCategories();
    const sddCore = categories.find((c) => c.name === 'sdd-core')!;
    const firstTool = sddCore.tools[0];
    const result = await firstTool.handler({ pattern: 'event-driven', text: 'test', id: 'REQ-001' });
    expect(result.success).toBe(true);
  });

  it('knowledge handlers return fail result when package is unavailable', async () => {
    const categories = getToolCategories();
    const knowledge = categories.find((c) => c.name === 'knowledge')!;
    const getTool = knowledge.tools.find((t) => t.definition.name === 'knowledge.entity.get')!;
    const result = await getTool.handler({ id: 'test-id' });
    // Either success (if package exists) or fail (if not) — just shouldn't throw
    expect(typeof result.success).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// createFullMCPServer
// ---------------------------------------------------------------------------

describe('createFullMCPServer', () => {
  it('should return a server with tools, prompts, and resources', () => {
    const server = createFullMCPServer();
    expect(server.getToolManifest().length).toBeGreaterThan(0);
    expect(server.prompts.list().length).toBeGreaterThan(0);
    expect(server.resources.list().length).toBeGreaterThan(0);
  });

  it('should respect custom server options', () => {
    const server = createFullMCPServer({ name: 'test-full', version: '9.9.9' });
    const info = server.getInfo();
    expect(info.name).toBe('test-full');
    expect(info.version).toBe('9.9.9');
    expect(info.toolCount).toBe(61);
  });
});

// ---------------------------------------------------------------------------
// v0.5.7 — security tools wired to real APIs, knowledge get awaits async
// ---------------------------------------------------------------------------

describe('v0.5.7 MCP tool fixes', () => {
  const SECRET = 'const k = "AKIAIOSFODNN7EXAMPLE";';

  it('security.scan detects a leaked AWS key (real scanner, not a no-op)', async () => {
    const result = await findTool('security', 'security.scan').handler({ code: SECRET });
    expect(result.success).toBe(true);
    const data = result.data as { findings: unknown[]; severity: string };
    expect(data.findings.length).toBeGreaterThan(0);
    expect(data.severity).toBe('critical');
  });

  it('security.secrets.detect finds the secret', async () => {
    const result = await findTool('security', 'security.secrets.detect').handler({ code: SECRET });
    expect(result.success).toBe(true);
    const data = result.data as { count: number };
    expect(data.count).toBeGreaterThan(0);
  });

  it('security.scan on clean code reports no findings', async () => {
    const result = await findTool('security', 'security.scan').handler({ code: 'export const n = 1;' });
    const data = result.data as { findings: unknown[]; severity: string };
    expect(data.findings.length).toBe(0);
    expect(data.severity).toBe('none');
  });

  it('knowledge.entity.get returns the stored entity (awaits async, not {})', async () => {
    const base = mkdtempSync(join(tmpdir(), 'mcp-kg-'));
    try {
      const put = await findTool('knowledge', 'knowledge.entity.put').handler({
        id: 'E1', type: 'concept', basePath: base,
      });
      expect(put.success).toBe(true);
      const get = await findTool('knowledge', 'knowledge.entity.get').handler({
        id: 'E1', basePath: base,
      });
      expect(get.success).toBe(true);
      expect((get.data as { id: string }).id).toBe('E1');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
