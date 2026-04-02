import { describe, it, expect } from 'vitest';
import {
  DomainClassifier,
  createDomainClassifier,
  DOMAINS,
  type DomainDefinition,
} from '../../src/domain/index.js';

describe('REQ-DOM-001: DOMAINS constant', () => {
  it('should contain exactly 62 domain definitions', () => {
    expect(DOMAINS).toHaveLength(62);
  });

  it('should have unique ids', () => {
    const ids = DOMAINS.map((d) => d.id);
    expect(new Set(ids).size).toBe(62);
  });

  it('each domain should have required fields', () => {
    for (const d of DOMAINS) {
      expect(typeof d.id).toBe('string');
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.name).toBe('string');
      expect(d.name.length).toBeGreaterThan(0);
      expect(typeof d.nameJa).toBe('string');
      expect(d.nameJa.length).toBeGreaterThan(0);
      expect(Array.isArray(d.keywords)).toBe(true);
      expect(d.keywords.length).toBeGreaterThan(0);
      expect(Array.isArray(d.components)).toBe(true);
      expect(d.components.length).toBeGreaterThan(0);
    }
  });

  it('should include all required domain ids', () => {
    const ids = new Set(DOMAINS.map((d) => d.id));
    const requiredIds = [
      'healthcare', 'finance', 'education', 'retail', 'logistics',
      'manufacturing', 'real-estate', 'legal', 'insurance', 'agriculture',
      'energy', 'telecom', 'media', 'gaming', 'travel',
      'food-service', 'construction', 'automotive', 'aerospace', 'defense',
      'government', 'nonprofit', 'sports', 'entertainment', 'fashion',
      'beauty', 'pets', 'childcare', 'elderly-care', 'pharmacy',
      'dental', 'veterinary', 'library', 'museum', 'hotel',
      'restaurant', 'parking', 'gym', 'clinic', 'delivery',
      'inventory', 'project-management', 'e-learning', 'employee-management',
      'household-finance', 'ticketing', 'iot', 'api-gateway', 'social-media',
      'messaging', 'calendar', 'weather', 'maps', 'payments',
      'subscription', 'analytics', 'crm', 'erp', 'hr',
      'supply-chain', 'marketplace', 'auction',
    ];
    for (const id of requiredIds) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe('REQ-DOM-001: DomainClassifier.classify()', () => {
  it('should classify healthcare text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('The patient requires a clinical diagnosis and medical treatment');
    const hc = results.find((r) => r.domainId === 'healthcare');
    expect(hc).toBeDefined();
    expect(hc!.confidence).toBeGreaterThan(0);
    expect(hc!.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('should classify finance text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('Manage bank transactions and investment portfolio tracking');
    const fin = results.find((r) => r.domainId === 'finance');
    expect(fin).toBeDefined();
    expect(fin!.matchedKeywords).toContain('bank');
  });

  it('should classify education text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('Student enrollment and course curriculum management');
    const edu = results.find((r) => r.domainId === 'education');
    expect(edu).toBeDefined();
    expect(edu!.matchedKeywords).toContain('student');
  });

  it('should classify gaming text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('Build a multiplayer game with leaderboard and player scores');
    const game = results.find((r) => r.domainId === 'gaming');
    expect(game).toBeDefined();
    expect(game!.matchedKeywords.length).toBeGreaterThanOrEqual(2);
  });

  it('should classify IoT text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('Connect sensor devices via mqtt gateway');
    const iot = results.find((r) => r.domainId === 'iot');
    expect(iot).toBeDefined();
  });

  it('should classify analytics text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('Build a dashboard with metric visualization and report generation');
    const a = results.find((r) => r.domainId === 'analytics');
    expect(a).toBeDefined();
    expect(a!.matchedKeywords.length).toBeGreaterThanOrEqual(2);
  });

  it('should return results sorted by confidence descending', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('patient medical clinical hospital sensor device gateway');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  it('should return empty array for unrecognized text', () => {
    const classifier = createDomainClassifier();
    const results = classifier.classify('xyzzy foobar baz');
    expect(results).toEqual([]);
  });

  it('should cap confidence at 1.0', () => {
    const classifier = createDomainClassifier();
    const allKeywords = DOMAINS[0].keywords.join(' ');
    const results = classifier.classify(allKeywords);
    for (const r of results) {
      expect(r.confidence).toBeLessThanOrEqual(1.0);
    }
  });
});

describe('REQ-DOM-001: DomainClassifier helper methods', () => {
  it('getDomain should return a domain by id', () => {
    const classifier = new DomainClassifier();
    const d = classifier.getDomain('healthcare');
    expect(d).toBeDefined();
    expect(d!.name).toBe('Healthcare');
    expect(d!.nameJa).toBe('ヘルスケア');
  });

  it('getDomain should return undefined for unknown id', () => {
    const classifier = new DomainClassifier();
    expect(classifier.getDomain('nonexistent')).toBeUndefined();
  });

  it('getAllDomains should return all 62 domains', () => {
    const classifier = new DomainClassifier();
    const all = classifier.getAllDomains();
    expect(all).toHaveLength(62);
  });

  it('factory createDomainClassifier returns a DomainClassifier instance', () => {
    const classifier = createDomainClassifier();
    expect(classifier).toBeInstanceOf(DomainClassifier);
  });
});
