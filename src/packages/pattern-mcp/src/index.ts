/**
 * @musubix2/pattern-mcp — AST pattern extraction and MCP server
 *
 * DES-LRN-006 (P7-05): パターン抽出MCP
 * ASTベースのデザインパターン抽出・分類。MCPツールとして公開。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ASTPatternType =
  | 'function-call'
  | 'class-definition'
  | 'import-statement'
  | 'error-handling'
  | 'loop'
  | 'conditional';

export interface ExtractedPattern {
  type: ASTPatternType;
  name: string;
  location: { line: number; column: number };
  frequency: number;
}

// ---------------------------------------------------------------------------
// PatternLibrary
// ---------------------------------------------------------------------------

export class PatternLibrary {
  private patterns: ExtractedPattern[] = [];

  add(pattern: ExtractedPattern): void {
    this.patterns.push(pattern);
  }

  getByType(type: ASTPatternType): ExtractedPattern[] {
    return this.patterns.filter((p) => p.type === type);
  }

  getMostFrequent(limit: number): ExtractedPattern[] {
    return [...this.patterns]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  search(query: string): ExtractedPattern[] {
    const lower = query.toLowerCase();
    return this.patterns.filter((p) => p.name.toLowerCase().includes(lower));
  }

  size(): number {
    return this.patterns.length;
  }

  clear(): void {
    this.patterns = [];
  }
}

// ---------------------------------------------------------------------------
// ASTPatternExtractor
// ---------------------------------------------------------------------------

interface PatternRule {
  type: ASTPatternType;
  regex: RegExp;
}

const PATTERN_RULES: PatternRule[] = [
  { type: 'class-definition', regex: /class\s+(\w+)/g },
  { type: 'import-statement', regex: /import.*from\s+['"](.+)['"]/g },
  { type: 'error-handling', regex: /try\s*\{/g },
  { type: 'error-handling', regex: /catch\s*\(/g },
  { type: 'loop', regex: /for\s*\(/g },
  { type: 'loop', regex: /while\s*\(/g },
  { type: 'conditional', regex: /if\s*\(/g },
  { type: 'function-call', regex: /(\w+)\(/g },
];

export class ASTPatternExtractor {
  extract(code: string): ExtractedPattern[] {
    const results: ExtractedPattern[] = [];
    const lines = code.split('\n');
    const freq = new Map<string, number>();

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      for (const rule of PATTERN_RULES) {
        const re = new RegExp(rule.regex.source, rule.regex.flags);
        let match: RegExpExecArray | null;
        while ((match = re.exec(line)) !== null) {
          const name = match[1] ?? match[0].trim();
          const key = `${rule.type}:${name}`;
          const count = (freq.get(key) ?? 0) + 1;
          freq.set(key, count);

          results.push({
            type: rule.type,
            name,
            location: { line: lineIdx + 1, column: match.index + 1 },
            frequency: count,
          });
        }
      }
    }

    // Update frequency counts on all extracted patterns
    for (const pattern of results) {
      const key = `${pattern.type}:${pattern.name}`;
      pattern.frequency = freq.get(key) ?? 1;
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// PatternMCPServer
// ---------------------------------------------------------------------------

export class PatternMCPServer {
  private library: PatternLibrary;
  private extractor: ASTPatternExtractor;

  constructor(library?: PatternLibrary, extractor?: ASTPatternExtractor) {
    this.library = library ?? new PatternLibrary();
    this.extractor = extractor ?? new ASTPatternExtractor();
  }

  registerTools(): Array<{ name: string; description: string }> {
    return [
      { name: 'pattern_extract', description: 'Extract patterns from code' },
      { name: 'pattern_search', description: 'Search patterns by name' },
      { name: 'pattern_add', description: 'Add a pattern to the library' },
      { name: 'pattern_list_by_type', description: 'List patterns by type' },
      { name: 'pattern_most_frequent', description: 'Get most frequent patterns' },
      { name: 'pattern_clear', description: 'Clear the pattern library' },
    ];
  }

  handleTool(name: string, params: Record<string, unknown>): unknown {
    switch (name) {
      case 'pattern_extract': {
        const code = params['code'] as string;
        const patterns = this.extractor.extract(code);
        for (const p of patterns) {
          this.library.add(p);
        }
        return patterns;
      }
      case 'pattern_search': {
        const query = params['query'] as string;
        return this.library.search(query);
      }
      case 'pattern_add': {
        const pattern = params['pattern'] as ExtractedPattern;
        this.library.add(pattern);
        return { success: true };
      }
      case 'pattern_list_by_type': {
        const type = params['type'] as ASTPatternType;
        return this.library.getByType(type);
      }
      case 'pattern_most_frequent': {
        const limit = (params['limit'] as number) ?? 10;
        return this.library.getMostFrequent(limit);
      }
      case 'pattern_clear': {
        this.library.clear();
        return { success: true };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createPatternLibrary(): PatternLibrary {
  return new PatternLibrary();
}

export function createASTPatternExtractor(): ASTPatternExtractor {
  return new ASTPatternExtractor();
}

export function createPatternMCPServer(): PatternMCPServer {
  return new PatternMCPServer();
}
