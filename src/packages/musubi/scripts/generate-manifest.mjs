/**
 * P0-05 / DES-SKL-001: Generate skills-manifest.json from .github/skills and .claude/skills.
 * Runs during build to produce dist/assets/skills-manifest.json.
 */
import { readdirSync, existsSync, readFileSync, mkdirSync, writeFileSync, createHash } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash as cryptoHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');

function scanSkills(baseDir, platform) {
  const entries = [];
  if (!existsSync(baseDir)) return entries;

  const skillDirs = readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const name of skillDirs) {
    const skillDir = join(baseDir, name);
    const skillMd = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) continue;

    const content = readFileSync(skillMd, 'utf-8');
    const checksum = cryptoHash('sha256').update(content).digest('hex').slice(0, 12);

    const assetKinds = ['skill'];
    if (existsSync(join(skillDir, 'scripts'))) assetKinds.push('script');
    if (existsSync(join(skillDir, 'references'))) assetKinds.push('reference');

    entries.push({
      platform,
      skillName: name,
      sourcePath: `.${platform === 'copilot' ? '.github' : '.claude'}/skills/${name}/SKILL.md`,
      assetKinds,
      checksum,
    });
  }
  return entries;
}

const copilotSkills = scanSkills(resolve(pkgDir, '.github', 'skills'), 'copilot');
const claudeSkills = scanSkills(resolve(pkgDir, '.claude', 'skills'), 'claude');

const manifest = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  entries: [...copilotSkills, ...claudeSkills],
};

const distAssets = resolve(pkgDir, 'dist', 'assets');
mkdirSync(distAssets, { recursive: true });
writeFileSync(resolve(distAssets, 'skills-manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`✓ Generated skills-manifest.json (${manifest.entries.length} entries)`);
