import { describe, it, expect } from 'vitest';
import {
  PatternDetector,
  createPatternDetector,
} from '../../src/design/pattern-detector.js';

describe('DES-DES-004: PatternDetector', () => {
  it('should detect singleton pattern', () => {
    const detector = new PatternDetector();
    const code = `
class Logger {
  private static instance: Logger;
  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }
}`;
    const results = detector.detect(code);
    const singleton = results.find(r => r.pattern === 'singleton');

    expect(singleton).toBeDefined();
    expect(singleton!.confidence).toBeGreaterThan(0);
    expect(singleton!.evidence).toContain('private static instance');
  });

  it('should detect factory pattern', () => {
    const detector = new PatternDetector();
    const code = `
class AnimalFactory {
  static createAnimal(type: string) { return new Dog(); }
  createDog() { return new Dog(); }
}`;
    const results = detector.detect(code);
    const factory = results.find(r => r.pattern === 'factory');

    expect(factory).toBeDefined();
    expect(factory!.confidence).toBeGreaterThan(0);
  });

  it('should detect observer pattern', () => {
    const detector = new PatternDetector();
    const code = `
class EventBus {
  listeners = [];
  addEventListener(event, cb) { this.listeners.push(cb); }
}
const bus = new EventBus();
bus.addEventListener('click', () => {});
bus.emit('click', {});`;
    const results = detector.detect(code);
    const observer = results.find(r => r.pattern === 'observer');

    expect(observer).toBeDefined();
    expect(observer!.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect repository pattern', () => {
    const detector = new PatternDetector();
    const code = `
interface UserRepository {
  find(id: string): User;
  save(user: User): void;
}
class Service {
  constructor(private repo: UserRepository) {}
  getUser(id: string) { return this.repo.find(id); }
  saveUser(u: User) { this.repo.save(u); }
}`;
    const results = detector.detect(code);
    const repo = results.find(r => r.pattern === 'repository');

    expect(repo).toBeDefined();
    expect(repo!.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect builder pattern', () => {
    const detector = new PatternDetector();
    const code = `
class QueryBuilder {
  where(col: string) { return this; }
  build() { return 'SELECT *'; }
}`;
    const results = detector.detect(code);
    const builder = results.find(r => r.pattern === 'builder');

    expect(builder).toBeDefined();
    expect(builder!.confidence).toBeGreaterThan(0);
  });

  it('should return empty array for code with no patterns', () => {
    const detector = new PatternDetector();
    const code = `const x = 1;\nconst y = 2;\nconsole.log(x + y);`;
    const results = detector.detect(code);

    expect(results).toHaveLength(0);
  });

  it('should list all supported patterns', () => {
    const detector = new PatternDetector();
    const patterns = detector.getSupportedPatterns();

    expect(patterns).toContain('singleton');
    expect(patterns).toContain('factory');
    expect(patterns).toContain('observer');
    expect(patterns).toContain('strategy');
    expect(patterns).toContain('builder');
    expect(patterns.length).toBeGreaterThanOrEqual(10);
  });

  it('should be created by factory function', () => {
    const detector = createPatternDetector();
    expect(detector).toBeInstanceOf(PatternDetector);
  });
});
