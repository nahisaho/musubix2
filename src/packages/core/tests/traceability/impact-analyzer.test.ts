import { describe, it, expect } from 'vitest';
import {
  ImpactAnalyzer,
  TraceSyncService,
  createImpactAnalyzer,
  createTraceSyncService,
  type ImpactLevel,
} from '../../src/traceability/impact-analyzer.js';

describe('DES-TRC-003: ImpactAnalyzer', () => {
  const links = [
    { source: 'REQ-001', target: 'DES-001' },
    { source: 'DES-001', target: 'TST-001' },
    { source: 'REQ-002', target: 'DES-002' },
    { source: 'DES-002', target: 'TST-002' },
    { source: 'DES-002', target: 'TST-003' },
  ];

  it('should create ImpactAnalyzer via factory', () => {
    const analyzer = createImpactAnalyzer();
    expect(analyzer).toBeInstanceOf(ImpactAnalyzer);
  });

  it('should create TraceSyncService via factory', () => {
    const svc = createTraceSyncService();
    expect(svc).toBeInstanceOf(TraceSyncService);
  });

  it('should trace all affected items through the link graph', () => {
    const analyzer = new ImpactAnalyzer();
    const result = analyzer.analyze('REQ-001', links);

    expect(result.changedId).toBe('REQ-001');
    expect(result.affectedIds).toContain('DES-001');
    expect(result.affectedIds).toContain('TST-001');
    expect(result.affectedIds).not.toContain('DES-002');
  });

  it('should return impact level based on affected count', () => {
    const analyzer = new ImpactAnalyzer();
    expect(analyzer.getImpactLevel(0)).toBe('none');
    expect(analyzer.getImpactLevel(1)).toBe('low');
    expect(analyzer.getImpactLevel(4)).toBe('medium');
    expect(analyzer.getImpactLevel(8)).toBe('high');
    expect(analyzer.getImpactLevel(15)).toBe('critical');
  });

  it('should report no impact for isolated nodes', () => {
    const analyzer = new ImpactAnalyzer();
    const result = analyzer.analyze('ORPHAN-001', links);
    expect(result.affectedIds).toHaveLength(0);
    expect(result.level).toBe('none');
    expect(result.description).toContain('No items affected');
  });

  it('should detect in-sync state when all expected links exist', () => {
    const svc = new TraceSyncService();
    const status = svc.checkSync(
      links,
      ['REQ-001', 'REQ-002'],
      ['DES-001', 'DES-002'],
    );

    expect(status.inSync).toBe(true);
    expect(status.missingLinks).toHaveLength(0);
    expect(status.staleLinks).toHaveLength(0);
  });

  it('should detect missing links and stale links', () => {
    const svc = new TraceSyncService();
    const currentLinks = [{ source: 'OLD-001', target: 'OLD-002' }];
    const status = svc.checkSync(
      currentLinks,
      ['REQ-001', 'REQ-002'],
      ['DES-001', 'DES-002'],
    );

    expect(status.inSync).toBe(false);
    expect(status.missingLinks).toContain('REQ-001');
    expect(status.missingLinks).toContain('DES-001');
    expect(status.staleLinks.length).toBeGreaterThan(0);
  });
});
