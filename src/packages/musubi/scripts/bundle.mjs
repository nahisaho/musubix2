import { build } from 'esbuild';
import { readdirSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');
const distDir = resolve(pkgDir, 'dist');

// Only bundle if dist/ exists (tsc must run first)
if (!existsSync(distDir)) {
  console.error('dist/ not found — run tsc first');
  process.exit(1);
}

const entryPoints = ['index.js', 'cli.js']
  .map(f => resolve(distDir, f))
  .filter(f => existsSync(f));

for (const entry of entryPoints) {
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: entry,
    allowOverwrite: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    // Keep node built-ins external
    external: [
      'node:*',
      'fs', 'path', 'os', 'child_process', 'http', 'https',
      'readline', 'crypto', 'stream', 'url', 'util', 'events',
      'buffer', 'net', 'tls', 'dns', 'zlib', 'assert',
      'typescript',
    ],
    // Suppress warnings for dynamic require
    logLevel: 'warning',
  });
}

console.log('✓ Bundled dist/ with esbuild (all @musubix2/* inlined)');

// ── Copy template assets to dist/templates/ ────────────────────────────────
const srcTemplates = resolve(pkgDir, 'src', 'templates');
const distTemplates = resolve(distDir, 'templates');
if (existsSync(srcTemplates)) {
  mkdirSync(distTemplates, { recursive: true });
  cpSync(srcTemplates, distTemplates, { recursive: true });
  console.log('✓ Copied templates to dist/templates/');
}
