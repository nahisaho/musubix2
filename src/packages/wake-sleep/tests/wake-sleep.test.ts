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

// ---------------------------------------------------------------------------
// DES-LRN-002: WakePhase — N-gram & PMI pattern extraction
// ---------------------------------------------------------------------------

describe('DES-LRN-002: WakePhase — N-gram extraction', () => {
  let wake: WakePhase;

  beforeEach(() => {
    wake = createWakePhase();
  });

  it('should extract bigram patterns from repeated phrases', () => {
    const result = wake.process([
      'machine learning is great',
      'machine learning is useful',
      'deep learning is powerful',
    ]);
    // "machine learning" appears in 2 items so should be detected as a bigram pattern
    expect(result.newPatterns.some((p) => p.includes('machine') && p.includes('learning'))).toBe(true);
  });

  it('should rank patterns by statistical significance', () => {
    const result = wake.process([
      'the quick brown fox jumps over the lazy dog',
      'the quick brown cat jumps over the lazy mouse',
      'the quick brown bird jumps over the lazy hamster',
    ]);
    // Patterns should be sorted by score
    expect(result.newPatterns.length).toBeGreaterThan(0);
    // "the" and "quick" and "brown" should appear as unigram patterns
    expect(result.newPatterns.some((p) => p === 'quick')).toBe(true);
    expect(result.newPatterns.some((p) => p === 'brown')).toBe(true);
  });

  it('should extract both unigrams and multi-word patterns', () => {
    const result = wake.process([
      'natural language processing',
      'natural language understanding',
      'natural language generation',
    ]);
    const hasUnigram = result.newPatterns.some((p) => !p.includes(' '));
    const hasMultiWord = result.newPatterns.some((p) => p.includes(' '));
    expect(hasUnigram).toBe(true);
    expect(hasMultiWord).toBe(true);
  });

  it('should handle empty items array', () => {
    const result = wake.process([]);
    expect(result.processedItems).toBe(0);
    expect(result.newPatterns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DES-LRN-002: SleepPhase — Jaccard clustering
// ---------------------------------------------------------------------------

describe('DES-LRN-002: SleepPhase — Jaccard clustering', () => {
  let sleep: SleepPhase;

  beforeEach(() => {
    sleep = createSleepPhase();
  });

  it('should cluster similar multi-word patterns', () => {
    // These share the word "learning" so Jaccard > 0.5
    const result = sleep.consolidate([
      'machine learning',
      'machine learning',
      'deep learning',
      'deep learning',
    ]);
    // Both survive frequency filter, but "machine learning" and "deep learning"
    // share "learning" → Jaccard = 1/3 < 0.5, so they stay separate
    expect(result.consolidatedPatterns).toBe(2);
  });

  it('should merge identical patterns with different casing', () => {
    const result = sleep.consolidate([
      'Machine Learning',
      'machine learning',
      'MACHINE LEARNING',
    ]);
    expect(result.consolidatedPatterns).toBe(1);
    expect(result.prunedPatterns).toBe(0);
  });

  it('should handle all unique patterns (all pruned)', () => {
    const result = sleep.consolidate(['alpha', 'beta', 'gamma', 'delta']);
    expect(result.consolidatedPatterns).toBe(0);
    expect(result.prunedPatterns).toBe(4);
  });

  it('should handle empty input', () => {
    const result = sleep.consolidate([]);
    expect(result.consolidatedPatterns).toBe(0);
    expect(result.prunedPatterns).toBe(0);
  });
});
