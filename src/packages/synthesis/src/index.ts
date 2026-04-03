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

export interface TransformStep {
  type: string;
  args: unknown[];
}

// --- DSLBuilder ---

const KEYWORDS = new Set([
  'if',
  'else',
  'while',
  'for',
  'return',
  'let',
  'const',
  'var',
  'function',
  'class',
  'import',
  'export',
  'from',
  'true',
  'false',
]);

const OPERATORS = new Set([
  '+',
  '-',
  '*',
  '/',
  '=',
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  '&&',
  '||',
  '!',
  '=>',
  '->',
]);

const DELIMITERS = new Set(['(', ')', '{', '}', '[', ']', ',', ';', ':']);

export class DSLBuilder {
  private pipeline: TransformStep[] = [];

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
    const source = tokens.map((t) => t.value).join(' ');
    return { tokens: [...tokens], source };
  }

  build(expression: DSLExpression): string {
    return expression.tokens.map((t) => t.value).join(' ');
  }

  // --- Transformation pipeline methods (chainable) ---

  prefixRemove(prefix: string): DSLBuilder {
    this.pipeline.push({ type: 'prefixRemove', args: [prefix] });
    return this;
  }

  suffixAppend(suffix: string): DSLBuilder {
    this.pipeline.push({ type: 'suffixAppend', args: [suffix] });
    return this;
  }

  replace(from: string, to: string): DSLBuilder {
    this.pipeline.push({ type: 'replace', args: [from, to] });
    return this;
  }

  toUpperCase(): DSLBuilder {
    this.pipeline.push({ type: 'toUpperCase', args: [] });
    return this;
  }

  toLowerCase(): DSLBuilder {
    this.pipeline.push({ type: 'toLowerCase', args: [] });
    return this;
  }

  reverse(): DSLBuilder {
    this.pipeline.push({ type: 'reverse', args: [] });
    return this;
  }

  substring(start: number, end?: number): DSLBuilder {
    this.pipeline.push({ type: 'substring', args: [start, end] });
    return this;
  }

  split(delimiter: string, index: number): DSLBuilder {
    this.pipeline.push({ type: 'split', args: [delimiter, index] });
    return this;
  }

  join(parts: string[], delimiter: string): DSLBuilder {
    this.pipeline.push({ type: 'join', args: [parts, delimiter] });
    return this;
  }

  conditionalReplace(
    pattern: string,
    replacement: string,
    condition: (s: string) => boolean,
  ): DSLBuilder {
    this.pipeline.push({ type: 'conditionalReplace', args: [pattern, replacement, condition] });
    return this;
  }

  repeat(times: number): DSLBuilder {
    this.pipeline.push({ type: 'repeat', args: [times] });
    return this;
  }

  pad(length: number, char: string, direction: 'left' | 'right'): DSLBuilder {
    this.pipeline.push({ type: 'pad', args: [length, char, direction] });
    return this;
  }

  trim(): DSLBuilder {
    this.pipeline.push({ type: 'trim', args: [] });
    return this;
  }

  capitalize(): DSLBuilder {
    this.pipeline.push({ type: 'capitalize', args: [] });
    return this;
  }

  camelCase(): DSLBuilder {
    this.pipeline.push({ type: 'camelCase', args: [] });
    return this;
  }

  snakeCase(): DSLBuilder {
    this.pipeline.push({ type: 'snakeCase', args: [] });
    return this;
  }

  regexReplace(pattern: RegExp, replacement: string): DSLBuilder {
    this.pipeline.push({ type: 'regexReplace', args: [pattern, replacement] });
    return this;
  }

  execute(input: string): string {
    let result = input;
    for (const step of this.pipeline) {
      result = this.applyStep(step, result);
    }
    return result;
  }

  getPipeline(): TransformStep[] {
    return [...this.pipeline];
  }

  clearPipeline(): DSLBuilder {
    this.pipeline = [];
    return this;
  }

  private applyStep(step: TransformStep, input: string): string {
    switch (step.type) {
      case 'prefixRemove': {
        const prefix = step.args[0] as string;
        return input.startsWith(prefix) ? input.slice(prefix.length) : input;
      }
      case 'suffixAppend':
        return input + (step.args[0] as string);
      case 'replace':
        return input.split(step.args[0] as string).join(step.args[1] as string);
      case 'toUpperCase':
        return input.toUpperCase();
      case 'toLowerCase':
        return input.toLowerCase();
      case 'reverse':
        return input.split('').reverse().join('');
      case 'substring': {
        const start = step.args[0] as number;
        const end = step.args[1] as number | undefined;
        return end !== undefined ? input.substring(start, end) : input.substring(start);
      }
      case 'split': {
        const parts = input.split(step.args[0] as string);
        const idx = step.args[1] as number;
        return idx >= 0 && idx < parts.length ? parts[idx] : '';
      }
      case 'join': {
        const joinParts = step.args[0] as string[];
        const delimiter = step.args[1] as string;
        return [input, ...joinParts].join(delimiter);
      }
      case 'conditionalReplace': {
        const pattern = step.args[0] as string;
        const replacement = step.args[1] as string;
        const condition = step.args[2] as (s: string) => boolean;
        return condition(input) ? input.split(pattern).join(replacement) : input;
      }
      case 'repeat': {
        const times = step.args[0] as number;
        return input.repeat(times);
      }
      case 'pad': {
        const length = step.args[0] as number;
        const char = step.args[1] as string;
        const direction = step.args[2] as 'left' | 'right';
        if (direction === 'left') {
          return input.length >= length ? input : char.repeat(length - input.length) + input;
        }
        return input.length >= length ? input : input + char.repeat(length - input.length);
      }
      case 'trim':
        return input.trim();
      case 'capitalize':
        return input.length === 0 ? input : input[0].toUpperCase() + input.slice(1).toLowerCase();
      case 'camelCase': {
        const words = input
          .replace(/[^a-zA-Z0-9]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0);
        if (words.length === 0) return '';
        return (
          words[0].toLowerCase() +
          words
            .slice(1)
            .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
            .join('')
        );
      }
      case 'snakeCase': {
        const snakeWords = input
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[^a-zA-Z0-9]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0);
        return snakeWords.map((w) => w.toLowerCase()).join('_');
      }
      case 'regexReplace': {
        const regex = step.args[0] as RegExp;
        const repl = step.args[1] as string;
        return input.replace(regex, repl);
      }
      default:
        return input;
    }
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
    return space.hypotheses.filter((h) => this.isConsistent(h, space));
  }

  getSpaces(): Map<string, VersionSpace> {
    return new Map(this.spaces);
  }

  getConfidence(name: string): number {
    const space = this.spaces.get(name);
    if (!space) {
      throw new Error(`Version space "${name}" not found`);
    }
    const total = space.hypotheses.length;
    if (total === 0) return 0;
    const consistent = space.hypotheses.filter((h) => this.isConsistent(h, space)).length;
    if (consistent === 0) return 0;
    // Confidence is higher when fewer hypotheses remain (more constrained)
    // and there are enough examples to support them
    const exampleCount = space.positiveExamples.length + space.negativeExamples.length;
    const selectivity = 1 - consistent / total;
    const exampleFactor = Math.min(1, exampleCount / 5);
    return selectivity * exampleFactor;
  }

  prune(name: string): string[] {
    const space = this.spaces.get(name);
    if (!space) {
      throw new Error(`Version space "${name}" not found`);
    }
    const consistent = space.hypotheses.filter((h) => this.isConsistent(h, space));
    const pruned = space.hypotheses.filter((h) => !this.isConsistent(h, space));
    space.hypotheses = consistent;
    return pruned;
  }

  getVersionSpaceSize(name: string): { total: number; consistent: number; inconsistent: number } {
    const space = this.spaces.get(name);
    if (!space) {
      throw new Error(`Version space "${name}" not found`);
    }
    const consistent = space.hypotheses.filter((h) => this.isConsistent(h, space)).length;
    return {
      total: space.hypotheses.length,
      consistent,
      inconsistent: space.hypotheses.length - consistent,
    };
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

      // Pattern-based hypotheses
      if (/^[A-Z]/.test(example)) {
        const h = 'pattern:startsWithUpper';
        if (!space.hypotheses.includes(h)) space.hypotheses.push(h);
      }
      if (/^[a-z]/.test(example)) {
        const h = 'pattern:startsWithLower';
        if (!space.hypotheses.includes(h)) space.hypotheses.push(h);
      }
      if (/\d/.test(example)) {
        const h = 'pattern:containsDigit';
        if (!space.hypotheses.includes(h)) space.hypotheses.push(h);
      }
      if (/^[a-zA-Z]+$/.test(example)) {
        const h = 'pattern:alphaOnly';
        if (!space.hypotheses.includes(h)) space.hypotheses.push(h);
      }
    }
  }

  private isConsistent(hypothesis: string, space: VersionSpace): boolean {
    // Check against positive examples — hypothesis must match all
    const allPositiveMatch = space.positiveExamples.every((ex) =>
      this.matchesHypothesis(hypothesis, ex),
    );
    // Check against negative examples — hypothesis must reject all
    const allNegativeReject = space.negativeExamples.every(
      (ex) => !this.matchesHypothesis(hypothesis, ex),
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
    if (hypothesis === 'pattern:startsWithUpper') {
      return /^[A-Z]/.test(example);
    }
    if (hypothesis === 'pattern:startsWithLower') {
      return /^[a-z]/.test(example);
    }
    if (hypothesis === 'pattern:containsDigit') {
      return /\d/.test(example);
    }
    if (hypothesis === 'pattern:alphaOnly') {
      return /^[a-zA-Z]+$/.test(example);
    }
    return false;
  }
}

// --- SynthesisEngine ---

type SynthesisExample = { input: string; output: string };

export class SynthesisEngine {
  synthesize(examples: Array<SynthesisExample>): string | null {
    if (examples.length === 0) {
      return null;
    }

    // Try prefix removal rule
    const prefixRule = this.tryPrefixRule(examples);
    if (prefixRule && this.verify(prefixRule, examples)) {
      return prefixRule;
    }

    // Try suffix append rule
    const suffixRule = this.trySuffixRule(examples);
    if (suffixRule && this.verify(suffixRule, examples)) {
      return suffixRule;
    }

    // Try replace rule
    const replaceRule = this.tryReplaceRule(examples);
    if (replaceRule && this.verify(replaceRule, examples)) {
      return replaceRule;
    }

    // Try uppercase/lowercase transformations
    if (examples.every((e) => e.output === e.input.toUpperCase())) {
      return 'uppercase';
    }
    if (examples.every((e) => e.output === e.input.toLowerCase())) {
      return 'lowercase';
    }

    // Try reverse
    if (examples.every((e) => e.output === e.input.split('').reverse().join(''))) {
      return 'reverse';
    }

    // Try trim
    if (examples.every((e) => e.output === e.input.trim())) {
      return 'trim';
    }

    // Try capitalize
    if (
      examples.every(
        (e) =>
          e.input.length > 0 &&
          e.output === e.input[0].toUpperCase() + e.input.slice(1).toLowerCase(),
      )
    ) {
      return 'capitalize';
    }

    // Try camelCase
    const camelRule = this.tryCamelCase(examples);
    if (camelRule) return camelRule;

    // Try snakeCase
    const snakeRule = this.trySnakeCase(examples);
    if (snakeRule) return snakeRule;

    // Try substring
    const substringRule = this.trySubstringRule(examples);
    if (substringRule && this.verify(substringRule, examples)) {
      return substringRule;
    }

    // Try repeat
    const repeatRule = this.tryRepeatRule(examples);
    if (repeatRule && this.verify(repeatRule, examples)) {
      return repeatRule;
    }

    // Try compositional synthesis (2-step combinations)
    const compositional = this.synthesizeCompositional(examples);
    if (compositional) return compositional;

    // Try conditional synthesis
    const conditional = this.synthesizeConditional(examples);
    if (conditional) return conditional;

    return null;
  }

  verify(rule: string, examples: Array<SynthesisExample>): boolean {
    return examples.every((e) => this.applyRule(rule, e.input) === e.output);
  }

  applyRule(rule: string, input: string): string {
    // Handle composite rules (pipe-separated)
    if (rule.includes('|>')) {
      const steps = rule.split('|>').map((s) => s.trim());
      let result = input;
      for (const step of steps) {
        result = this.applySingleRule(step, result);
      }
      return result;
    }

    // Handle conditional rules
    if (rule.startsWith('conditional:')) {
      return this.applyConditionalRule(rule, input);
    }

    return this.applySingleRule(rule, input);
  }

  private applySingleRule(rule: string, input: string): string {
    if (rule === 'uppercase') {
      return input.toUpperCase();
    }
    if (rule === 'lowercase') {
      return input.toLowerCase();
    }
    if (rule === 'reverse') {
      return input.split('').reverse().join('');
    }
    if (rule === 'trim') {
      return input.trim();
    }
    if (rule === 'capitalize') {
      return input.length === 0
        ? input
        : input[0].toUpperCase() + input.slice(1).toLowerCase();
    }
    if (rule === 'camelCase') {
      const words = input
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (words.length === 0) return '';
      return (
        words[0].toLowerCase() +
        words
          .slice(1)
          .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
          .join('')
      );
    }
    if (rule === 'snakeCase') {
      const words = input
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      return words.map((w) => w.toLowerCase()).join('_');
    }

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
    if (rule.startsWith('substring:')) {
      const params = rule.slice('substring:'.length).split(',').map(Number);
      if (params.length === 2) {
        return input.substring(params[0], params[1]);
      }
      if (params.length === 1) {
        return input.substring(params[0]);
      }
    }
    if (rule.startsWith('repeat:')) {
      const times = parseInt(rule.slice('repeat:'.length), 10);
      return input.repeat(times);
    }
    if (rule.startsWith('split:')) {
      const match = rule.match(/^split:(.+),(\d+)$/);
      if (match) {
        const parts = input.split(match[1]);
        const idx = parseInt(match[2], 10);
        return idx >= 0 && idx < parts.length ? parts[idx] : '';
      }
    }
    if (rule.startsWith('pad:')) {
      const match = rule.match(/^pad:(\d+),(.),(\w+)$/);
      if (match) {
        const len = parseInt(match[1], 10);
        const ch = match[2];
        const dir = match[3];
        if (dir === 'left') {
          return input.length >= len ? input : ch.repeat(len - input.length) + input;
        }
        return input.length >= len ? input : input + ch.repeat(len - input.length);
      }
    }
    return input;
  }

  private applyConditionalRule(rule: string, input: string): string {
    // Format: conditional:condition1=>rule1;condition2=>rule2;default=>rule3
    const body = rule.slice('conditional:'.length);
    const branches = body.split(';');
    for (const branch of branches) {
      const [condition, branchRule] = branch.split('=>');
      if (!branchRule) continue;
      if (condition === 'default') {
        return this.applySingleRule(branchRule, input);
      }
      if (this.matchCondition(condition, input)) {
        return this.applySingleRule(branchRule, input);
      }
    }
    return input;
  }

  private matchCondition(condition: string, input: string): boolean {
    if (condition.startsWith('contains:')) {
      return input.includes(condition.slice('contains:'.length));
    }
    if (condition.startsWith('startsWith:')) {
      return input.startsWith(condition.slice('startsWith:'.length));
    }
    if (condition === 'isUpperCase') {
      return input === input.toUpperCase() && input !== input.toLowerCase();
    }
    if (condition === 'isLowerCase') {
      return input === input.toLowerCase() && input !== input.toUpperCase();
    }
    if (condition.startsWith('lengthGreaterThan:')) {
      return input.length > parseInt(condition.slice('lengthGreaterThan:'.length), 10);
    }
    return false;
  }

  private tryPrefixRule(examples: Array<SynthesisExample>): string | null {
    const first = examples[0];
    // Check if output is input with prefix removed
    for (let len = 1; len <= first.input.length; len++) {
      const prefix = first.input.slice(0, len);
      if (first.input.slice(len) === first.output) {
        const rule = `removePrefix:${prefix}`;
        if (examples.every((e) => e.input.startsWith(prefix) && e.input.slice(len) === e.output)) {
          return rule;
        }
      }
    }
    return null;
  }

  private trySuffixRule(examples: Array<SynthesisExample>): string | null {
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

  private tryReplaceRule(examples: Array<SynthesisExample>): string | null {
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

  private trySubstringRule(examples: Array<SynthesisExample>): string | null {
    const first = examples[0];
    const idx = first.input.indexOf(first.output);
    if (idx >= 0 && first.output.length < first.input.length) {
      const start = idx;
      const end = idx + first.output.length;
      const rule = `substring:${start},${end}`;
      if (this.verify(rule, examples)) {
        return rule;
      }
    }
    return null;
  }

  private tryRepeatRule(examples: Array<SynthesisExample>): string | null {
    const first = examples[0];
    if (first.input.length === 0) return null;
    if (first.output.length % first.input.length === 0) {
      const times = first.output.length / first.input.length;
      if (times >= 2 && first.output === first.input.repeat(times)) {
        const rule = `repeat:${times}`;
        if (this.verify(rule, examples)) {
          return rule;
        }
      }
    }
    return null;
  }

  private tryCamelCase(examples: Array<SynthesisExample>): string | null {
    if (
      examples.every((e) => {
        const words = e.input
          .replace(/[^a-zA-Z0-9]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0);
        if (words.length === 0) return e.output === '';
        const expected =
          words[0].toLowerCase() +
          words
            .slice(1)
            .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
            .join('');
        return e.output === expected;
      })
    ) {
      return 'camelCase';
    }
    return null;
  }

  private trySnakeCase(examples: Array<SynthesisExample>): string | null {
    if (
      examples.every((e) => {
        const words = e.input
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[^a-zA-Z0-9]+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0);
        const expected = words.map((w) => w.toLowerCase()).join('_');
        return e.output === expected;
      })
    ) {
      return 'snakeCase';
    }
    return null;
  }

  private synthesizeCompositional(examples: Array<SynthesisExample>): string | null {
    const singleRules = [
      'uppercase',
      'lowercase',
      'reverse',
      'trim',
      'capitalize',
      'camelCase',
      'snakeCase',
    ];

    // Try all pairs of single rules
    for (const r1 of singleRules) {
      for (const r2 of singleRules) {
        if (r1 === r2) continue;
        const composite = `${r1} |> ${r2}`;
        if (this.verify(composite, examples)) {
          return composite;
        }
      }
    }

    // Try single rule + replace
    const replaceRule = this.findReplacePart(examples, singleRules);
    if (replaceRule) return replaceRule;

    return null;
  }

  private findReplacePart(
    examples: Array<SynthesisExample>,
    singleRules: string[],
  ): string | null {
    for (const r1 of singleRules) {
      // Apply r1 to all inputs, then try to find a replace rule for the remainder
      const intermediate = examples.map((e) => ({
        input: this.applySingleRule(r1, e.input),
        output: e.output,
      }));
      const replaceRule = this.tryReplaceRule(intermediate);
      if (replaceRule && this.verify(`${r1} |> ${replaceRule}`, examples)) {
        return `${r1} |> ${replaceRule}`;
      }

      // Or try replace first, then r1
      for (let i = 0; i < examples[0].input.length && i < examples[0].output.length; i++) {
        if (examples[0].input[i] !== examples[0].output[i]) {
          const from = examples[0].input[i];
          // Find what the output char should be before r1 is applied
          const candidates = this.applySingleRule(r1, examples[0].output);
          if (candidates[i] !== undefined) {
            const to = examples[0].output[i];
            const rule = `replace:${from}->${to} |> ${r1}`;
            if (this.verify(rule, examples)) {
              return rule;
            }
          }
          break;
        }
      }
    }
    return null;
  }

  private synthesizeConditional(examples: Array<SynthesisExample>): string | null {
    if (examples.length < 2) return null;

    const singleRules = [
      'uppercase',
      'lowercase',
      'reverse',
      'trim',
      'capitalize',
    ];

    // Try to partition examples into groups that each follow a single rule
    for (const r1 of singleRules) {
      const r1Matches = examples.filter(
        (e) => this.applySingleRule(r1, e.input) === e.output,
      );
      if (r1Matches.length === 0 || r1Matches.length === examples.length) continue;

      const remaining = examples.filter(
        (e) => this.applySingleRule(r1, e.input) !== e.output,
      );

      for (const r2 of singleRules) {
        if (r1 === r2) continue;
        const r2Matches = remaining.filter(
          (e) => this.applySingleRule(r2, e.input) === e.output,
        );
        if (r2Matches.length === remaining.length) {
          // Find a distinguishing condition
          const condition = this.findDistinguishingCondition(r1Matches, remaining);
          if (condition) {
            return `conditional:${condition}=>${r1};default=>${r2}`;
          }
        }
      }
    }

    return null;
  }

  private findDistinguishingCondition(
    group1: Array<SynthesisExample>,
    group2: Array<SynthesisExample>,
  ): string | null {
    // Try isUpperCase
    if (
      group1.every((e) => e.input === e.input.toUpperCase() && e.input !== e.input.toLowerCase()) &&
      group2.every((e) => !(e.input === e.input.toUpperCase() && e.input !== e.input.toLowerCase()))
    ) {
      return 'isUpperCase';
    }

    // Try isLowerCase
    if (
      group1.every((e) => e.input === e.input.toLowerCase() && e.input !== e.input.toUpperCase()) &&
      group2.every((e) => !(e.input === e.input.toLowerCase() && e.input !== e.input.toUpperCase()))
    ) {
      return 'isLowerCase';
    }

    // Try startsWith for common prefixes
    if (group1.length > 0) {
      const firstInput = group1[0].input;
      for (let len = 1; len <= Math.min(3, firstInput.length); len++) {
        const prefix = firstInput.slice(0, len);
        if (
          group1.every((e) => e.input.startsWith(prefix)) &&
          group2.every((e) => !e.input.startsWith(prefix))
        ) {
          return `startsWith:${prefix}`;
        }
      }
    }

    // Try contains
    if (group1.length > 0) {
      const words1 = new Set(group1[0].input.split(/\W+/).filter((w) => w.length > 0));
      for (const word of words1) {
        if (
          group1.every((e) => e.input.includes(word)) &&
          group2.every((e) => !e.input.includes(word))
        ) {
          return `contains:${word}`;
        }
      }
    }

    // Try length-based
    const minGroup1Len = Math.min(...group1.map((e) => e.input.length));
    const maxGroup2Len = Math.max(...group2.map((e) => e.input.length));
    if (minGroup1Len > maxGroup2Len) {
      return `lengthGreaterThan:${maxGroup2Len}`;
    }

    return null;
  }

  generalizePattern(examples: Array<SynthesisExample>): string | null {
    if (examples.length < 2) return this.synthesize(examples);

    // Try synthesizing from subsets and find the most general rule
    const rules: string[] = [];

    // Try pairs of examples
    for (let i = 0; i < examples.length - 1; i++) {
      const pairRule = this.synthesize([examples[i], examples[i + 1]]);
      if (pairRule) rules.push(pairRule);
    }

    if (rules.length === 0) return null;

    // Find the rule that works for all examples
    for (const rule of rules) {
      if (this.verify(rule, examples)) {
        return rule;
      }
    }

    // Return the most common rule even if not universal
    const ruleCounts = new Map<string, number>();
    for (const rule of rules) {
      const count = examples.filter((e) => this.applyRule(rule, e.input) === e.output).length;
      ruleCounts.set(rule, count);
    }
    let bestRule = rules[0];
    let bestCount = ruleCounts.get(rules[0]) ?? 0;
    for (const [rule, count] of ruleCounts) {
      if (count > bestCount) {
        bestRule = rule;
        bestCount = count;
      }
    }
    return bestCount >= examples.length * 0.5 ? bestRule : null;
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
