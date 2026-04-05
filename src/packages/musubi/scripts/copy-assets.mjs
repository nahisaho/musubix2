/**
 * P0-02 / DES-SKL-001: Copy .github and .claude assets for npm packaging.
 * Runs as part of prepublishOnly.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');
const repoRoot = resolve(pkgDir, '..', '..');

// ── .github assets ─────────────────────────────────────────────────────────
const repoGithub = resolve(repoRoot, '.github');
const destGithub = resolve(pkgDir, '.github');

mkdirSync(destGithub, { recursive: true });

if (existsSync(resolve(repoGithub, 'skills'))) {
  cpSync(resolve(repoGithub, 'skills'), resolve(destGithub, 'skills'), { recursive: true });
}
if (existsSync(resolve(repoGithub, 'copilot-instructions.md'))) {
  cpSync(resolve(repoGithub, 'copilot-instructions.md'), resolve(destGithub, 'copilot-instructions.md'));
}

// ── .claude assets ─────────────────────────────────────────────────────────
const destClaude = resolve(pkgDir, '.claude');

// Always generate .claude/skills from .github/skills (same content, different path)
const githubSkills = resolve(destGithub, 'skills');
const claudeSkills = resolve(destClaude, 'skills');

if (existsSync(githubSkills)) {
  cpSync(githubSkills, claudeSkills, { recursive: true });
}

// Add .musubix-managed marker for circular detection (REQ-INS-002)
import { writeFileSync } from 'node:fs';
writeFileSync(
  resolve(destClaude, '.musubix-managed'),
  JSON.stringify({ generator: 'musubix2', version: '0.4.0', timestamp: new Date().toISOString() }),
);

console.log('✓ Copied .github and .claude assets for packaging');
