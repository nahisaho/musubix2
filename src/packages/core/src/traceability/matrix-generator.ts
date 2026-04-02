/**
 * Matrix Generator — DES-TRC-002
 *
 * 全アーティファクト間のリンクマトリクスをMarkdown/CSV形式で出力。カバレッジギャップを自動検出。
 */

export interface MatrixCell {
  sourceId: string;
  targetId: string;
  linked: boolean;
  verified: boolean;
}

export interface GapInfo {
  id: string;
  type: 'requirement' | 'design' | 'test';
  reason: string;
}

export interface TraceabilityMatrixReport {
  cells: MatrixCell[];
  gaps: GapInfo[];
  completeness: number;
}

export class MatrixGenerator {
  generate(
    sourceIds: string[],
    targetIds: string[],
    links: Array<{ source: string; target: string; verified?: boolean }>,
  ): TraceabilityMatrixReport {
    const linkMap = new Map<string, { target: string; verified: boolean }[]>();
    for (const link of links) {
      const existing = linkMap.get(link.source) ?? [];
      existing.push({ target: link.target, verified: link.verified ?? false });
      linkMap.set(link.source, existing);
    }

    const cells: MatrixCell[] = [];
    for (const src of sourceIds) {
      for (const tgt of targetIds) {
        const srcLinks = linkMap.get(src) ?? [];
        const match = srcLinks.find(l => l.target === tgt);
        cells.push({
          sourceId: src,
          targetId: tgt,
          linked: match !== undefined,
          verified: match?.verified ?? false,
        });
      }
    }

    const gaps: GapInfo[] = [];
    const linkedSources = new Set(links.map(l => l.source));
    const linkedTargets = new Set(links.map(l => l.target));

    for (const src of sourceIds) {
      if (!linkedSources.has(src)) {
        gaps.push({
          id: src,
          type: this.inferType(src),
          reason: `No outgoing links from '${src}'`,
        });
      }
    }

    for (const tgt of targetIds) {
      if (!linkedTargets.has(tgt)) {
        gaps.push({
          id: tgt,
          type: this.inferType(tgt),
          reason: `No incoming links to '${tgt}'`,
        });
      }
    }

    const totalPairs = sourceIds.length * targetIds.length;
    const linkedCount = cells.filter(c => c.linked).length;
    const completeness = totalPairs === 0 ? 100 : Math.round((linkedCount / totalPairs) * 100);

    return { cells, gaps, completeness };
  }

  toMarkdown(report: TraceabilityMatrixReport): string {
    const sourceIds = [...new Set(report.cells.map(c => c.sourceId))];
    const targetIds = [...new Set(report.cells.map(c => c.targetId))];

    const header = `| Source \\ Target | ${targetIds.join(' | ')} |`;
    const separator = `|${'-'.repeat(17)}|${targetIds.map(() => '------').join('|')}|`;

    const rows = sourceIds.map(src => {
      const vals = targetIds.map(tgt => {
        const cell = report.cells.find(c => c.sourceId === src && c.targetId === tgt);
        if (!cell || !cell.linked) return ' ';
        return cell.verified ? '✓' : '○';
      });
      return `| ${src} | ${vals.join(' | ')} |`;
    });

    const lines = [header, separator, ...rows];

    lines.push('', `Completeness: ${report.completeness}%`);

    if (report.gaps.length > 0) {
      lines.push('', '### Gaps', '');
      for (const gap of report.gaps) {
        lines.push(`- **${gap.id}** (${gap.type}): ${gap.reason}`);
      }
    }

    return lines.join('\n');
  }

  toCSV(report: TraceabilityMatrixReport): string {
    const sourceIds = [...new Set(report.cells.map(c => c.sourceId))];
    const targetIds = [...new Set(report.cells.map(c => c.targetId))];

    const headerRow = ['Source', ...targetIds].join(',');
    const dataRows = sourceIds.map(src => {
      const vals = targetIds.map(tgt => {
        const cell = report.cells.find(c => c.sourceId === src && c.targetId === tgt);
        if (!cell || !cell.linked) return '0';
        return cell.verified ? '2' : '1';
      });
      return [src, ...vals].join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  private inferType(id: string): 'requirement' | 'design' | 'test' {
    if (id.startsWith('REQ')) return 'requirement';
    if (id.startsWith('DES')) return 'design';
    if (id.startsWith('TST') || id.startsWith('TEST')) return 'test';
    return 'requirement';
  }
}

export function createMatrixGenerator(): MatrixGenerator {
  return new MatrixGenerator();
}
