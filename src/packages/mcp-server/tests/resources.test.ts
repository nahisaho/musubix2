import { describe, it, expect } from 'vitest';
import {
  MCPServer,
  registerDefaultResources,
  getDefaultResources,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// registerDefaultResources
// ---------------------------------------------------------------------------

describe('registerDefaultResources', () => {
  it('should register resources on the server', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    const resources = server.resources.list();
    expect(resources.length).toBeGreaterThan(0);
  });

  it('should register exactly 3 resources', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    expect(server.resources.list()).toHaveLength(3);
  });

  it('should register resources with the expected URIs', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    const uris = server.resources.list().map((r) => r.uri);
    expect(uris).toContain('musubix://constitution');
    expect(uris).toContain('musubix://ears-patterns');
    expect(uris).toContain('musubix://workflow-phases');
  });
});

// ---------------------------------------------------------------------------
// getDefaultResources
// ---------------------------------------------------------------------------

describe('getDefaultResources', () => {
  it('should return resource entries', () => {
    const resources = getDefaultResources();
    expect(resources).toHaveLength(3);
  });

  it('each resource has uri, name, and handler', () => {
    const resources = getDefaultResources();
    for (const entry of resources) {
      expect(entry.resource.uri).toBeTruthy();
      expect(entry.resource.name).toBeTruthy();
      expect(typeof entry.handler).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// Resource reading
// ---------------------------------------------------------------------------

describe('resource reading', () => {
  it('musubix://constitution returns valid JSON content', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    const content = server.resources.read('musubix://constitution');
    expect(content.uri).toBe('musubix://constitution');
    expect(content.mimeType).toBe('application/json');
    const parsed = JSON.parse(content.text);
    expect(parsed.title).toBeTruthy();
    expect(Array.isArray(parsed.articles)).toBe(true);
    expect(parsed.articles.length).toBeGreaterThan(0);
  });

  it('musubix://ears-patterns returns valid JSON content', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    const content = server.resources.read('musubix://ears-patterns');
    expect(content.uri).toBe('musubix://ears-patterns');
    expect(content.mimeType).toBe('application/json');
    const parsed = JSON.parse(content.text);
    expect(parsed.title).toBeTruthy();
    expect(Array.isArray(parsed.patterns)).toBe(true);
    expect(parsed.patterns.length).toBe(5);
  });

  it('musubix://workflow-phases returns valid JSON content', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    const content = server.resources.read('musubix://workflow-phases');
    expect(content.uri).toBe('musubix://workflow-phases');
    expect(content.mimeType).toBe('application/json');
    const parsed = JSON.parse(content.text);
    expect(parsed.title).toBeTruthy();
    expect(Array.isArray(parsed.phases)).toBe(true);
    expect(parsed.phases.length).toBeGreaterThan(0);
  });

  it('each resource content has uri, mimeType, and text', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    for (const res of server.resources.list()) {
      const content = server.resources.read(res.uri);
      expect(content.uri).toBe(res.uri);
      expect(content.mimeType).toBeTruthy();
      expect(content.text.length).toBeGreaterThan(0);
    }
  });

  it('reading a non-existent resource throws', () => {
    const server = new MCPServer();
    registerDefaultResources(server);
    expect(() => server.resources.read('musubix://nonexistent')).toThrow('Resource not found');
  });
});
