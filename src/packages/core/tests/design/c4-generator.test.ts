import { describe, it, expect } from 'vitest';
import {
  C4ModelGenerator,
  createC4ModelGenerator,
  type C4Element,
  type C4Relationship,
} from '../../src/design/c4-generator.js';

describe('DES-DES-002: C4ModelGenerator', () => {
  function makeGenerator(): C4ModelGenerator {
    const gen = new C4ModelGenerator();
    gen.addElement({ id: 'user', name: 'User', type: 'person', description: 'End user' });
    gen.addElement({ id: 'sys', name: 'System', type: 'system', description: 'Main system' });
    gen.addElement({ id: 'api', name: 'API', type: 'container', description: 'REST API', technology: 'Node.js' });
    gen.addElement({ id: 'svc', name: 'Service', type: 'component', description: 'Business logic' });
    gen.addRelationship({ from: 'user', to: 'sys', description: 'Uses' });
    gen.addRelationship({ from: 'sys', to: 'api', description: 'Delegates to', technology: 'HTTPS' });
    gen.addRelationship({ from: 'api', to: 'svc', description: 'Calls' });
    return gen;
  }

  it('should add elements and generate context diagram', () => {
    const gen = makeGenerator();
    const diagram = gen.generateDiagram('context', 'Context View');

    expect(diagram.level).toBe('context');
    expect(diagram.title).toBe('Context View');
    // Context level includes person + system only
    expect(diagram.elements.every(e => e.type === 'person' || e.type === 'system')).toBe(true);
    expect(diagram.elements.length).toBe(2);
  });

  it('should include containers in container-level diagram', () => {
    const gen = makeGenerator();
    const diagram = gen.generateDiagram('container', 'Container View');

    expect(diagram.elements.some(e => e.type === 'container')).toBe(true);
    expect(diagram.elements.length).toBe(3);
  });

  it('should include components in component-level diagram', () => {
    const gen = makeGenerator();
    const diagram = gen.generateDiagram('component', 'Component View');

    expect(diagram.elements.some(e => e.type === 'component')).toBe(true);
  });

  it('should filter relationships to matching elements', () => {
    const gen = makeGenerator();
    const diagram = gen.generateDiagram('context', 'Context');

    // Only relationships involving person/system elements
    for (const rel of diagram.relationships) {
      const fromEl = diagram.elements.find(e => e.id === rel.from);
      const toEl = diagram.elements.find(e => e.id === rel.to);
      expect(fromEl !== undefined || toEl !== undefined).toBe(true);
    }
  });

  it('should generate valid Mermaid output', () => {
    const gen = makeGenerator();
    const diagram = gen.generateDiagram('context', 'System Context');
    const mermaid = gen.toMermaid(diagram);

    expect(mermaid).toContain('C4Context');
    expect(mermaid).toContain('title System Context');
    expect(mermaid).toContain('Person(user');
    expect(mermaid).toContain('System(sys');
    expect(mermaid).toContain('Rel(user, sys');
  });

  it('should emit a level-specific Mermaid header', () => {
    const gen = makeGenerator();
    expect(gen.toMermaid(gen.generateDiagram('context', 't')).split('\n')[0]).toBe('C4Context');
    expect(gen.toMermaid(gen.generateDiagram('container', 't')).split('\n')[0]).toBe('C4Container');
    expect(gen.toMermaid(gen.generateDiagram('component', 't')).split('\n')[0]).toBe('C4Component');
    expect(gen.toMermaid(gen.generateDiagram('code', 't')).split('\n')[0]).toBe('C4Component');
  });

  it('should not reference elements undeclared at the level (both endpoints kept)', () => {
    const gen = makeGenerator();
    // Container level excludes the `svc` component; the api->svc rel must drop.
    const diagram = gen.generateDiagram('container', 'Container');
    const ids = new Set(diagram.elements.map((e) => e.id));
    for (const rel of diagram.relationships) {
      expect(ids.has(rel.from)).toBe(true);
      expect(ids.has(rel.to)).toBe(true);
    }
    expect(diagram.relationships.some((r) => r.to === 'svc')).toBe(false);
  });

  it('should escape non-identifier ids into valid Mermaid aliases', () => {
    const gen = new C4ModelGenerator();
    gen.addElement({ id: 'ORD', name: 'ORD', type: 'container', description: 'svc' });
    gen.addElement({ id: 'REQ-ORD-001', name: 'Place Order', type: 'component', description: 'REQ-ORD-001' });
    gen.addRelationship({ from: 'ORD', to: 'REQ-ORD-001', description: 'implements' });
    const mermaid = gen.toMermaid(gen.generateDiagram('component', 'Components'));
    expect(mermaid).toContain('Component(REQ_ORD_001,');
    expect(mermaid).toContain('Rel(ORD, REQ_ORD_001,');
    expect(mermaid).not.toMatch(/\(REQ-ORD-001,/); // no hyphenated alias
    expect(mermaid).toContain('"REQ-ORD-001"'); // readable label preserved
  });

  // v0.5.90 — duplicate element ids / relationships (from hand-written or merged
  // design JSON) must not emit duplicate Mermaid declarations (invalid alias).
  it('dedupes duplicate element ids and identical relationships', () => {
    const gen = new C4ModelGenerator();
    gen.addElement({ id: 'a', name: 'A', type: 'system', description: 'x' });
    gen.addElement({ id: 'a', name: 'A dup', type: 'system', description: 'y' });
    gen.addElement({ id: 'b', name: 'B', type: 'system', description: 'z' });
    gen.addRelationship({ from: 'a', to: 'b', description: 'r' });
    gen.addRelationship({ from: 'a', to: 'b', description: 'r' });
    const d = gen.generateDiagram('context', 't');
    expect(d.elements.filter((e) => e.id === 'a')).toHaveLength(1);
    expect(d.relationships).toHaveLength(1);
    const mermaid = gen.toMermaid(d);
    expect(mermaid.match(/System\(a,/g)).toHaveLength(1);
  });

  // v0.5.92 — an element with no id must be skipped, not crash alias generation
  // (`id.replace` on undefined).
  it('skips elements with no id instead of crashing', () => {
    const gen = new C4ModelGenerator();
    gen.addElement({ id: 'a', name: 'A', type: 'system', description: 'x' });
    gen.addElement({ name: 'B', type: 'system', description: 'y' } as never); // no id
    const diagram = gen.generateDiagram('context', 't');
    expect(diagram.elements).toHaveLength(1);
    expect(() => gen.toMermaid(diagram)).not.toThrow();
    expect(gen.toMermaid(diagram)).toContain('System(a,');
  });

  it('should generate valid PlantUML output', () => {
    const gen = makeGenerator();
    const diagram = gen.generateDiagram('context', 'System Context');
    const puml = gen.toPlantUML(diagram);

    expect(puml).toContain('@startuml');
    expect(puml).toContain('@enduml');
    expect(puml).toContain('title System Context');
    expect(puml).toContain('Person(user');
    expect(puml).toContain('System(sys');
  });

  it('should include technology in Mermaid when present', () => {
    const gen = new C4ModelGenerator();
    gen.addElement({ id: 'a', name: 'A', type: 'container', description: 'Desc', technology: 'Go' });
    const diagram = gen.generateDiagram('container', 'Test');
    const mermaid = gen.toMermaid(diagram);

    expect(mermaid).toContain('"Go"');
  });

  it('should be created by factory function', () => {
    const gen = createC4ModelGenerator();
    expect(gen).toBeInstanceOf(C4ModelGenerator);
  });
});
