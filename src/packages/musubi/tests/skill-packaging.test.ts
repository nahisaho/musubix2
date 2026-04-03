import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');
const scriptsDir = resolve(pkgDir, 'scripts');
const destGithub = resolve(pkgDir, '.github');

afterAll(() => {
  // Ensure cleanup even if tests fail
  try {
    execFileSync('node', [resolve(scriptsDir, 'clean-github-assets.mjs')], { cwd: pkgDir });
  } catch {
    // ignore
  }
});

describe('Skill packaging scripts', () => {
  it('copy script creates .github/skills/ with expected directories', () => {
    execFileSync('node', [resolve(scriptsDir, 'copy-github-assets.mjs')], { cwd: pkgDir });

    expect(existsSync(resolve(destGithub, 'skills'))).toBe(true);

    const skills = readdirSync(resolve(destGithub, 'skills'));
    expect(skills).toContain('code-generator');
    expect(skills).toContain('orchestrator');
    expect(skills).toContain('test-engineer');
    expect(skills.length).toBeGreaterThanOrEqual(8);
  });

  it('copy script copies copilot-instructions.md', () => {
    expect(existsSync(resolve(destGithub, 'copilot-instructions.md'))).toBe(true);
  });

  it('skill directories contain SKILL.md files', () => {
    const skills = readdirSync(resolve(destGithub, 'skills'));
    for (const skill of skills) {
      const skillDir = resolve(destGithub, 'skills', skill);
      const files = readdirSync(skillDir);
      expect(files).toContain('SKILL.md');
    }
  });

  it('clean script removes .github/', () => {
    execFileSync('node', [resolve(scriptsDir, 'clean-github-assets.mjs')], { cwd: pkgDir });

    expect(existsSync(destGithub)).toBe(false);
  });

  it('clean script is idempotent (no error on missing dir)', () => {
    expect(() => {
      execFileSync('node', [resolve(scriptsDir, 'clean-github-assets.mjs')], { cwd: pkgDir });
    }).not.toThrow();
  });
});
