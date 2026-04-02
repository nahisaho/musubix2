import { describe, it, expect } from 'vitest';
import { ReasoningChainRecorder, ExplanationGenerator } from '../../src/explanation/index.js';

describe('REQ-EXP-001: ReasoningChainRecorder', () => {
  it('should start and conclude a chain', () => {
    const recorder = new ReasoningChainRecorder();
    const id = recorder.startChain('EARS Classification');
    recorder.addStep('Parse requirement text', ['Input: "WHEN user..."'], 0.90);
    recorder.addStep('Match EARS pattern', ['Pattern: event-driven'], 0.85);
    const chain = recorder.conclude('Classified as EVENT-DRIVEN with 87.5% confidence');

    expect(chain.id).toBe(id);
    expect(chain.steps).toHaveLength(2);
    expect(chain.conclusion).toContain('EVENT-DRIVEN');
    expect(chain.overallConfidence).toBeCloseTo(0.875, 2);
  });

  it('should throw when adding step without active chain', () => {
    const recorder = new ReasoningChainRecorder();
    expect(() => recorder.addStep('step', [], 0.5)).toThrow('No active reasoning chain');
  });

  it('should throw when concluding without active chain', () => {
    const recorder = new ReasoningChainRecorder();
    expect(() => recorder.conclude('done')).toThrow('No active reasoning chain');
  });

  it('should clamp confidence to [0, 1]', () => {
    const recorder = new ReasoningChainRecorder();
    recorder.startChain('test');
    const step = recorder.addStep('over', [], 1.5);
    expect(step.confidence).toBe(1.0);
    const step2 = recorder.addStep('under', [], -0.5);
    expect(step2.confidence).toBe(0.0);
  });

  it('should get chain by ID', () => {
    const recorder = new ReasoningChainRecorder();
    const id = recorder.startChain('test');
    recorder.conclude('done');
    expect(recorder.getChain(id)).toBeDefined();
    expect(recorder.getChain('nonexistent')).toBeUndefined();
  });

  it('should get all chains', () => {
    const recorder = new ReasoningChainRecorder();
    recorder.startChain('chain1');
    recorder.conclude('done1');
    recorder.startChain('chain2');
    recorder.conclude('done2');
    expect(recorder.getAllChains()).toHaveLength(2);
  });

  it('should include metadata in steps', () => {
    const recorder = new ReasoningChainRecorder();
    recorder.startChain('test');
    const step = recorder.addStep('step', [], 0.8, { reqId: 'REQ-001' });
    expect(step.metadata?.reqId).toBe('REQ-001');
  });
});

describe('REQ-EXP-001: ExplanationGenerator', () => {
  function createTestChain() {
    const recorder = new ReasoningChainRecorder();
    recorder.startChain('Design Decision');
    recorder.addStep('Analyzed requirements', ['REQ-ARC-001'], 0.90);
    recorder.addStep('Selected pattern', ['Strategy pattern'], 0.85);
    return recorder.conclude('Use Strategy pattern for command dispatch');
  }

  const generator = new ExplanationGenerator();

  it('should generate markdown explanation', () => {
    const chain = createTestChain();
    const md = generator.generate(chain, { format: 'markdown' });
    expect(md).toContain('# Design Decision');
    expect(md).toContain('## 推論ステップ');
    expect(md).toContain('Analyzed requirements');
    expect(md).toContain('Strategy pattern');
    expect(md).toContain('## 結論');
  });

  it('should generate text explanation', () => {
    const chain = createTestChain();
    const text = generator.generate(chain, { format: 'text' });
    expect(text).toContain('Design Decision');
    expect(text).toContain('1. Analyzed requirements');
    expect(text).toContain('結論:');
  });

  it('should generate JSON explanation', () => {
    const chain = createTestChain();
    const json = generator.generate(chain, { format: 'json' });
    const parsed = JSON.parse(json);
    expect(parsed.title).toBe('Design Decision');
    expect(parsed.steps).toHaveLength(2);
  });

  it('should include evidence when requested', () => {
    const chain = createTestChain();
    const md = generator.generate(chain, { includeEvidence: true });
    expect(md).toContain('REQ-ARC-001');
  });

  it('should exclude evidence when not requested', () => {
    const chain = createTestChain();
    const md = generator.generate(chain, { includeEvidence: false });
    expect(md).not.toContain('REQ-ARC-001');
  });

  it('should include confidence percentages', () => {
    const chain = createTestChain();
    const md = generator.generate(chain, { includeConfidence: true });
    expect(md).toContain('%');
  });

  it('should default to markdown format', () => {
    const chain = createTestChain();
    const result = generator.generate(chain);
    expect(result).toContain('#');
  });
});
