/**
 * P2-04 / DES-SAF-001: Plan write operations with merge/append/replace modes.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GeneratedArtifacts,
  GeneratedFile,
  GeneratedDirectory,
  WorkspaceSnapshot,
  WriteOperation,
} from '../../domain/install/types.js';

const MUSUBIX_BEGIN = '<!-- musubix:begin -->';
const MUSUBIX_END = '<!-- musubix:end -->';

export class WorkspaceMergeService {
  async plan(
    snapshot: WorkspaceSnapshot,
    generated: GeneratedArtifacts,
    force: boolean,
  ): Promise<WriteOperation[]> {
    const ops: WriteOperation[] = [];

    for (const artifact of generated) {
      if ('files' in artifact) {
        // GeneratedDirectory
        const dir = artifact as GeneratedDirectory;
        for (const file of dir.files) {
          ops.push(this.planFile(snapshot, file, force));
        }
      } else {
        // GeneratedFile
        ops.push(this.planFile(snapshot, artifact as GeneratedFile, force));
      }
    }

    return ops;
  }

  private planFile(
    snapshot: WorkspaceSnapshot,
    file: GeneratedFile,
    force: boolean,
  ): WriteOperation {
    const fullPath = resolve(snapshot.projectRoot, file.path);
    const existing = existsSync(fullPath);

    if (!existing) {
      return { targetPath: fullPath, mode: 'create', content: file.content };
    }

    // JSON files → merge at key level
    if (file.path.endsWith('.json')) {
      return this.planJsonMerge(fullPath, file);
    }

    // Markdown files with musubix section → append-section
    if (file.path.endsWith('.md') && file.managed) {
      return this.planSectionAppend(fullPath, file);
    }

    // Existing non-managed file → replace only with --force
    if (force) {
      return { targetPath: fullPath, mode: 'replace', content: file.content };
    }

    // Skip
    return { targetPath: fullPath, mode: 'create', content: '' };
  }

  private planJsonMerge(fullPath: string, file: GeneratedFile): WriteOperation {
    try {
      const existing = JSON.parse(readFileSync(fullPath, 'utf-8'));
      const incoming = JSON.parse(file.content);
      const merged = this.deepMerge(existing, incoming);
      return {
        targetPath: fullPath,
        mode: 'merge-json',
        content: JSON.stringify(merged, null, 2) + '\n',
      };
    } catch {
      return { targetPath: fullPath, mode: 'merge-json', content: file.content };
    }
  }

  private planSectionAppend(fullPath: string, file: GeneratedFile): WriteOperation {
    const existing = readFileSync(fullPath, 'utf-8');
    const beginIdx = existing.indexOf(MUSUBIX_BEGIN);
    const endIdx = existing.indexOf(MUSUBIX_END);

    if (beginIdx >= 0 && endIdx > beginIdx) {
      // Replace existing musubix section
      const before = existing.slice(0, beginIdx);
      const after = existing.slice(endIdx + MUSUBIX_END.length);
      const newSection = file.content.includes(MUSUBIX_BEGIN)
        ? file.content.slice(
            file.content.indexOf(MUSUBIX_BEGIN),
            file.content.indexOf(MUSUBIX_END) + MUSUBIX_END.length,
          )
        : `${MUSUBIX_BEGIN}\n${file.content}\n${MUSUBIX_END}`;
      return {
        targetPath: fullPath,
        mode: 'append-section',
        content: before + newSection + after,
      };
    }

    // No existing section — append at end
    return {
      targetPath: fullPath,
      mode: 'append-section',
      content: existing + '\n\n' + file.content,
    };
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key]) &&
        typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
