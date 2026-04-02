import { describe, it, expect } from 'vitest';
import {
  RequirementWizard,
  AcceptanceCriteriaGenerator,
  createRequirementWizard,
  createAcceptanceCriteriaGenerator,
  type ProjectContext,
} from '../../src/requirements/index.js';

describe('DES-REQ-003: RequirementWizard', () => {
  it('should return wizard steps via getSteps()', () => {
    const wizard = new RequirementWizard();
    const steps = wizard.getSteps();
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps[0].id).toBe('feature-name');
    expect(steps[1].id).toBe('pattern');
  });

  it('should generate ubiquitous requirement', () => {
    const wizard = new RequirementWizard();
    const result = wizard.generate({
      'feature-name': 'Login',
      'pattern': 'ubiquitous',
      'action': 'authenticate the user',
    });

    expect(result.pattern).toBe('ubiquitous');
    expect(result.earsText).toContain('SHALL');
    expect(result.earsText).toContain('authenticate the user');
  });

  it('should generate event-driven requirement', () => {
    const wizard = new RequirementWizard();
    const result = wizard.generate({
      'feature-name': 'Notification',
      'pattern': 'event-driven',
      'trigger': 'user clicks submit',
      'action': 'send a notification',
    });

    expect(result.pattern).toBe('event-driven');
    expect(result.earsText).toContain('WHEN');
    expect(result.earsText).toContain('user clicks submit');
  });

  it('should generate state-driven requirement', () => {
    const wizard = new RequirementWizard();
    const result = wizard.generate({
      'feature-name': 'Maintenance',
      'pattern': 'state-driven',
      'condition': 'the system is in maintenance mode',
      'action': 'reject user requests',
    });

    expect(result.pattern).toBe('state-driven');
    expect(result.earsText).toContain('WHILE');
    expect(result.earsText).toContain('the system is in maintenance mode');
  });

  it('should generate complex requirement', () => {
    const wizard = new RequirementWizard();
    const result = wizard.generate({
      'feature-name': 'AutoSave',
      'pattern': 'complex',
      'trigger': 'timer fires',
      'condition': 'document is modified',
      'action': 'save the document',
    });

    expect(result.pattern).toBe('complex');
    expect(result.earsText).toContain('WHILE');
    expect(result.earsText).toContain('WHEN');
  });

  it('should increment counter for each generated requirement', () => {
    const wizard = new RequirementWizard();
    const r1 = wizard.generate({ 'action': 'do A' });
    const r2 = wizard.generate({ 'action': 'do B' });

    expect(r1.id).toBe('REQ-GEN-001');
    expect(r2.id).toBe('REQ-GEN-002');
  });

  it('should format markdown correctly', () => {
    const wizard = new RequirementWizard();
    const result = wizard.generate({
      'feature-name': 'Search',
      'pattern': 'ubiquitous',
      'action': 'return results',
    });

    expect(result.markdown).toContain('### REQ-GEN-001: Search');
    expect(result.markdown).toContain('**パターン**: ubiquitous');
    expect(result.markdown).toContain('**受入基準**:');
  });

  it('should be created by factory function', () => {
    const wizard = createRequirementWizard();
    expect(wizard).toBeInstanceOf(RequirementWizard);
  });
});

describe('DES-REQ-003: AcceptanceCriteriaGenerator', () => {
  const generator = new AcceptanceCriteriaGenerator();
  const context: ProjectContext = { projectName: 'TestProject' };

  it('should generate criteria with SHALL keyword', () => {
    const criteria = generator.generate('The system SHALL save data.', context);
    expect(criteria.some(c => c.includes('SHALL句'))).toBe(true);
  });

  it('should generate criteria with WHEN keyword', () => {
    const criteria = generator.generate('WHEN user logs in, the system SHALL greet.', context);
    expect(criteria.some(c => c.includes('トリガー条件'))).toBe(true);
  });

  it('should generate criteria with WHILE keyword', () => {
    const criteria = generator.generate('WHILE idle, the system SHALL sleep.', context);
    expect(criteria.some(c => c.includes('状態条件'))).toBe(true);
  });

  it('should always include standard criteria', () => {
    const criteria = generator.generate('Simple text.', context);
    expect(criteria.some(c => c.includes('テストが作成'))).toBe(true);
    expect(criteria.some(c => c.includes('ドキュメントが更新'))).toBe(true);
  });

  it('should include project name in criteria', () => {
    const criteria = generator.generate('The system SHALL work.', context);
    expect(criteria.some(c => c.includes('TestProject'))).toBe(true);
  });

  it('should be created by factory function', () => {
    const gen = createAcceptanceCriteriaGenerator();
    expect(gen).toBeInstanceOf(AcceptanceCriteriaGenerator);
  });
});
