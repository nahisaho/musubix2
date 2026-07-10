import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleReqValidate,
  handleDesignGenerate,
  handleCodegen,
  handleVerify,
  handleTrace,
  handleTestGen,
} from '../src/cli.js';
import { ExitCode } from '@musubix2/core';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// v0.5.56 — a full requirements → design → codegen → verify → trace run that
// locks in the invariants established by the E2E dogfoods (0.5.49–0.5.55):
// domain cohesion, traceability comments, symbol-level impact coupling, and —
// critically — the SMT semantics for the awkward requirement structures
// (WHERE + SHALL NOT, IF-THEN, bare SHALL NOT).

const REQS = [
  '# Access Control Requirements',
  '',
  '## REQ-ACC-001: Default Deny',
  '**要件**: THE system SHALL deny access by default.',
  '## REQ-ACC-002: Admin Access',
  '**要件**: WHERE the user has the admin role, THE system SHALL grant full access.',
  '## REQ-ACC-003: Least Privilege',
  '**要件**: THE system SHALL NOT grant permissions beyond the role.',
  '## REQ-PERM-001: Hide Resource',
  '**要件**: WHERE the user lacks permission, THE system SHALL NOT expose the resource.',
  '## REQ-AUD-001: Audit Unauthorized',
  '**要件**: IF an unauthorized request arrives, THEN THE system SHALL record an audit event.',
  '## REQ-SESS-001: Refresh On Change',
  '**要件**: WHILE a session is active, WHEN permissions change, THE system SHALL refresh the token.',
  '',
].join('\n');

describe('SDD pipeline — end to end (RBAC domain)', () => {
  let dir: string;
  let logs: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let reqsFile: string;
  let designFile: string;
  let srcDir: string;
  let srcFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'musubix-pipeline-'));
    srcDir = join(dir, 'src');
    mkdirSync(srcDir, { recursive: true });
    reqsFile = join(dir, 'reqs.md');
    designFile = join(dir, 'design.json');
    srcFile = join(srcDir, 'impl.ts');
    writeFileSync(reqsFile, REQS);
    logs = [];
    logSpy = vi.spyOn(console, 'log').mockImplementation((m?: unknown) => { logs.push(String(m)); });
    errSpy = vi.spyOn(console, 'error').mockImplementation((m?: unknown) => { logs.push(String(m)); });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  const out = (): string => logs.join('\n');

  it('runs requirements → design → codegen → verify → trace with correct semantics', async () => {
    // 1. Requirements analysis — confidence is rounded, not a float tail.
    expect(await handleReqValidate(reqsFile)).toBe(ExitCode.SUCCESS);
    expect(out()).toMatch(/REQ-ACC-002: pattern=optional/);
    expect(out()).not.toMatch(/confidence=0\.\d{5}/); // e.g. 0.95000000001

    // 2. Design — the ACC domain (3 requirements) coheres into one service,
    //    and the WHERE requirement contributes a Feature Toggle pattern.
    expect(await handleDesignGenerate(reqsFile, designFile)).toBe(ExitCode.SUCCESS);
    const design = JSON.parse(readFileSync(designFile, 'utf-8')) as {
      sections: Array<{ requirementIds: string[]; patterns: string[]; components: Array<{ name: string; requirementIds: string[] }> }>;
    };
    const accSection = design.sections.find((s) => s.requirementIds.includes('REQ-ACC-001'))!;
    expect(accSection.components).toHaveLength(1);
    expect(accSection.components[0].name).toBe('AccService');
    expect(accSection.components[0].requirementIds).toEqual(['REQ-ACC-001', 'REQ-ACC-002', 'REQ-ACC-003']);
    expect(accSection.patterns).toContain('Feature Toggle');

    // 3. Codegen — every class carries an `// Implements: REQ-` trace comment.
    expect(await handleCodegen(designFile, 'class', srcFile)).toBe(ExitCode.SUCCESS);
    const code = readFileSync(srcFile, 'utf-8');
    expect(code).toContain('// Implements: REQ-ACC-001');
    expect(code).toContain('class AccService');

    // 4. Formal verification — the SMT must be semantically correct for each
    //    structure: WHERE+SHALL NOT is a guarded negation, IF-THEN a positive
    //    implication, and a bare SHALL NOT a negation.
    logs.length = 0;
    expect(await handleVerify(reqsFile)).toBe(ExitCode.SUCCESS);
    const smt = out();
    expect(smt).toContain('(=> the_user_lacks_permission (not expose_the_resource))'); // WHERE + SHALL NOT
    expect(smt).toContain('(=> an_unauthorized_request_arrives record_an_audit_event)'); // IF-THEN (positive)
    expect(smt).toMatch(/\(assert \(not grant_permissions_beyond_the_role\)\)/); // bare SHALL NOT
    expect(smt).toContain('consistent');

    // 5. Traceability — full coverage and symbol-level coupling.
    logs.length = 0;
    expect(await handleTrace('matrix', [], { specs: reqsFile, src: srcDir })).toBe(ExitCode.SUCCESS);
    expect(out()).toContain('100%');

    logs.length = 0;
    expect(await handleTrace('impact', ['REQ-ACC-001'], { specs: reqsFile, src: srcDir })).toBe(ExitCode.SUCCESS);
    const impact = out();
    expect(impact).toContain('AccService');
    expect(impact).toContain('REQ-ACC-002'); // coupled — same service
    expect(impact).toContain('REQ-ACC-003');
    expect(impact).not.toContain('REQ-PERM-001'); // different service, not coupled

    // 6. Test generation from the produced source.
    logs.length = 0;
    expect(await handleTestGen(srcFile)).toBe(ExitCode.SUCCESS);
  });
});
