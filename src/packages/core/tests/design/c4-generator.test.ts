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
