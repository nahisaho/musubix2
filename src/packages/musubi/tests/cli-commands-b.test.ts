import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCLIDispatcher,
  handleTrace,
  handleTraceVerify,
  handlePolicy,
  handleOntology,
  handleCodegraph,
  handleSecurity,
  handleWorkflow,
  handleStatus,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// ── Traceability ───────────────────────────────────────────────────────────

describe('CLI Commands B — Traceability', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('trace matrix returns SUCCESS', async () => {
    const code = await handleTrace('matrix', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('trace validate returns SUCCESS', async () => {
    const code = await handleTrace('validate', []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('trace impact returns SUCCESS with target', async () => {
    const code = await handleTrace('impact', ['REQ-001']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('REQ-001'));
  });

  it('trace impact returns GENERAL_ERROR without target', async () => {
    const code = await handleTrace('impact', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('trace default shows help', async () => {
    const code = await handleTrace(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('trace'));
  });
});

// ── Trace:verify ───────────────────────────────────────────────────────────

describe('CLI Commands B — Trace:verify', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('trace:verify returns SUCCESS and prints coverage', async () => {
    const code = await handleTraceVerify();
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Coverage'));
  });
});

// ── Policy ─────────────────────────────────────────────────────────────────

describe('CLI Commands B — Policy', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('policy validate returns SUCCESS', async () => {
    const code = await handlePolicy('validate', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Overall'));
  });

  it('policy list prints all 9 constitution articles', async () => {
    const code = await handlePolicy('list', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Constitution Articles'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 9'));
  });

  it('policy info shows article details', async () => {
    const code = await handlePolicy('info', ['1']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CONST-001'));
  });

  it('policy info returns GENERAL_ERROR for unknown article', async () => {
    const code = await handlePolicy('info', ['99']);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('policy info returns GENERAL_ERROR without article number', async () => {
    const code = await handlePolicy('info', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('policy default shows help', async () => {
    const code = await handlePolicy(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
  });
});

// ── Ontology ───────────────────────────────────────────────────────────────

describe('CLI Commands B — Ontology', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('ontology validate returns SUCCESS', async () => {
    const code = await handleOntology('validate');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Consistent'));
  });

  it('ontology stats returns SUCCESS', async () => {
    const code = await handleOntology('stats');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Triples'));
  });

  it('ontology default shows help', async () => {
    const code = await handleOntology(undefined);
    expect(code).toBe(ExitCode.SUCCESS);
  });
});

// ── Codegraph ──────────────────────────────────────────────────────────────

describe('CLI Commands B — Codegraph', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('cg stats returns SUCCESS', async () => {
    const code = await handleCodegraph('stats', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nodes'));
  });

  it('cg languages returns SUCCESS', async () => {
    const code = await handleCodegraph('languages', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Supported languages'));
  });

  it('cg index returns GENERAL_ERROR without path', async () => {
    const code = await handleCodegraph('index', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('cg search returns GENERAL_ERROR without query', async () => {
    const code = await handleCodegraph('search', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('cg search returns SUCCESS with query', async () => {
    const code = await handleCodegraph('search', ['test']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Results for "test"'));
  });

  it('cg default shows help', async () => {
    const code = await handleCodegraph(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('cg index succeeds with a valid TypeScript file', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_cg');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'sample.ts');
    writeFileSync(file, 'export function hello() { return "hi"; }\n');
    try {
      const code = await handleCodegraph('index', [file]);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Indexed'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── Security ───────────────────────────────────────────────────────────────

describe('CLI Commands B — Security', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('security returns GENERAL_ERROR for missing file', async () => {
    const code = await handleSecurity('/nonexistent/file.ts');
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('security scans a valid file', async () => {
    const dir = join(process.cwd(), 'packages', 'musubi', 'tests', '_fixture_sec');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'sample.ts');
    writeFileSync(file, 'const x = 1;\n');
    try {
      const code = await handleSecurity(file);
      expect(code).toBe(ExitCode.SUCCESS);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Security scan'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total findings'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── Workflow ───────────────────────────────────────────────────────────────

describe('CLI Commands B — Workflow', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('workflow status returns SUCCESS', async () => {
    const code = await handleWorkflow('status', []);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Current phase'));
  });

  it('workflow approve returns SUCCESS', async () => {
    const code = await handleWorkflow('approve', ['requirements']);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Approved'));
  });

  it('workflow approve returns GENERAL_ERROR without phase', async () => {
    const code = await handleWorkflow('approve', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('workflow transition returns SUCCESS or PHASE_BLOCKED', async () => {
    const code = await handleWorkflow('transition', ['design']);
    expect([ExitCode.SUCCESS, ExitCode.PHASE_BLOCKED]).toContain(code);
  });

  it('workflow transition returns GENERAL_ERROR without phase', async () => {
    const code = await handleWorkflow('transition', []);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('workflow default shows help', async () => {
    const code = await handleWorkflow(undefined, []);
    expect(code).toBe(ExitCode.SUCCESS);
  });
});

// ── Status ─────────────────────────────────────────────────────────────────

describe('CLI Commands B — Status', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('status returns SUCCESS with dashboard', async () => {
    const code = await handleStatus();
    expect(code).toBe(ExitCode.SUCCESS);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project Status'));
  });
});

// ── Dispatch integration ───────────────────────────────────────────────────

describe('CLI Commands B — Dispatch integration', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('dispatches trace validate', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('trace', { subcommand: 'validate' });
    expect(logSpy).toHaveBeenCalled();
  });

  it('dispatches policy list', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('policy', { subcommand: 'list' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article'));
  });

  it('dispatches ontology stats', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('ontology', { subcommand: 'stats' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Triples'));
  });

  it('dispatches cg languages', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('cg', { subcommand: 'languages' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Supported languages'));
  });

  it('dispatches workflow status', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('workflow', { subcommand: 'status' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Current phase'));
  });

  it('dispatches status command', async () => {
    const d = createCLIDispatcher();
    await d.dispatch('status', {});
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project Status'));
  });
});
