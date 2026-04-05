/**
 * P1-02 / DES-CFG-001: Resolve package root from import.meta.url.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export class PackageRootLocator {
  resolve(importMetaUrl: string): string {
    const thisFile = fileURLToPath(importMetaUrl);
    let dir = dirname(thisFile);
    for (let i = 0; i < 10; i++) {
      if (existsSync(resolve(dir, 'package.json'))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return dir;
  }
}
