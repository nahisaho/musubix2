import { describe, it, expect } from 'vitest';
import {
  QualityGateReporter,
  createQualityGateReporter,
  type GateReportEntry,
} from '../../src/monitoring/quality-reporter.js';

describe('DES-MON-002: QualityGateReporter', () => {
  it('should add entries and generate a report', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({
      name: 'Coverage',
      status: 'passed',
      value: 85,
      threshold: 80,
      message: 'Coverage meets threshold',
    });

    const report = reporter.generate();
    expect(report.entries).toHaveLength(1);
    expect(report.overallStatus).toBe('passed');
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.summary).toContain('1 gates evaluated');
  });

  it('should mark overall as failed if any entry fails', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({ name: 'Lint', status: 'passed', value: 0, threshold: 0, message: 'No lint errors' });
    reporter.addEntry({ name: 'Coverage', status: 'failed', value: 60, threshold: 80, message: 'Below threshold' });

    const report = reporter.generate();
    expect(report.overallStatus).toBe('failed');
    expect(report.summary).toContain('1 failed');
  });

  it('should mark overall as warning if no failures but warnings exist', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({ name: 'Lint', status: 'passed', value: 0, threshold: 0, message: 'OK' });
    reporter.addEntry({ name: 'Complexity', status: 'warning', value: 18, threshold: 15, message: 'High' });

    const report = reporter.generate();
    expect(report.overallStatus).toBe('warning');
  });

  it('should mark overall as skipped when empty', () => {
    const reporter = createQualityGateReporter();
    const report = reporter.generate();
    expect(report.overallStatus).toBe('skipped');
    expect(report.entries).toHaveLength(0);
  });

  it('should generate markdown with status emojis', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({ name: 'Lint', status: 'passed', value: 0, threshold: 0, message: 'Clean' });
    reporter.addEntry({ name: 'Coverage', status: 'failed', value: 50, threshold: 80, message: 'Low' });

    const report = reporter.generate();
    const md = reporter.toMarkdown(report);

    expect(md).toContain('# Quality Gate Report');
    expect(md).toContain('✅');
    expect(md).toContain('❌');
    expect(md).toContain('| Lint |');
    expect(md).toContain('| Coverage |');
    expect(md).toContain('**Summary**');
  });

  it('should generate valid JSON', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({ name: 'Test', status: 'passed', value: 100, threshold: 95, message: 'All pass' });

    const report = reporter.generate();
    const json = reporter.toJSON(report);
    const parsed = JSON.parse(json);

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.overallStatus).toBe('passed');
    expect(parsed.summary).toBeDefined();
  });

  it('should clear all entries', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({ name: 'A', status: 'passed', value: 1, threshold: 1, message: 'ok' });
    reporter.addEntry({ name: 'B', status: 'failed', value: 0, threshold: 1, message: 'fail' });

    reporter.clear();
    const report = reporter.generate();
    expect(report.entries).toHaveLength(0);
    expect(report.overallStatus).toBe('skipped');
  });

  it('factory createQualityGateReporter returns a QualityGateReporter instance', () => {
    const reporter = createQualityGateReporter();
    expect(reporter).toBeInstanceOf(QualityGateReporter);
  });

  it('should include all skipped entries as skipped overall', () => {
    const reporter = createQualityGateReporter();
    reporter.addEntry({ name: 'A', status: 'skipped', value: 0, threshold: 0, message: 'Skipped' });
    reporter.addEntry({ name: 'B', status: 'skipped', value: 0, threshold: 0, message: 'Skipped' });

    const report = reporter.generate();
    expect(report.overallStatus).toBe('skipped');
  });
});
