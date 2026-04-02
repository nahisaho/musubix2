import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTraceabilityManager,
  TraceabilityManager,
} from '../../src/traceability/index.js';
import type { TraceLinkType } from '../../src/traceability/index.js';

describe('DES-TRC-001: TraceabilityManager', () => {
  let manager: TraceabilityManager;

  beforeEach(() => {
    manager = createTraceabilityManager();
  });

  it('should create a TraceabilityManager via factory', () => {
    expect(manager).toBeInstanceOf(TraceabilityManager);
  });

  it('should add a link with auto-generated ID', () => {
    const link = manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    expect(link.id).toBe('TL-001');
    expect(link.sourceId).toBe('REQ-001');
    expect(link.targetId).toBe('DES-001');
    expect(link.type).toBe('requirement-to-design');
    expect(link.verified).toBe(false);
    expect(link.createdAt).toBeInstanceOf(Date);
  });

  it('should auto-increment link IDs', () => {
    const link1 = manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    const link2 = manager.addLink('DES-001', 'CODE-001', 'design-to-code');
    expect(link1.id).toBe('TL-001');
    expect(link2.id).toBe('TL-002');
  });

  it('should return links from a given source ID', () => {
    manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    manager.addLink('REQ-001', 'DES-002', 'requirement-to-design');
    manager.addLink('REQ-002', 'DES-003', 'requirement-to-design');

    const links = manager.getLinksFrom('REQ-001');
    expect(links).toHaveLength(2);
    expect(links.every(l => l.sourceId === 'REQ-001')).toBe(true);
  });

  it('should return links to a given target ID', () => {
    manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    manager.addLink('REQ-002', 'DES-001', 'requirement-to-design');
    manager.addLink('REQ-003', 'DES-002', 'requirement-to-design');

    const links = manager.getLinksTo('DES-001');
    expect(links).toHaveLength(2);
    expect(links.every(l => l.targetId === 'DES-001')).toBe(true);
  });

  it('should verify a link by ID', () => {
    const link = manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    expect(link.verified).toBe(false);

    manager.verifyLink(link.id);

    const links = manager.getLinksFrom('REQ-001');
    expect(links[0].verified).toBe(true);
  });

  it('should not throw when verifying a non-existent link', () => {
    expect(() => manager.verifyLink('TL-999')).not.toThrow();
  });

  it('should remove a link by ID', () => {
    const link = manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    const removed = manager.removeLink(link.id);
    expect(removed).toBe(true);
    expect(manager.getLinksFrom('REQ-001')).toHaveLength(0);
  });

  it('should return false when removing a non-existent link', () => {
    expect(manager.removeLink('TL-999')).toBe(false);
  });

  it('should compute coverage matrix for given source IDs', () => {
    manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    manager.addLink('REQ-002', 'DES-002', 'requirement-to-design');

    const matrix = manager.getMatrix(['REQ-001', 'REQ-002', 'REQ-003']);
    expect(matrix.coverage.total).toBe(3);
    expect(matrix.coverage.covered).toBe(2);
    expect(matrix.coverage.percent).toBe(67);
    expect(matrix.links).toHaveLength(2);
  });

  it('should handle empty source IDs in getMatrix', () => {
    const matrix = manager.getMatrix([]);
    expect(matrix.coverage.total).toBe(0);
    expect(matrix.coverage.covered).toBe(0);
    expect(matrix.coverage.percent).toBe(0);
  });

  it('should find unlinked IDs', () => {
    manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    manager.addLink('REQ-002', 'DES-002', 'requirement-to-design');

    const unlinked = manager.findUnlinked(['REQ-001', 'REQ-002', 'REQ-003', 'DES-001', 'DES-003']);
    expect(unlinked).toEqual(['REQ-003', 'DES-003']);
  });

  it('should produce a markdown traceability table', () => {
    manager.addLink('REQ-001', 'DES-001', 'requirement-to-design');
    const link2 = manager.addLink('DES-001', 'CODE-001', 'design-to-code');
    manager.verifyLink(link2.id);

    const md = manager.toMarkdown();
    expect(md).toContain('| ID | Source | Target | Type | Verified |');
    expect(md).toContain('REQ-001');
    expect(md).toContain('DES-001');
    expect(md).toContain('✓');
    expect(md).toContain('✗');
  });

  it('should support all trace link types', () => {
    const types: TraceLinkType[] = [
      'requirement-to-design',
      'design-to-code',
      'code-to-test',
      'requirement-to-test',
      'design-to-test',
    ];
    for (const type of types) {
      const link = manager.addLink('SRC', 'TGT', type);
      expect(link.type).toBe(type);
    }
  });
});
