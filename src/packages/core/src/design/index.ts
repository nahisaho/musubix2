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

export interface DesignComponent {
  /** PascalCase component/class name. */
  name: string;
  /** One-line statement of what the component is responsible for. */
  responsibility: string;
  /** Method signatures (camelCase name + params + return type) this component exposes. */
  methods: Array<{ name: string; params: string; returnType: string }>;
  /** Requirement IDs this component realises. */
  requirementIds: string[];
}

export interface DesignSection {
  id: string;
  title: string;
  requirementIds: string[];
  description: string;
  interfaces: string[];
  patterns: string[];
  /** High-level responsibilities of this section (one per requirement). */
  responsibilities: string[];
  /** Concrete components with method signatures, derived from the requirements. */
  components: DesignComponent[];
  /** Candidate data entities/nouns referenced by the requirements. */
  dataEntities: string[];
}

const OPERATION_STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'with', 'for', 'and', 'or', 'its', 'their', 'on',
  'in', 'into', 'from', 'that', 'this', 'these', 'those', 'all', 'any', 'each',
  'system', 'shall', 'will', 'must', 'should',
]);

/** Verbs whose operations return a truthy/falsey result. */
const BOOLEAN_VERBS = new Set([
  'validate', 'verify', 'check', 'ensure', 'confirm', 'authenticate', 'authorize',
  'allow', 'reject', 'prevent', 'deny', 'is', 'has', 'can', 'match', 'compare',
]);
/** Verbs whose operations produce/return a value (return type = object noun). */
const VALUE_VERBS = new Set([
  'create', 'issue', 'generate', 'produce', 'build', 'make', 'fetch', 'get',
  'load', 'find', 'return', 'retrieve', 'compute', 'calculate', 'resolve', 'render',
]);
/** Verbs whose operations return a collection. */
const LIST_VERBS = new Set(['list', 'query', 'search', 'collect', 'enumerate']);

/**
 * Prepositions / quantifiers that read awkwardly as the *last* word of an
 * operation name (e.g. "readTemperatureEvery", "lowerTargetBy"). They are kept
 * mid-phrase but trimmed from the tail after the word cap.
 */
const TRAILING_FILLER = new Set([
  'every', 'by', 'before', 'after', 'with', 'of', 'to', 'in', 'on', 'for', 'from',
  'into', 'than', 'as', 'at', 'per', 'via', 'using', 'about', 'over', 'under',
  'one', 'two', 'three', 'four', 'five',
]);

function operationParts(text: string, fallbackTitle: string): { negated: boolean; words: string[] } {
  const shall = /\bSHALL\s+(NOT\s+)?([^.。\n]+)/i.exec(text);
  const negated = Boolean(shall?.[1]);
  const phrase = (shall?.[2] ?? fallbackTitle ?? '').trim();
  const words = phrase
    .split(/[\s,、]+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter((w) => w.length > 0 && !OPERATION_STOPWORDS.has(w.toLowerCase()))
    .slice(0, 4);
  // Trim trailing filler/quantifier words so the name ends on a meaningful token
  // (keep at least the leading verb).
  while (words.length > 1 && (TRAILING_FILLER.has(words[words.length - 1].toLowerCase()) || /^\d+$/.test(words[words.length - 1]))) {
    words.pop();
  }
  return { negated, words };
}

function camelJoin(parts: string[]): string {
  return parts
    .map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

function pascalJoin(parts: string[]): string {
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

/**
 * Derive a camelCase operation name from an EARS requirement.
 *
 * Prefers the verb phrase following `SHALL` (e.g. "…SHALL create a user
 * account" → `createUserAccount`); a `SHALL NOT` phrase becomes `reject…`.
 * Falls back to the requirement title, then to `execute`.
 */
export function deriveOperation(text: string, fallbackTitle = ''): string {
  const { negated, words } = operationParts(text, fallbackTitle);
  const parts = negated ? ['reject', ...words] : words;
  if (parts.length === 0) {return 'execute';}
  return camelJoin(parts);
}

/**
 * Derive a full method signature (name, params, return type) from an EARS
 * requirement. Return type is inferred from the verb: boolean-ish verbs
 * (validate/authenticate/…) → `boolean`, value-producing verbs
 * (create/issue/get/…) → the object noun as a type, collection verbs
 * (list/query/…) → `T[]`; everything else → `void`. `SHALL NOT` → `boolean`
 * (a guard that reports whether the unwanted case was blocked).
 */
export function deriveMethodSignature(
  text: string,
  fallbackTitle = '',
): { name: string; params: string; returnType: string } {
  const { negated, words } = operationParts(text, fallbackTitle);
  const name = deriveOperation(text, fallbackTitle);
  if (words.length === 0) {return { name, params: '', returnType: 'void' }; }

  const verb = words[0].toLowerCase();
  const objectWords = words.slice(1);
  let returnType = 'void';
  if (negated || BOOLEAN_VERBS.has(verb)) {
    returnType = 'boolean';
  } else if (LIST_VERBS.has(verb)) {
    returnType = objectWords.length > 0 ? `${pascalJoin(objectWords)}[]` : 'unknown[]';
  } else if (VALUE_VERBS.has(verb) && objectWords.length > 0) {
    returnType = pascalJoin(objectWords);
  }
  return { name, params: '', returnType };
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

    const sections: DesignSection[] = groups.map((group, idx) => {
      const components = this.deriveComponents(group.requirements);
      return {
        id: `${docId}-SEC-${String(idx + 1).padStart(3, '0')}`,
        title: group.title,
        requirementIds: group.requirements.map((r) => r.id),
        description: this.generateDescription(group.title, group.requirements, components),
        interfaces: this.suggestInterfaces(group.requirements),
        patterns: this.suggestPatterns(group.requirements),
        responsibilities: this.deriveResponsibilities(group.requirements),
        components,
        dataEntities: this.deriveDataEntities(group.requirements),
      };
    });

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

  private generateDescription(
    title: string,
    reqs: ParsedRequirementInput[],
    components: DesignComponent[],
  ): string {
    const lines: string[] = [];
    lines.push(
      `Design for ${title}, realising ${reqs.length} requirement(s): ${reqs.map((r) => r.id).join(', ')}.`,
    );
    lines.push('');
    lines.push('Responsibilities:');
    for (const r of reqs) {
      lines.push(`- ${r.id}: ${r.title || r.text}`);
    }
    lines.push('');
    lines.push('Components:');
    for (const c of components) {
      const sigs = c.methods.map((m) => `${m.name}()`).join(', ') || '(no operations inferred)';
      lines.push(`- ${c.name} — ${c.responsibility} [${sigs}]`);
    }
    return lines.join('\n');
  }

  private deriveResponsibilities(reqs: ParsedRequirementInput[]): string[] {
    return reqs.map((r) => {
      const op = deriveOperation(r.text, r.title);
      return `${r.id}: ${op}${r.title ? ` — ${r.title}` : ''}`;
    });
  }

  private deriveComponents(reqs: ParsedRequirementInput[]): DesignComponent[] {
    return reqs.map((r) => {
      const sig = deriveMethodSignature(r.text, r.title);
      const compName = this.pascal(r.title || sig.name) + (/(service|manager|controller|repository)$/i.test(r.title) ? '' : 'Service');
      return {
        name: compName,
        responsibility: r.title || `Handle ${r.id}`,
        methods: [sig],
        requirementIds: [r.id],
      };
    });
  }

  private deriveDataEntities(reqs: ParsedRequirementInput[]): string[] {
    const entities = new Set<string>();
    for (const req of reqs) {
      // Capture "<Capitalised Noun>" phrases and known domain nouns from the title.
      for (const m of (req.title ?? '').matchAll(/\b([A-Z][a-z]+)\b/g)) {
        if (!OPERATION_STOPWORDS.has(m[1].toLowerCase())) {entities.add(m[1]);}
      }
    }
    return [...entities];
  }

  private pascal(text: string): string {
    const words = text.split(/[\s_\-,、]+/).filter(Boolean);
    if (words.length === 0) {return 'Component';}
    return words
      .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
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
