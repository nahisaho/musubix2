import { describe, it, expect } from 'vitest';
import {
  DesignGenerator,
  SOLIDValidator,
  createDesignGenerator,
  createSOLIDValidator,
  deriveOperation,
  deriveMethodSignature,
  type ParsedRequirementInput,
  type DesignDocument,
} from '../../src/design/index.js';

describe('deriveOperation', () => {
  it('derives a camelCase operation from a SHALL clause', () => {
    expect(deriveOperation('THE system SHALL create a user account.')).toBe('createUserAccount');
  });

  it('prefixes SHALL NOT clauses with reject', () => {
    expect(deriveOperation('THE system SHALL NOT expose personal data.')).toBe('rejectExposePersonalData');
  });

  it('falls back to the title when there is no SHALL clause', () => {
    expect(deriveOperation('no keyword here', 'Password Reset')).toBe('passwordReset');
  });

  it('falls back to execute when nothing usable is present', () => {
    expect(deriveOperation('the system shall the a of')).toBe('execute');
  });

  // v0.5.51 — trim trailing prepositions/quantifiers left by the word cap.
  it('trims a trailing preposition from the operation name', () => {
    expect(deriveOperation('THE system SHALL read the current temperature every second.')).toBe('readCurrentTemperature');
  });

  it('trims a trailing quantifier from the operation name', () => {
    expect(deriveOperation('THE system SHALL lower the target by two degrees.')).toBe('lowerTarget');
  });
});

describe('deriveMethodSignature (v0.5.46)', () => {
  it('infers a value return type from a producing verb', () => {
    const sig = deriveMethodSignature('THE system SHALL issue a session token.');
    expect(sig.name).toBe('issueSessionToken');
    expect(sig.returnType).toBe('SessionToken');
  });

  // v0.5.64 — parameters are inferred from an input clause.
  it('infers parameters from a "submits …" clause', () => {
    const sig = deriveMethodSignature('WHEN a user submits an email and password, THE system SHALL create an account.');
    expect(sig.name).toBe('createAccount');
    expect(sig.params).toBe('email: string, password: string');
  });

  it('leaves params empty when there is no input clause', () => {
    expect(deriveMethodSignature('THE system SHALL issue a session token.').params).toBe('');
  });

  it('infers boolean for validating verbs', () => {
    expect(deriveMethodSignature('THE system SHALL validate the credentials.').returnType).toBe('boolean');
  });

  it('infers boolean for SHALL NOT guards', () => {
    expect(deriveMethodSignature('THE system SHALL NOT expose personal data.').returnType).toBe('boolean');
  });

  it('infers an array for collection verbs', () => {
    expect(deriveMethodSignature('THE system SHALL list active sessions.').returnType).toBe('ActiveSessions[]');
  });

  it('defaults to void for verbs with no clear result', () => {
    expect(deriveMethodSignature('THE system SHALL email a reset link.').returnType).toBe('void');
  });
});

describe('DesignGenerator — enriched sections (v0.5.45)', () => {
  // v0.5.52 — multiple requirements in one domain cohere into a single service.
  it('derives a cohesive domain service with a method per requirement', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-USR-001', title: 'User Registration', text: 'WHEN a visitor signs up, THE system SHALL create a user account.', pattern: 'event-driven' },
      { id: 'REQ-USR-002', title: 'User Login', text: 'THE system SHALL issue a session token.', pattern: 'ubiquitous' },
    ]);
    const section = doc.sections[0];
    expect(section.responsibilities).toHaveLength(2);
    // Two USR requirements → one UsrService owning both operations.
    expect(section.components).toHaveLength(1);
    const svc = section.components[0];
    expect(svc.name).toBe('UsrService');
    expect(svc.methods.map((m) => m.name)).toEqual(['createUserAccount', 'issueSessionToken']);
    expect(svc.requirementIds).toEqual(['REQ-USR-001', 'REQ-USR-002']);
    expect(section.dataEntities).toContain('User');
    expect(section.description).toContain('Components:');
    expect(section.description).toContain('createUserAccount()');
  });

  it('keeps a descriptive title-based name for a single-requirement domain', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-REG-001', title: 'User Registration', text: 'THE system SHALL create a user account.', pattern: 'ubiquitous' },
    ]);
    expect(doc.sections[0].components[0].name).toBe('UserRegistrationService');
  });

  it('does not double-suffix a single component whose title already ends in Service', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-PAY-001', title: 'Payment Service', text: 'THE system SHALL charge a card.', pattern: 'ubiquitous' },
    ]);
    expect(doc.sections[0].components[0].name).toBe('PaymentService');
  });

  it('normalises an all-caps domain code to Title case', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-PAY-001', title: 'Charge', text: 'THE system SHALL charge a card.', pattern: 'ubiquitous' },
      { id: 'REQ-PAY-002', title: 'Refund', text: 'THE system SHALL refund a payment.', pattern: 'ubiquitous' },
    ]);
    expect(doc.sections[0].components[0].name).toBe('PayService');
  });

  // v0.5.58 — states are inferred from WHILE clauses for a state-machine service.
  it('infers state names from WHILE clauses', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-PIPE-001', title: 'Ingest', text: 'WHILE the pipeline is running, THE system SHALL ingest events.', pattern: 'state-driven' },
      { id: 'REQ-PIPE-002', title: 'Drain', text: 'WHILE the pipeline is draining, THE system SHALL flush events.', pattern: 'state-driven' },
    ]);
    expect(doc.sections[0].components[0].states).toEqual(['Running', 'Draining']);
  });

  // v0.5.63 — a non-ASCII (e.g. Japanese) title must not yield an empty name.
  it('falls back to the operation name when the title has no ASCII', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-STAT-001', title: 'クリック計測', text: 'WHEN a link is visited, THE system SHALL record a click event.', pattern: 'event-driven' },
    ]);
    expect(doc.sections[0].components[0].name).toBe('RecordClickEventService');
  });

  it('uses the last word when a WHILE clause has no "is"', () => {
    const gen = new DesignGenerator();
    const doc = gen.generate([
      { id: 'REQ-JOB-001', title: 'Drain', text: 'WHILE draining, THE system SHALL flush.', pattern: 'state-driven' },
    ]);
    expect(doc.sections[0].components[0].states).toEqual(['Draining']);
  });
});

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

  // v0.5.69 — interface names must be valid TS identifiers even when the title
  // contains punctuation ("In-progress tracking" → not "IIn-progressTracking").
  it('produces valid identifier interface names from punctuated titles', () => {
    const generator = new DesignGenerator();
    const reqs: ParsedRequirementInput[] = [
      { id: 'REQ-RIDE-002', title: 'In-progress tracking', text: 'WHILE a trip is in progress, THE system SHALL update.', pattern: 'state-driven' },
    ];
    const doc = generator.generate(reqs);
    for (const iface of doc.sections[0].interfaces) {
      expect(iface).toMatch(/^I[A-Za-z0-9]*$/); // no hyphens or other punctuation
    }
    expect(doc.sections[0].interfaces).toContain('IProgressTracking');
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

  // v0.5.55 — optional (WHERE …) maps to a feature-flag pattern.
  it('should suggest Feature Toggle for an optional (WHERE) requirement', () => {
    const generator = new DesignGenerator();
    const doc = generator.generate([
      { id: 'REQ-001', title: 'Eco Mode', text: 'WHERE eco mode is enabled, THE system SHALL lower the target.', pattern: 'optional' },
    ]);
    expect(doc.sections[0].patterns).toContain('Feature Toggle');
    expect(doc.sections[0].patterns).not.toContain('Simple Implementation');
  });

  // v0.5.55 — a keyword must not be detected inside another word.
  it('does not mistake "verify" for the IF keyword', () => {
    const generator = new DesignGenerator();
    const doc = generator.generate([
      { id: 'REQ-001', title: 'Verify Signature', text: 'THE system SHALL verify the signature.', pattern: 'ubiquitous' },
    ]);
    expect(doc.sections[0].patterns).not.toContain('Strategy');
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

  // v0.5.76 — tolerate partial/hand-written design JSON without crashing on
  // `undefined.length` (sections or their array fields may be missing).
  it('does not crash on partial designs with missing fields', () => {
    const v = new SOLIDValidator();
    expect(() => v.validate({ sections: [{ id: 'S1' }] } as never)).not.toThrow();
    expect(() => v.validate({} as never)).not.toThrow();
    const report = v.validate({ sections: [{ id: 'S1' }] } as never);
    expect(typeof report.score).toBe('number');
  });
});
