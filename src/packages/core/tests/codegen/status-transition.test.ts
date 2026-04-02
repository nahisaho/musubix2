import { describe, it, expect } from 'vitest';
import {
  StatusTransitionGenerator,
  createStatusTransitionGenerator,
  type StateMachineSpec,
} from '../../src/codegen/status-transition.js';

const sampleSpec: StateMachineSpec = {
  name: 'Order',
  statuses: [
    { name: 'draft', description: 'Initial order state' },
    { name: 'submitted', description: 'Order submitted' },
    { name: 'approved', description: 'Order approved' },
    { name: 'rejected', description: 'Order rejected', terminal: true },
    { name: 'completed', description: 'Order completed', terminal: true },
  ],
  transitions: [
    { from: 'draft', to: 'submitted', action: 'submit' },
    { from: 'submitted', to: 'approved', guard: 'isValid' },
    { from: 'submitted', to: 'rejected', guard: '!isValid' },
    { from: 'approved', to: 'completed', action: 'complete' },
  ],
  initialStatus: 'draft',
};

describe('DES-COD-006: StatusTransitionGenerator', () => {
  it('should create via factory function', () => {
    const gen = createStatusTransitionGenerator();
    expect(gen).toBeInstanceOf(StatusTransitionGenerator);
  });

  it('should generate a TypeScript state machine class', () => {
    const gen = new StatusTransitionGenerator();
    const code = gen.generate(sampleSpec);
    expect(code).toContain("export type OrderStatus =");
    expect(code).toContain("export class OrderStateMachine");
    expect(code).toContain("'draft'");
    expect(code).toContain('canTransition');
    expect(code).toContain('getStatus');
  });

  it('should generate a Mermaid state diagram', () => {
    const gen = new StatusTransitionGenerator();
    const mermaid = gen.toMermaid(sampleSpec);
    expect(mermaid).toContain('stateDiagram-v2');
    expect(mermaid).toContain('[*] --> draft');
    expect(mermaid).toContain('draft --> submitted');
    expect(mermaid).toContain('rejected --> [*]');
    expect(mermaid).toContain('completed --> [*]');
  });

  it('should include guards in Mermaid diagram', () => {
    const gen = new StatusTransitionGenerator();
    const mermaid = gen.toMermaid(sampleSpec);
    expect(mermaid).toContain('submitted --> approved : isValid');
  });

  it('should validate a valid spec successfully', () => {
    const gen = new StatusTransitionGenerator();
    const result = gen.validate(sampleSpec);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect undefined statuses in transitions', () => {
    const gen = new StatusTransitionGenerator();
    const badSpec: StateMachineSpec = {
      name: 'Bad',
      statuses: [{ name: 'a', description: 'A' }],
      transitions: [{ from: 'a', to: 'b' }],
      initialStatus: 'a',
    };
    const result = gen.validate(badSpec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("'b'"))).toBe(true);
  });

  it('should detect unreachable states', () => {
    const gen = new StatusTransitionGenerator();
    const spec: StateMachineSpec = {
      name: 'Unreachable',
      statuses: [
        { name: 'start', description: 'Start' },
        { name: 'end', description: 'End' },
        { name: 'orphan', description: 'Orphan state' },
      ],
      transitions: [{ from: 'start', to: 'end' }],
      initialStatus: 'start',
    };
    const result = gen.validate(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('orphan'))).toBe(true);
  });
});
