import { describe, it, expect } from 'vitest';
import {
  MatrixGenerator,
  createMatrixGenerator,
  type TraceabilityMatrixReport,
} from '../../src/traceability/matrix-generator.js';

describe('DES-TRC-002: MatrixGenerator', () => {
  const sources = ['REQ-001', 'REQ-002', 'REQ-003'];
  const targets = ['DES-001', 'DES-002'];
  const links = [
    { source: 'REQ-001', target: 'DES-001', verified: true },
    { source: 'REQ-002', target: 'DES-002' },
  ];

  it('should create via factory function', () => {
    const gen = createMatrixGenerator();
    expect(gen).toBeInstanceOf(MatrixGenerator);
  });

  it('should generate a traceability matrix report', () => {
    const gen = new MatrixGenerator();
    const report = gen.generate(sources, targets, links);

    expect(report.cells.length).toBe(sources.length * targets.length);
    expect(report.completeness).toBeGreaterThan(0);
    expect(report.completeness).toBeLessThanOrEqual(100);
  });

  it('should detect gaps for unlinked sources and targets', () => {
    const gen = new MatrixGenerator();
    const report = gen.generate(sources, targets, links);

    // REQ-003 has no outgoing link
    const sourceGap = report.gaps.find(g => g.id === 'REQ-003');
    expect(sourceGap).toBeDefined();
    expect(sourceGap!.reason).toContain('No outgoing links');
  });

  it('should mark verified cells correctly', () => {
    const gen = new MatrixGenerator();
    const report = gen.generate(sources, targets, links);

    const verifiedCell = report.cells.find(
      c => c.sourceId === 'REQ-001' && c.targetId === 'DES-001',
    );
    expect(verifiedCell?.linked).toBe(true);
    expect(verifiedCell?.verified).toBe(true);

    const unverifiedCell = report.cells.find(
      c => c.sourceId === 'REQ-002' && c.targetId === 'DES-002',
    );
    expect(unverifiedCell?.linked).toBe(true);
    expect(unverifiedCell?.verified).toBe(false);
  });

  it('should render markdown output', () => {
    const gen = new MatrixGenerator();
    const report = gen.generate(sources, targets, links);
    const md = gen.toMarkdown(report);

    expect(md).toContain('REQ-001');
    expect(md).toContain('DES-001');
    expect(md).toContain('✓');
    expect(md).toContain('Completeness:');
  });

  it('should render CSV output', () => {
    const gen = new MatrixGenerator();
    const report = gen.generate(sources, targets, links);
    const csv = gen.toCSV(report);

    const lines = csv.split('\n');
    expect(lines[0]).toContain('Source');
    expect(lines[0]).toContain('DES-001');
    // REQ-001/DES-001 is verified → '2'
    expect(lines[1]).toContain('2');
  });

  it('should report an unlinked target as an incoming gap and infer types', () => {
    const gen = new MatrixGenerator();
    // TST-900 has no incoming link → gap; ids cover design/test type inference.
    const report = gen.generate(['REQ-001', 'DES-500'], ['DES-500', 'TST-900'], [
      { source: 'REQ-001', target: 'DES-500', verified: true },
    ]);
    const gapIds = report.gaps.map((g) => g.id);
    expect(gapIds).toContain('TST-900');
    const tstGap = report.gaps.find((g) => g.id === 'TST-900');
    expect(tstGap!.type).toBe('test');
    const desGap = report.gaps.find((g) => g.id === 'DES-500' && g.reason.includes('outgoing'));
    expect(desGap!.type).toBe('design');
  });

  it('should report 100% completeness for an empty matrix', () => {
    const gen = new MatrixGenerator();
    const report = gen.generate([], [], []);
    expect(report.completeness).toBe(100);
    expect(report.cells).toHaveLength(0);
  });
});
