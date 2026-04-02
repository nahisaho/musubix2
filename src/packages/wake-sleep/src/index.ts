/**
 * @musubix2/wake-sleep — Wake-Sleep Cycle management
 *
 * DES-LRN-002 (P7-02): Wake-Sleepサイクル
 * Wakeフェーズでパターン抽出、Sleepフェーズで統合・プルーニング。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CyclePhase = 'wake' | 'sleep';

export interface WakePhaseResult {
  processedItems: number;
  newPatterns: string[];
  duration: number;
}

export interface SleepPhaseResult {
  consolidatedPatterns: number;
  prunedPatterns: number;
  duration: number;
}

export interface CycleConfig {
  wakeIntervalMs: number;
  sleepIntervalMs: number;
  maxPatternsPerCycle: number;
}

export const DEFAULT_CYCLE_CONFIG: CycleConfig = {
  wakeIntervalMs: 60000,
  sleepIntervalMs: 300000,
  maxPatternsPerCycle: 100,
};

// ---------------------------------------------------------------------------
// WakePhase
// ---------------------------------------------------------------------------

export class WakePhase {
  process(items: string[]): WakePhaseResult {
    const start = Date.now();
    const freq = new Map<string, number>();

    for (const item of items) {
      const words = item
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      for (const word of words) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }

    const newPatterns = [...freq.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    return {
      processedItems: items.length,
      newPatterns,
      duration: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// SleepPhase
// ---------------------------------------------------------------------------

export class SleepPhase {
  consolidate(patterns: string[]): SleepPhaseResult {
    const start = Date.now();
    const unique = new Set<string>();
    const freq = new Map<string, number>();

    for (const p of patterns) {
      const normalized = p.trim().toLowerCase();
      if (normalized.length === 0) {
        continue;
      }
      unique.add(normalized);
      freq.set(normalized, (freq.get(normalized) ?? 0) + 1);
    }

    // Prune patterns that appear only once (low-frequency)
    let prunedCount = 0;
    for (const [pattern, count] of freq) {
      if (count <= 1) {
        unique.delete(pattern);
        prunedCount++;
      }
    }

    return {
      consolidatedPatterns: unique.size,
      prunedPatterns: prunedCount,
      duration: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// CycleManager
// ---------------------------------------------------------------------------

export class CycleManager {
  private phase: CyclePhase = 'wake';
  private config: CycleConfig;
  private wakePhase: WakePhase;
  private sleepPhase: SleepPhase;
  private cycleCount = 0;

  constructor(config: CycleConfig = DEFAULT_CYCLE_CONFIG) {
    this.config = { ...config };
    this.wakePhase = new WakePhase();
    this.sleepPhase = new SleepPhase();
  }

  getCurrentPhase(): CyclePhase {
    return this.phase;
  }

  runWake(items: string[]): WakePhaseResult {
    this.phase = 'wake';
    const limited = items.slice(0, this.config.maxPatternsPerCycle);
    const result = this.wakePhase.process(limited);
    this.phase = 'sleep';
    this.cycleCount++;
    return result;
  }

  runSleep(patterns: string[]): SleepPhaseResult {
    this.phase = 'sleep';
    const result = this.sleepPhase.consolidate(patterns);
    this.phase = 'wake';
    return result;
  }

  getConfig(): CycleConfig {
    return { ...this.config };
  }

  getCycleCount(): number {
    return this.cycleCount;
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createCycleManager(config?: Partial<CycleConfig>): CycleManager {
  return new CycleManager(config ? { ...DEFAULT_CYCLE_CONFIG, ...config } : undefined);
}

export function createWakePhase(): WakePhase {
  return new WakePhase();
}

export function createSleepPhase(): SleepPhase {
  return new SleepPhase();
}
