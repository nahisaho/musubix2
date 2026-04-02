import { describe, it, expect, beforeEach } from 'vitest';
import {
  WakePhase,
  SleepPhase,
  CycleManager,
  DEFAULT_CYCLE_CONFIG,
  createCycleManager,
  createWakePhase,
  createSleepPhase,
} from '../src/index.js';
import type { CycleConfig } from '../src/index.js';

// ---------------------------------------------------------------------------
// DES-LRN-002: WakePhase
// ---------------------------------------------------------------------------

describe('DES-LRN-002: WakePhase', () => {
  let wake: WakePhase;

  beforeEach(() => {
    wake = createWakePhase();
  });

  it('should process items and count processed', () => {
    const result = wake.process(['hello world', 'world peace']);
    expect(result.processedItems).toBe(2);
  });

  it('should extract repeated words as patterns', () => {
    const result = wake.process([
      'the quick brown fox',
      'the quick red fox',
      'the lazy brown dog',
    ]);
    expect(result.newPatterns).toContain('the');
    expect(result.newPatterns).toContain('quick');
  });

  it('should ignore short words (<=2 chars)', () => {
    const result = wake.process(['I am a cat', 'I am a dog']);
    expect(result.newPatterns.every((p) => p.length > 2)).toBe(true);
  });

  it('should return empty patterns for single unique items', () => {
    const result = wake.process(['unique']);
    expect(result.newPatterns).toHaveLength(0);
  });

  it('should include a non-negative duration', () => {
    const result = wake.process(['test data']);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-002: SleepPhase
// ---------------------------------------------------------------------------

describe('DES-LRN-002: SleepPhase', () => {
  let sleep: SleepPhase;

  beforeEach(() => {
    sleep = createSleepPhase();
  });

  it('should consolidate duplicate patterns', () => {
    const result = sleep.consolidate(['alpha', 'alpha', 'beta', 'beta']);
    expect(result.consolidatedPatterns).toBe(2);
  });

  it('should prune patterns that appear only once', () => {
    const result = sleep.consolidate(['alpha', 'alpha', 'single']);
    expect(result.prunedPatterns).toBe(1);
    expect(result.consolidatedPatterns).toBe(1);
  });

  it('should normalize to lowercase', () => {
    const result = sleep.consolidate(['Alpha', 'alpha', 'ALPHA']);
    expect(result.consolidatedPatterns).toBe(1);
    expect(result.prunedPatterns).toBe(0);
  });

  it('should skip empty strings', () => {
    const result = sleep.consolidate(['', '  ', 'valid', 'valid']);
    expect(result.consolidatedPatterns).toBe(1);
  });

  it('should include a non-negative duration', () => {
    const result = sleep.consolidate(['a', 'a']);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-002: CycleManager
// ---------------------------------------------------------------------------

describe('DES-LRN-002: CycleManager', () => {
  let manager: CycleManager;

  beforeEach(() => {
    manager = createCycleManager();
  });

  it('should start in wake phase', () => {
    expect(manager.getCurrentPhase()).toBe('wake');
  });

  it('should transition to sleep after runWake', () => {
    manager.runWake(['test']);
    expect(manager.getCurrentPhase()).toBe('sleep');
  });

  it('should transition to wake after runSleep', () => {
    manager.runWake(['test']);
    manager.runSleep(['pattern', 'pattern']);
    expect(manager.getCurrentPhase()).toBe('wake');
  });

  it('should increment cycle count on wake', () => {
    expect(manager.getCycleCount()).toBe(0);
    manager.runWake(['a']);
    expect(manager.getCycleCount()).toBe(1);
    manager.runWake(['b']);
    expect(manager.getCycleCount()).toBe(2);
  });

  it('should respect maxPatternsPerCycle', () => {
    const small = createCycleManager({ maxPatternsPerCycle: 2 });
    const result = small.runWake(['a', 'b', 'c', 'd', 'e']);
    expect(result.processedItems).toBe(2);
  });

  it('should return default config', () => {
    const config = manager.getConfig();
    expect(config).toEqual(DEFAULT_CYCLE_CONFIG);
  });

  it('should accept partial config override', () => {
    const custom = createCycleManager({ wakeIntervalMs: 1000 });
    const config = custom.getConfig();
    expect(config.wakeIntervalMs).toBe(1000);
    expect(config.sleepIntervalMs).toBe(DEFAULT_CYCLE_CONFIG.sleepIntervalMs);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-002: DEFAULT_CYCLE_CONFIG
// ---------------------------------------------------------------------------

describe('DES-LRN-002: DEFAULT_CYCLE_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_CYCLE_CONFIG.wakeIntervalMs).toBe(60000);
    expect(DEFAULT_CYCLE_CONFIG.sleepIntervalMs).toBe(300000);
    expect(DEFAULT_CYCLE_CONFIG.maxPatternsPerCycle).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-002: Factory functions
// ---------------------------------------------------------------------------

describe('DES-LRN-002: Factory functions', () => {
  it('should create CycleManager via factory', () => {
    expect(createCycleManager()).toBeInstanceOf(CycleManager);
  });

  it('should create WakePhase via factory', () => {
    expect(createWakePhase()).toBeInstanceOf(WakePhase);
  });

  it('should create SleepPhase via factory', () => {
    expect(createSleepPhase()).toBeInstanceOf(SleepPhase);
  });
});
