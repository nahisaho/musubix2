import { describe, it, expect } from 'vitest';
import {
  TraceabilityValidator,
  createTraceabilityValidator,
  type TraceLink,
} from '../../src/validators/traceability-validator.js';

describe('DES-REQ-002: TraceabilityValidator', () => {
  const validator = new TraceabilityValidator();

  it('should report full coverage when all requirements are linked', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
      { sourceId: 'REQ-001', targetId: 'TEST-001', type: 'requirement-to-test' },
    ];
    const report = validator.validateCoverage(['REQ-001'], ['DES-001'], ['TEST-001'], links);

    expect(report.totalRequirements).toBe(1);
    expect(report.coveredRequirements).toBe(1);
    expect(report.coveragePercent).toBe(100);
    expect(report.gaps).toHaveLength(0);
  });

  it('should detect undesigned requirement', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'TEST-001', type: 'requirement-to-test' },
    ];
    const report = validator.validateCoverage(['REQ-001'], [], ['TEST-001'], links);

    const undesigned = report.gaps.filter(g => g.type === 'undesigned');
    expect(undesigned).toHaveLength(1);
    expect(undesigned[0].id).toBe('REQ-001');
  });

  it('should detect untested requirement', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
    ];
    const report = validator.validateCoverage(['REQ-001'], ['DES-001'], [], links);

    const untested = report.gaps.filter(g => g.type === 'untested');
    expect(untested).toHaveLength(1);
    expect(untested[0].id).toBe('REQ-001');
  });

  it('should consider requirement tested through design chain', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
      { sourceId: 'DES-001', targetId: 'TEST-001', type: 'design-to-test' },
    ];
    const report = validator.validateCoverage(['REQ-001'], ['DES-001'], ['TEST-001'], links);

    const untested = report.gaps.filter(g => g.type === 'untested');
    expect(untested).toHaveLength(0);
    expect(report.coveredRequirements).toBe(1);
  });

  it('should detect orphaned test', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
      { sourceId: 'REQ-001', targetId: 'TEST-001', type: 'requirement-to-test' },
    ];
    const report = validator.validateCoverage(['REQ-001'], ['DES-001'], ['TEST-001', 'TEST-999'], links);

    const orphaned = report.gaps.filter(g => g.type === 'orphaned-test');
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].id).toBe('TEST-999');
  });

  it('should detect orphaned design', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
      { sourceId: 'REQ-001', targetId: 'TEST-001', type: 'requirement-to-test' },
    ];
    const report = validator.validateCoverage(['REQ-001'], ['DES-001', 'DES-999'], ['TEST-001'], links);

    const orphaned = report.gaps.filter(g => g.type === 'orphaned-design');
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].id).toBe('DES-999');
  });

  it('should calculate coverage percent correctly', () => {
    const links: TraceLink[] = [
      { sourceId: 'REQ-001', targetId: 'DES-001', type: 'requirement-to-design' },
      { sourceId: 'REQ-001', targetId: 'TEST-001', type: 'requirement-to-test' },
    ];
    const report = validator.validateCoverage(
      ['REQ-001', 'REQ-002', 'REQ-003'],
      ['DES-001'],
      ['TEST-001'],
      links
    );

    expect(report.totalRequirements).toBe(3);
    expect(report.coveredRequirements).toBe(1);
    expect(report.coveragePercent).toBe(33);
  });

  it('should return 100% for empty inputs', () => {
    const report = validator.validateCoverage([], [], [], []);

    expect(report.totalRequirements).toBe(0);
    expect(report.coveragePercent).toBe(100);
    expect(report.gaps).toHaveLength(0);
  });

  it('should be created by factory function', () => {
    const v = createTraceabilityValidator();
    expect(v).toBeInstanceOf(TraceabilityValidator);
  });
});
