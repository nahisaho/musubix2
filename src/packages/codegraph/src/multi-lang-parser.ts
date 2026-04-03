/**
 * Multi-language AST parser with recursive descent / block-tracking approach.
 *
 * Provides tree-sitter-LIKE capability (nested structures, scope tracking,
 * imports/exports, decorators, modifiers) without requiring native binaries.
 *
 * Pure TypeScript — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ASTNode {
  type:
    | 'module'
    | 'class'
    | 'interface'
    | 'function'
    | 'method'
    | 'property'
    | 'import'
    | 'export'
    | 'enum'
    | 'trait'
    | 'struct'
    | 'decorator'
    | 'type_alias';
  name: string;
  startLine: number;
  endLine: number;
  parent?: string;
  children: ASTNode[];
  modifiers: string[];
  params?: string[];
  returnType?: string;
  language: string;
}

export interface ParseResult {
  language: string;
  nodes: ASTNode[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  errors: ParseError[];
}

export interface ImportInfo {
  module: string;
  symbols: string[];
  line: number;
  isDefault?: boolean;
  isWildcard?: boolean;
}

export interface ExportInfo {
  name: string;
  line: number;
  isDefault?: boolean;
}

export interface ParseError {
  line: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Block tracking utilities
// ---------------------------------------------------------------------------

export interface BlockInfo {
  type: string;
  name: string;
  startLine: number;
}

/**
 * Brace-counting block tracker for C-family languages (Java, Go, Rust, PHP, …).
 */
export class BraceBlockTracker {
  private depth = 0;
  private blockStack: BlockInfo[] = [];

  processLine(
    line: string,
    _lineNum: number,
  ): { opened?: BlockInfo; closed?: BlockInfo[] } {
    const result: { opened?: BlockInfo; closed?: BlockInfo[] } = {};
    const closedBlocks: BlockInfo[] = [];

    for (const ch of line) {
      if (ch === '{') {
        this.depth++;
      } else if (ch === '}') {
        this.depth--;
        if (this.depth >= 0 && this.blockStack.length > 0) {
          if (this.depth < this.blockStack.length) {
            closedBlocks.push(this.blockStack.pop()!);
          }
        }
      }
    }

    if (closedBlocks.length > 0) {
      result.closed = closedBlocks;
    }
    return result;
  }

  pushBlock(block: BlockInfo): void {
    this.blockStack.push(block);
  }

  getCurrentDepth(): number {
    return this.depth;
  }

  getCurrentBlock(): BlockInfo | undefined {
    return this.blockStack.length > 0
      ? this.blockStack[this.blockStack.length - 1]
      : undefined;
  }

  getBlockStack(): readonly BlockInfo[] {
    return this.blockStack;
  }
}

/**
 * Indentation-based block tracker for Python.
 */
export class IndentBlockTracker {
  private blockStack: Array<{ block: BlockInfo; indent: number }> = [];

  processLine(
    line: string,
    _lineNum: number,
  ): { closed: BlockInfo[] } {
    const closed: BlockInfo[] = [];
    if (line.trim() === '' || line.trim().startsWith('#')) {
      return { closed };
    }
    const indent = this.getIndent(line);
    while (
      this.blockStack.length > 0 &&
      indent <= this.blockStack[this.blockStack.length - 1].indent
    ) {
      closed.push(this.blockStack.pop()!.block);
    }
    return { closed };
  }

  pushBlock(block: BlockInfo, indent: number): void {
    this.blockStack.push({ block, indent });
  }

  getCurrentBlock(): BlockInfo | undefined {
    return this.blockStack.length > 0
      ? this.blockStack[this.blockStack.length - 1].block
      : undefined;
  }

  getBlockStack(): readonly BlockInfo[] {
    return this.blockStack.map((e) => e.block);
  }

  closeAll(): BlockInfo[] {
    const closed = this.blockStack.map((e) => e.block).reverse();
    this.blockStack = [];
    return closed;
  }

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}

// ---------------------------------------------------------------------------
// LanguageParser interface
// ---------------------------------------------------------------------------

export interface LanguageParser {
  language: string;
  extensions: string[];
  parse(source: string): ParseResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractParams(sig: string): string[] | undefined {
  const match = sig.match(/\(([^)]*)\)/);
  if (!match) return undefined;
  const inner = match[1].trim();
  if (!inner) return [];
  return inner.split(',').map((p) => p.trim()).filter(Boolean);
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// ---------------------------------------------------------------------------
// PythonParser
// ---------------------------------------------------------------------------

export class PythonParser implements LanguageParser {
  language = 'python';
  extensions = ['.py'];

  parse(source: string): ParseResult {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const errors: ParseError[] = [];

    const tracker = new IndentBlockTracker();
    // Map from BlockInfo to ASTNode for parent tracking
    const blockNodeMap = new Map<BlockInfo, ASTNode>();
    const pendingDecorators: Array<{ name: string; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('#')) continue;

      const indent = getIndent(line);

      // Close blocks at same or lesser indent
      const { closed } = tracker.processLine(line, lineNum);
      for (const blk of closed) {
        const node = blockNodeMap.get(blk);
        if (node) {
          node.endLine = lineNum - 1;
        }
      }

      // Decorators
      const decoMatch = trimmed.match(/^@(\w[\w.]*)/);
      if (decoMatch) {
        pendingDecorators.push({ name: decoMatch[1], line: lineNum });
        continue;
      }

      // Imports
      const importMatch = trimmed.match(/^import\s+(\S+)/);
      if (importMatch) {
        imports.push({
          module: importMatch[1],
          symbols: [],
          line: lineNum,
        });
        continue;
      }
      const fromImportMatch = trimmed.match(
        /^from\s+(\S+)\s+import\s+(.+)/,
      );
      if (fromImportMatch) {
        const mod = fromImportMatch[1];
        const syms = fromImportMatch[2];
        const isWildcard = syms.trim() === '*';
        const symbols = isWildcard
          ? ['*']
          : syms.split(',').map((s) => s.trim()).filter(Boolean);
        imports.push({ module: mod, symbols, line: lineNum, isWildcard });
        continue;
      }

      // Class
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;

        const modifiers: string[] = [];
        const consumedDecorators = pendingDecorators.splice(0);
        for (const d of consumedDecorators) {
          modifiers.push(`@${d.name}`);
        }

        const node: ASTNode = {
          type: 'class',
          name: classMatch[1],
          startLine: consumedDecorators.length > 0
            ? consumedDecorators[0].line
            : lineNum,
          endLine: lineNum, // updated on close
          children: [],
          modifiers,
          language: 'python',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        const blk: BlockInfo = {
          type: 'class',
          name: classMatch[1],
          startLine: lineNum,
        };
        tracker.pushBlock(blk, indent);
        blockNodeMap.set(blk, node);
        continue;
      }

      // Function / method
      const funcMatch = trimmed.match(
        /^(async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(.+))?/,
      );
      if (funcMatch) {
        const isAsync = !!funcMatch[1];
        const name = funcMatch[2];
        const paramStr = funcMatch[3];
        const retType = funcMatch[4]?.trim().replace(/:$/, '');
        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;

        const isMethod =
          parentNode !== undefined && parentNode.type === 'class';
        const isConstructor = isMethod && name === '__init__';

        const modifiers: string[] = [];
        if (isAsync) modifiers.push('async');
        const consumedDecorators = pendingDecorators.splice(0);
        for (const d of consumedDecorators) {
          modifiers.push(`@${d.name}`);
        }
        if (isConstructor) modifiers.push('constructor');

        const params = paramStr
          ? paramStr
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [];

        const node: ASTNode = {
          type: isMethod ? 'method' : 'function',
          name,
          startLine: consumedDecorators.length > 0
            ? consumedDecorators[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          params,
          returnType: retType || undefined,
          language: 'python',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        const blk: BlockInfo = {
          type: isMethod ? 'method' : 'function',
          name,
          startLine: lineNum,
        };
        tracker.pushBlock(blk, indent);
        blockNodeMap.set(blk, node);
        continue;
      }

      // Clear any pending decorators that didn't attach
      pendingDecorators.splice(0);
    }

    // Close remaining blocks
    const remaining = tracker.closeAll();
    for (const blk of remaining) {
      const node = blockNodeMap.get(blk);
      if (node) {
        node.endLine = lines.length;
      }
    }

    return { language: 'python', nodes, imports, exports, errors };
  }
}

// ---------------------------------------------------------------------------
// JavaParser
// ---------------------------------------------------------------------------

export class JavaParser implements LanguageParser {
  language = 'java';
  extensions = ['.java'];

  parse(source: string): ParseResult {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const errors: ParseError[] = [];

    const tracker = new BraceBlockTracker();
    const blockNodeMap = new Map<BlockInfo, ASTNode>();
    const pendingAnnotations: Array<{ name: string; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

      // Package — skip
      const pkgMatch = trimmed.match(/^package\s+([\w.]+)\s*;/);
      if (pkgMatch) {
        continue;
      }

      // Import
      const importMatch = trimmed.match(
        /^import\s+(?:static\s+)?([\w.*]+)\s*;/,
      );
      if (importMatch) {
        const mod = importMatch[1];
        const isWildcard = mod.endsWith('.*');
        imports.push({
          module: mod,
          symbols: isWildcard ? ['*'] : [mod.split('.').pop()!],
          line: lineNum,
          isWildcard,
        });
        continue;
      }

      // Annotations
      const annoMatch = trimmed.match(/^@(\w+)/);
      if (annoMatch && !trimmed.match(/^@\w+.*\b(?:class|interface|enum|record)\b/)) {
        pendingAnnotations.push({ name: annoMatch[1], line: lineNum });
        // Process braces on this line too (annotations with params)
        tracker.processLine(line, lineNum);
        continue;
      }

      // Class / interface / enum / record
      const classMatch = trimmed.match(
        /^(?:(public|private|protected|internal)\s+)?(?:(abstract|static|final)\s+)*(?:(abstract|static|final)\s+)?(class|interface|enum|record)\s+(\w+)/,
      );
      if (classMatch) {
        const vis = classMatch[1];
        const mod1 = classMatch[2];
        const mod2 = classMatch[3];
        const kind = classMatch[4] as 'class' | 'interface' | 'enum';
        const name = classMatch[5];

        const modifiers: string[] = [];
        if (vis) modifiers.push(vis);
        if (mod1) modifiers.push(mod1);
        if (mod2) modifiers.push(mod2);
        const consumedAnnos = pendingAnnotations.splice(0);
        for (const a of consumedAnnos) {
          modifiers.push(`@${a.name}`);
        }

        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;

        const type: ASTNode['type'] =
          kind === 'interface'
            ? 'interface'
            : kind === 'enum'
              ? 'enum'
              : 'class';

        const node: ASTNode = {
          type,
          name,
          startLine: consumedAnnos.length > 0
            ? consumedAnnos[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'java',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        const blk: BlockInfo = { type: kind, name, startLine: lineNum };
        tracker.pushBlock(blk);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        blockNodeMap.set(blk, node);
        continue;
      }

      // Method detection (inside a class)
      const methodMatch = trimmed.match(
        /^(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(abstract|final|synchronized)\s+)?(?:(abstract|final|synchronized)\s+)?(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*\(/,
      );
      if (methodMatch) {
        const currentBlock = tracker.getCurrentBlock();
        const currentNode = currentBlock
          ? blockNodeMap.get(currentBlock)
          : undefined;

        if (
          currentNode &&
          (currentNode.type === 'class' ||
            currentNode.type === 'interface' ||
            currentNode.type === 'enum')
        ) {
          const vis = methodMatch[1];
          const isStatic = methodMatch[2];
          const mod1 = methodMatch[3];
          const mod2 = methodMatch[4];
          const returnType = methodMatch[5];
          const name = methodMatch[6];

          const modifiers: string[] = [];
          if (vis) modifiers.push(vis);
          if (isStatic) modifiers.push('static');
          if (mod1) modifiers.push(mod1);
          if (mod2) modifiers.push(mod2);
          const consumedAnnos = pendingAnnotations.splice(0);
          for (const a of consumedAnnos) {
            modifiers.push(`@${a.name}`);
          }

          const params = extractParams(trimmed);

          const methodNode: ASTNode = {
            type: 'method',
            name,
            startLine: consumedAnnos.length > 0
              ? consumedAnnos[0].line
              : lineNum,
            endLine: lineNum,
            children: [],
            modifiers,
            params,
            returnType,
            language: 'java',
            parent: currentNode.name,
          };

          currentNode.children.push(methodNode);

          const blk: BlockInfo = {
            type: 'method',
            name,
            startLine: lineNum,
          };
          // Only push method block if there's an opening brace (not abstract)
          if (trimmed.includes('{')) {
            tracker.pushBlock(blk);
            blockNodeMap.set(blk, methodNode);
          }

          const { closed } = tracker.processLine(line, lineNum);
          if (closed) {
            for (const c of closed) {
              const n = blockNodeMap.get(c);
              if (n) n.endLine = lineNum;
            }
          }
          continue;
        }
      }

      // Clear pending annotations if not consumed
      pendingAnnotations.splice(0);

      // Process braces for block tracking
      const { closed } = tracker.processLine(line, lineNum);
      if (closed) {
        for (const c of closed) {
          const n = blockNodeMap.get(c);
          if (n) n.endLine = lineNum;
        }
      }
    }

    return { language: 'java', nodes, imports, exports, errors };
  }
}

// ---------------------------------------------------------------------------
// GoParser
// ---------------------------------------------------------------------------

export class GoParser implements LanguageParser {
  language = 'go';
  extensions = ['.go'];

  parse(source: string): ParseResult {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const errors: ParseError[] = [];

    const tracker = new BraceBlockTracker();
    const blockNodeMap = new Map<BlockInfo, ASTNode>();
    let inImportBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('//')) continue;

      // Package
      const pkgMatch = trimmed.match(/^package\s+(\w+)/);
      if (pkgMatch) {
        const node: ASTNode = {
          type: 'module',
          name: pkgMatch[1],
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: [],
          language: 'go',
        };
        nodes.push(node);
        continue;
      }

      // Import block
      if (trimmed === 'import (') {
        inImportBlock = true;
        continue;
      }
      if (inImportBlock) {
        if (trimmed === ')') {
          inImportBlock = false;
          continue;
        }
        const impMatch = trimmed.match(/^(?:\w+\s+)?"([^"]+)"/);
        if (impMatch) {
          imports.push({
            module: impMatch[1],
            symbols: [],
            line: lineNum,
          });
        }
        continue;
      }

      // Single-line import
      const singleImp = trimmed.match(/^import\s+"([^"]+)"/);
      if (singleImp) {
        imports.push({
          module: singleImp[1],
          symbols: [],
          line: lineNum,
        });
        continue;
      }

      // Type struct
      const structMatch = trimmed.match(
        /^type\s+(\w+)\s+struct\b/,
      );
      if (structMatch) {
        const name = structMatch[1];
        const isExported = name[0] === name[0].toUpperCase();
        const modifiers = isExported ? ['exported'] : [];

        const node: ASTNode = {
          type: 'struct',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'go',
        };
        nodes.push(node);

        const blk: BlockInfo = { type: 'struct', name, startLine: lineNum };
        tracker.pushBlock(blk);
        blockNodeMap.set(blk, node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Type interface
      const ifaceMatch = trimmed.match(
        /^type\s+(\w+)\s+interface\b/,
      );
      if (ifaceMatch) {
        const name = ifaceMatch[1];
        const isExported = name[0] === name[0].toUpperCase();
        const modifiers = isExported ? ['exported'] : [];

        const node: ASTNode = {
          type: 'interface',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'go',
        };
        nodes.push(node);

        const blk: BlockInfo = {
          type: 'interface',
          name,
          startLine: lineNum,
        };
        tracker.pushBlock(blk);
        blockNodeMap.set(blk, node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Type alias
      const typeAliasMatch = trimmed.match(
        /^type\s+(\w+)\s+(?!struct\b|interface\b)(\w+)/,
      );
      if (typeAliasMatch) {
        const name = typeAliasMatch[1];
        const isExported = name[0] === name[0].toUpperCase();
        const node: ASTNode = {
          type: 'type_alias',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: isExported ? ['exported'] : [],
          language: 'go',
        };
        nodes.push(node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Method with receiver
      const methodMatch = trimmed.match(
        /^func\s+\((\w+)\s+\*?(\w+)\)\s+(\w+)\s*\(([^)]*)\)(?:\s*(?:\(([^)]*)\)|(\S+)))?/,
      );
      if (methodMatch) {
        const receiverType = methodMatch[2];
        const name = methodMatch[3];
        const paramStr = methodMatch[4];
        const retMulti = methodMatch[5];
        const retSingle = methodMatch[6];
        const isExported = name[0] === name[0].toUpperCase();
        const modifiers = isExported ? ['exported'] : [];

        const params = paramStr
          ? paramStr.split(',').map((p) => p.trim()).filter(Boolean)
          : [];

        const returnType = retMulti || retSingle || undefined;

        // Try to find the struct node to attach to
        const parentNode = nodes.find(
          (n) =>
            (n.type === 'struct' || n.type === 'interface') &&
            n.name === receiverType,
        );

        const node: ASTNode = {
          type: 'method',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          params,
          returnType: returnType?.replace(/\{$/, '').trim() || undefined,
          language: 'go',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          node.parent = receiverType;
          nodes.push(node);
        }

        if (trimmed.includes('{')) {
          const blk: BlockInfo = {
            type: 'method',
            name,
            startLine: lineNum,
          };
          tracker.pushBlock(blk);
          blockNodeMap.set(blk, node);
        }
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Package-level function
      const funcMatch = trimmed.match(
        /^func\s+(\w+)\s*\(([^)]*)\)(?:\s*(?:\(([^)]*)\)|(\S+)))?/,
      );
      if (funcMatch) {
        const name = funcMatch[1];
        const paramStr = funcMatch[2];
        const retMulti = funcMatch[3];
        const retSingle = funcMatch[4];
        const isExported = name[0] === name[0].toUpperCase();
        const modifiers = isExported ? ['exported'] : [];

        const params = paramStr
          ? paramStr.split(',').map((p) => p.trim()).filter(Boolean)
          : [];

        const returnType = retMulti || retSingle || undefined;

        const node: ASTNode = {
          type: 'function',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          params,
          returnType: returnType?.replace(/\{$/, '').trim() || undefined,
          language: 'go',
        };
        nodes.push(node);

        if (trimmed.includes('{')) {
          const blk: BlockInfo = {
            type: 'function',
            name,
            startLine: lineNum,
          };
          tracker.pushBlock(blk);
          blockNodeMap.set(blk, node);
        }
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Var / const
      const varMatch = trimmed.match(/^(var|const)\s+(\w+)/);
      if (varMatch) {
        const name = varMatch[2];
        const isExported = name[0] === name[0].toUpperCase();
        const node: ASTNode = {
          type: 'property',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: isExported ? ['exported', varMatch[1]] : [varMatch[1]],
          language: 'go',
        };
        nodes.push(node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Process braces
      const { closed } = tracker.processLine(line, lineNum);
      if (closed) {
        for (const c of closed) {
          const n = blockNodeMap.get(c);
          if (n) n.endLine = lineNum;
        }
      }
    }

    return { language: 'go', nodes, imports, exports, errors };
  }
}

// ---------------------------------------------------------------------------
// RustParser
// ---------------------------------------------------------------------------

export class RustParser implements LanguageParser {
  language = 'rust';
  extensions = ['.rs'];

  parse(source: string): ParseResult {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const errors: ParseError[] = [];

    const tracker = new BraceBlockTracker();
    const blockNodeMap = new Map<BlockInfo, ASTNode>();
    const pendingAttrs: Array<{ name: string; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('//')) continue;

      // Attributes
      const attrMatch = trimmed.match(/^#\[(\w+(?:\([^)]*\))?)\]/);
      if (attrMatch && !trimmed.match(/^#\[.*\]\s*(?:pub\s+)?(?:fn|struct|enum|trait|mod|impl)/)) {
        pendingAttrs.push({ name: attrMatch[1], line: lineNum });
        continue;
      }

      // Use imports
      const useMatch = trimmed.match(/^(?:pub\s+)?use\s+(.+);/);
      if (useMatch) {
        const path = useMatch[1];
        const isWildcard = path.includes('*');
        // Extract symbols from braced groups: use std::{a, b}
        const braceMatch = path.match(/(.+)::\{([^}]+)\}/);
        let symbols: string[] = [];
        let module = path;
        if (braceMatch) {
          module = braceMatch[1];
          symbols = braceMatch[2].split(',').map((s) => s.trim());
        } else {
          const parts = path.split('::');
          symbols = [parts[parts.length - 1]];
          module = parts.slice(0, -1).join('::') || path;
        }
        imports.push({ module, symbols, line: lineNum, isWildcard });
        continue;
      }

      // Mod
      const modMatch = trimmed.match(/^(?:pub\s+)?mod\s+(\w+)/);
      if (modMatch && !trimmed.endsWith(';')) {
        const name = modMatch[1];
        const modifiers = trimmed.startsWith('pub') ? ['pub'] : [];
        const consumedAttrs = pendingAttrs.splice(0);
        for (const a of consumedAttrs) modifiers.push(`#[${a.name}]`);

        const node: ASTNode = {
          type: 'module',
          name,
          startLine: consumedAttrs.length > 0
            ? consumedAttrs[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'rust',
        };
        nodes.push(node);

        const blk: BlockInfo = { type: 'module', name, startLine: lineNum };
        tracker.pushBlock(blk);
        blockNodeMap.set(blk, node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Struct
      const structMatch = trimmed.match(
        /^(?:pub(?:\(crate\))?\s+)?struct\s+(\w+)/,
      );
      if (structMatch) {
        const name = structMatch[1];
        const modifiers = trimmed.match(/^pub/) ? ['pub'] : [];
        const consumedAttrs = pendingAttrs.splice(0);
        for (const a of consumedAttrs) modifiers.push(`#[${a.name}]`);

        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;

        const node: ASTNode = {
          type: 'struct',
          name,
          startLine: consumedAttrs.length > 0
            ? consumedAttrs[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'rust',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        if (trimmed.includes('{')) {
          const blk: BlockInfo = {
            type: 'struct',
            name,
            startLine: lineNum,
          };
          tracker.pushBlock(blk);
          blockNodeMap.set(blk, node);
        }
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Enum
      const enumMatch = trimmed.match(
        /^(?:pub(?:\(crate\))?\s+)?enum\s+(\w+)/,
      );
      if (enumMatch) {
        const name = enumMatch[1];
        const modifiers = trimmed.match(/^pub/) ? ['pub'] : [];
        const consumedAttrs = pendingAttrs.splice(0);
        for (const a of consumedAttrs) modifiers.push(`#[${a.name}]`);

        const node: ASTNode = {
          type: 'enum',
          name,
          startLine: consumedAttrs.length > 0
            ? consumedAttrs[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'rust',
        };
        nodes.push(node);

        if (trimmed.includes('{')) {
          const blk: BlockInfo = {
            type: 'enum',
            name,
            startLine: lineNum,
          };
          tracker.pushBlock(blk);
          blockNodeMap.set(blk, node);
        }
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Trait
      const traitMatch = trimmed.match(
        /^(?:pub(?:\(crate\))?\s+)?(?:unsafe\s+)?trait\s+(\w+)/,
      );
      if (traitMatch) {
        const name = traitMatch[1];
        const modifiers = trimmed.match(/^pub/) ? ['pub'] : [];
        if (trimmed.includes('unsafe')) modifiers.push('unsafe');
        const consumedAttrs = pendingAttrs.splice(0);
        for (const a of consumedAttrs) modifiers.push(`#[${a.name}]`);

        const node: ASTNode = {
          type: 'trait',
          name,
          startLine: consumedAttrs.length > 0
            ? consumedAttrs[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'rust',
        };
        nodes.push(node);

        const blk: BlockInfo = { type: 'trait', name, startLine: lineNum };
        tracker.pushBlock(blk);
        blockNodeMap.set(blk, node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Impl
      const implMatch = trimmed.match(
        /^impl(?:<[^>]*>)?\s+(?:(\w+)\s+for\s+)?(\w+)/,
      );
      if (implMatch) {
        const traitName = implMatch[1];
        const typeName = implMatch[2];
        const name = traitName
          ? `${traitName} for ${typeName}`
          : typeName;

        const modifiers: string[] = [];
        if (traitName) modifiers.push('impl_trait');
        const consumedAttrs = pendingAttrs.splice(0);
        for (const a of consumedAttrs) modifiers.push(`#[${a.name}]`);

        const node: ASTNode = {
          type: 'class', // impl blocks act like class extensions
          name,
          startLine: consumedAttrs.length > 0
            ? consumedAttrs[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'rust',
        };
        nodes.push(node);

        const blk: BlockInfo = { type: 'impl', name, startLine: lineNum };
        tracker.pushBlock(blk);
        blockNodeMap.set(blk, node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Function / method
      const fnMatch = trimmed.match(
        /^(?:pub(?:\(crate\))?\s+)?(?:(async)\s+)?(?:(unsafe)\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*->\s*(.+))?/,
      );
      if (fnMatch) {
        const isAsync = fnMatch[1];
        const isUnsafe = fnMatch[2];
        const name = fnMatch[3];
        const paramStr = fnMatch[4];
        const retType = fnMatch[5]?.trim().replace(/\{$/, '').trim();

        const modifiers: string[] = [];
        if (trimmed.match(/^pub/)) modifiers.push('pub');
        if (isAsync) modifiers.push('async');
        if (isUnsafe) modifiers.push('unsafe');
        const consumedAttrs = pendingAttrs.splice(0);
        for (const a of consumedAttrs) modifiers.push(`#[${a.name}]`);

        const params = paramStr
          ? paramStr.split(',').map((p) => p.trim()).filter(Boolean)
          : [];

        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;
        const isMethod =
          parentNode !== undefined &&
          (parentNode.type === 'class' ||
            parentNode.type === 'trait');

        const node: ASTNode = {
          type: isMethod ? 'method' : 'function',
          name,
          startLine: consumedAttrs.length > 0
            ? consumedAttrs[0].line
            : lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          params,
          returnType: retType || undefined,
          language: 'rust',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        if (trimmed.includes('{')) {
          const blk: BlockInfo = {
            type: isMethod ? 'method' : 'function',
            name,
            startLine: lineNum,
          };
          tracker.pushBlock(blk);
          blockNodeMap.set(blk, node);
        }
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Clear pending attrs
      pendingAttrs.splice(0);

      // Process braces
      const { closed } = tracker.processLine(line, lineNum);
      if (closed) {
        for (const c of closed) {
          const n = blockNodeMap.get(c);
          if (n) n.endLine = lineNum;
        }
      }
    }

    return { language: 'rust', nodes, imports, exports, errors };
  }
}

// ---------------------------------------------------------------------------
// RubyParser
// ---------------------------------------------------------------------------

export class RubyParser implements LanguageParser {
  language = 'ruby';
  extensions = ['.rb'];

  parse(source: string): ParseResult {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const errors: ParseError[] = [];

    // Ruby uses `end` keywords for block closing
    const blockStack: Array<{ node: ASTNode; type: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('#')) continue;

      // Require / require_relative
      const reqMatch = trimmed.match(
        /^require(?:_relative)?\s+['"](.[^'"]*)['"]/,
      );
      if (reqMatch) {
        imports.push({
          module: reqMatch[1],
          symbols: [],
          line: lineNum,
        });
        continue;
      }

      // Include / extend
      const includeMatch = trimmed.match(
        /^(?:include|extend)\s+(\w[\w:]*)/,
      );
      if (includeMatch) {
        imports.push({
          module: includeMatch[1],
          symbols: [],
          line: lineNum,
        });
        continue;
      }

      // attr_reader, attr_writer, attr_accessor
      const attrMatch = trimmed.match(
        /^(attr_reader|attr_writer|attr_accessor)\s+(.+)/,
      );
      if (attrMatch) {
        const kind = attrMatch[1];
        const syms = attrMatch[2].match(/:(\w+)/g);
        if (syms) {
          for (const sym of syms) {
            const name = sym.slice(1);
            const parentBlock =
              blockStack.length > 0
                ? blockStack[blockStack.length - 1]
                : undefined;
            const node: ASTNode = {
              type: 'property',
              name,
              startLine: lineNum,
              endLine: lineNum,
              children: [],
              modifiers: [kind],
              language: 'ruby',
            };
            if (parentBlock) {
              node.parent = parentBlock.node.name;
              parentBlock.node.children.push(node);
            } else {
              nodes.push(node);
            }
          }
        }
        continue;
      }

      // Module
      const modMatch = trimmed.match(/^module\s+(\w[\w:]*)/);
      if (modMatch) {
        const parentBlock =
          blockStack.length > 0
            ? blockStack[blockStack.length - 1]
            : undefined;

        const node: ASTNode = {
          type: 'module',
          name: modMatch[1],
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: [],
          language: 'ruby',
        };

        if (parentBlock) {
          node.parent = parentBlock.node.name;
          parentBlock.node.children.push(node);
        } else {
          nodes.push(node);
        }

        blockStack.push({ node, type: 'module' });
        continue;
      }

      // Class
      const classMatch = trimmed.match(
        /^class\s+(\w[\w:]*)/,
      );
      if (classMatch) {
        const parentBlock =
          blockStack.length > 0
            ? blockStack[blockStack.length - 1]
            : undefined;

        const node: ASTNode = {
          type: 'class',
          name: classMatch[1],
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: [],
          language: 'ruby',
        };

        if (parentBlock) {
          node.parent = parentBlock.node.name;
          parentBlock.node.children.push(node);
        } else {
          nodes.push(node);
        }

        blockStack.push({ node, type: 'class' });
        continue;
      }

      // Method (def)
      const defMatch = trimmed.match(
        /^def\s+(?:(self)\.)?(\w+[?!=]?)\s*(?:\(([^)]*)\))?/,
      );
      if (defMatch) {
        const isSelf = defMatch[1] === 'self';
        const name = defMatch[2];
        const paramStr = defMatch[3];

        const modifiers: string[] = [];
        if (isSelf) modifiers.push('static');

        const params = paramStr
          ? paramStr.split(',').map((p) => p.trim()).filter(Boolean)
          : undefined;

        const parentBlock =
          blockStack.length > 0
            ? blockStack[blockStack.length - 1]
            : undefined;

        const isMethod =
          parentBlock !== undefined &&
          (parentBlock.type === 'class' || parentBlock.type === 'module');

        const node: ASTNode = {
          type: isMethod ? 'method' : 'function',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          params,
          language: 'ruby',
        };

        if (parentBlock) {
          node.parent = parentBlock.node.name;
          parentBlock.node.children.push(node);
        } else {
          nodes.push(node);
        }

        blockStack.push({ node, type: 'def' });
        continue;
      }

      // Standalone do..end, if/unless/while/for/case/begin blocks
      // These open a block that needs an 'end'
      if (
        /^(?:if|unless|while|for|case|begin|do)\b/.test(trimmed) &&
        !trimmed.includes(' end') &&
        !trimmed.endsWith('end')
      ) {
        // We still need to track these for end-counting
        const dummyNode: ASTNode = {
          type: 'module', // placeholder
          name: '__block__',
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: [],
          language: 'ruby',
        };
        blockStack.push({ node: dummyNode, type: 'block' });
        continue;
      }

      // End keyword
      if (trimmed === 'end' || trimmed.startsWith('end ') || trimmed.startsWith('end;')) {
        if (blockStack.length > 0) {
          const closed = blockStack.pop()!;
          closed.node.endLine = lineNum;
        }
        continue;
      }
    }

    // Close remaining
    while (blockStack.length > 0) {
      const closed = blockStack.pop()!;
      closed.node.endLine = lines.length;
    }

    // Filter out dummy block nodes from top-level
    const filtered = nodes.filter((n) => n.name !== '__block__');

    return {
      language: 'ruby',
      nodes: filtered,
      imports,
      exports,
      errors,
    };
  }
}

// ---------------------------------------------------------------------------
// PhpParser
// ---------------------------------------------------------------------------

export class PhpParser implements LanguageParser {
  language = 'php';
  extensions = ['.php'];

  parse(source: string): ParseResult {
    const lines = source.split('\n');
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const errors: ParseError[] = [];

    const tracker = new BraceBlockTracker();
    const blockNodeMap = new Map<BlockInfo, ASTNode>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (
        trimmed === '' ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed === '<?php'
      )
        continue;

      // Namespace
      const nsMatch = trimmed.match(/^namespace\s+([\w\\]+)\s*;/);
      if (nsMatch) {
        const node: ASTNode = {
          type: 'module',
          name: nsMatch[1],
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers: [],
          language: 'php',
        };
        nodes.push(node);
        continue;
      }

      // Use / require / include
      const useMatch = trimmed.match(
        /^use\s+([\w\\]+)(?:\s+as\s+(\w+))?\s*;/,
      );
      if (useMatch) {
        const mod = useMatch[1];
        const alias = useMatch[2];
        imports.push({
          module: mod,
          symbols: alias ? [alias] : [mod.split('\\').pop()!],
          line: lineNum,
        });
        continue;
      }

      // Class / interface / trait / enum
      const classMatch = trimmed.match(
        /^(?:(abstract|final)\s+)?(?:(abstract|final)\s+)?(class|interface|trait|enum)\s+(\w+)/,
      );
      if (classMatch) {
        const mod1 = classMatch[1];
        const mod2 = classMatch[2];
        const kind = classMatch[3];
        const name = classMatch[4];

        const modifiers: string[] = [];
        if (mod1) modifiers.push(mod1);
        if (mod2) modifiers.push(mod2);

        const type: ASTNode['type'] =
          kind === 'interface'
            ? 'interface'
            : kind === 'trait'
              ? 'trait'
              : kind === 'enum'
                ? 'enum'
                : 'class';

        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;

        const node: ASTNode = {
          type,
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          language: 'php',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        const blk: BlockInfo = { type: kind, name, startLine: lineNum };
        tracker.pushBlock(blk);
        blockNodeMap.set(blk, node);
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Function / method
      const funcMatch = trimmed.match(
        /^(?:(public|private|protected)\s+)?(?:(static)\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(.+?))?/,
      );
      if (funcMatch) {
        const vis = funcMatch[1];
        const isStatic = funcMatch[2];
        const name = funcMatch[3];
        const paramStr = funcMatch[4];
        const retType = funcMatch[5]?.trim().replace(/\{$/, '').trim();

        const modifiers: string[] = [];
        if (vis) modifiers.push(vis);
        if (isStatic) modifiers.push('static');

        const params = paramStr
          ? paramStr.split(',').map((p) => p.trim()).filter(Boolean)
          : [];

        const parentBlock = tracker.getCurrentBlock();
        const parentNode = parentBlock
          ? blockNodeMap.get(parentBlock)
          : undefined;
        const isMethod =
          parentNode !== undefined &&
          (parentNode.type === 'class' ||
            parentNode.type === 'interface' ||
            parentNode.type === 'trait');

        const node: ASTNode = {
          type: isMethod ? 'method' : 'function',
          name,
          startLine: lineNum,
          endLine: lineNum,
          children: [],
          modifiers,
          params,
          returnType: retType || undefined,
          language: 'php',
        };

        if (parentNode) {
          node.parent = parentNode.name;
          parentNode.children.push(node);
        } else {
          nodes.push(node);
        }

        if (trimmed.includes('{')) {
          const blk: BlockInfo = {
            type: isMethod ? 'method' : 'function',
            name,
            startLine: lineNum,
          };
          tracker.pushBlock(blk);
          blockNodeMap.set(blk, node);
        }
        const { closed } = tracker.processLine(line, lineNum);
        if (closed) {
          for (const c of closed) {
            const n = blockNodeMap.get(c);
            if (n) n.endLine = lineNum;
          }
        }
        continue;
      }

      // Property
      const propMatch = trimmed.match(
        /^(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(readonly)\s+)?(?:\??\w+\s+)?\$(\w+)/,
      );
      if (propMatch && !trimmed.includes('function')) {
        const vis = propMatch[1];
        const isStatic = propMatch[2];
        const isReadonly = propMatch[3];
        const name = propMatch[4];

        if (vis || isStatic || isReadonly) {
          const modifiers: string[] = [];
          if (vis) modifiers.push(vis);
          if (isStatic) modifiers.push('static');
          if (isReadonly) modifiers.push('readonly');

          const parentBlock = tracker.getCurrentBlock();
          const parentNode = parentBlock
            ? blockNodeMap.get(parentBlock)
            : undefined;

          const node: ASTNode = {
            type: 'property',
            name,
            startLine: lineNum,
            endLine: lineNum,
            children: [],
            modifiers,
            language: 'php',
          };

          if (parentNode) {
            node.parent = parentNode.name;
            parentNode.children.push(node);
          } else {
            nodes.push(node);
          }
        }
      }

      // Process braces
      const { closed } = tracker.processLine(line, lineNum);
      if (closed) {
        for (const c of closed) {
          const n = blockNodeMap.get(c);
          if (n) n.endLine = lineNum;
        }
      }
    }

    return { language: 'php', nodes, imports, exports, errors };
  }
}

// ---------------------------------------------------------------------------
// MultiLanguageParser — Main entry point
// ---------------------------------------------------------------------------

export class MultiLanguageParser {
  private parsers = new Map<string, LanguageParser>();

  constructor() {
    this.registerDefaults();
  }

  register(parser: LanguageParser): void {
    this.parsers.set(parser.language, parser);
  }

  parse(source: string, language: string): ParseResult {
    const parser = this.parsers.get(language);
    if (!parser) return this.fallbackParse(source, language);
    return parser.parse(source);
  }

  getSupportedLanguages(): string[] {
    return [...this.parsers.keys()];
  }

  getParserFor(language: string): LanguageParser | undefined {
    return this.parsers.get(language);
  }

  private registerDefaults(): void {
    const defaults: LanguageParser[] = [
      new PythonParser(),
      new JavaParser(),
      new GoParser(),
      new RustParser(),
      new RubyParser(),
      new PhpParser(),
    ];
    for (const p of defaults) {
      this.parsers.set(p.language, p);
    }
  }

  private fallbackParse(source: string, language: string): ParseResult {
    const nodes: ASTNode[] = [];
    const imports: ImportInfo[] = [];
    const lines = source.split('\n');

    // Enhanced regex fallback for unknown languages
    const patterns: Array<{ type: ASTNode['type']; regex: RegExp }> = [
      { type: 'class', regex: /(?:class|struct)\s+(\w+)/ },
      { type: 'interface', regex: /(?:interface|protocol|trait)\s+(\w+)/ },
      { type: 'function', regex: /(?:function|func|fn|def|fun)\s+(\w+)/ },
      { type: 'import', regex: /(?:import|require|use|include|using)\s+(.+?)(?:;|\s|$)/ },
      { type: 'module', regex: /(?:module|namespace|package)\s+(\w+)/ },
      { type: 'enum', regex: /(?:enum)\s+(\w+)/ },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();
      if (trimmed === '') continue;

      for (const { type, regex } of patterns) {
        const match = regex.exec(trimmed);
        if (match) {
          const name = match[1].trim();
          if (name) {
            if (type === 'import') {
              imports.push({ module: name, symbols: [], line: lineNum });
            }
            nodes.push({
              type,
              name,
              startLine: lineNum,
              endLine: lineNum,
              children: [],
              modifiers: [],
              language,
            });
          }
          break;
        }
      }
    }

    return { language, nodes, imports, exports: [], errors: [] };
  }
}

export function createMultiLanguageParser(): MultiLanguageParser {
  return new MultiLanguageParser();
}
