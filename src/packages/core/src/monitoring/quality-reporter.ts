/**
 * Quality Gate Reporter
 *
 * Aggregates quality gate results into reports with Markdown and JSON output.
 *
 * @module monitoring/quality-reporter
 * @see DES-MON-002 — 品質ゲートレポート
 */

export type GateStatus = 'passed' | 'failed' | 'skipped' | 'warning';

export interface GateReportEntry {
  name: string;
  status: GateStatus;
  value: number;
  threshold: number;
  message: string;
}

export interface QualityReport {
  entries: GateReportEntry[];
  overallStatus: GateStatus;
  generatedAt: Date;
  summary: string;
}

const STATUS_EMOJI: Record<GateStatus, string> = {
  passed: '✅',
  failed: '❌',
  skipped: '⏭️',
  warning: '⚠️',
};

export class QualityGateReporter {
  private entries: GateReportEntry[] = [];

  addEntry(entry: GateReportEntry): void {
    this.entries.push(entry);
  }

  generate(): QualityReport {
    const overallStatus = this.computeOverallStatus();
    const passed = this.entries.filter((e) => e.status === 'passed').length;
    const failed = this.entries.filter((e) => e.status === 'failed').length;
    const warnings = this.entries.filter((e) => e.status === 'warning').length;
    const skipped = this.entries.filter((e) => e.status === 'skipped').length;

    const parts: string[] = [`${this.entries.length} gates evaluated`];
    if (passed > 0) {
      parts.push(`${passed} passed`);
    }
    if (failed > 0) {
      parts.push(`${failed} failed`);
    }
    if (warnings > 0) {
      parts.push(`${warnings} warnings`);
    }
    if (skipped > 0) {
      parts.push(`${skipped} skipped`);
    }

    return {
      entries: [...this.entries],
      overallStatus,
      generatedAt: new Date(),
      summary: parts.join(', '),
    };
  }

  toMarkdown(report: QualityReport): string {
    const lines: string[] = [
      '# Quality Gate Report',
      '',
      `**Status**: ${STATUS_EMOJI[report.overallStatus]} ${report.overallStatus.toUpperCase()}`,
      `**Generated**: ${report.generatedAt.toISOString()}`,
      '',
      '| Gate | Status | Value | Threshold | Message |',
      '|------|--------|-------|-----------|---------|',
    ];

    for (const entry of report.entries) {
      const emoji = STATUS_EMOJI[entry.status];
      lines.push(
        `| ${entry.name} | ${emoji} ${entry.status} | ${entry.value} | ${entry.threshold} | ${entry.message} |`,
      );
    }

    lines.push('', `**Summary**: ${report.summary}`);
    return lines.join('\n');
  }

  toJSON(report: QualityReport): string {
    return JSON.stringify(report, null, 2);
  }

  clear(): void {
    this.entries.length = 0;
  }

  private computeOverallStatus(): GateStatus {
    if (this.entries.length === 0) {
      return 'skipped';
    }
    if (this.entries.some((e) => e.status === 'failed')) {
      return 'failed';
    }
    if (this.entries.some((e) => e.status === 'warning')) {
      return 'warning';
    }
    if (this.entries.every((e) => e.status === 'skipped')) {
      return 'skipped';
    }
    return 'passed';
  }
}

export function createQualityGateReporter(): QualityGateReporter {
  return new QualityGateReporter();
}
