import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ProjectInitializer,
  createProjectInitializer,
} from '../../src/project/index.js';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('DES-SDD-005: ProjectInitializer', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'musubix-init-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('actually writes the default template files to disk', () => {
    const pi = new ProjectInitializer();
    const out = join(dir, 'proj');
    const result = pi.init({ projectName: 'my-project', template: 'default', outputDir: out });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    // Files exist on disk (not merely planned).
    expect(existsSync(join(out, 'steering/product.ja.md'))).toBe(true);
    expect(existsSync(join(out, 'steering/rules/constitution.md'))).toBe(true);
    expect(existsSync(join(out, 'musubix.config.json'))).toBe(true);
    // Directory placeholders are created.
    expect(existsSync(join(out, 'storage/specs/requirements'))).toBe(true);
    expect(existsSync(join(out, 'storage/specs/designs'))).toBe(true);
    expect(existsSync(join(out, 'storage/specs/plans'))).toBe(true);
    expect(existsSync(join(out, 'storage/specs/reviews'))).toBe(true);
  });

  it('writes a config JSON carrying the project name', () => {
    const pi = new ProjectInitializer();
    const out = join(dir, 'named');
    pi.init({ projectName: 'AcmeApp', template: 'default', outputDir: out });
    const cfg = JSON.parse(readFileSync(join(out, 'musubix.config.json'), 'utf-8'));
    expect(cfg.name).toBe('AcmeApp');
    expect(cfg.sdd.specsDir).toBe('storage/specs');
  });

  it('generates fewer files for the minimal template than full', () => {
    const pi = new ProjectInitializer();
    const minimal = pi.init({ projectName: 'proj', template: 'minimal', outputDir: join(dir, 'a') });
    const full = pi.init({ projectName: 'proj', template: 'full', outputDir: join(dir, 'b') });
    expect(minimal.createdFiles.length).toBeLessThan(full.createdFiles.length);
  });

  it('does not overwrite an existing file unless overwrite is set', () => {
    const pi = new ProjectInitializer();
    const out = join(dir, 'existing');
    pi.init({ projectName: 'proj', template: 'default', outputDir: out });
    const custom = '# my edited product doc\n';
    writeFileSync(join(out, 'steering/product.ja.md'), custom);

    // Re-run without overwrite → the edit is preserved.
    pi.init({ projectName: 'proj', template: 'default', outputDir: out });
    expect(readFileSync(join(out, 'steering/product.ja.md'), 'utf-8')).toBe(custom);

    // Re-run with overwrite → the file is reset to the template.
    pi.init({ projectName: 'proj', template: 'default', outputDir: out, overwrite: true });
    expect(readFileSync(join(out, 'steering/product.ja.md'), 'utf-8')).not.toBe(custom);
  });

  it('includes storage/specs subdirectories in every template', () => {
    const pi = new ProjectInitializer();
    for (const template of ['minimal', 'default', 'full'] as const) {
      const out = join(dir, template);
      pi.init({ projectName: 'proj', template, outputDir: out });
      for (const sub of ['requirements', 'designs', 'plans', 'reviews']) {
        expect(existsSync(join(out, 'storage/specs', sub))).toBe(true);
      }
    }
  });

  it('rejects an empty project name without writing anything', () => {
    const pi = new ProjectInitializer();
    const out = join(dir, 'empty');
    const result = pi.init({ projectName: '', template: 'default', outputDir: out });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(existsSync(out)).toBe(false);
  });

  it('rejects an invalid project name', () => {
    const pi = new ProjectInitializer();
    const check = pi.validateProjectName('123-bad');
    expect(check.valid).toBe(false);
    expect(check.error).toBeDefined();
  });

  it('accepts a valid project name', () => {
    const pi = new ProjectInitializer();
    const check = pi.validateProjectName('my-project-2');
    expect(check.valid).toBe(true);
    expect(check.error).toBeUndefined();
  });

  it('lists the available templates', () => {
    const pi = new ProjectInitializer();
    const templates = pi.getTemplates();
    expect(templates).toHaveLength(3);
    expect(templates.map((t) => t.name)).toEqual(expect.arrayContaining(['default', 'minimal', 'full']));
  });

  it('is created by the factory function', () => {
    expect(createProjectInitializer()).toBeInstanceOf(ProjectInitializer);
  });
});
