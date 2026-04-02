/**
 * @module synthesis
 * @description DSL builder, version spaces, and program synthesis engine
 * @see DES-LRN-005
 */

// --- Types ---

export interface DSLToken {
  type: 'keyword' | 'identifier' | 'operator' | 'literal' | 'delimiter';
  value: string;
}

export interface DSLExpression {
  tokens: DSLToken[];
  source: string;
}

export interface VersionSpace {
  hypotheses: string[];
  positiveExamples: string[];
  negativeExamples: string[];
}

// --- DSLBuilder ---

const KEYWORDS = new Set([
  'if', 'else', 'while', 'for', 'return', 'let', 'const', 'var',
  'function', 'class', 'import', 'export', 'from', 'true', 'false',
]);

const OPERATORS = new Set([
  '+', '-', '*', '/', '=', '==', '===', '!=', '!==',
  '<', '>', '<=', '>=', '&&', '||', '!', '=>', '->',
]);

const DELIMITERS = new Set(['(', ')', '{', '}', '[', ']', ',', ';', ':']);

export class DSLBuilder {
  tokenize(source: string): DSLToken[] {
    const tokens: DSLToken[] = [];
    const chars = source.trim();
    let i = 0;

    while (i < chars.length) {
      // Skip whitespace
      if (/\s/.test(chars[i])) {
        i++;
        continue;
      }

      // String literals
      if (chars[i] === '"' || chars[i] === "'") {
        const quote = chars[i];
        let value = quote;
        i++;
        while (i < chars.length && chars[i] !== quote) {
          value += chars[i];
          i++;
        }
        if (i < chars.length) {
          value += chars[i];
          i++;
        }
        tokens.push({ type: 'literal', value });
        continue;
      }

      // Number literals
      if (/[0-9]/.test(chars[i])) {
        let value = '';
        while (i < chars.length && /[0-9.]/.test(chars[i])) {
          value += chars[i];
          i++;
        }
        tokens.push({ type: 'literal', value });
        continue;
      }

      // Delimiters
      if (DELIMITERS.has(chars[i])) {
        tokens.push({ type: 'delimiter', value: chars[i] });
        i++;
        continue;
      }

      // Multi-char operators (check 3-char, 2-char, then 1-char)
      const threeChar = chars.slice(i, i + 3);
      const twoChar = chars.slice(i, i + 2);
      if (OPERATORS.has(threeChar)) {
        tokens.push({ type: 'operator', value: threeChar });
        i += 3;
        continue;
      }
      if (OPERATORS.has(twoChar)) {
        tokens.push({ type: 'operator', value: twoChar });
        i += 2;
        continue;
      }
      if (OPERATORS.has(chars[i])) {
        tokens.push({ type: 'operator', value: chars[i] });
        i++;
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(chars[i])) {
        let value = '';
        while (i < chars.length && /[a-zA-Z0-9_$]/.test(chars[i])) {
          value += chars[i];
          i++;
        }
        if (KEYWORDS.has(value)) {
          tokens.push({ type: 'keyword', value });
        } else {
          tokens.push({ type: 'identifier', value });
        }
        continue;
      }

      // Unknown character — skip
      i++;
    }

    return tokens;
  }

  parse(tokens: DSLToken[]): DSLExpression {
    const source = tokens.map(t => t.value).join(' ');
    return { tokens: [...tokens], source };
  }

  build(expression: DSLExpression): string {
    return expression.tokens.map(t => t.value).join(' ');
  }
}

// --- VersionSpaceManager ---

export class VersionSpaceManager {
  private spaces: Map<string, VersionSpace> = new Map();

  create(name: string): VersionSpace {
    const space: VersionSpace = {
      hypotheses: [],
      positiveExamples: [],
      negativeExamples: [],
    };
    this.spaces.set(name, space);
    return space;
  }

  addPositive(name: string, example: string): void {
    const space = this.spaces.get(name);
    if (!space) {
      throw new Error(`Version space "${name}" not found`);
    }
    space.positiveExamples.push(example);
    this.updateHypotheses(space);
  }

  addNegative(name: string, example: string): void {
    const space = this.spaces.get(name);
    if (!space) {
      throw new Error(`Version space "${name}" not found`);
    }
    space.negativeExamples.push(example);
    this.updateHypotheses(space);
  }

  getConsistentHypotheses(name: string): string[] {
    const space = this.spaces.get(name);
    if (!space) {
      throw new Error(`Version space "${name}" not found`);
    }
    return space.hypotheses.filter(h => this.isConsistent(h, space));
  }

  getSpaces(): Map<string, VersionSpace> {
    return new Map(this.spaces);
  }

  private updateHypotheses(space: VersionSpace): void {
    // Generate hypotheses from positive examples
    for (const example of space.positiveExamples) {
      const words = example.split(/\s+/);
      for (const word of words) {
        const hypothesis = `contains:${word}`;
        if (!space.hypotheses.includes(hypothesis)) {
          space.hypotheses.push(hypothesis);
        }
      }
      const lengthHypothesis = `length>=${example.length}`;
      if (!space.hypotheses.includes(lengthHypothesis)) {
        space.hypotheses.push(lengthHypothesis);
      }
    }
  }

  private isConsistent(hypothesis: string, space: VersionSpace): boolean {
    // Check against positive examples — hypothesis must match all
    const allPositiveMatch = space.positiveExamples.every(ex =>
      this.matchesHypothesis(hypothesis, ex),
    );
    // Check against negative examples — hypothesis must reject all
    const allNegativeReject = space.negativeExamples.every(ex =>
      !this.matchesHypothesis(hypothesis, ex),
    );
    return allPositiveMatch && allNegativeReject;
  }

  private matchesHypothesis(hypothesis: string, example: string): boolean {
    if (hypothesis.startsWith('contains:')) {
      const word = hypothesis.slice('contains:'.length);
      return example.includes(word);
    }
    if (hypothesis.startsWith('length>=')) {
      const len = parseInt(hypothesis.slice('length>='.length), 10);
      return example.length >= len;
    }
    return false;
  }
}

// --- SynthesisEngine ---

export class SynthesisEngine {
  synthesize(examples: Array<{ input: string; output: string }>): string | null {
    if (examples.length === 0) return null;

    // Try prefix removal rule
    const prefixRule = this.tryPrefixRule(examples);
    if (prefixRule && this.verify(prefixRule, examples)) return prefixRule;

    // Try suffix append rule
    const suffixRule = this.trySuffixRule(examples);
    if (suffixRule && this.verify(suffixRule, examples)) return suffixRule;

    // Try replace rule
    const replaceRule = this.tryReplaceRule(examples);
    if (replaceRule && this.verify(replaceRule, examples)) return replaceRule;

    // Try uppercase/lowercase transformations
    if (examples.every(e => e.output === e.input.toUpperCase())) {
      return 'uppercase';
    }
    if (examples.every(e => e.output === e.input.toLowerCase())) {
      return 'lowercase';
    }

    // Try reverse
    if (examples.every(e => e.output === e.input.split('').reverse().join(''))) {
      return 'reverse';
    }

    return null;
  }

  verify(rule: string, examples: Array<{ input: string; output: string }>): boolean {
    return examples.every(e => this.applyRule(rule, e.input) === e.output);
  }

  private applyRule(rule: string, input: string): string {
    if (rule === 'uppercase') return input.toUpperCase();
    if (rule === 'lowercase') return input.toLowerCase();
    if (rule === 'reverse') return input.split('').reverse().join('');

    if (rule.startsWith('removePrefix:')) {
      const prefix = rule.slice('removePrefix:'.length);
      return input.startsWith(prefix) ? input.slice(prefix.length) : input;
    }
    if (rule.startsWith('addSuffix:')) {
      const suffix = rule.slice('addSuffix:'.length);
      return input + suffix;
    }
    if (rule.startsWith('replace:')) {
      const parts = rule.slice('replace:'.length).split('->');
      if (parts.length === 2) {
        return input.split(parts[0]).join(parts[1]);
      }
    }
    return input;
  }

  private tryPrefixRule(examples: Array<{ input: string; output: string }>): string | null {
    const first = examples[0];
    // Check if output is input with prefix removed
    for (let len = 1; len <= first.input.length; len++) {
      const prefix = first.input.slice(0, len);
      if (first.input.slice(len) === first.output) {
        const rule = `removePrefix:${prefix}`;
        if (examples.every(e => e.input.startsWith(prefix) && e.input.slice(len) === e.output)) {
          return rule;
        }
      }
    }
    return null;
  }

  private trySuffixRule(examples: Array<{ input: string; output: string }>): string | null {
    const first = examples[0];
    // Check if output is input with something appended
    if (first.output.startsWith(first.input)) {
      const suffix = first.output.slice(first.input.length);
      if (suffix.length > 0) {
        return `addSuffix:${suffix}`;
      }
    }
    return null;
  }

  private tryReplaceRule(examples: Array<{ input: string; output: string }>): string | null {
    const first = examples[0];
    // Find a single-character difference for replacement
    for (let i = 0; i < first.input.length && i < first.output.length; i++) {
      if (first.input[i] !== first.output[i]) {
        // Try replacing this character pattern
        const from = first.input[i];
        const to = first.output[i];
        const rule = `replace:${from}->${to}`;
        if (this.verify(rule, examples)) {
          return rule;
        }
      }
    }
    return null;
  }
}

// --- Factories ---

export function createDSLBuilder(): DSLBuilder {
  return new DSLBuilder();
}

export function createVersionSpaceManager(): VersionSpaceManager {
  return new VersionSpaceManager();
}

export function createSynthesisEngine(): SynthesisEngine {
  return new SynthesisEngine();
}
