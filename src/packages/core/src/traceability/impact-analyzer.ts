/**
 * Impact Analyzer — DES-TRC-003
 *
 * ソースコード・テストからトレーサビリティIDを抽出し、マトリクスとの整合性を検証。
 */

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface ImpactResult {
  changedId: string;
  affectedIds: string[];
  level: ImpactLevel;
  description: string;
}

export interface TraceSyncStatus {
  inSync: boolean;
  staleLinks: string[];
  missingLinks: string[];
}

export class ImpactAnalyzer {
  analyze(changedId: string, links: Array<{ source: string; target: string }>): ImpactResult {
    const affected = new Set<string>();
    const queue = [changedId];

    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const link of links) {
        if (link.source === current && !affected.has(link.target)) {
          affected.add(link.target);
          queue.push(link.target);
        }
        if (link.target === current && !affected.has(link.source)) {
          affected.add(link.source);
          queue.push(link.source);
        }
      }
    }

    affected.delete(changedId);
    const affectedIds = [...affected];
    const level = this.getImpactLevel(affectedIds.length);

    return {
      changedId,
      affectedIds,
      level,
      description:
        affectedIds.length === 0
          ? `No items affected by change to '${changedId}'`
          : `Change to '${changedId}' affects ${affectedIds.length} item(s): ${affectedIds.join(', ')}`,
    };
  }

  getImpactLevel(affectedCount: number): ImpactLevel {
    if (affectedCount === 0) {
      return 'none';
    }
    if (affectedCount <= 2) {
      return 'low';
    }
    if (affectedCount <= 5) {
      return 'medium';
    }
    if (affectedCount <= 10) {
      return 'high';
    }
    return 'critical';
  }
}

export class TraceSyncService {
  checkSync(
    currentLinks: Array<{ source: string; target: string }>,
    expectedSources: string[],
    expectedTargets: string[],
  ): TraceSyncStatus {
    const linkedSources = new Set(currentLinks.map((l) => l.source));
    const linkedTargets = new Set(currentLinks.map((l) => l.target));

    const missingLinks: string[] = [];
    for (const src of expectedSources) {
      if (!linkedSources.has(src)) {
        missingLinks.push(src);
      }
    }
    for (const tgt of expectedTargets) {
      if (!linkedTargets.has(tgt)) {
        missingLinks.push(tgt);
      }
    }

    const allExpected = new Set([...expectedSources, ...expectedTargets]);
    const staleLinks: string[] = [];
    for (const link of currentLinks) {
      if (!allExpected.has(link.source) && !allExpected.has(link.target)) {
        staleLinks.push(`${link.source}->${link.target}`);
      }
    }

    return {
      inSync: missingLinks.length === 0 && staleLinks.length === 0,
      staleLinks,
      missingLinks,
    };
  }
}

export function createImpactAnalyzer(): ImpactAnalyzer {
  return new ImpactAnalyzer();
}

export function createTraceSyncService(): TraceSyncService {
  return new TraceSyncService();
}
