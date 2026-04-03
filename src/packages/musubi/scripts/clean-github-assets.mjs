import { rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destGithub = resolve(__dirname, '..', '.github');

if (existsSync(destGithub)) {
  rmSync(destGithub, { recursive: true, force: true });
  console.log('✓ Cleaned .github assets after publish');
}
