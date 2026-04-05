import { describe, it, expect } from 'vitest';
import { ConfigLoader, DEFAULT_CONFIG } from '../../src/config/index.js';
import { ActionableError } from '../../src/error/index.js';
import { join } from 'node:path';

describe('REQ-ARC-004: ConfigLoader', () => {
  it('should load config from project root', async () => {
    const loader = new ConfigLoader(join(import.meta.dirname, '../../../..'));
    const config = await loader.load();
    expect(config.steeringDir).toBe('steering');
    expect(config.storageDir).toBe('storage');
    expect(config.integration.confidenceThreshold).toBe(0.85);
  });

  it('should merge with defaults', async () => {
    const loader = new ConfigLoader(join(import.meta.dirname, '../../../..'));
    const config = await loader.load();
    expect(config.llm.provider).toBeDefined();
    expect(config.knowledge.basePath).toBeDefined();
  });

  it('should throw ActionableError for missing config', async () => {
    const loader = new ConfigLoader('/tmp/nonexistent-dir');
    try {
      await loader.load();
      expect.fail('should have thrown');
    } catch (error) {
      expect(ActionableError.isActionableError(error)).toBe(true);
      expect((error as ActionableError).code).toBe('CONFIG_MISSING');
    }
  });

  it('should return defaults when not loaded', () => {
    const loader = new ConfigLoader();
    const config = loader.getConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('should have specs paths in DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG.specs).toBeDefined();
    expect(DEFAULT_CONFIG.specs.basePath).toBe('storage/specs');
    expect(DEFAULT_CONFIG.specs.requirements).toBe('storage/specs/requirements');
    expect(DEFAULT_CONFIG.specs.designs).toBe('storage/specs/designs');
    expect(DEFAULT_CONFIG.specs.plans).toBe('storage/specs/plans');
    expect(DEFAULT_CONFIG.specs.reviews).toBe('storage/specs/reviews');
  });

  it('should merge specs with defaults when config has no specs key', async () => {
    const loader = new ConfigLoader(join(import.meta.dirname, '../../../..'));
    const config = await loader.load();
    expect(config.specs).toBeDefined();
    expect(config.specs.basePath).toBe('storage/specs');
    expect(config.specs.requirements).toBe('storage/specs/requirements');
  });
});
