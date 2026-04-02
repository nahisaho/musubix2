import { describe, it, expect } from 'vitest';
import { EARSValidator, createEARSValidator } from '../../src/validators/ears-validator.js';

describe('REQ-REQ-001: EARSValidator', () => {
  const validator = new EARSValidator();

  describe('analyze - pattern classification', () => {
    it('should classify UBIQUITOUS pattern', () => {
      const result = validator.analyze('THE system SHALL display a welcome message.');
      expect(result.pattern).toBe('ubiquitous');
      expect(result.confidence).toBeGreaterThan(0.50);
    });

    it('should classify EVENT-DRIVEN pattern', () => {
      const result = validator.analyze('WHEN the user clicks submit, THE system SHALL save the form.');
      expect(result.pattern).toBe('event-driven');
      expect(result.confidence).toBeGreaterThan(0.70);
      expect(result.triggers).toHaveLength(1);
      expect(result.triggers[0]).toContain('user clicks submit');
    });

    it('should classify STATE-DRIVEN pattern', () => {
      const result = validator.analyze('WHILE the system is in maintenance mode, THE system SHALL reject requests.');
      expect(result.pattern).toBe('state-driven');
      expect(result.confidence).toBeGreaterThan(0.70);
      expect(result.triggers).toHaveLength(1);
    });

    it('should classify UNWANTED pattern', () => {
      const result = validator.analyze('THE system SHALL NOT expose internal error details.');
      expect(result.pattern).toBe('unwanted');
      expect(result.confidence).toBeGreaterThan(0.60);
    });

    it('should classify OPTIONAL pattern', () => {
      const result = validator.analyze('WHERE premium feature is enabled, THE system SHALL show analytics.');
      expect(result.pattern).toBe('optional');
      expect(result.confidence).toBeGreaterThan(0.60);
    });

    it('should classify COMPLEX pattern', () => {
      const result = validator.analyze('IF the retry count exceeds 3, THEN THE system SHALL circuit break.');
      expect(result.pattern).toBe('complex');
      expect(result.confidence).toBeGreaterThan(0.50);
    });

    it('should classify COMPLEX for multi-keyword combinations', () => {
      const result = validator.analyze('WHEN user logs in WHILE maintenance mode is active, THE system SHALL warn.');
      expect(result.pattern).toBe('complex');
    });

    it('should give low confidence for non-EARS text', () => {
      const result = validator.analyze('The system displays data');
      expect(result.confidence).toBeLessThan(0.50);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('analyze - confidence scoring', () => {
    it('should boost confidence for complete sentences', () => {
      const withPeriod = validator.analyze('THE system SHALL log events.');
      const withoutPeriod = validator.analyze('THE system SHALL log events');
      expect(withPeriod.confidence).toBeGreaterThan(withoutPeriod.confidence);
    });

    it('should penalize very short requirements', () => {
      const short = validator.analyze('SHALL log.');
      const normal = validator.analyze('THE system SHALL log all authentication events.');
      expect(normal.confidence).toBeGreaterThan(short.confidence);
    });

    it('should achieve >= 0.85 for well-formed EARS', () => {
      const result = validator.analyze(
        'WHEN the user submits a form, THE system SHALL validate all fields.',
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('analyze - markdown blockquote format', () => {
    it('should strip blockquote markers', () => {
      const result = validator.analyze(
        '> THE system SHALL process requests.',
        { sourceFormat: 'markdown-blockquote' },
      );
      expect(result.pattern).toBe('ubiquitous');
      expect(result.confidence).toBeGreaterThan(0.50);
    });
  });

  describe('validate', () => {
    it('should validate well-formed requirement', () => {
      const result = validator.validate('THE system SHALL display a message.');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag missing SHALL', () => {
      const result = validator.validate('The system displays data');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('SHALL'))).toBe(true);
    });
  });

  describe('factory', () => {
    it('should create validator via factory', () => {
      const v = createEARSValidator();
      expect(v).toBeInstanceOf(EARSValidator);
    });
  });
});
