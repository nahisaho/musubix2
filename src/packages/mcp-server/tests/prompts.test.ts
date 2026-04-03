import { describe, it, expect } from 'vitest';
import {
  MCPServer,
  registerDefaultPrompts,
  getDefaultPrompts,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// registerDefaultPrompts
// ---------------------------------------------------------------------------

describe('registerDefaultPrompts', () => {
  it('should register prompts on the server', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    const prompts = server.prompts.list();
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('should register exactly 4 prompts', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    expect(server.prompts.list()).toHaveLength(4);
  });

  it('should register prompts with the expected names', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    const names = server.prompts.list().map((p) => p.name);
    expect(names).toContain('sdd-requirements-template');
    expect(names).toContain('sdd-design-template');
    expect(names).toContain('sdd-review-checklist');
    expect(names).toContain('sdd-task-breakdown-template');
  });
});

// ---------------------------------------------------------------------------
// getDefaultPrompts
// ---------------------------------------------------------------------------

describe('getDefaultPrompts', () => {
  it('should return prompt entries', () => {
    const prompts = getDefaultPrompts();
    expect(prompts).toHaveLength(4);
  });

  it('each prompt has name, description, and handler', () => {
    const prompts = getDefaultPrompts();
    for (const entry of prompts) {
      expect(entry.prompt.name).toBeTruthy();
      expect(entry.prompt.description).toBeTruthy();
      expect(typeof entry.handler).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// Prompt execution
// ---------------------------------------------------------------------------

describe('prompt execution', () => {
  it('sdd-requirements-template returns valid messages', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    const messages = server.prompts.execute('sdd-requirements-template', { feature: 'Login' });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    for (const msg of messages) {
      expect(msg.role).toMatch(/^(user|assistant)$/);
      expect(msg.content.type).toBe('text');
      expect(msg.content.text.length).toBeGreaterThan(0);
    }
  });

  it('sdd-design-template returns valid messages', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    const messages = server.prompts.execute('sdd-design-template', { component: 'AuthModule' });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages.some((m) => m.content.text.includes('AuthModule'))).toBe(true);
  });

  it('sdd-review-checklist returns valid messages for each phase', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    for (const phase of ['requirements', 'design', 'implementation', 'testing']) {
      const messages = server.prompts.execute('sdd-review-checklist', { phase });
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages.some((m) => m.content.text.includes('☐'))).toBe(true);
    }
  });

  it('sdd-task-breakdown-template returns valid messages', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    const messages = server.prompts.execute('sdd-task-breakdown-template', { feature: 'Search' });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages.some((m) => m.content.text.includes('Search'))).toBe(true);
  });

  it('prompts use default values when optional args omitted', () => {
    const server = new MCPServer();
    registerDefaultPrompts(server);
    const messages = server.prompts.execute('sdd-requirements-template', { feature: 'Test' });
    // Should not throw when pattern is omitted
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });
});
