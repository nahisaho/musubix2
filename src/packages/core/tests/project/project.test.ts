import { describe, it, expect } from 'vitest';
import {
  ProjectInitializer,
  createProjectInitializer,
  type InitOptions,
} from '../../src/project/index.js';

describe('DES-SDD-005: ProjectInitializer', () => {
  it('should generate file list for default template', () => {
    const pi = new ProjectInitializer();
    const result = pi.init({
      projectName: 'my-project',
      template: 'default',
      outputDir: '/out',
    });

    expect(result.success).toBe(true);
    expect(result.createdFiles.length).toBeGreaterThan(0);
    expect(result.createdFiles.some(f => f.includes('steering/product.ja.md'))).toBe(true);
    expect(result.createdFiles.some(f => f.includes('musubix.config.json'))).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should generate fewer files for minimal template', () => {
    const pi = new ProjectInitializer();
    const minimal = pi.init({ projectName: 'proj', template: 'minimal', outputDir: '/out' });
    const full = pi.init({ projectName: 'proj', template: 'full', outputDir: '/out' });

    expect(minimal.createdFiles.length).toBeLessThan(full.createdFiles.length);
  });

  it('should include .github/skills/ in full template', () => {
    const pi = new ProjectInitializer();
    const result = pi.init({ projectName: 'proj', template: 'full', outputDir: '/out' });

    expect(result.createdFiles.some(f => f.includes('.github/skills/'))).toBe(true);
  });

  it('should reject empty project name', () => {
    const pi = new ProjectInitializer();
    const result = pi.init({ projectName: '', template: 'default', outputDir: '/out' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid project name', () => {
    const pi = new ProjectInitializer();
    const check = pi.validateProjectName('123-bad');
    expect(check.valid).toBe(false);
    expect(check.error).toBeDefined();
  });

  it('should accept valid project name', () => {
    const pi = new ProjectInitializer();
    const check = pi.validateProjectName('my-project-2');
    expect(check.valid).toBe(true);
    expect(check.error).toBeUndefined();
  });

  it('should list available templates', () => {
    const pi = new ProjectInitializer();
    const templates = pi.getTemplates();

    expect(templates).toHaveLength(3);
    expect(templates.map(t => t.name)).toContain('default');
    expect(templates.map(t => t.name)).toContain('minimal');
    expect(templates.map(t => t.name)).toContain('full');
  });

  it('should be created by factory function', () => {
    const pi = createProjectInitializer();
    expect(pi).toBeInstanceOf(ProjectInitializer);
  });
});
