import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');
const repoGithub = resolve(pkgDir, '..', '..', '.github');
const destGithub = resolve(pkgDir, '.github');

mkdirSync(destGithub, { recursive: true });

if (existsSync(resolve(repoGithub, 'skills'))) {
  cpSync(resolve(repoGithub, 'skills'), resolve(destGithub, 'skills'), { recursive: true });
}

if (existsSync(resolve(repoGithub, 'copilot-instructions.md'))) {
  cpSync(resolve(repoGithub, 'copilot-instructions.md'), resolve(destGithub, 'copilot-instructions.md'));
}

console.log('✓ Copied .github assets for packaging');
