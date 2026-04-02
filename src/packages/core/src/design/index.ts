/**
 * Design Document Generation — DES-DES-001
 * DesignGenerator and SOLIDValidator
 */

export interface ParsedRequirementInput {
  id: string;
  title: string;
  text: string;
  pattern: string;
}

export interface DesignSection {
  id: string;
  title: string;
  requirementIds: string[];
  description: string;
  interfaces: string[];
  patterns: string[];
}

export interface DesignDocument {
  id: string;
  title: string;
  version: string;
  sections: DesignSection[];
  generatedAt: Date;
}

export type SOLIDPrinciple = 'SRP' | 'OCP' | 'LSP' | 'ISP' | 'DIP';

export interface SOLIDViolation {
  principle: SOLIDPrinciple;
  section: string;
  message: string;
  suggestion: string;
}

export interface SOLIDReport {
  violations: SOLIDViolation[];
  score: number; // 0-100, higher is better
  principleScores: Record<SOLIDPrinciple, number>;
}

export interface DesignOutput {
  document: DesignDocument;
  elementIds: string[];
}

export interface TraceabilityLink {
  reqId: string;
  desId: string;
}

export interface TraceabilityCoverageResult {
  coverage: number;
  gaps: string[];
}

export interface TraceabilityDesignResult {
  design: DesignOutput;
  traceabilityLinks: TraceabilityLink[];
}

export class DesignGenerator {
  private counter: number = 0;

  generate(requirements: ParsedRequirementInput[]): DesignDocument {
    this.counter++;
    const docId = `DES-DOC-${String(this.counter).padStart(3, '0')}`;

    // Group requirements by common prefixes/categories
    const groups = this.groupRequirements(requirements);

    const sections: DesignSection[] = groups.map((group, idx) => ({
      id: `${docId}-SEC-${String(idx + 1).padStart(3, '0')}`,
      title: group.title,
      requirementIds: group.requirements.map((r) => r.id),
      description: this.generateDescription(group.requirements),
      interfaces: this.suggestInterfaces(group.requirements),
      patterns: this.suggestPatterns(group.requirements),
    }));

    return {
      id: docId,
      title: `Design Document for ${requirements.length} Requirements`,
      version: '1.0',
      sections,
      generatedAt: new Date(),
    };
  }

  generateWithTraceability(
    requirements: Array<{ id: string; text: string }>,
  ): TraceabilityDesignResult {
    const fullReqs: ParsedRequirementInput[] = requirements.map((r) => ({
      id: r.id,
      title: r.text,
      text: r.text,
      pattern: 'ubiquitous',
    }));

    const document = this.generate(fullReqs);
    const elementIds = document.sections.map((s) => s.id);

    const traceabilityLinks: TraceabilityLink[] = [];
    for (const section of document.sections) {
      for (const reqId of section.requirementIds) {
        traceabilityLinks.push({ reqId, desId: section.id });
      }
    }

    return {
      design: { document, elementIds },
      traceabilityLinks,
    };
  }

  validateTraceabilityCoverage(
    links: Array<{ reqId: string; desId: string }>,
    totalReqs: number,
  ): TraceabilityCoverageResult {
    const coveredReqIds = new Set(links.map((l) => l.reqId));
    const coverage = totalReqs === 0 ? 1 : coveredReqIds.size / totalReqs;
    const gaps: string[] = [];
    for (let i = 1; i <= totalReqs; i++) {
      const candidate = `REQ-${String(i).padStart(3, '0')}`;
      if (!coveredReqIds.has(candidate)) {
        gaps.push(candidate);
      }
    }
    return { coverage, gaps };
  }

  private groupRequirements(
    reqs: ParsedRequirementInput[],
  ): Array<{ title: string; requirements: ParsedRequirementInput[] }> {
    // Group by requirement ID prefix (e.g., REQ-AUTH, REQ-DATA)
    const groups = new Map<string, ParsedRequirementInput[]>();
    for (const req of reqs) {
      const prefix = req.id.replace(/-\d+$/, '');
      const list = groups.get(prefix) ?? [];
      list.push(req);
      groups.set(prefix, list);
    }

    return Array.from(groups.entries()).map(([prefix, requirements]) => ({
      title: `${prefix} Design Section`,
      requirements,
    }));
  }

  private generateDescription(reqs: ParsedRequirementInput[]): string {
    return `This section covers ${reqs.length} requirement(s): ${reqs.map((r) => r.id).join(', ')}.`;
  }

  private suggestInterfaces(reqs: ParsedRequirementInput[]): string[] {
    const interfaces: string[] = [];
    for (const req of reqs) {
      // Extract potential interface names from requirement titles
      const words = req.title.split(/\s+/).filter((w) => w.length > 3);
      if (words.length > 0) {
        const name = words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
        interfaces.push(`I${name}`);
      }
    }
    return [...new Set(interfaces)];
  }

  private suggestPatterns(reqs: ParsedRequirementInput[]): string[] {
    const patterns = new Set<string>();
    for (const req of reqs) {
      if (req.text.includes('WHEN')) {
        patterns.add('Observer');
      }
      if (req.text.includes('WHILE')) {
        patterns.add('State');
      }
      if (req.text.includes('IF')) {
        patterns.add('Strategy');
      }
      if (req.pattern === 'complex') {
        patterns.add('Chain of Responsibility');
      }
    }
    if (patterns.size === 0) {
      patterns.add('Simple Implementation');
    }
    return [...patterns];
  }
}

export class SOLIDValidator {
  validate(design: DesignDocument): SOLIDReport {
    const violations: SOLIDViolation[] = [];
    const principleScores: Record<SOLIDPrinciple, number> = {
      SRP: 100,
      OCP: 100,
      LSP: 100,
      ISP: 100,
      DIP: 100,
    };

    for (const section of design.sections) {
      // SRP: Each section should focus on few requirements
      if (section.requirementIds.length > 5) {
        violations.push({
          principle: 'SRP',
          section: section.id,
          message: `Section handles ${section.requirementIds.length} requirements (>5)`,
          suggestion: 'Consider splitting this section into smaller, focused sections',
        });
        principleScores.SRP = Math.max(0, principleScores.SRP - 20);
      }

      // ISP: Check if too many interfaces suggested
      if (section.interfaces.length > 4) {
        violations.push({
          principle: 'ISP',
          section: section.id,
          message: `Section suggests ${section.interfaces.length} interfaces (>4)`,
          suggestion: 'Consider splitting large interfaces into smaller, role-specific ones',
        });
        principleScores.ISP = Math.max(0, principleScores.ISP - 15);
      }

      // DIP: Check if section has no interfaces (concrete dependency)
      if (section.interfaces.length === 0 && section.requirementIds.length > 1) {
        violations.push({
          principle: 'DIP',
          section: section.id,
          message: 'Section has multiple requirements but no interfaces',
          suggestion: 'Add abstractions to decouple components',
        });
        principleScores.DIP = Math.max(0, principleScores.DIP - 25);
      }
    }

    const score = Math.round(Object.values(principleScores).reduce((a, b) => a + b, 0) / 5);

    return { violations, score, principleScores };
  }
}

export function createDesignGenerator(): DesignGenerator {
  return new DesignGenerator();
}

export function createSOLIDValidator(): SOLIDValidator {
  return new SOLIDValidator();
}
