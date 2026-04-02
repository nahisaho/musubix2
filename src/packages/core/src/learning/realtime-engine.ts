/**
 * @module learning/realtime-engine
 * @description Realtime learning engine with buffered ingestion and dashboard
 * @see DES-LRN-001
 */

export interface LearningDashboard {
  totalPatterns: number;
  recentPatterns: number;
  topCategories: Array<{ category: string; count: number }>;
  lastUpdated: Date;
}

export class RealtimeLearningEngine {
  private buffer: string[] = [];
  private maxBufferSize: number;
  private allPatterns: string[] = [];
  private recentPatterns: string[] = [];
  private categoryCounts: Map<string, number> = new Map();
  private lastUpdated: Date = new Date();

  constructor(maxBufferSize: number = 100) {
    this.maxBufferSize = maxBufferSize;
  }

  ingest(data: string): void {
    this.buffer.push(data);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  flush(): string[] {
    const patterns = this.extractPatterns(this.buffer);
    this.allPatterns.push(...patterns);
    this.recentPatterns = patterns;
    this.lastUpdated = new Date();

    for (const pattern of patterns) {
      const category = this.categorize(pattern);
      this.categoryCounts.set(category, (this.categoryCounts.get(category) ?? 0) + 1);
    }

    this.buffer = [];
    return patterns;
  }

  getDashboard(): LearningDashboard {
    const topCategories = [...this.categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPatterns: this.allPatterns.length,
      recentPatterns: this.recentPatterns.length,
      topCategories,
      lastUpdated: this.lastUpdated,
    };
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  setMaxBufferSize(size: number): void {
    this.maxBufferSize = size;
  }

  private extractPatterns(data: string[]): string[] {
    const patterns: string[] = [];
    for (const item of data) {
      // Extract word-level patterns (sequences of 2+ word tokens)
      const words = item.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2) {
        for (let i = 0; i < words.length - 1; i++) {
          patterns.push(`${words[i]} ${words[i + 1]}`);
        }
      } else if (words.length === 1) {
        patterns.push(words[0]);
      }
    }
    return patterns;
  }

  private categorize(pattern: string): string {
    if (/[A-Z][a-z]/.test(pattern)) return 'naming';
    if (/error|catch|throw/i.test(pattern)) return 'error-handling';
    if (/test|describe|expect/i.test(pattern)) return 'testing';
    if (/import|export|require/i.test(pattern)) return 'module';
    return 'general';
  }
}

export function createRealtimeLearningEngine(maxBufferSize?: number): RealtimeLearningEngine {
  return new RealtimeLearningEngine(maxBufferSize);
}
