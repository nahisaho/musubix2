/**
 * P0-02 / DES-SKL-001: Clean staged .github and .claude assets after publish.
 */
import { rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');

for (const dir of ['.github', '.claude']) {
  const target = resolve(pkgDir, dir);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`✓ Cleaned ${dir} assets after publish`);
  }
}
