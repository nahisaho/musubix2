import { describe, it, expect, beforeEach } from 'vitest';
import {
  DomainClassifier,
  DriftAnalyzer,
  IdentityManager,
  createDomainClassifier,
  createIdentityManager,
  type IdentityProfile,
} from '../src/index.js';

describe('DES-AGT-005: DomainClassifier', () => {
  let classifier: DomainClassifier;

  beforeEach(() => {
    classifier = createDomainClassifier();
  });

  it('should classify technical text', () => {
    const result = classifier.classify('Fix the bug in the API code and add a test');
    expect(result.domain).toBe('technical');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify creative text', () => {
    const result = classifier.classify('Update the UI design with new color and layout');
    expect(result.domain).toBe('creative');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify analytical text', () => {
    const result = classifier.classify('Analyze the data metrics and generate a report');
    expect(result.domain).toBe('analytical');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify operational text', () => {
    const result = classifier.classify('Set up the CI pipeline for the server cluster infrastructure');
    expect(result.domain).toBe('operational');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should return unknown for ambiguous text', () => {
    const result = classifier.classify('Hello, how are you today?');
    expect(result.domain).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('should classifyBatch multiple texts', () => {
    const results = classifier.classifyBatch([
      'Fix the bug in the code',
      'Update the color and layout design',
      'Hello world',
    ]);
    expect(results).toHaveLength(3);
    expect(results[0].domain).toBe('technical');
    expect(results[1].domain).toBe('creative');
    expect(results[2].domain).toBe('unknown');
  });
});

describe('DES-AGT-005: DriftAnalyzer', () => {
  const technicalProfile: IdentityProfile = {
    name: 'TechAssistant',
    primaryDomain: 'technical',
    boundaries: ['no creative tasks'],
    strengths: ['code review', 'debugging'],
  };

  it('should detect no drift for matching domain', () => {
    const analyzer = new DriftAnalyzer(technicalProfile);
    const result = analyzer.analyze([
      'Fix the bug in the code',
      'Add a test for the API module',
      'Debug the function compile error',
    ]);
    expect(result.level).toBe('none');
    expect(result.originalDomain).toBe('technical');
    expect(result.currentDomain).toBe('technical');
  });

  it('should detect minor drift for related domain', () => {
    const analyzer = new DriftAnalyzer(technicalProfile);
    const result = analyzer.analyze([
      'Analyze the data metrics',
      'Generate a report with statistics',
      'Measure the benchmark trend',
    ]);
    expect(result.level).toBe('minor');
    expect(result.originalDomain).toBe('technical');
    expect(result.currentDomain).toBe('analytical');
  });

  it('should detect moderate drift for unrelated domain', () => {
    const analyzer = new DriftAnalyzer(technicalProfile);
    const result = analyzer.analyze([
      'Update the UI design with new color',
      'Change the layout and style theme',
    ]);
    expect(result.level).toBe('moderate');
    expect(result.currentDomain).toBe('creative');
  });

  it('should detect severe drift across multiple domains', () => {
    const creativeProfile: IdentityProfile = {
      name: 'CreativeBot',
      primaryDomain: 'creative',
      boundaries: [],
      strengths: ['design'],
    };
    const analyzer = new DriftAnalyzer(creativeProfile);
    const result = analyzer.analyze([
      'Fix the bug in the API code and add a test',
      'Analyze the data metrics and generate a report',
      'Set up the CI pipeline for the server cluster',
    ]);
    expect(result.level).toBe('severe');
  });

  it('should return none for empty conversation', () => {
    const analyzer = new DriftAnalyzer(technicalProfile);
    const result = analyzer.analyze([]);
    expect(result.level).toBe('none');
    expect(result.message).toContain('No conversation history');
  });

  it('should expose profile via getProfile', () => {
    const analyzer = new DriftAnalyzer(technicalProfile);
    const profile = analyzer.getProfile();
    expect(profile.name).toBe('TechAssistant');
    expect(profile.primaryDomain).toBe('technical');
  });
});

describe('DES-AGT-005: IdentityManager', () => {
  let manager: IdentityManager;

  const techProfile: IdentityProfile = {
    name: 'TechBot',
    primaryDomain: 'technical',
    boundaries: ['no creative'],
    strengths: ['coding'],
  };

  const creativeProfile: IdentityProfile = {
    name: 'DesignBot',
    primaryDomain: 'creative',
    boundaries: ['no ops'],
    strengths: ['design', 'UX'],
  };

  beforeEach(() => {
    manager = createIdentityManager();
  });

  it('should register and retrieve a profile', () => {
    manager.registerProfile(techProfile);
    const found = manager.getProfile('TechBot');
    expect(found).toBeDefined();
    expect(found?.primaryDomain).toBe('technical');
  });

  it('should return undefined for unknown profile', () => {
    expect(manager.getProfile('Unknown')).toBeUndefined();
  });

  it('should list all profiles', () => {
    manager.registerProfile(techProfile);
    manager.registerProfile(creativeProfile);
    expect(manager.listProfiles()).toHaveLength(2);
  });

  it('should createAnalyzer for registered profile', () => {
    manager.registerProfile(techProfile);
    const analyzer = manager.createAnalyzer('TechBot');
    expect(analyzer).not.toBeNull();
    expect(analyzer?.getProfile().name).toBe('TechBot');
  });

  it('should return null for createAnalyzer with unknown profile', () => {
    expect(manager.createAnalyzer('Unknown')).toBeNull();
  });
});
