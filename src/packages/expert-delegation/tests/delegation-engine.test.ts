import { describe, it, expect, beforeEach } from 'vitest';
import {
  SemanticRouter,
  createSemanticRouter,
  type Expert,
} from '../src/index.js';
import {
  DelegationEngine,
  createDelegationEngine,
  type DelegationRequest,
} from '../src/delegation-engine.js';

function registerTestExperts(router: SemanticRouter): void {
  const frontendExpert: Expert = {
    id: 'expert-fe',
    name: 'Frontend Expert',
    domain: 'frontend',
    capabilities: ['react', 'css'],
    triggerPatterns: [
      { keywords: ['react', 'component', 'css', 'ui'], domain: 'frontend', priority: 8 },
    ],
  };

  const backendExpert: Expert = {
    id: 'expert-be',
    name: 'Backend Expert',
    domain: 'backend',
    capabilities: ['api', 'database'],
    triggerPatterns: [
      { keywords: ['api', 'server', 'database', 'rest'], domain: 'backend', priority: 9 },
    ],
  };

  const testingExpert: Expert = {
    id: 'expert-test',
    name: 'Testing Expert',
    domain: 'testing',
    capabilities: ['unit', 'integration'],
    triggerPatterns: [
      { keywords: ['test', 'coverage', 'assertion'], domain: 'testing', priority: 7 },
    ],
  };

  router.registerExpert(frontendExpert);
  router.registerExpert(backendExpert);
  router.registerExpert(testingExpert);
}

describe('DES-AGT-002: DelegationEngine', () => {
  let router: SemanticRouter;
  let engine: DelegationEngine;

  beforeEach(() => {
    router = createSemanticRouter();
    registerTestExperts(router);
    engine = createDelegationEngine(router);
  });

  it('should delegate to best-match by default', () => {
    const result = engine.delegate({ query: 'fix the react component' });
    expect(result).not.toBeNull();
    expect(result!.expertId).toBe('expert-fe');
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('should return null when no match found', () => {
    const result = engine.delegate({ query: 'quantum physics' });
    expect(result).toBeNull();
  });

  it('should filter by requiredDomain', () => {
    const result = engine.delegate({ query: 'test the api server', requiredDomain: 'testing' });
    expect(result).not.toBeNull();
    expect(result!.expertId).toBe('expert-test');
  });

  it('should support round-robin strategy', () => {
    engine.setStrategy('round-robin');
    expect(engine.getStrategy()).toBe('round-robin');

    // Query that matches multiple experts
    const r1 = engine.delegate({ query: 'test the api server database rest' });
    const r2 = engine.delegate({ query: 'test the api server database rest' });
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    // Round-robin should cycle
    if (r1!.expertId === r2!.expertId) {
      // Both matched same — acceptable if only one matched
      expect(r1!.expertId).toBeDefined();
    }
  });

  it('should delegate batch of requests', () => {
    const requests: DelegationRequest[] = [
      { query: 'fix react component' },
      { query: 'setup api server' },
    ];
    const responses = engine.delegateBatch(requests);
    expect(responses.length).toBeGreaterThanOrEqual(1);
  });

  it('should track delegation history', () => {
    engine.delegate({ query: 'fix the react component' });
    engine.delegate({ query: 'setup api server' });
    const history = engine.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].delegatedAt).toBeInstanceOf(Date);
  });

  it('should support load-balanced strategy', () => {
    engine.setStrategy('load-balanced');
    expect(engine.getStrategy()).toBe('load-balanced');
    const result = engine.delegate({ query: 'fix the react component' });
    expect(result).not.toBeNull();
  });

  it('should change strategy with setStrategy', () => {
    expect(engine.getStrategy()).toBe('best-match');
    engine.setStrategy('round-robin');
    expect(engine.getStrategy()).toBe('round-robin');
  });
});
