import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleSearch, handleVerify, handleDfg } from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// v0.5.48 — dfg / formal-verify / neural-search exposed as CLI commands.

describe('CLI expose — search / verify / dfg', () => {
  let dir: string;
  let logs: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'musubix-expose-'));
    logs = [];
    logSpy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    errSpy = vi.spyOn(console, 'error').mockImplementation((m?: unknown) => { logs.push(String(m)); });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  // ── search ───────────────────────────────────────────────────────────────

  it('search ranks relevant documents above unrelated ones', async () => {
    mkdirSync(join(dir, 'c'), { recursive: true });
    writeFileSync(join(dir, 'c', 'a.md'), 'redis cache eviction and invalidation');
    writeFileSync(join(dir, 'c', 'b.md'), 'oauth token authentication for users');
    writeFileSync(join(dir, 'c', 'c.md'), 'lru cache in redis with ttl');
    expect(await handleSearch('redis cache', { corpus: join(dir, 'c'), top: '3' })).toBe(ExitCode.SUCCESS);
    const out = logs.join('\n');
    // The oauth doc must score zero (no shared terms).
    const bLine = out.split('\n').find((l) => l.includes('b.md'))!;
    expect(bLine).toMatch(/0\.000/);
    // The two cache docs must rank above it.
    const aScore = parseFloat(out.split('\n').find((l) => l.includes('a.md'))!.trim());
    expect(aScore).toBeGreaterThan(0);
  });

  it('search requires a query', async () => {
    expect(await handleSearch(undefined, {})).toBe(ExitCode.VALIDATION_ERROR);
  });

  it('search errors on a missing corpus', async () => {
    expect(await handleSearch('q', { corpus: join(dir, 'nope') })).toBe(ExitCode.GENERAL_ERROR);
  });

  // ── verify ───────────────────────────────────────────────────────────────

  it('verify converts EARS requirements to SMT and reports consistency', async () => {
    const f = join(dir, 'reqs.md');
    writeFileSync(
      f,
      [
        '## REQ-AUT-001: Login',
        '**要件**: WHEN a user submits credentials, THE system SHALL issue a session token.',
        '## REQ-SEC-001: No leak',
        '**要件**: THE system SHALL NOT expose passwords in logs.',
      ].join('\n'),
    );
    expect(await handleVerify(f)).toBe(ExitCode.SUCCESS);
    const out = logs.join('\n');
    expect(out).toContain('REQ-AUT-001');
    expect(out).toContain('(assert');
    expect(out).toContain('consistent');
  });

  it('verify requires a file and reports a missing one', async () => {
    expect(await handleVerify(undefined)).toBe(ExitCode.VALIDATION_ERROR);
    expect(await handleVerify(join(dir, 'nope.md'))).toBe(ExitCode.GENERAL_ERROR);
  });

  // ── dfg ──────────────────────────────────────────────────────────────────

  it('dfg builds a graph and flags an unused definition', async () => {
    const f = join(dir, 'code.js');
    writeFileSync(f, 'const x = 5;\nconst y = x + 1;\nconst dead = 99;\nreturn y;\n');
    expect(await handleDfg(f, { unused: true })).toBe(ExitCode.SUCCESS);
    const out = logs.join('\n');
    expect(out).toContain('Data-flow graph');
    expect(out).toMatch(/Unused definitions \(1\)/);
    expect(out).toContain('dead');
    // x and y are used, so they must not be listed as unused.
    expect(out).not.toMatch(/- x\b/);
  });

  it('dfg requires a file', async () => {
    expect(await handleDfg(undefined, {})).toBe(ExitCode.VALIDATION_ERROR);
  });
});
