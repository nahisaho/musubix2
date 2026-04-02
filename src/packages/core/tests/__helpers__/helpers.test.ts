import { describe, it, expect, afterEach } from 'vitest';
import { createTempDir, createMockContext, expectEarsLinked, groupByReqId } from './index.js';

describe('REQ-GOV-002: test helpers', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it('should create and cleanup temp directory', async () => {
    const tmp = await createTempDir();
    cleanup = tmp.cleanup;
    expect(tmp.path).toBeTruthy();
    expect(tmp.path).toContain('musubix2-test-');
  });

  it('should create mock context with defaults', () => {
    const ctx = createMockContext();
    expect(ctx.cwd).toBe('/tmp/test');
    expect(ctx.fs.readFile).toBeDefined();
    expect(ctx.fs.writeFile).toBeDefined();
  });

  it('should create mock context with overrides', () => {
    const ctx = createMockContext({ cwd: '/custom' });
    expect(ctx.cwd).toBe('/custom');
  });

  it('should validate EARS linked test names', () => {
    expect(() => expectEarsLinked('REQ-ARC-001: test')).not.toThrow();
    expect(() => expectEarsLinked('no req id')).toThrow();
  });

  it('should group results by REQ ID', () => {
    const results = [
      { name: 'REQ-ARC-001: test1', passed: true },
      { name: 'REQ-ARC-001: test2', passed: false },
      { name: 'REQ-GOV-002: test3', passed: true },
    ];
    const grouped = groupByReqId(results);
    expect(grouped['REQ-ARC-001']).toHaveLength(2);
    expect(grouped['REQ-GOV-002']).toHaveLength(1);
  });
});
