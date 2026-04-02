import { describe, it, expect } from 'vitest';
import { DesignGenerator } from '../../src/design/index.js';

describe('REQ-DES-001 / REQ-DES-004: Design traceability link generation', () => {
  describe('generateWithTraceability', () => {
    it('should return design output and traceability links', () => {
      const gen = new DesignGenerator();
      const result = gen.generateWithTraceability([
        { id: 'REQ-001', text: 'The system SHALL authenticate users.' },
        { id: 'REQ-002', text: 'The system SHALL log events.' },
      ]);

      expect(result.design).toBeDefined();
      expect(result.design.document).toBeDefined();
      expect(result.design.elementIds.length).toBeGreaterThan(0);
      expect(result.traceabilityLinks.length).toBeGreaterThan(0);
    });

    it('should link every requirement back to a design element', () => {
      const gen = new DesignGenerator();
      const reqs = [
        { id: 'REQ-AUTH-001', text: 'SHALL authenticate' },
        { id: 'REQ-AUTH-002', text: 'SHALL authorize' },
        { id: 'REQ-DATA-001', text: 'SHALL persist data' },
      ];
      const result = gen.generateWithTraceability(reqs);

      const linkedReqIds = new Set(result.traceabilityLinks.map((l) => l.reqId));
      for (const req of reqs) {
        expect(linkedReqIds.has(req.id)).toBe(true);
      }
    });

    it('should produce links whose desId matches a section id', () => {
      const gen = new DesignGenerator();
      const result = gen.generateWithTraceability([
        { id: 'REQ-001', text: 'SHALL do something' },
      ]);

      const sectionIds = new Set(result.design.document.sections.map((s) => s.id));
      for (const link of result.traceabilityLinks) {
        expect(sectionIds.has(link.desId)).toBe(true);
      }
    });

    it('should handle empty requirements array', () => {
      const gen = new DesignGenerator();
      const result = gen.generateWithTraceability([]);

      expect(result.design.document.sections).toHaveLength(0);
      expect(result.traceabilityLinks).toHaveLength(0);
    });
  });

  describe('validateTraceabilityCoverage', () => {
    it('should return 100% coverage when all requirements are linked', () => {
      const gen = new DesignGenerator();
      const links = [
        { reqId: 'REQ-001', desId: 'DES-001' },
        { reqId: 'REQ-002', desId: 'DES-002' },
        { reqId: 'REQ-003', desId: 'DES-003' },
      ];
      const result = gen.validateTraceabilityCoverage(links, 3);

      expect(result.coverage).toBe(1);
      expect(result.gaps).toHaveLength(0);
    });

    it('should detect gaps for missing requirements', () => {
      const gen = new DesignGenerator();
      const links = [{ reqId: 'REQ-001', desId: 'DES-001' }];
      const result = gen.validateTraceabilityCoverage(links, 3);

      expect(result.coverage).toBeCloseTo(1 / 3);
      expect(result.gaps).toContain('REQ-002');
      expect(result.gaps).toContain('REQ-003');
    });

    it('should return full coverage for zero total requirements', () => {
      const gen = new DesignGenerator();
      const result = gen.validateTraceabilityCoverage([], 0);

      expect(result.coverage).toBe(1);
      expect(result.gaps).toHaveLength(0);
    });

    it('should return 0 coverage when no links provided but reqs exist', () => {
      const gen = new DesignGenerator();
      const result = gen.validateTraceabilityCoverage([], 2);

      expect(result.coverage).toBe(0);
      expect(result.gaps).toHaveLength(2);
    });
  });
});
