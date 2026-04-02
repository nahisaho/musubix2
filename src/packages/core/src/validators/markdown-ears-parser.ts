/**
 * Markdown EARS Parser
 *
 * Parses Markdown documents to extract EARS requirements.
 *
 * @module validators/markdown-ears-parser
 * @see REQ-REQ-002 — EARS parsing from Markdown
 * @see DES-REQ-002 — MarkdownEARSParser
 */

import type { ParsedRequirement, EARSPattern, ValidationIssue } from '../types/ears.js';
import { EARSValidator } from './ears-validator.js';

const REQ_HEADING_REGEX = /^#{1,4}\s+(REQ-[A-Z]{3}-\d{3}):\s*(.+)$/;
const FIELD_REGEX = {
  type: /^\*\*種別\*\*:\s*(.+)$/m,
  priority: /^\*\*優先度\*\*:\s*(P[012])$/m,
  requirement: /^\*\*要件\*\*:\s*\n([\s\S]+?)(?=\n\*\*|$)/m,
  acceptanceCriteria: /^\*\*受入基準\*\*:\s*\n((?:[-*]\s+\[[ x]\].+\n?)+)/m,
  traceability: /^\*\*トレーサビリティ\*\*:\s*(.+)$/m,
  package: /^\*\*パッケージ\*\*:\s*`(.+)`$/m,
};

export class MarkdownEARSParser {
  private validator: EARSValidator;

  constructor(validator?: EARSValidator) {
    this.validator = validator ?? new EARSValidator();
  }

  parse(markdown: string): ParsedRequirement[] {
    const requirements: ParsedRequirement[] = [];
    const lines = markdown.split('\n');
    let currentReq: Partial<ParsedRequirement> | null = null;
    let currentBlock = '';
    let blockStartLine = 0;
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          continue;
        }
      }
      if (inCodeBlock) {
        continue;
      }

      const headingMatch = line.match(REQ_HEADING_REGEX);
      if (headingMatch) {
        // Flush previous requirement
        if (currentReq && currentReq.id) {
          const parsed = this.parseBlock(currentReq, currentBlock, blockStartLine);
          requirements.push(parsed);
        }

        currentReq = {
          id: headingMatch[1],
          title: headingMatch[2].trim(),
          line: i + 1,
        };
        currentBlock = '';
        blockStartLine = i + 1;
      } else if (currentReq) {
        currentBlock += line + '\n';
      }
    }

    // Flush last requirement
    if (currentReq && currentReq.id) {
      const parsed = this.parseBlock(currentReq, currentBlock, blockStartLine);
      requirements.push(parsed);
    }

    return requirements;
  }

  private parseBlock(
    partial: Partial<ParsedRequirement>,
    block: string,
    _startLine: number,
  ): ParsedRequirement {
    const typeMatch = block.match(FIELD_REGEX.type);
    const priorityMatch = block.match(FIELD_REGEX.priority);
    const reqMatch = block.match(FIELD_REGEX.requirement);
    const acMatch = block.match(FIELD_REGEX.acceptanceCriteria);
    const traceMatch = block.match(FIELD_REGEX.traceability);
    const pkgMatch = block.match(FIELD_REGEX.package);

    const reqText = reqMatch ? reqMatch[1].trim() : '';

    // Classify with EARS validator
    let pattern: EARSPattern | undefined;
    let confidence: number | undefined;
    if (reqText) {
      const analysis = this.validator.analyze(reqText);
      pattern = analysis.pattern;
      confidence = analysis.confidence;
    }

    // Parse acceptance criteria
    let acceptanceCriteria: string[] | undefined;
    if (acMatch) {
      acceptanceCriteria = acMatch[1]
        .split('\n')
        .filter((l) => l.match(/^[-*]\s+\[[ x]\]/))
        .map((l) => l.replace(/^[-*]\s+\[[ x]\]\s*/, '').trim());
    }

    return {
      id: partial.id!,
      title: partial.title ?? '',
      text: reqText,
      pattern: typeMatch ? this.normalizePattern(typeMatch[1]) : pattern,
      confidence,
      priority: priorityMatch ? (priorityMatch[1] as 'P0' | 'P1' | 'P2') : undefined,
      acceptanceCriteria,
      traceability: traceMatch ? traceMatch[1].trim() : undefined,
      package: pkgMatch ? pkgMatch[1] : undefined,
      line: partial.line,
    };
  }

  private normalizePattern(raw: string): EARSPattern {
    const mapping: Record<string, EARSPattern> = {
      UBIQUITOUS: 'ubiquitous',
      'EVENT-DRIVEN': 'event-driven',
      EVENT_DRIVEN: 'event-driven',
      'STATE-DRIVEN': 'state-driven',
      STATE_DRIVEN: 'state-driven',
      UNWANTED: 'unwanted',
      OPTIONAL: 'optional',
      COMPLEX: 'complex',
    };
    return mapping[raw.toUpperCase()] ?? 'ubiquitous';
  }
}

/**
 * Requirements Validator
 *
 * Validates requirements document and provides map/search.
 */
export class RequirementsValidator {
  private parser: MarkdownEARSParser;
  private earsValidator: EARSValidator;

  constructor(parser?: MarkdownEARSParser, validator?: EARSValidator) {
    this.earsValidator = validator ?? new EARSValidator();
    this.parser = parser ?? new MarkdownEARSParser(this.earsValidator);
  }

  validate(markdown: string): { requirements: ParsedRequirement[]; issues: ValidationIssue[] } {
    const requirements = this.parser.parse(markdown);
    const issues: ValidationIssue[] = [];

    for (const req of requirements) {
      if (!req.text) {
        issues.push({
          requirementId: req.id,
          line: req.line ?? 0,
          column: 0,
          message: 'Requirement text is empty',
        });
        continue;
      }

      const validation = this.earsValidator.validate(req.text);
      if (!validation.valid) {
        for (const issue of validation.issues) {
          issues.push({
            requirementId: req.id,
            line: req.line ?? 0,
            column: 0,
            message: issue,
            suggestion: issue,
          });
        }
      }

      if (!req.acceptanceCriteria || req.acceptanceCriteria.length === 0) {
        issues.push({
          requirementId: req.id,
          line: req.line ?? 0,
          column: 0,
          message: 'Missing acceptance criteria',
          suggestion: 'Add acceptance criteria in checklist format',
        });
      }
    }

    return { requirements, issues };
  }

  map(requirements: ParsedRequirement[]): Map<string, ParsedRequirement> {
    const map = new Map<string, ParsedRequirement>();
    for (const req of requirements) {
      map.set(req.id, req);
    }
    return map;
  }

  search(query: string, requirements: ParsedRequirement[]): ParsedRequirement[] {
    const lower = query.toLowerCase();
    return requirements.filter((req) => {
      return (
        req.id.toLowerCase().includes(lower) ||
        req.title.toLowerCase().includes(lower) ||
        req.text.toLowerCase().includes(lower)
      );
    });
  }
}

export function createMarkdownEARSParser(): MarkdownEARSParser {
  return new MarkdownEARSParser();
}

export function createRequirementsValidator(): RequirementsValidator {
  return new RequirementsValidator();
}
