/**
 * EARS Validator
 *
 * Classifies requirements into EARS patterns and computes confidence scores.
 *
 * @module validators/ears-validator
 * @see REQ-REQ-001 — EARS pattern classification
 * @see DES-REQ-001 — EARS形式要件分析
 */

import type { EARSPattern, EARSAnalysisResult } from '../types/ears.js';

interface PatternRule {
  pattern: EARSPattern;
  regex: RegExp;
  baseConfidence: number;
  bonus: number;
}

const PATTERN_RULES: PatternRule[] = [
  {
    pattern: 'event-driven',
    regex: /\bWHEN\b.*\b(THE\s+.+\s+)?SHALL\b/i,
    baseConfidence: 0.6,
    bonus: 0.25,
  },
  {
    pattern: 'state-driven',
    regex: /\bWHILE\b.*\b(THE\s+.+\s+)?SHALL\b/i,
    baseConfidence: 0.6,
    bonus: 0.25,
  },
  {
    pattern: 'unwanted',
    regex: /\bSHALL\s+NOT\b/i,
    baseConfidence: 0.6,
    bonus: 0.2,
  },
  {
    pattern: 'optional',
    regex: /\bWHERE\b.*\b(THE\s+.+\s+)?SHALL\b/i,
    baseConfidence: 0.6,
    bonus: 0.2,
  },
  {
    pattern: 'complex',
    regex: /\bIF\b.*\bTHEN\b.*\bSHALL\b/i,
    baseConfidence: 0.55,
    bonus: 0.15,
  },
  {
    pattern: 'ubiquitous',
    regex: /\b(THE\s+.+\s+)?SHALL\b/i,
    baseConfidence: 0.5,
    bonus: 0.0,
  },
];

// Detect complex multi-pattern requirements
const COMPLEX_COMBINATIONS: RegExp[] = [
  /\bWHEN\b.*\bWHILE\b/i,
  /\bWHILE\b.*\bWHEN\b/i,
  /\bIF\b.*\bWHEN\b/i,
];

export class EARSValidator {
  analyze(
    text: string,
    options?: { sourceFormat?: 'plain' | 'markdown-blockquote' },
  ): EARSAnalysisResult {
    const cleaned = this.cleanText(text, options?.sourceFormat);
    const suggestions: string[] = [];

    // Check for complex combinations first
    for (const combo of COMPLEX_COMBINATIONS) {
      if (combo.test(cleaned)) {
        const confidence = this.computeConfidence(cleaned, 'complex', 0.55, 0.15);
        return {
          pattern: 'complex',
          confidence,
          triggers: this.extractTriggers(cleaned, 'complex'),
          suggestions:
            confidence < 0.7
              ? ['Consider splitting this complex requirement into simpler EARS patterns']
              : [],
        };
      }
    }

    // Try each pattern in priority order (most specific first)
    // Early termination: return immediately when confidence >= 0.85
    let bestResult: EARSAnalysisResult | null = null;

    for (const rule of PATTERN_RULES) {
      if (rule.regex.test(cleaned)) {
        const confidence = this.computeConfidence(
          cleaned,
          rule.pattern,
          rule.baseConfidence,
          rule.bonus,
        );
        const patternTriggers = this.extractTriggers(cleaned, rule.pattern);

        const patternSuggestions: string[] = [];
        if (confidence < 0.7) {
          patternSuggestions.push(this.getSuggestion(rule.pattern));
        }

        const result: EARSAnalysisResult = {
          pattern: rule.pattern,
          confidence,
          triggers: patternTriggers,
          suggestions: patternSuggestions,
        };

        // Early termination: high confidence match needs no further checks
        if (confidence >= 0.85) {
          return result;
        }

        if (!bestResult || confidence > bestResult.confidence) {
          bestResult = result;
        }

        // First match in priority order is authoritative
        return result;
      }
    }

    // No pattern matched
    return {
      pattern: 'ubiquitous',
      confidence: 0.3,
      triggers: [],
      suggestions: [
        'Requirement does not match any EARS pattern. Use "THE <system> SHALL <action>" as minimum.',
      ],
    };
  }

  validate(requirement: string): { valid: boolean; issues: string[] } {
    const result = this.analyze(requirement);
    const issues: string[] = [];

    if (result.confidence < 0.5) {
      issues.push(
        `Low confidence (${result.confidence.toFixed(2)}): does not clearly match EARS pattern`,
      );
    }

    if (!/\bSHALL\b/i.test(requirement)) {
      issues.push('Missing mandatory keyword "SHALL"');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private cleanText(text: string, format?: 'plain' | 'markdown-blockquote'): string {
    let cleaned = text.trim();
    if (format === 'markdown-blockquote') {
      cleaned = cleaned.replace(/^>\s*/gm, '');
    }
    return cleaned;
  }

  private computeConfidence(
    text: string,
    _pattern: EARSPattern,
    base: number,
    bonus: number,
  ): number {
    let confidence = base + bonus;

    // Boost for explicit "THE <system> SHALL"
    if (/\bTHE\s+\S+\s+SHALL\b/i.test(text)) {
      confidence += 0.1;
    }

    // Boost for punctuation and completeness
    if (text.endsWith('.') || text.endsWith('。')) {
      confidence += 0.05;
    }

    // Penalty for very short text
    if (text.split(/\s+/).length < 5) {
      confidence -= 0.15;
    }

    // Early termination optimization: cap at 1.0
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  private extractTriggers(text: string, pattern: EARSPattern): string[] {
    const triggers: string[] = [];

    switch (pattern) {
      case 'event-driven': {
        const match = text.match(/\bWHEN\s+(.+?),?\s*(THE\b|$)/i);
        if (match) {
          triggers.push(match[1].trim());
        }
        break;
      }
      case 'state-driven': {
        const match = text.match(/\bWHILE\s+(.+?),?\s*(THE\b|$)/i);
        if (match) {
          triggers.push(match[1].trim());
        }
        break;
      }
      case 'optional': {
        const match = text.match(/\bWHERE\s+(.+?),?\s*(THE\b|$)/i);
        if (match) {
          triggers.push(match[1].trim());
        }
        break;
      }
      case 'complex': {
        const ifMatch = text.match(/\bIF\s+(.+?),?\s*THEN\b/i);
        if (ifMatch) {
          triggers.push(ifMatch[1].trim());
        }
        break;
      }
    }

    return triggers;
  }

  private getSuggestion(pattern: EARSPattern): string {
    const suggestions: Record<EARSPattern, string> = {
      ubiquitous: 'Use "THE <system> SHALL <action>" format',
      'event-driven': 'Use "WHEN <event>, THE <system> SHALL <action>" format',
      'state-driven': 'Use "WHILE <state>, THE <system> SHALL <action>" format',
      unwanted: 'Use "THE <system> SHALL NOT <action>" format',
      optional: 'Use "WHERE <condition>, THE <system> SHALL <action>" format',
      complex: 'Use "IF <condition>, THEN THE <system> SHALL <action>" format',
    };
    return suggestions[pattern];
  }
}

/**
 * Converts natural language to EARS format using keyword heuristics.
 */
export function convertToEARS(naturalLanguage: string): string {
  const text = naturalLanguage.trim();

  // Detect "when ... shall/should/must"
  const whenMatch = text.match(/^when\s+(.+?),?\s+(the\s+\S+)\s+(shall|should|must)\s+(.+)$/i);
  if (whenMatch) {
    const trigger = whenMatch[1].trim();
    const system = whenMatch[2].trim().toUpperCase();
    const action = whenMatch[4].trim();
    return `WHEN ${trigger}, ${system} SHALL ${action}`;
  }

  // Detect "while ... shall/should/must"
  const whileMatch = text.match(
    /^while\s+(.+?),?\s+(the\s+\S+)\s+(shall|should|must)\s+(.+)$/i,
  );
  if (whileMatch) {
    const state = whileMatch[1].trim();
    const system = whileMatch[2].trim().toUpperCase();
    const action = whileMatch[4].trim();
    return `WHILE ${state}, ${system} SHALL ${action}`;
  }

  // Detect "if ... then ... shall/should/must"
  const ifMatch = text.match(
    /^if\s+(.+?),?\s+then\s+(the\s+\S+)\s+(shall|should|must)\s+(.+)$/i,
  );
  if (ifMatch) {
    const condition = ifMatch[1].trim();
    const system = ifMatch[2].trim().toUpperCase();
    const action = ifMatch[4].trim();
    return `IF ${condition}, THEN ${system} SHALL ${action}`;
  }

  // Detect "shall not" pattern
  const shallNotMatch = text.match(/^(the\s+\S+)\s+(shall|should|must)\s+not\s+(.+)$/i);
  if (shallNotMatch) {
    const system = shallNotMatch[1].trim().toUpperCase();
    const action = shallNotMatch[3].trim();
    return `${system} SHALL NOT ${action}`;
  }

  // Detect simple "shall/should/must" pattern
  const shallMatch = text.match(/^(the\s+\S+)\s+(shall|should|must)\s+(.+)$/i);
  if (shallMatch) {
    const system = shallMatch[1].trim().toUpperCase();
    const action = shallMatch[3].trim();
    return `${system} SHALL ${action}`;
  }

  // Fallback: wrap into ubiquitous pattern
  return `THE system SHALL ${text}`;
}

export function createEARSValidator(): EARSValidator {
  return new EARSValidator();
}
