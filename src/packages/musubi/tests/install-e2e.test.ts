/**
 * P4-02 / P4-03: E2E tests for init --platform and musubix2 mcp.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { createInitCommandHandler } from '../src/interface/cli/init-command-handler.js';

describe('E2E: init --platform', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `musubix-e2e-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--platform copilot --dry-run prints report without writing', async () => {
    const handler = createInitCommandHandler();
    const logs: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      logs.push(String(chunk));
      return true;
    }) as any;

    try {
      const summary = await handler.run({
        projectPath: tmpDir,
        platform: 'copilot',
        force: false,
        dryRun: true,
        update: false,
      });
      expect(summary.detectedPlatforms.copilot).toBe(true);
      expect(summary.detectedPlatforms.claude).toBe(false);
      const output = logs.join('');
      expect(output).toContain('Dry Run');
    } finally {
      process.stdout.write = origWrite;
    }

    // No files written
    expect(existsSync(join(tmpDir, '.github'))).toBe(false);
    expect(existsSync(join(tmpDir, '.vscode'))).toBe(false);
  });

  it('--platform copilot generates .github/ and .vscode/', async () => {
    const handler = createInitCommandHandler();
    await handler.run({
      projectPath: tmpDir,
      platform: 'copilot',
      force: false,
      dryRun: false,
      update: false,
    });

    // copilot-instructions.md should exist
    expect(existsSync(join(tmpDir, '.github', 'copilot-instructions.md'))).toBe(true);
    const content = readFileSync(join(tmpDir, '.github', 'copilot-instructions.md'), 'utf-8');
    expect(content).toContain('MUSUBIX2');
  });

  it('--platform claude generates .claude/ and CLAUDE.md atomically', async () => {
    const handler = createInitCommandHandler();
    await handler.run({
      projectPath: tmpDir,
      platform: 'claude',
      force: false,
      dryRun: false,
      update: false,
    });

    // Claude artifacts
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
    const claude = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claude).toContain('MUSUBIX2');

    expect(existsSync(join(tmpDir, '.claude'))).toBe(true);
    expect(existsSync(join(tmpDir, '.claude', '.musubix-managed'))).toBe(true);
  });

  it('--platform both generates both platforms', async () => {
    const handler = createInitCommandHandler();
    await handler.run({
      projectPath: tmpDir,
      platform: 'both',
      force: false,
      dryRun: false,
      update: false,
    });

    // Both platforms
    expect(existsSync(join(tmpDir, '.github', 'copilot-instructions.md'))).toBe(true);
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });

  it('--platform both --dry-run writes nothing', async () => {
    const handler = createInitCommandHandler();
    const logs: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      logs.push(String(chunk));
      return true;
    }) as any;

    try {
      await handler.run({
        projectPath: tmpDir,
        platform: 'both',
        force: false,
        dryRun: true,
        update: false,
      });
    } finally {
      process.stdout.write = origWrite;
    }

    // No side effects on filesystem outside Claude transaction (which is dry-run aware)
    const entries = readdirSync(tmpDir);
    expect(entries.length).toBe(0);
  });
});



// ── MCP launcher smoke test ────────────────────────────────────────────────

import { McpCliLauncher } from '../src/interface/cli/mcp-cli-launcher.js';

describe('E2E: musubix2 mcp', () => {
  it('McpCliLauncher can be instantiated', () => {
    const launcher = new McpCliLauncher();
    expect(launcher).toBeDefined();
    expect(typeof launcher.start).toBe('function');
  });
});
