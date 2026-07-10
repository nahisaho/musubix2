/**
 * @musubix2/codegraph — Code Graph Engine
 *
 * AST parsing (TypeScript Compiler API for TS/JS, regex-based fallback for others),
 * in-memory dependency graph, storage adapters, and keyword-based GraphRAG search.
 *
 * @see DES-CG-001 — Code Graph
 */

import ts from 'typescript';
import {
  MultiLanguageParser,
  type ASTNode as MLASTNode,
} from './multi-lang-parser.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'haskell'
  | 'lua';

export type CodeNodeKind =
  | 'class'
  | 'function'
  | 'method'
  | 'interface'
  | 'import'
  | 'export'
  | 'variable'
  | 'module';

export type EdgeKind = 'calls' | 'imports' | 'extends' | 'implements' | 'uses' | 'contains';

export interface ASTNode {
  kind: CodeNodeKind;
  name: string;
  startLine: number;
  endLine: number;
  children: ASTNode[];
  metadata?: Record<string, unknown>;
}

export interface CodeNode {
  id: string;
  kind: CodeNodeKind;
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: SupportedLanguage;
  metadata?: Record<string, unknown>;
}

export interface CodeEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  metadata?: Record<string, unknown>;
}

export interface CodeGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export interface GraphQuery {
  kind?: CodeNodeKind;
  name?: string;
  filePath?: string;
  language?: SupportedLanguage;
}

export interface SearchResult {
  node: CodeNode;
  score: number;
  context?: string;
}

export interface StorageAdapter {
  save(graph: CodeGraph): Promise<void>;
  load(): Promise<CodeGraph>;
  query(filter: GraphQuery): Promise<CodeNode[]>;
}

// ---------------------------------------------------------------------------
// ASTParser options
// ---------------------------------------------------------------------------

export interface ASTParserOptions {
  /** Use enhanced multi-language parser instead of regex fallback (default false). */
  enhancedParsing?: boolean;
}

// ---------------------------------------------------------------------------
// ASTParser
// ---------------------------------------------------------------------------

const ALL_LANGUAGES: SupportedLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'haskell',
  'lua',
];


type LanguagePatterns = { kind: CodeNodeKind; regex: RegExp }[];

const LANGUAGE_PATTERNS: Record<string, LanguagePatterns> = {
  typescript: [
    { kind: 'class', regex: /(?:export\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /(?:export\s+)?interface\s+(\w+)/ },
    { kind: 'function', regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
    { kind: 'import', regex: /import\s+.*from\s+['"](.[^'"]+)['"]/ },
    { kind: 'export', regex: /export\s+\{\s*([^}]+)\}/ },
    { kind: 'variable', regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)/ },
  ],
  python: [
    { kind: 'class', regex: /^\s*class\s+(\w+)/ },
    // Allow leading indentation so class methods and nested defs are captured.
    { kind: 'function', regex: /^\s*(?:async\s+)?def\s+(\w+)/ },
    { kind: 'import', regex: /^(?:from\s+(\S+)\s+import|import\s+(\S+))/ },
    { kind: 'variable', regex: /^(\w+)\s*(?::\s*\w+)?\s*=/ },
  ],
  java: [
    { kind: 'class', regex: /(?:public|private|protected)?\s*(?:abstract\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /(?:public\s+)?interface\s+(\w+)/ },
    { kind: 'function', regex: /(?:public|private|protected)\s+(?:static\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/ },
    { kind: 'import', regex: /import\s+([\w.]+);/ },
    { kind: 'variable', regex: /(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?\w+\s+(\w+)\s*[=;]/ },
  ],
  go: [
    { kind: 'function', regex: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/ },
    { kind: 'class', regex: /^type\s+(\w+)\s+struct\b/ },
    { kind: 'interface', regex: /^type\s+(\w+)\s+interface\b/ },
    { kind: 'import', regex: /^\s*"([^"]+)"/ },
    { kind: 'variable', regex: /^(?:var|const)\s+(\w+)/ },
  ],
  rust: [
    { kind: 'class', regex: /(?:pub\s+)?struct\s+(\w+)/ },
    { kind: 'interface', regex: /(?:pub\s+)?trait\s+(\w+)/ },
    { kind: 'function', regex: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/ },
    { kind: 'import', regex: /use\s+([\w:]+)/ },
    { kind: 'variable', regex: /(?:pub\s+)?(?:static|const)\s+(\w+)/ },
  ],
  c: [
    { kind: 'class', regex: /(?:typedef\s+)?struct\s+(\w+)/ },
    { kind: 'function', regex: /^\w[\w\s*]+\s+(\w+)\s*\([^)]*\)\s*\{/ },
    { kind: 'import', regex: /#include\s+[<"]([^>"]+)[>"]/ },
    { kind: 'variable', regex: /^(?:static\s+)?(?:const\s+)?\w+\s+(\w+)\s*[=;]/ },
  ],
  cpp: [
    { kind: 'class', regex: /(?:class|struct)\s+(\w+)/ },
    { kind: 'function', regex: /^\w[\w\s*:&<>]+\s+(\w+)\s*\([^)]*\)\s*(?:const\s*)?[{;]/ },
    { kind: 'import', regex: /#include\s+[<"]([^>"]+)[>"]/ },
    { kind: 'variable', regex: /^(?:static\s+)?(?:const\s+)?(?:auto|int|float|double|string|bool|char)\s+(\w+)/ },
  ],
  csharp: [
    { kind: 'class', regex: /(?:public|private|internal|protected)?\s*(?:abstract\s+|static\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /(?:public\s+)?interface\s+(\w+)/ },
    { kind: 'function', regex: /(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/ },
    { kind: 'import', regex: /using\s+([\w.]+);/ },
    { kind: 'variable', regex: /(?:public|private|protected)\s+(?:static\s+)?(?:readonly\s+)?\w+\s+(\w+)\s*[=;{]/ },
  ],
  ruby: [
    // Allow leading indentation so classes/modules nested in a module (the norm
    // in Rails-style code) are captured, not just top-level ones.
    { kind: 'class', regex: /^\s*class\s+(\w+)/ },
    { kind: 'module', regex: /^\s*module\s+(\w+)/ },
    { kind: 'function', regex: /^\s*def\s+(?:self\.)?(\w+)/ },
    { kind: 'import', regex: /require(?:_relative)?\s+['"](.[^'"]+)['"]/ },
    { kind: 'variable', regex: /^\s*(\w+)\s*=/ },
  ],
  php: [
    { kind: 'class', regex: /(?:abstract\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /interface\s+(\w+)/ },
    { kind: 'function', regex: /(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)/ },
    // Anchor to statement start so the words "use"/"include" in prose/comments
    // are not mistaken for imports; capture the namespaced module name.
    { kind: 'import', regex: /^\s*(?:use|require_once|require|include_once|include)\s+([A-Za-z_\\][\w\\]*)/ },
    { kind: 'variable', regex: /(?:public|private|protected)\s+(?:static\s+)?\$(\w+)/ },
  ],
  swift: [
    { kind: 'class', regex: /(?:public\s+|open\s+|internal\s+|private\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /(?:public\s+)?protocol\s+(\w+)/ },
    { kind: 'function', regex: /(?:public\s+|private\s+|internal\s+)?(?:static\s+)?func\s+(\w+)/ },
    { kind: 'import', regex: /import\s+(\w+)/ },
    { kind: 'variable', regex: /(?:public\s+|private\s+)?(?:static\s+)?(?:let|var)\s+(\w+)/ },
  ],
  kotlin: [
    { kind: 'class', regex: /(?:data\s+|sealed\s+|abstract\s+|open\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /interface\s+(\w+)/ },
    { kind: 'function', regex: /(?:private\s+|public\s+)?(?:suspend\s+)?fun\s+(\w+)/ },
    { kind: 'import', regex: /import\s+([\w.]+)/ },
    { kind: 'variable', regex: /(?:private\s+|public\s+)?(?:val|var)\s+(\w+)/ },
  ],
  scala: [
    { kind: 'class', regex: /(?:case\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /trait\s+(\w+)/ },
    { kind: 'function', regex: /def\s+(\w+)/ },
    { kind: 'import', regex: /import\s+([\w.]+)/ },
    { kind: 'variable', regex: /(?:val|var|lazy\s+val)\s+(\w+)/ },
  ],
  haskell: [
    { kind: 'class', regex: /^(?:data|newtype)\s+(\w+)/ },
    { kind: 'interface', regex: /^class\s+(\w+)/ },
    { kind: 'function', regex: /^(\w+)\s+::/ },
    { kind: 'import', regex: /^import\s+(?:qualified\s+)?([\w.]+)/ },
    { kind: 'variable', regex: /^(\w+)\s+=/ },
  ],
  lua: [
    { kind: 'function', regex: /(?:local\s+)?function\s+(?:(\w[\w.:]*))\s*\(/ },
    { kind: 'import', regex: /(?:local\s+\w+\s*=\s*)?require\s*\(?['"](.[^'"]+)['"]\)?/ },
    { kind: 'variable', regex: /local\s+(\w+)\s*=/ },
  ],
};

// Copy typescript patterns for javascript
LANGUAGE_PATTERNS['javascript'] = LANGUAGE_PATTERNS['typescript'];

/** Keywords that are followed by `(` but are not function calls. */
const CALL_KEYWORDS: Record<string, Set<string>> = {
  default: new Set([
    'if', 'for', 'while', 'switch', 'return', 'sizeof', 'catch', 'do',
    'else', 'case', 'goto', 'typeof', 'await', 'defined',
  ]),
};
CALL_KEYWORDS.c = CALL_KEYWORDS.default;
CALL_KEYWORDS.cpp = CALL_KEYWORDS.default;

/**
 * Strip line/block comments and string/char literals so that identifiers inside
 * them are not mistaken for calls. Language-agnostic C-family handling (also a
 * safe superset for TS/JS/Java/Go/Rust). `#` line comments are handled for
 * scripting languages.
 */
function stripCommentsAndStrings(source: string, language: SupportedLanguage): string {
  const hashComments =
    language === 'python' || language === 'ruby' || language === 'lua';
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    const next = i + 1 < n ? source[i + 1] : '';
    // line comment
    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {i++;}
      continue;
    }
    if (hashComments && c === '#') {
      while (i < n && source[i] !== '\n') {i++;}
      continue;
    }
    // block comment
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {i++;}
      i += 2;
      continue;
    }
    // string / char literal
    if (c === '"' || c === '\'' || c === '`') {
      const quote = c;
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\') {i++;} // skip escaped char
        i++;
      }
      i++;
      out += ' ';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export class ASTParser {
  private enhancedParsing: boolean;
  private multiLangParser: MultiLanguageParser | null = null;

  constructor(options?: ASTParserOptions) {
    this.enhancedParsing = options?.enhancedParsing ?? false;
    if (this.enhancedParsing) {
      this.multiLangParser = new MultiLanguageParser();
    }
  }

  /** Enable or disable enhanced multi-language parsing at runtime. */
  useEnhancedParsing(enabled: boolean): void {
    this.enhancedParsing = enabled;
    if (enabled && !this.multiLangParser) {
      this.multiLangParser = new MultiLanguageParser();
    }
  }

  parse(source: string, language: SupportedLanguage): ASTNode[] {
    if (language === 'typescript' || language === 'javascript') {
      return this.parseWithTypeScriptAPI(source, language);
    }
    if (this.enhancedParsing && this.multiLangParser) {
      return this.parseWithMultiLang(source, language);
    }
    // C needs definition-aware, multi-line-signature handling that the generic
    // line-by-line regex fallback cannot provide (kernel style puts `{` on the
    // next line, and `struct X` appears far more often as a *usage* than a def).
    if (language === 'c') {
      return this.parseCLike(source);
    }
    return this.parseWithRegex(source, language);
  }

  /**
   * Definition-aware parser for C.
   *
   * Fixes three failures of the generic regex fallback on real C code:
   *  1. Function definitions are detected even when `(` params span multiple
   *     lines or the opening `{` sits on the next line (K&R kernel style).
   *  2. `struct`/`union`/`enum` nodes are emitted only for *definitions*
   *     (`tag {`), not for the vastly more common type *usages* in fields,
   *     parameters and locals — which otherwise flood the graph with noise.
   *  3. Macro invocations (`EXPORT_SYMBOL(x)`) and control statements are not
   *     mistaken for function definitions.
   */
  private parseCLike(source: string): ASTNode[] {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const CONTROL = new Set([
      'if', 'for', 'while', 'switch', 'return', 'sizeof', 'else', 'do',
      'case', 'goto', 'typedef', 'else if',
    ]);
    const includeRe = /#include\s+[<"]([^>"]+)[>"]/;
    const tagRe = /^(?:typedef\s+)?(?:struct|union|enum)\s+(\w+)\s*(\{|$)/;
    const funcRe = /^([A-Za-z_][\w\s*]*?\s+\*?)([A-Za-z_]\w*)\s*\(/;
    const varRe = /^(?:static\s+|const\s+|volatile\s+|extern\s+)*[A-Za-z_]\w*[\w\s*]*?\s+\*?([A-Za-z_]\w*)\s*[=;]/;

    const nextNonEmptyIsBrace = (from: number): boolean => {
      for (let j = from; j < lines.length && j < from + 3; j++) {
        const t = lines[j].trim();
        if (t === '') {continue;}
        return t.startsWith('{');
      }
      return false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // #include — the only cross-file edge source we currently track.
      const inc = includeRe.exec(line);
      if (inc) {
        nodes.push({ kind: 'import', name: inc[1], startLine: i + 1, endLine: i + 1, children: [] });
        continue;
      }

      // struct/union/enum DEFINITION (brace here or on the next non-empty line).
      const tag = tagRe.exec(line);
      if (tag && (line.includes('{') || nextNonEmptyIsBrace(i + 1))) {
        nodes.push({ kind: 'class', name: tag[1], startLine: i + 1, endLine: i + 1, children: [] });
        continue;
      }

      // Only top-level (column 0) declarations can be definitions.
      if (line.length === 0 || /^\s/.test(line) || /^[#*/]/.test(line)) {
        continue;
      }

      // Function definition.
      const fm = funcRe.exec(line);
      if (fm) {
        const retType = fm[1].trim();
        const firstTok = retType.split(/\s+/)[0];
        const name = fm[2];
        const end = line.trimEnd();
        const isDefinition =
          !end.endsWith(';') && // not a prototype/declaration
          (end.endsWith('{') || end.endsWith(')') || end.endsWith(',') || nextNonEmptyIsBrace(i + 1));
        if (isDefinition && !CONTROL.has(firstTok) && !CONTROL.has(name)) {
          // Record internal linkage (`static`) so cross-file call resolution can
          // bind file-local homonyms correctly.
          const isStatic = /\bstatic\b/.test(retType);
          nodes.push({
            kind: 'function',
            name,
            startLine: i + 1,
            endLine: i + 1,
            children: [],
            metadata: { static: isStatic },
          });
          continue;
        }
      }

      // File-scope variable (global) — ends with `=` or `;`, no call parens.
      if (!line.includes('(')) {
        const vm = varRe.exec(line);
        if (vm && !CONTROL.has(vm[1])) {
          nodes.push({ kind: 'variable', name: vm[1], startLine: i + 1, endLine: i + 1, children: [] });
        }
      }
    }

    return nodes;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return [...ALL_LANGUAGES];
  }

  // -- TypeScript Compiler API ------------------------------------------------

  private parseWithTypeScriptAPI(source: string, language: SupportedLanguage): ASTNode[] {
    const scriptKind = language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const sourceFile = ts.createSourceFile('temp.ts', source, ts.ScriptTarget.Latest, true, scriptKind);
    const nodes: ASTNode[] = [];

    for (const statement of sourceFile.statements) {
      const node = this.visitTsNode(statement, sourceFile);
      if (node) {nodes.push(node);}
    }

    return nodes;
  }

  private visitTsNode(node: ts.Node, sourceFile: ts.SourceFile): ASTNode | null {
    const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const startLine = startPos.line + 1;
    const endLine = endPos.line + 1;

    if (ts.isClassDeclaration(node)) {
      const name = node.name?.text ?? '<anonymous>';
      const children: ASTNode[] = [];
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
          const methodName = member.name
            ? (ts.isIdentifier(member.name) ? member.name.text : member.name.getText(sourceFile))
            : 'constructor';
          const mStart = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          const mEnd = sourceFile.getLineAndCharacterOfPosition(member.getEnd());
          children.push({
            kind: 'method',
            name: methodName,
            startLine: mStart.line + 1,
            endLine: mEnd.line + 1,
            children: [],
          });
        }
      }
      return { kind: 'class', name, startLine, endLine, children };
    }

    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text ?? '<anonymous>';
      return { kind: 'function', name, startLine, endLine, children: [] };
    }

    if (ts.isInterfaceDeclaration(node)) {
      return { kind: 'interface', name: node.name.text, startLine, endLine, children: [] };
    }

    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      const name = ts.isStringLiteral(specifier) ? specifier.text : specifier.getText(sourceFile);
      return { kind: 'import', name, startLine, endLine, children: [] };
    }

    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        const names = node.exportClause.elements.map((e) => e.name.text).join(', ');
        return { kind: 'export', name: names, startLine, endLine, children: [] };
      }
      const modSpec = node.moduleSpecifier;
      const name = modSpec && ts.isStringLiteral(modSpec) ? modSpec.text : '*';
      return { kind: 'export', name, startLine, endLine, children: [] };
    }

    if (ts.isExportAssignment(node)) {
      return { kind: 'export', name: 'default', startLine, endLine, children: [] };
    }

    if (ts.isVariableStatement(node)) {
      const children: ASTNode[] = [];
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const dStart = sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile));
          const dEnd = sourceFile.getLineAndCharacterOfPosition(decl.getEnd());
          children.push({
            kind: 'variable',
            name: decl.name.text,
            startLine: dStart.line + 1,
            endLine: dEnd.line + 1,
            children: [],
          });
        }
      }
      // Return single variable directly, or a variable node with children for destructuring
      if (children.length === 1) {
        return children[0];
      }
      if (children.length > 0) {
        return { kind: 'variable', name: children.map((c) => c.name).join(', '), startLine, endLine, children };
      }
      return null;
    }

    return null;
  }

  // -- Enhanced multi-language parser -----------------------------------------

  private parseWithMultiLang(source: string, language: SupportedLanguage): ASTNode[] {
    const result = this.multiLangParser!.parse(source, language);
    return result.nodes.map((n) => this.convertMLNode(n));
  }

  private convertMLNode(node: MLASTNode): ASTNode {
    const kindMap: Record<string, CodeNodeKind> = {
      class: 'class',
      struct: 'class',
      interface: 'interface',
      trait: 'interface',
      function: 'function',
      method: 'method',
      module: 'module',
      import: 'import',
      export: 'export',
      enum: 'class',
      property: 'variable',
      decorator: 'variable',
      type_alias: 'variable',
    };
    const kind = kindMap[node.type] ?? 'variable';
    return {
      kind,
      name: node.name,
      startLine: node.startLine,
      endLine: node.endLine,
      children: node.children.map((c) => this.convertMLNode(c)),
      metadata: {
        modifiers: node.modifiers,
        params: node.params,
        returnType: node.returnType,
        parent: node.parent,
        originalType: node.type,
      },
    };
  }

  // -- Regex fallback ---------------------------------------------------------

  /**
   * Extract the set of called identifier names (`name(`) from a source file.
   *
   * Comments and string literals are stripped first to avoid spurious matches.
   * The result is deliberately permissive — control keywords are removed, but
   * macro/undefined names are left in; callers resolve them against the set of
   * actually-defined functions, so unknown names simply produce no edge. Used
   * to build the cross-file call graph that `#include` edges alone cannot see.
   */
  extractCalls(source: string, language: SupportedLanguage): string[] {
    const cleaned = stripCommentsAndStrings(source, language);
    const KW = CALL_KEYWORDS[language] ?? CALL_KEYWORDS.default;
    const re = /\b([A-Za-z_]\w*)\s*\(/g;
    const out = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleaned)) !== null) {
      const name = m[1];
      if (!KW.has(name)) {out.add(name);}
    }
    return [...out];
  }

  private parseWithRegex(source: string, language: SupportedLanguage): ASTNode[] {
    const patterns = LANGUAGE_PATTERNS[language];
    if (!patterns) {
      return [];
    }
    return this.parseWithPatterns(source, patterns);
  }

  private parseWithPatterns(source: string, patterns: LanguagePatterns): ASTNode[] {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { kind, regex } of patterns) {
        const match = regex.exec(line);
        if (match) {
          const name = (match[1] ?? match[2] ?? '').trim();
          if (name) {
            nodes.push({
              kind,
              name,
              startLine: i + 1,
              endLine: i + 1,
              children: [],
            });
          }
          break; // one match per line
        }
      }
    }

    return nodes;
  }
}

// ---------------------------------------------------------------------------
// GraphEngine
// ---------------------------------------------------------------------------

export class GraphEngine {
  private nodes = new Map<string, CodeNode>();
  private edges: CodeEdge[] = [];

  addNode(node: CodeNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: CodeEdge): void {
    this.edges.push(edge);
  }

  getNode(id: string): CodeNode | undefined {
    return this.nodes.get(id);
  }

  getDependencies(id: string): CodeNode[] {
    const targetIds = this.edges.filter((e) => e.from === id).map((e) => e.to);
    return targetIds
      .map((tid) => this.nodes.get(tid))
      .filter((n): n is CodeNode => n !== undefined);
  }

  getCallers(id: string): CodeNode[] {
    const sourceIds = this.edges.filter((e) => e.to === id).map((e) => e.from);
    return sourceIds
      .map((sid) => this.nodes.get(sid))
      .filter((n): n is CodeNode => n !== undefined);
  }

  traverseDependencies(id: string, maxDepth: number): CodeNode[] {
    const visited = new Set<string>();
    const result: CodeNode[] = [];
    const queue: { nodeId: string; depth: number }[] = [{ nodeId: id, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.nodeId) || item.depth > maxDepth) {
        continue;
      }
      visited.add(item.nodeId);

      if (item.nodeId !== id) {
        const node = this.nodes.get(item.nodeId);
        if (node) {
          result.push(node);
        }
      }

      if (item.depth < maxDepth) {
        const deps = this.edges.filter((e) => e.from === item.nodeId).map((e) => e.to);
        for (const dep of deps) {
          if (!visited.has(dep)) {
            queue.push({ nodeId: dep, depth: item.depth + 1 });
          }
        }
      }
    }

    return result;
  }

  getStats(): { nodeCount: number; edgeCount: number; languages: Set<SupportedLanguage> } {
    const languages = new Set<SupportedLanguage>();
    for (const node of this.nodes.values()) {
      languages.add(node.language);
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      languages,
    };
  }

  toGraph(): CodeGraph {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges],
    };
  }
}

// ---------------------------------------------------------------------------
// MemoryStorage
// ---------------------------------------------------------------------------

export class MemoryStorage implements StorageAdapter {
  private graph: CodeGraph = { nodes: [], edges: [] };

  async save(graph: CodeGraph): Promise<void> {
    this.graph = { nodes: [...graph.nodes], edges: [...graph.edges] };
  }

  async load(): Promise<CodeGraph> {
    return { nodes: [...this.graph.nodes], edges: [...this.graph.edges] };
  }

  async query(filter: GraphQuery): Promise<CodeNode[]> {
    return this.graph.nodes.filter((node) => {
      if (filter.kind && node.kind !== filter.kind) {
        return false;
      }
      if (filter.name && !node.name.includes(filter.name)) {
        return false;
      }
      if (filter.filePath && !node.filePath.includes(filter.filePath)) {
        return false;
      }
      if (filter.language && node.language !== filter.language) {
        return false;
      }
      return true;
    });
  }
}

// ---------------------------------------------------------------------------
// GraphRAGSearch
// ---------------------------------------------------------------------------

export class GraphRAGSearch {
  constructor(private engine: GraphEngine) {}

  globalSearch(query: string): SearchResult[] {
    const graph = this.engine.toGraph();
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const node of graph.nodes) {
      const nameScore = this.scoreMatch(node.name.toLowerCase(), lowerQuery);
      const kindScore = this.scoreMatch(node.kind.toLowerCase(), lowerQuery);
      const pathScore = this.scoreMatch(node.filePath.toLowerCase(), lowerQuery);
      const score = Math.max(nameScore, kindScore * 0.5, pathScore * 0.3);

      if (score > 0) {
        results.push({
          node,
          score,
          context: `${node.kind} ${node.name} in ${node.filePath}`,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  localSearch(entityId: string, query: string, depth: number): SearchResult[] {
    const neighbors = this.engine.traverseDependencies(entityId, depth);
    const startNode = this.engine.getNode(entityId);
    const candidates = startNode ? [startNode, ...neighbors] : neighbors;
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const node of candidates) {
      const score = this.scoreMatch(node.name.toLowerCase(), lowerQuery);
      if (score > 0) {
        results.push({
          node,
          score,
          context: `${node.kind} ${node.name} in ${node.filePath}`,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private scoreMatch(text: string, query: string): number {
    if (text === query) {
      return 1.0;
    }
    if (text.includes(query)) {
      return 0.7;
    }

    const words = query.split(/\s+/);
    const matchCount = words.filter((w) => text.includes(w)).length;
    if (matchCount > 0) {
      return (matchCount / words.length) * 0.5;
    }

    return 0;
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createASTParser(options?: ASTParserOptions): ASTParser {
  return new ASTParser(options);
}

export function createGraphEngine(): GraphEngine {
  return new GraphEngine();
}

export function createMemoryStorage(): MemoryStorage {
  return new MemoryStorage();
}

export { TestPlacementValidator, createTestPlacementValidator } from './test-placement.js';
export type { TestPlacementRule, MissingTest, TestPlacementReport } from './test-placement.js';

export {
  MultiLanguageParser,
  createMultiLanguageParser,
  BraceBlockTracker,
  IndentBlockTracker,
  PythonParser,
  JavaParser,
  GoParser,
  RustParser,
  RubyParser,
  PhpParser,
} from './multi-lang-parser.js';

export type {
  ASTNode as MLASTNode,
  ParseResult,
  ImportInfo,
  ExportInfo,
  ParseError,
  BlockInfo,
  LanguageParser,
} from './multi-lang-parser.js';
