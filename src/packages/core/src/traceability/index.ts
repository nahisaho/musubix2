/**
 * @module traceability
 * @description 100% Traceability Management - manages links between all artifacts
 * @see DES-TRC-001
 */

export type TraceLinkType =
  | 'requirement-to-design'
  | 'design-to-code'
  | 'code-to-test'
  | 'requirement-to-test'
  | 'design-to-test';

export interface TraceabilityLink {
  id: string;
  sourceId: string;
  targetId: string;
  type: TraceLinkType;
  verified: boolean;
  createdAt: Date;
}

export interface TraceabilityMatrix {
  links: TraceabilityLink[];
  coverage: {
    total: number;
    covered: number;
    percent: number;
  };
}

export class TraceabilityManager {
  private links: TraceabilityLink[] = [];
  private linkCounter = 0;

  addLink(sourceId: string, targetId: string, type: TraceLinkType): TraceabilityLink {
    this.linkCounter++;
    const link: TraceabilityLink = {
      id: `TL-${String(this.linkCounter).padStart(3, '0')}`,
      sourceId,
      targetId,
      type,
      verified: false,
      createdAt: new Date(),
    };
    this.links.push(link);
    return link;
  }

  removeLink(id: string): boolean {
    const index = this.links.findIndex((l) => l.id === id);
    if (index === -1) {
      return false;
    }
    this.links.splice(index, 1);
    return true;
  }

  getLinksFrom(sourceId: string): TraceabilityLink[] {
    return this.links.filter((l) => l.sourceId === sourceId);
  }

  getLinksTo(targetId: string): TraceabilityLink[] {
    return this.links.filter((l) => l.targetId === targetId);
  }

  verifyLink(id: string): void {
    const link = this.links.find((l) => l.id === id);
    if (link) {
      link.verified = true;
    }
  }

  getMatrix(sourceIds: string[]): TraceabilityMatrix {
    const coveredIds = new Set(this.links.map((l) => l.sourceId));
    const covered = sourceIds.filter((id) => coveredIds.has(id)).length;
    const total = sourceIds.length;
    return {
      links: [...this.links],
      coverage: {
        total,
        covered,
        percent: total === 0 ? 0 : Math.round((covered / total) * 100),
      },
    };
  }

  findUnlinked(allIds: string[]): string[] {
    const linkedIds = new Set([
      ...this.links.map((l) => l.sourceId),
      ...this.links.map((l) => l.targetId),
    ]);
    return allIds.filter((id) => !linkedIds.has(id));
  }

  toMarkdown(): string {
    const header = '| ID | Source | Target | Type | Verified |';
    const separator = '|------|----------|----------|------|----------|';
    const rows = this.links.map(
      (l) => `| ${l.id} | ${l.sourceId} | ${l.targetId} | ${l.type} | ${l.verified ? '✓' : '✗'} |`,
    );
    return [header, separator, ...rows].join('\n');
  }
}

export function createTraceabilityManager(): TraceabilityManager {
  return new TraceabilityManager();
}
