/**
 * P1-03 / DES-SKL-001: Read skills-manifest.json and list assets by platform.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AssetEntry, SkillsManifest } from '../../domain/install/types.js';
import { PackageRootLocator } from './package-root-locator.js';

export class PackageAssetCatalog {
  private manifest: SkillsManifest | null = null;

  constructor(private readonly locator: PackageRootLocator) {}

  private load(): SkillsManifest {
    if (this.manifest) {return this.manifest;}
    const root = this.locator.resolve(import.meta.url);
    const manifestPath = resolve(root, 'dist', 'assets', 'skills-manifest.json');
    if (!existsSync(manifestPath)) {
      return { version: '1.0', generatedAt: '', entries: [] };
    }
    this.manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as SkillsManifest;
    return this.manifest;
  }

  async list(platform: 'copilot' | 'claude'): Promise<AssetEntry[]> {
    const m = this.load();
    return m.entries.filter(e => e.platform === platform);
  }
}
