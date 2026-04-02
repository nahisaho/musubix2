import { describe, it, expect } from 'vitest';
import {
  MarkdownEARSParser,
  RequirementsValidator,
  createMarkdownEARSParser,
  createRequirementsValidator,
} from '../../src/validators/markdown-ears-parser.js';

const SAMPLE_MARKDOWN = `
# Requirements

### REQ-ARC-001: モノレポ構成

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE system SHALL use npm workspaces for monorepo management.

**受入基準**:
- [ ] npm workspaces configured
- [ ] tsc -b builds all packages

**トレーサビリティ**: DES-ARC-001
**パッケージ**: \`core\`

### REQ-REQ-001: EARS形式要件分析

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN the user submits a requirement, THE system SHALL classify it into an EARS pattern.

**受入基準**:
- [ ] All 6 EARS patterns supported
- [ ] Confidence score >= 0.70

**トレーサビリティ**: DES-REQ-001
**パッケージ**: \`core\`

### REQ-GOV-001: 憲法ガバナンス

**種別**: UNWANTED
**優先度**: P0

**要件**:
THE system SHALL NOT allow phase transitions without quality gate approval.

**受入基準**:
- [ ] Phase transitions blocked without approval

**トレーサビリティ**: DES-GOV-001
**パッケージ**: \`policy\`
`;

describe('REQ-REQ-002: MarkdownEARSParser', () => {
  const parser = new MarkdownEARSParser();

  it('should parse requirements from markdown', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs).toHaveLength(3);
  });

  it('should extract requirement IDs', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs.map((r) => r.id)).toEqual(['REQ-ARC-001', 'REQ-REQ-001', 'REQ-GOV-001']);
  });

  it('should extract titles', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[0].title).toBe('モノレポ構成');
    expect(reqs[1].title).toBe('EARS形式要件分析');
  });

  it('should extract requirement text', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[0].text).toContain('npm workspaces');
  });

  it('should extract EARS pattern from type field', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[0].pattern).toBe('ubiquitous');
    expect(reqs[1].pattern).toBe('event-driven');
    expect(reqs[2].pattern).toBe('unwanted');
  });

  it('should extract priority', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs.every((r) => r.priority === 'P0')).toBe(true);
  });

  it('should extract acceptance criteria', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[0].acceptanceCriteria).toHaveLength(2);
    expect(reqs[0].acceptanceCriteria![0]).toContain('npm workspaces');
  });

  it('should extract traceability', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[0].traceability).toBe('DES-ARC-001');
    expect(reqs[2].traceability).toBe('DES-GOV-001');
  });

  it('should extract package', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[0].package).toBe('core');
    expect(reqs[2].package).toBe('policy');
  });

  it('should skip code blocks', () => {
    const md = `
### REQ-TST-001: Test

**要件**:
THE system SHALL run tests.

\`\`\`typescript
### REQ-FAKE-001: Not a real requirement
\`\`\`

### REQ-TST-002: Another

**要件**:
THE system SHALL validate.
`;
    const reqs = parser.parse(md);
    expect(reqs.map((r) => r.id)).toEqual(['REQ-TST-001', 'REQ-TST-002']);
  });

  it('should compute confidence scores', () => {
    const reqs = parser.parse(SAMPLE_MARKDOWN);
    expect(reqs[1].confidence).toBeGreaterThan(0.70);
  });

  it('should create via factory', () => {
    expect(createMarkdownEARSParser()).toBeInstanceOf(MarkdownEARSParser);
  });
});

describe('REQ-REQ-002: RequirementsValidator', () => {
  const validator = new RequirementsValidator();

  it('should validate valid requirements', () => {
    const result = validator.validate(SAMPLE_MARKDOWN);
    expect(result.requirements).toHaveLength(3);
  });

  it('should detect missing requirement text', () => {
    const md = `
### REQ-BAD-001: Empty req

**種別**: UBIQUITOUS
**優先度**: P0
`;
    const result = validator.validate(md);
    expect(result.issues.some((i) => i.message.includes('empty'))).toBe(true);
  });

  it('should detect missing acceptance criteria', () => {
    const md = `
### REQ-BAD-002: No AC

**要件**:
THE system SHALL do something.
`;
    const result = validator.validate(md);
    expect(result.issues.some((i) => i.message.includes('acceptance criteria'))).toBe(true);
  });

  it('should map requirements by ID', () => {
    const result = validator.validate(SAMPLE_MARKDOWN);
    const map = validator.map(result.requirements);
    expect(map.get('REQ-ARC-001')).toBeDefined();
    expect(map.get('REQ-REQ-001')?.pattern).toBe('event-driven');
  });

  it('should search requirements', () => {
    const result = validator.validate(SAMPLE_MARKDOWN);
    const found = validator.search('EARS', result.requirements);
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('REQ-REQ-001');
  });

  it('should search by ID', () => {
    const result = validator.validate(SAMPLE_MARKDOWN);
    const found = validator.search('GOV', result.requirements);
    expect(found).toHaveLength(1);
  });

  it('should create via factory', () => {
    expect(createRequirementsValidator()).toBeInstanceOf(RequirementsValidator);
  });
});
