import { describe, it, expect } from 'vitest';
import {
  DomainDetector,
  createDomainDetector,
  type DomainType,
} from '../../src/domain/index.js';

describe('DES-DOM-001: DomainDetector', () => {
  it('should detect web domain from .tsx files', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['src/App.tsx', 'src/index.tsx', 'src/styles.css']);

    const web = results.find((r) => r.domain === 'web');
    expect(web).toBeDefined();
    expect(web!.confidence).toBeGreaterThan(0);
    expect(web!.evidence.length).toBeGreaterThan(0);
  });

  it('should detect AI domain from Python + tensorflow dependency', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['model.py', 'train.ipynb'], {
      dependencies: { tensorflow: '^2.0.0' },
    });

    const ai = results.find((r) => r.domain === 'ai');
    expect(ai).toBeDefined();
    expect(ai!.confidence).toBeGreaterThan(0);
    expect(ai!.evidence.some((e) => e.includes('tensorflow'))).toBe(true);
  });

  it('should detect devops domain from Dockerfile', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['Dockerfile', 'docker-compose.yml', '.github/workflows/ci.yml']);

    const devops = results.find((r) => r.domain === 'devops');
    expect(devops).toBeDefined();
    expect(devops!.confidence).toBeGreaterThan(0);
  });

  it('should detect backend domain from express dependency', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['server.ts'], {
      dependencies: { express: '^4.0.0', prisma: '^5.0.0' },
    });

    const backend = results.find((r) => r.domain === 'backend');
    expect(backend).toBeDefined();
    expect(backend!.evidence.some((e) => e.includes('express'))).toBe(true);
  });

  it('should return results sorted by confidence descending', () => {
    const detector = createDomainDetector();
    const results = detector.detect(
      ['App.tsx', 'index.tsx', 'styles.css', 'server.ts'],
      { dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } },
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  it('should return empty array for unrecognized files', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['README.md', 'LICENSE']);
    expect(results).toEqual([]);
  });

  it('should return all supported domains', () => {
    const detector = new DomainDetector();
    const domains = detector.getSupportedDomains();
    expect(domains.length).toBeGreaterThan(20);
    expect(domains).toContain('web');
    expect(domains).toContain('ai');
    expect(domains).toContain('fintech');
  });

  it('should return keywords for a given domain', () => {
    const detector = new DomainDetector();
    const keywords = detector.getDomainKeywords('web');
    expect(keywords).toContain('react');
    expect(keywords).toContain('vue');

    const aiKeywords = detector.getDomainKeywords('ai');
    expect(aiKeywords).toContain('tensorflow');
    expect(aiKeywords).toContain('pytorch');
  });

  it('should cap confidence at 1.0', () => {
    const detector = createDomainDetector();
    const manyTsxFiles = Array.from({ length: 50 }, (_, i) => `comp${i}.tsx`);
    const results = detector.detect(manyTsxFiles, {
      dependencies: { react: '18', vue: '3', angular: '17', svelte: '4', next: '14' },
    });

    for (const result of results) {
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should handle empty packageJson dependencies gracefully', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['index.ts'], {});
    expect(Array.isArray(results)).toBe(true);
  });

  it('should detect mobile domain from .swift and .kt files', () => {
    const detector = createDomainDetector();
    const results = detector.detect(['ViewController.swift', 'MainActivity.kt']);

    const mobile = results.find((r) => r.domain === 'mobile');
    expect(mobile).toBeDefined();
    expect(mobile!.confidence).toBeGreaterThan(0);
  });

  it('factory createDomainDetector returns a DomainDetector instance', () => {
    const detector = createDomainDetector();
    expect(detector).toBeInstanceOf(DomainDetector);

    const result = detector.getDomainKeywords('blockchain' as DomainType);
    expect(Array.isArray(result)).toBe(true);
  });
});
