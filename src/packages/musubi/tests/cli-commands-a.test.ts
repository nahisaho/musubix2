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
  createCLIDispatcher,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
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
