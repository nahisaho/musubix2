/**
 * C4 Diagram Generator — DES-DES-002
 *
 * C4モデル（Context/Container/Component/Code）の生成と
 * Mermaid / PlantUML 形式での出力。
 */

export type C4Level = 'context' | 'container' | 'component' | 'code';

export interface C4Element {
  id: string;
  name: string;
  type: 'person' | 'system' | 'container' | 'component';
  description: string;
  technology?: string;
}

export interface C4Relationship {
  from: string;
  to: string;
  description: string;
  technology?: string;
}

export interface C4Diagram {
  level: C4Level;
  title: string;
  elements: C4Element[];
  relationships: C4Relationship[];
}

export class C4ModelGenerator {
  private elements: C4Element[] = [];
  private relationships: C4Relationship[] = [];

  addElement(element: C4Element): void {
    this.elements.push(element);
  }

  addRelationship(relationship: C4Relationship): void {
    this.relationships.push(relationship);
  }

  generateDiagram(level: C4Level, title: string): C4Diagram {
    const levelFilter = this.getLevelFilter(level);
    const kept = new Set(
      this.elements.filter((e) => levelFilter.includes(e.type)).map((e) => e.id),
    );
    return {
      level,
      title,
      elements: this.elements.filter((e) => levelFilter.includes(e.type)),
      // Keep a relationship only when *both* endpoints are elements shown at this
      // level; otherwise the diagram would reference an undeclared element.
      relationships: this.relationships.filter((r) => kept.has(r.from) && kept.has(r.to)),
    };
  }

  /** Mermaid C4 aliases must be identifiers; ids like `REQ-ORD-001` need escaping. */
  private mermaidAlias(id: string): string {
    return id.replace(/[^A-Za-z0-9_]/g, '_');
  }

  toMermaid(diagram: C4Diagram): string {
    const header =
      diagram.level === 'container' ? 'C4Container'
        : diagram.level === 'component' || diagram.level === 'code' ? 'C4Component'
          : 'C4Context';
    const lines: string[] = [];
    lines.push(header);
    lines.push(`  title ${diagram.title}`);
    lines.push('');

    for (const el of diagram.elements) {
      const mermaidType = this.toMermaidType(el.type);
      const tech = el.technology ? `, "${el.technology}"` : '';
      lines.push(`  ${mermaidType}(${this.mermaidAlias(el.id)}, "${el.name}", "${el.description}"${tech})`);
    }

    if (diagram.relationships.length > 0) {
      lines.push('');
      for (const rel of diagram.relationships) {
        const tech = rel.technology ? `, "${rel.technology}"` : '';
        lines.push(`  Rel(${this.mermaidAlias(rel.from)}, ${this.mermaidAlias(rel.to)}, "${rel.description}"${tech})`);
      }
    }

    return lines.join('\n');
  }

  toPlantUML(diagram: C4Diagram): string {
    const lines: string[] = [];
    lines.push('@startuml');
    lines.push('!include <C4/C4_Context>');
    lines.push('');
    lines.push(`title ${diagram.title}`);
    lines.push('');

    for (const el of diagram.elements) {
      const pumlType = this.toPlantUMLType(el.type);
      const tech = el.technology ? `, "${el.technology}"` : '';
      lines.push(`${pumlType}(${el.id}, "${el.name}", "${el.description}"${tech})`);
    }

    if (diagram.relationships.length > 0) {
      lines.push('');
      for (const rel of diagram.relationships) {
        const tech = rel.technology ? `, "${rel.technology}"` : '';
        lines.push(`Rel(${rel.from}, ${rel.to}, "${rel.description}"${tech})`);
      }
    }

    lines.push('');
    lines.push('@enduml');
    return lines.join('\n');
  }

  private getLevelFilter(level: C4Level): C4Element['type'][] {
    switch (level) {
      case 'context':
        return ['person', 'system'];
      case 'container':
        return ['person', 'system', 'container'];
      case 'component':
        return ['container', 'component'];
      case 'code':
        return ['component'];
    }
  }

  private toMermaidType(type: C4Element['type']): string {
    switch (type) {
      case 'person':
        return 'Person';
      case 'system':
        return 'System';
      case 'container':
        return 'Container';
      case 'component':
        return 'Component';
    }
  }

  private toPlantUMLType(type: C4Element['type']): string {
    switch (type) {
      case 'person':
        return 'Person';
      case 'system':
        return 'System';
      case 'container':
        return 'Container';
      case 'component':
        return 'Component';
    }
  }
}

export function createC4ModelGenerator(): C4ModelGenerator {
  return new C4ModelGenerator();
}
