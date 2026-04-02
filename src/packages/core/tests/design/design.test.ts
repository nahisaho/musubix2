import { describe, it, expect } from 'vitest';
import {
  DesignGenerator,
  SOLIDValidator,
  createDesignGenerator,
  createSOLIDValidator,
  type ParsedRequirementInput,
  type DesignDocument,
} from '../../src/design/index.js';

describe('DES-DES-001: DesignGenerator', () => {
  it('should generate a design document from requirements', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-AUTH-001', title: 'User Login', text: 'The system SHALL authenticate users.', pattern: 'ubiquitous' },
    ];

    const doc = generator.generate(reqs);

    expect(doc.id).toBe('DES-DOC-001');
    expect(doc.title).toContain('1 Requirements');
    expect(doc.version).toBe('1.0');
    expect(doc.sections).toHaveLength(1);
    expect(doc.generatedAt).toBeInstanceOf(Date);
  });

  it('should group requirements by ID prefix', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-AUTH-001', title: 'Login', text: 'SHALL login', pattern: 'ubiquitous' },
      { id: 'REQ-AUTH-002', title: 'Logout', text: 'SHALL logout', pattern: 'ubiquitous' },
      { id: 'REQ-DATA-001', title: 'Save Data', text: 'SHALL save', pattern: 'ubiquitous' },
    ];

    const doc = generator.generate(reqs);

    expect(doc.sections).toHaveLength(2);
    const authSection = doc.sections.find(s => s.title.includes('REQ-AUTH'));
    expect(authSection).toBeDefined();
    expect(authSection!.requirementIds).toHaveLength(2);
  });

  it('should suggest interfaces from requirement titles', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'User Authentication', text: 'SHALL authenticate', pattern: 'ubiquitous' },
    ];

    const doc = generator.generate(reqs);
    expect(doc.sections[0].interfaces.length).toBeGreaterThan(0);
    expect(doc.sections[0].interfaces[0]).toMatch(/^I/);
  });

  it('should suggest Observer pattern for WHEN keyword', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'Notify User', text: 'WHEN event occurs, SHALL notify', pattern: 'event-driven' },
    ];

    const doc = generator.generate(reqs);
    expect(doc.sections[0].patterns).toContain('Observer');
  });

  it('should suggest State pattern for WHILE keyword', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'Idle Mode', text: 'WHILE idle, SHALL sleep', pattern: 'state-driven' },
    ];

    const doc = generator.generate(reqs);
    expect(doc.sections[0].patterns).toContain('State');
  });

  it('should suggest Strategy pattern for IF keyword', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'Error Handler', text: 'IF error occurs, SHALL retry', pattern: 'unwanted' },
    ];

    const doc = generator.generate(reqs);
    expect(doc.sections[0].patterns).toContain('Strategy');
  });

  it('should suggest Simple Implementation when no EARS keywords found', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'Basic Feature', text: 'The system SHALL work.', pattern: 'ubiquitous' },
    ];

    const doc = generator.generate(reqs);
    expect(doc.sections[0].patterns).toContain('Simple Implementation');
  });

  it('should increment document counter', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-001', title: 'Feature', text: 'SHALL work', pattern: 'ubiquitous' },
    ];

    const doc1 = generator.generate(reqs);
    const doc2 = generator.generate(reqs);

    expect(doc1.id).toBe('DES-DOC-001');
    expect(doc2.id).toBe('DES-DOC-002');
  });

  it('should be created by factory function', () => {
    const gen = createDesignGenerator();
    expect(gen).toBeInstanceOf(DesignGenerator);
  });
});

describe('DES-DES-001: SOLIDValidator', () => {
  const solidValidator = new SOLIDValidator();

  function makeDoc(sections: DesignDocument['sections']): DesignDocument {
    return {
      id: 'DES-DOC-001',
      title: 'Test Doc',
      version: '1.0',
      sections,
      generatedAt: new Date(),
    };
  }

  it('should give perfect score for well-designed document', () => {
    const doc = makeDoc([
      {
        id: 'SEC-001',
        title: 'Auth',
        requirementIds: ['REQ-001', 'REQ-002'],
        description: 'Auth section',
        interfaces: ['IAuth', 'IToken'],
        patterns: ['Observer'],
      },
    ]);

    const report = solidValidator.validate(doc);
    expect(report.score).toBe(100);
    expect(report.violations).toHaveLength(0);
  });

  it('should detect SRP violation when section has too many requirements', () => {
    const doc = makeDoc([
      {
        id: 'SEC-001',
        title: 'Monolith',
        requirementIds: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
        description: 'Too many',
        interfaces: ['IMonolith'],
        patterns: [],
      },
    ]);

    const report = solidValidator.validate(doc);
    const srp = report.violations.filter(v => v.principle === 'SRP');
    expect(srp).toHaveLength(1);
    expect(report.principleScores.SRP).toBeLessThan(100);
  });

  it('should detect DIP violation when section has no interfaces', () => {
    const doc = makeDoc([
      {
        id: 'SEC-001',
        title: 'Concrete',
        requirementIds: ['R1', 'R2'],
        description: 'No abstractions',
        interfaces: [],
        patterns: [],
      },
    ]);

    const report = solidValidator.validate(doc);
    const dip = report.violations.filter(v => v.principle === 'DIP');
    expect(dip).toHaveLength(1);
    expect(report.principleScores.DIP).toBeLessThan(100);
  });

  it('should detect ISP violation when section has too many interfaces', () => {
    const doc = makeDoc([
      {
        id: 'SEC-001',
        title: 'Fat Interface',
        requirementIds: ['R1'],
        description: 'Too many interfaces',
        interfaces: ['IA', 'IB', 'IC', 'ID', 'IE'],
        patterns: [],
      },
    ]);

    const report = solidValidator.validate(doc);
    const isp = report.violations.filter(v => v.principle === 'ISP');
    expect(isp).toHaveLength(1);
    expect(report.principleScores.ISP).toBeLessThan(100);
  });

  it('should not flag DIP for single-requirement section with no interfaces', () => {
    const doc = makeDoc([
      {
        id: 'SEC-001',
        title: 'Single',
        requirementIds: ['R1'],
        description: 'Single req',
        interfaces: [],
        patterns: [],
      },
    ]);

    const report = solidValidator.validate(doc);
    const dip = report.violations.filter(v => v.principle === 'DIP');
    expect(dip).toHaveLength(0);
  });

  it('should be created by factory function', () => {
    const v = createSOLIDValidator();
    expect(v).toBeInstanceOf(SOLIDValidator);
  });
});
