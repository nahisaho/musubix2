import { describe, it, expect } from 'vitest';
import {
  ScaffoldGenerator,
  createScaffoldGenerator,
  type ScaffoldConfig,
  type ScaffoldMode,
} from '../../src/codegen/scaffold-generator.js';

describe('DES-COD-004: ScaffoldGenerator', () => {
  it('should create via factory function', () => {
    const gen = createScaffoldGenerator();
    expect(gen).toBeInstanceOf(ScaffoldGenerator);
  });

  it('should return available modes', () => {
    const gen = new ScaffoldGenerator();
    const modes = gen.getAvailableModes();
    expect(modes).toEqual(['minimal', 'standard', 'full']);
  });

  it('should generate minimal scaffold (package.json, tsconfig.json, src/index.ts)', () => {
    const gen = new ScaffoldGenerator();
    const files = gen.generate({
      mode: 'minimal',
      packageName: '@test/pkg',
      description: 'A test package',
      withTests: false,
      withDocs: false,
    });

    const paths = files.map(f => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('tsconfig.json');
    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('README.md');
    expect(paths).not.toContain('tests/.gitkeep');
  });

  it('should generate standard scaffold with tests/ and README.md', () => {
    const gen = new ScaffoldGenerator();
    const files = gen.generate({
      mode: 'standard',
      packageName: '@test/std',
      description: 'Standard pkg',
      withTests: true,
      withDocs: false,
    });

    const paths = files.map(f => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('README.md');
    expect(paths).toContain('tests/.gitkeep');
    expect(paths).not.toContain('.eslintrc');
  });

  it('should generate full scaffold with docs/, examples/, .eslintrc', () => {
    const gen = new ScaffoldGenerator();
    const files = gen.generate({
      mode: 'full',
      packageName: '@test/full',
      description: 'Full pkg',
      withTests: true,
      withDocs: true,
    });

    const paths = files.map(f => f.path);
    expect(paths).toContain('docs/.gitkeep');
    expect(paths).toContain('examples/.gitkeep');
    expect(paths).toContain('.eslintrc');
    expect(paths).toContain('README.md');
  });

  it('should include package name in package.json content', () => {
    const gen = new ScaffoldGenerator();
    const files = gen.generate({
      mode: 'minimal',
      packageName: '@musubix2/my-pkg',
      description: 'My package',
      withTests: false,
      withDocs: false,
    });

    const pkgFile = files.find(f => f.path === 'package.json')!;
    const parsed = JSON.parse(pkgFile.content);
    expect(parsed.name).toBe('@musubix2/my-pkg');
    expect(parsed.description).toBe('My package');
  });
});
