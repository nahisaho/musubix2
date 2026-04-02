import { describe, it, expect, beforeEach } from 'vitest';
import {
  SemanticRouter,
  createSemanticRouter,
  type Expert,
  type ExpertDomain,
} from '../src/index.js';

describe('DES-AGT-002: SemanticRouter', () => {
  let router: SemanticRouter;

  const frontendExpert: Expert = {
    id: 'expert-fe',
    name: 'Frontend Expert',
    domain: 'frontend',
    capabilities: ['react', 'css', 'accessibility'],
    triggerPatterns: [
      { keywords: ['react', 'component', 'css', 'html', 'dom'], domain: 'frontend', priority: 8 },
      { keywords: ['style', 'layout', 'responsive'], domain: 'frontend', priority: 6 },
    ],
  };

  const backendExpert: Expert = {
    id: 'expert-be',
    name: 'Backend Expert',
    domain: 'backend',
    capabilities: ['node', 'express', 'database'],
    triggerPatterns: [
      { keywords: ['api', 'server', 'endpoint', 'rest', 'graphql'], domain: 'backend', priority: 9 },
      { keywords: ['middleware', 'authentication', 'route'], domain: 'backend', priority: 7 },
    ],
  };

  const securityExpert: Expert = {
    id: 'expert-sec',
    name: 'Security Expert',
    domain: 'security',
    capabilities: ['audit', 'penetration-testing'],
    triggerPatterns: [
      { keywords: ['vulnerability', 'xss', 'injection', 'csrf', 'auth'], domain: 'security', priority: 10 },
    ],
  };

  beforeEach(() => {
    router = createSemanticRouter();
  });

  it('should register and retrieve an expert', () => {
    router.registerExpert(frontendExpert);
    const expert = router.getExpert('expert-fe');
    expect(expert).toBeDefined();
    expect(expert?.name).toBe('Frontend Expert');
  });

  it('should return undefined for unknown expert', () => {
    expect(router.getExpert('nonexistent')).toBeUndefined();
  });

  it('should list all experts', () => {
    router.registerExpert(frontendExpert);
    router.registerExpert(backendExpert);
    router.registerExpert(securityExpert);
    expect(router.listExperts()).toHaveLength(3);
  });

  it('should filter experts by domain', () => {
    router.registerExpert(frontendExpert);
    router.registerExpert(backendExpert);
    const backendExperts = router.listExperts('backend');
    expect(backendExperts).toHaveLength(1);
    expect(backendExperts[0].id).toBe('expert-be');
  });

  it('should route query and match keywords', () => {
    router.registerExpert(frontendExpert);
    router.registerExpert(backendExpert);
    const results = router.route('I need to build a React component with CSS styling');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].expertId).toBe('expert-fe');
    expect(results[0].matchedTriggers).toContain('react');
    expect(results[0].matchedTriggers).toContain('component');
    expect(results[0].matchedTriggers).toContain('css');
  });

  it('should return results sorted by confidence', () => {
    router.registerExpert(frontendExpert);
    router.registerExpert(backendExpert);
    const results = router.route('build a React component that calls an API endpoint');
    expect(results.length).toBe(2);
    // Confidence should be descending
    expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence);
  });

  it('should return empty array for unmatched query', () => {
    router.registerExpert(frontendExpert);
    const results = router.route('quantum computing algorithms');
    expect(results).toHaveLength(0);
  });

  it('should getBestMatch returning highest confidence', () => {
    router.registerExpert(frontendExpert);
    router.registerExpert(backendExpert);
    router.registerExpert(securityExpert);
    const best = router.getBestMatch('Check for XSS vulnerability and injection attacks');
    expect(best).not.toBeNull();
    expect(best?.expertId).toBe('expert-sec');
    expect(best?.domain).toBe('security');
  });

  it('should getBestMatch returning null when no match', () => {
    router.registerExpert(frontendExpert);
    const best = router.getBestMatch('unrelated topic about cooking recipes');
    expect(best).toBeNull();
  });

  it('should handle case-insensitive matching', () => {
    router.registerExpert(backendExpert);
    const results = router.route('Build a REST API with Express SERVER');
    expect(results).toHaveLength(1);
    expect(results[0].matchedTriggers).toContain('api');
    expect(results[0].matchedTriggers).toContain('rest');
    expect(results[0].matchedTriggers).toContain('server');
  });

  it('should return confidence capped at 1', () => {
    router.registerExpert(securityExpert);
    const results = router.route('vulnerability xss injection csrf auth security');
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBeLessThanOrEqual(1);
  });
});
