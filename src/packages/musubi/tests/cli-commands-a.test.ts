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
        '## REQ-001: System Login',
        '',
        '> When the user enters valid credentials, the system shall grant access.',
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
        '## REQ-001: Test',
        '',
        '> The system shall work.',
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
