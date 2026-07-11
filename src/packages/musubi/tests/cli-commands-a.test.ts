/**
 * Tests for Group A CLI command handlers (requirements, design, codegen).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleReqValidate,
  handleReqWizard,
  handleDesignGenerate,
  handleDesignC4,
  handleDesignVerify,
  handleCodegen,
  handleTestGen,
  handleReqInterview,
  createCLIDispatcher,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = join(import.meta.dirname ?? '.', '__fixtures_a__');

beforeEach(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ── handleReqValidate ──────────────────────────────────────────────────────

describe('handleReqValidate', () => {
  it('returns SUCCESS for valid requirements file', async () => {
    const file = join(FIXTURE_DIR, 'reqs.md');
    writeFileSync(
      file,
      [
        '# Requirements',
        '',
        '## REQ-AUT-001: System Login',
        '**要件**:',
        'WHEN the user enters valid credentials, THE system SHALL grant access.',
        '',
      ].join('\n'),
    );
    const code = await handleReqValidate(file);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('returns GENERAL_ERROR for missing file', async () => {
    const code = await handleReqValidate(join(FIXTURE_DIR, 'nonexistent.md'));
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('returns SUCCESS for file with no requirements', async () => {
    const file = join(FIXTURE_DIR, 'empty.md');
    writeFileSync(file, '# Nothing here\n');
    const code = await handleReqValidate(file);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(console.log).toHaveBeenCalledWith('No requirements found in file');
  });

  // v0.5.71 — duplicate requirement IDs break traceability and must be flagged.
  it('flags duplicate requirement IDs (VALIDATION_ERROR)', async () => {
    const file = join(FIXTURE_DIR, 'dupe.md');
    writeFileSync(
      file,
      '## REQ-DUP-001: A\nTHE system SHALL a.\n## REQ-DUP-001: B\nTHE system SHALL b.\n',
    );
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      const code = await handleReqValidate(file);
      expect(code).toBe(ExitCode.VALIDATION_ERROR);
      expect(logs.join('\n')).toContain('Duplicate requirement ID "REQ-DUP-001"');
    } finally {
      spy.mockRestore();
    }
  });

  // v0.5.64 — the diagnostic hint reflects the real rule (2–6 letter domain).
  it('diagnoses a malformed id with the correct 2–6 letter hint', async () => {
    const file = join(FIXTURE_DIR, 'malformed.md');
    writeFileSync(file, '## REQ-X-1: x\n**要件**: THE system SHALL x.\n');
    const errs: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((m?: unknown) => { errs.push(String(m)); });
    try {
      await handleReqValidate(file);
      const out = errs.join('\n');
      expect(out).toContain('2–6 letter domain code');
      expect(out).not.toContain('3-letter');
    } finally {
      spy.mockRestore();
    }
  });
});

// ── handleReqInterview ─────────────────────────────────────────────────────

describe('handleReqInterview persistence', () => {
  // v0.5.74 — the 1問1答 flow must survive across separate CLI invocations
  // (each a fresh process), so state persists to .musubix/interview.json.
  it('persists interview state across separate calls', async () => {
    const dir = join(FIXTURE_DIR, 'iv');
    mkdirSync(dir, { recursive: true });
    const prev = process.cwd();
    process.chdir(dir);
    try {
      await handleReqInterview({ args: ['A todo app for teams'] }); // start (own process sim)
      const logs: string[] = [];
      const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
      try {
        await handleReqInterview({ state: true }); // a "new process" reads persisted state
      } finally {
        spy.mockRestore();
      }
      const out = logs.join('\n');
      expect(out).toContain('Answered:');
      expect(out).not.toContain('Completion: 0%'); // progress survived, not reset
      // reset clears it.
      await handleReqInterview({ reset: true });
    } finally {
      process.chdir(prev);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── handleReqWizard ────────────────────────────────────────────────────────

describe('handleReqWizard', () => {
  it('returns SUCCESS and prints wizard steps', async () => {
    const code = await handleReqWizard();
    expect(code).toBe(ExitCode.SUCCESS);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Requirements Creation Wizard'),
    );
  });
});

// ── handleDesignGenerate ───────────────────────────────────────────────────

describe('handleDesignGenerate', () => {
  it('returns SUCCESS for valid requirements file', async () => {
    const file = join(FIXTURE_DIR, 'reqs-design.md');
    writeFileSync(
      file,
      [
        '# Requirements',
        '',
        '## REQ-001: Login',
        '',
        '> The system shall authenticate users via password.',
        '',
      ].join('\n'),
    );
    const code = await handleDesignGenerate(file);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('returns GENERAL_ERROR for missing file', async () => {
    const code = await handleDesignGenerate(join(FIXTURE_DIR, 'nope.md'));
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // v0.5.45 — the printed design now includes responsibilities, components and methods.
  it('prints responsibilities, components and derived methods', async () => {
    const file = join(FIXTURE_DIR, 'reqs-detail.md');
    writeFileSync(file, '## REQ-USR-001: User Registration\n**要件**: THE system SHALL create a user account.\n');
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleDesignGenerate(file)).toBe(ExitCode.SUCCESS);
      const out = logs.join('\n');
      expect(out).toContain('Responsibilities:');
      expect(out).toContain('Components:');
      expect(out).toContain('createUserAccount');
    } finally {
      spy.mockRestore();
    }
  });
});

// ── handleDesignC4 ─────────────────────────────────────────────────────────

describe('handleDesignC4', () => {
  it('returns SUCCESS for valid C4 model JSON', async () => {
    const file = join(FIXTURE_DIR, 'c4.json');
    writeFileSync(
      file,
      JSON.stringify({
        title: 'Test System',
        elements: [
          { id: 'sys', name: 'System', type: 'system', description: 'Main system' },
        ],
        relationships: [],
      }),
    );
    const code = await handleDesignC4(file, 'context');
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('returns GENERAL_ERROR for invalid JSON', async () => {
    const file = join(FIXTURE_DIR, 'bad.json');
    writeFileSync(file, '{ invalid }');
    const code = await handleDesignC4(file);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // v0.5.73 — --format plantuml is honored (was always Mermaid); bad format errors.
  it('emits PlantUML when --format plantuml is requested', async () => {
    const file = join(FIXTURE_DIR, 'c4fmt.json');
    writeFileSync(file, JSON.stringify({
      title: 'Sys', elements: [{ id: 'sys', name: 'System', type: 'system', description: 'x' }], relationships: [],
    }));
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleDesignC4(file, 'context', 'plantuml')).toBe(ExitCode.SUCCESS);
      expect(logs.join('\n')).toContain('@startuml');
    } finally {
      spy.mockRestore();
    }
    expect(await handleDesignC4(file, 'context', 'svg')).toBe(ExitCode.VALIDATION_ERROR);
  });

  // v0.5.40 — dogfooding: accept Markdown requirements, not only JSON models.
  it('derives a C4 model from a Markdown requirements file', async () => {
    const file = join(FIXTURE_DIR, 'reqs-c4.md');
    writeFileSync(file, '## REQ-AUT-001: Auth\n**要件**: The system shall authenticate.\n');
    expect(await handleDesignC4(file, 'container')).toBe(ExitCode.SUCCESS);
  });

  it('returns VALIDATION_ERROR for non-JSON, non-requirements input', async () => {
    const file = join(FIXTURE_DIR, 'plain-c4.txt');
    writeFileSync(file, 'just some prose, no model and no requirements');
    expect(await handleDesignC4(file)).toBe(ExitCode.VALIDATION_ERROR);
  });

  // v0.5.42 — SDD pipeline: `design generate --out` writes an artifact that
  // both `design verify` and `design:c4` consume.
  it('design generate --out writes an artifact usable by verify and c4', async () => {
    const reqs = join(FIXTURE_DIR, 'e2e-reqs.md');
    writeFileSync(reqs, '## REQ-AUT-001: Auth\n**要件**: The system shall authenticate users.\n');
    const out = join(FIXTURE_DIR, 'e2e-design.json');
    expect(await handleDesignGenerate(reqs, out)).toBe(ExitCode.SUCCESS);
    expect(existsSync(out)).toBe(true);
    expect(await handleDesignVerify(out)).toBe(ExitCode.SUCCESS); // reads sections
    expect(await handleDesignC4(out, 'container')).toBe(ExitCode.SUCCESS); // reads elements
  });
});

// ── handleDesignVerify ─────────────────────────────────────────────────────

describe('handleDesignVerify', () => {
  it('returns SUCCESS for a well-structured design', async () => {
    const file = join(FIXTURE_DIR, 'design.json');
    writeFileSync(
      file,
      JSON.stringify({
        id: 'DES-001',
        title: 'Good Design',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        sections: [
          {
            id: 'SEC-1',
            title: 'Auth',
            requirementIds: ['REQ-001'],
            description: 'Auth module',
            interfaces: ['IAuth'],
            patterns: ['factory'],
          },
        ],
      }),
    );
    const code = await handleDesignVerify(file);
    expect([ExitCode.SUCCESS, ExitCode.VALIDATION_ERROR]).toContain(code);
  });

  it('returns GENERAL_ERROR for missing file', async () => {
    const code = await handleDesignVerify(join(FIXTURE_DIR, 'nope.json'));
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('guides the user (VALIDATION_ERROR) when given Markdown instead of design JSON', async () => {
    const md = join(FIXTURE_DIR, 'reqs.md');
    writeFileSync(md, '# Reqs\n\n## REQ-AUT-001: Login\nTHE system SHALL authenticate users.\n');
    const code = await handleDesignVerify(md);
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('is not a design JSON artifact'));
  });
});

// ── handleCodegen ──────────────────────────────────────────────────────────

describe('handleCodegen', () => {
  it('returns SUCCESS and prints generated code', async () => {
    const code = await handleCodegen('UserService', 'class');
    expect(code).toBe(ExitCode.SUCCESS);
    expect(console.log).toHaveBeenCalled();
  });

  it('returns SUCCESS for interface template type', async () => {
    const code = await handleCodegen('IUserRepo', 'interface');
    expect(code).toBe(ExitCode.SUCCESS);
  });

  // v0.5.72 — an unknown --type must error, not print `undefined`.
  it('rejects an unknown template type', async () => {
    const code = await handleCodegen('Foo', 'bogus');
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown --type'));
  });

  // v0.5.72 — a path-like arg that doesn't exist is a mistyped file, not a class.
  it('errors on a nonexistent path-like argument', async () => {
    const code = await handleCodegen('/no/such/file.md', 'class');
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('File not found'));
  });

  // v0.5.74 — --out must create missing parent directories.
  it('creates parent directories for --out', async () => {
    const nested = join(FIXTURE_DIR, 'aa', 'bb', 'cc', 'out.ts');
    const code = await handleCodegen('Widget', 'class', nested);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(existsSync(nested)).toBe(true);
  });

  // v0.5.73 — a reserved word as a name must not emit `class class {`.
  it('sanitizes a reserved word used as a name', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleCodegen('class', 'class')).toBe(ExitCode.SUCCESS);
      const out = logs.join('\n');
      expect(out).toContain('class class_');
      expect(out).not.toMatch(/\bclass class\s*\{/); // never the bare reserved word
    } finally {
      spy.mockRestore();
    }
  });

  // v0.5.43 — pipeline: codegen consumes design artifacts / requirements files.
  it('generates a skeleton per requirement from a Markdown file', async () => {
    const file = join(FIXTURE_DIR, 'codegen-reqs.md');
    writeFileSync(file, '## REQ-AUT-001: Authentication\n**要件**: shall authenticate.\n');
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleCodegen(file)).toBe(ExitCode.SUCCESS);
      expect(logs.join('\n')).toContain('class Authentication');
    } finally {
      spy.mockRestore();
    }
  });

  it('sanitizes an invalid name into a valid identifier', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleCodegen('my service', 'class')).toBe(ExitCode.SUCCESS);
      expect(logs.join('\n')).toContain('class MyService');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns VALIDATION_ERROR for a file with no components/requirements', async () => {
    const file = join(FIXTURE_DIR, 'codegen-empty.md');
    writeFileSync(file, '# Just a heading\nno requirements here');
    expect(await handleCodegen(file)).toBe(ExitCode.VALIDATION_ERROR);
  });

  // v0.5.45 — codegen derives method stubs from the requirement's SHALL clause.
  it('generates a method per requirement instead of an empty class', async () => {
    const file = join(FIXTURE_DIR, 'codegen-methods.md');
    writeFileSync(
      file,
      '## REQ-USR-001: User Registration\n**要件**: WHEN a visitor signs up, THE system SHALL create a user account.\n',
    );
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleCodegen(file)).toBe(ExitCode.SUCCESS);
      const out = logs.join('\n');
      expect(out).toContain('createUserAccount(');
      expect(out).toContain("throw new Error('Not implemented')");
    } finally {
      spy.mockRestore();
    }
  });

  // v0.5.46 — codegen infers a return type and can write to a file for test:gen.
  it('infers a return type and writes the skeleton to --out', async () => {
    const reqs = join(FIXTURE_DIR, 'codegen-out-reqs.md');
    const out = join(FIXTURE_DIR, 'codegen-out.ts');
    writeFileSync(reqs, '## REQ-USR-002: User Login\n**要件**: THE system SHALL issue a session token.\n');
    expect(await handleCodegen(reqs, 'class', out)).toBe(ExitCode.SUCCESS);
    expect(existsSync(out)).toBe(true);
    const written = readFileSync(out, 'utf-8');
    expect(written).toContain('issueSessionToken(): SessionToken');
    // The written file must be consumable by test:gen (round-trip).
    expect(await handleTestGen(out)).toBe(ExitCode.SUCCESS);
  });

  // v0.5.49 — generated code carries a traceability comment so `trace` can link
  // it back to the requirement (design→codegen→trace chain).
  it('emits an "Implements: REQ-…" traceability comment', async () => {
    const reqs = join(FIXTURE_DIR, 'codegen-trace-reqs.md');
    const design = join(FIXTURE_DIR, 'codegen-trace-design.json');
    const out = join(FIXTURE_DIR, 'codegen-trace.ts');
    writeFileSync(reqs, '## REQ-AUTH-001: Authenticate\n**要件**: THE system SHALL validate credentials.\n');
    await handleDesignGenerate(reqs, design);
    expect(await handleCodegen(design, 'class', out)).toBe(ExitCode.SUCCESS);
    const written = readFileSync(out, 'utf-8');
    expect(written).toContain('// Implements: REQ-AUTH-001');
  });

  it('emits a traceability comment when generating from requirements directly', async () => {
    const reqs = join(FIXTURE_DIR, 'codegen-trace-md.md');
    writeFileSync(reqs, '## REQ-TSK-001: Create Task\n**要件**: THE system SHALL create a task.\n');
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleCodegen(reqs)).toBe(ExitCode.SUCCESS);
      expect(logs.join('\n')).toContain('// Implements: REQ-TSK-001');
    } finally {
      spy.mockRestore();
    }
  });

  // v0.5.57 — a design section's detected pattern scaffolds the generated class.
  it('scaffolds a Feature Toggle from a WHERE design section', async () => {
    const reqs = join(FIXTURE_DIR, 'codegen-pat-reqs.md');
    const design = join(FIXTURE_DIR, 'codegen-pat-design.json');
    const out = join(FIXTURE_DIR, 'codegen-pat.ts');
    writeFileSync(reqs, '## REQ-ECO-001: Eco Mode\n**要件**: WHERE eco mode is enabled, THE system SHALL lower the target.\n');
    await handleDesignGenerate(reqs, design);
    expect(await handleCodegen(design, 'class', out)).toBe(ExitCode.SUCCESS);
    const code = readFileSync(out, 'utf-8');
    expect(code).toContain('private readonly enabled: boolean = false');
    expect(code).toContain('if (!this.enabled)');
  });

  // v0.5.59 — a cohesive multi-operation service is generated with an extracted
  // interface, and inferred entity return types get placeholder declarations so
  // the file type-checks. A single-method domain stays concrete.
  it('extracts an interface for a multi-operation service and stubs entity types', async () => {
    const reqs = join(FIXTURE_DIR, 'codegen-iface-reqs.md');
    const design = join(FIXTURE_DIR, 'codegen-iface-design.json');
    const out = join(FIXTURE_DIR, 'codegen-iface.ts');
    writeFileSync(
      reqs,
      [
        '## REQ-PAY-001: Charge',
        '**要件**: THE system SHALL charge a card.',
        '## REQ-PAY-002: Token',
        '**要件**: THE system SHALL issue a session token.',
        '## REQ-AUTH-001: Verify',
        '**要件**: THE system SHALL validate the token.',
      ].join('\n'),
    );
    await handleDesignGenerate(reqs, design);
    expect(await handleCodegen(design, 'class', out)).toBe(ExitCode.SUCCESS);
    const code = readFileSync(out, 'utf-8');
    // PAY has two operations → interface + implements.
    expect(code).toContain('export interface IPayService {');
    expect(code).toContain('implements IPayService');
    // "issue a session token" → SessionToken return type gets a stub.
    expect(code).toContain('export interface SessionToken {');
    // AUTH has one operation → concrete, no interface.
    expect(code).not.toContain('interface IVerifyService');
  });

  // v0.5.45 — codegen prefers a design document's components (which carry methods).
  it('generates classes with methods from a design artifact', async () => {
    const reqs = join(FIXTURE_DIR, 'codegen-design-reqs.md');
    const design = join(FIXTURE_DIR, 'codegen-design.json');
    writeFileSync(reqs, '## REQ-USR-002: User Login\n**要件**: THE system SHALL issue a session token.\n');
    await handleDesignGenerate(reqs, design);
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    try {
      expect(await handleCodegen(design)).toBe(ExitCode.SUCCESS);
      const out = logs.join('\n');
      expect(out).toContain('class UserLoginService');
      expect(out).toContain('issueSessionToken(');
    } finally {
      spy.mockRestore();
    }
  });
});

// ── handleTestGen ──────────────────────────────────────────────────────────

describe('handleTestGen', () => {
  it('returns SUCCESS for a source file', async () => {
    const file = join(FIXTURE_DIR, 'sample.ts');
    writeFileSync(
      file,
      [
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
      ].join('\n'),
    );
    const code = await handleTestGen(file);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(console.log).toHaveBeenCalled();
  });

  it('returns GENERAL_ERROR for missing file', async () => {
    const code = await handleTestGen(join(FIXTURE_DIR, 'nope.ts'));
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  // A Markdown requirements file is not source: the extension filter now applies
  // to explicitly-named files, so it is rejected with guidance rather than
  // silently producing a meaningless stub.
  it('rejects a Markdown file (not source) with guidance', async () => {
    const md = join(FIXTURE_DIR, 'reqs-for-test-gen.md');
    writeFileSync(md, '## REQ-AUT-001: Login\nTHE system SHALL authenticate users.\n');
    const code = await handleTestGen(md);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('TS/JS only'));
  });

  // v0.5.85 — test:gen only understands TS/JS; a Python file must be rejected
  // clearly rather than getting a misleading generic Vitest stub.
  it('rejects a non-TS/JS source file (Python) with a clear message', async () => {
    const py = join(FIXTURE_DIR, 'calc.py');
    writeFileSync(py, 'def add(a, b):\n    return a + b\n');
    const code = await handleTestGen(py);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('TS/JS only'));
  });

  // ISSUE-15: a directory argument must not crash with EISDIR.
  it('accepts a directory and generates per-file skeletons', async () => {
    const sub = join(FIXTURE_DIR, 'srcdir');
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(sub, 'a.ts'), 'export function a() { return 1; }\n');
    writeFileSync(join(sub, 'b.ts'), 'export function b() { return 2; }\n');
    const code = await handleTestGen(sub);
    expect(code).toBe(ExitCode.SUCCESS);
    const printed = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(printed).toContain('a.ts');
    expect(printed).toContain('b.ts');
  });
});

// ── Dispatcher integration ─────────────────────────────────────────────────

describe('Group A dispatcher integration', () => {
  it('dispatches req command with file arg', async () => {
    const file = join(FIXTURE_DIR, 'disp-reqs.md');
    writeFileSync(
      file,
      [
        '# Reqs',
        '',
        '## REQ-SYS-001: Test',
        '**要件**:',
        'THE system SHALL work.',
        '',
      ].join('\n'),
    );
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['req', file]);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('dispatches req:wizard command', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['req:wizard']);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  it('dispatches codegen command', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['codegen', 'MyClass', '--type', 'class']);
    expect(code).toBe(ExitCode.SUCCESS);
  });

  // v0.5.69 — codegen emits TypeScript only; an unsupported --lang must be
  // rejected rather than silently emitting TS.
  it('rejects codegen --lang for a non-TypeScript language', async () => {
    const dispatcher = createCLIDispatcher();
    expect(await dispatcher.run(['codegen', 'MyClass', '--lang', 'python'])).toBe(ExitCode.VALIDATION_ERROR);
    // typescript (and no flag) still work.
    expect(await dispatcher.run(['codegen', 'MyClass', '--lang', 'typescript'])).toBe(ExitCode.SUCCESS);
  });

  // v0.5.83 — `--out` with no value (parses to boolean true) must not crash the
  // fs write with a raw ERR_INVALID_ARG_TYPE.
  it('does not crash when --out is given with no filename', async () => {
    const dispatcher = createCLIDispatcher();
    expect(await dispatcher.run(['codegen', 'MyClass', '--out'])).toBe(ExitCode.SUCCESS);
  });
});

// ── v0.5.1 fixes: verb tolerance, exit-code propagation, parser diagnostic ──

describe('v0.5.1 CLI fixes', () => {
  function writeReqFixture(name: string): string {
    const file = join(FIXTURE_DIR, name);
    writeFileSync(
      file,
      [
        '## REQ-AUT-001: Login',
        '**要件**:',
        'WHEN a user signs in, THE system SHALL issue a token.',
        '',
      ].join('\n'),
    );
    return file;
  }

  it('tolerates documented `requirements analyze <file>` alias form', async () => {
    const file = writeReqFixture('alias.md');
    const dispatcher = createCLIDispatcher();
    expect(await dispatcher.run(['requirements', 'analyze', file])).toBe(ExitCode.SUCCESS);
    expect(await dispatcher.run(['requirements', 'validate', file])).toBe(ExitCode.SUCCESS);
  });

  it('tolerates documented `design generate <file>` verb form', async () => {
    const file = writeReqFixture('design.md');
    const dispatcher = createCLIDispatcher();
    expect(await dispatcher.run(['design', 'generate', file])).toBe(ExitCode.SUCCESS);
  });

  it('tolerates documented `codegen generate <name>` verb form', async () => {
    const dispatcher = createCLIDispatcher();
    expect(await dispatcher.run(['codegen', 'generate', 'TaskService'])).toBe(ExitCode.SUCCESS);
  });

  it('propagates non-zero exit code when a handler fails (design ENOENT)', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['design', 'generate', join(FIXTURE_DIR, 'missing.md')]);
    expect(code).toBe(ExitCode.GENERAL_ERROR);
  });

  it('returns VALIDATION_ERROR for a missing required argument (tasks list)', async () => {
    const dispatcher = createCLIDispatcher();
    const code = await dispatcher.run(['tasks', 'list']);
    expect(code).not.toBe(ExitCode.SUCCESS);
  });

  it('flags REQ- tokens that are not in parseable heading form', async () => {
    const file = join(FIXTURE_DIR, 'listform.md');
    writeFileSync(file, '- REQ-001: THE system SHALL do things.\n');
    const code = await handleReqValidate(file);
    expect(code).toBe(ExitCode.VALIDATION_ERROR);
  });
});
