/**
 * EARS types
 *
 * Types for Easy Approach to Requirements Syntax.
 *
 * @module types/ears
 * @see REQ-REQ-001 — EARS pattern classification
 */

export type EARSPattern =
  | 'ubiquitous'
  | 'event-driven'
  | 'state-driven'
  | 'unwanted'
  | 'optional'
  | 'complex';

export interface EARSAnalysisResult {
  pattern: EARSPattern;
  confidence: number;
  triggers: string[];
  suggestions: string[];
}

export interface ParsedRequirement {
  id: string;
  title: string;
  text: string;
  pattern?: EARSPattern;
  confidence?: number;
  priority?: 'P0' | 'P1' | 'P2';
  acceptanceCriteria?: string[];
  traceability?: string;
  package?: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  requirementId: string;
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

export interface CoverageReport {
  total: number;
  covered: number;
  uncovered: string[];
  percentage: number;
}
