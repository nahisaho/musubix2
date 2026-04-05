/**
 * P1-06 / DES-INS-004, DES-SAF-001, DES-UPD-001:
 * Write files via temp → rename strategy with rollback and .bak backup.
 */
import {
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  existsSync,
  copyFileSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { WriteOperation, WriteSummary } from '../../domain/install/types.js';

export class WorkspaceWriter {
  async execute(
    operations: WriteOperation[],
    dryRun: boolean,
  ): Promise<WriteSummary> {
    const summary: WriteSummary = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    if (dryRun) {
      for (const op of operations) {
        if (existsSync(op.targetPath)) {
          summary.updated.push(op.targetPath);
        } else {
          summary.created.push(op.targetPath);
        }
      }
      return summary;
    }

    // Stage all writes to temp dir first
    const stageDir = join(tmpdir(), `musubix-stage-${randomUUID()}`);
    mkdirSync(stageDir, { recursive: true });

    const staged: Array<{ op: WriteOperation; tempPath: string; backup?: string }> = [];

    try {
      // Stage phase: write to temp
      for (const op of operations) {
        const tempPath = join(stageDir, randomUUID());
        const content = op.content ?? JSON.stringify(op.jsonPatch, null, 2);
        writeFileSync(tempPath, content, 'utf-8');
        staged.push({ op, tempPath });
      }

      // Backup phase
      for (const item of staged) {
        if (existsSync(item.op.targetPath)) {
          const backupPath = `${item.op.targetPath}.bak`;
          copyFileSync(item.op.targetPath, backupPath);
          item.backup = backupPath;
        }
      }

      // Commit phase: move staged files to target
      for (const item of staged) {
        mkdirSync(dirname(item.op.targetPath), { recursive: true });
        renameSync(item.tempPath, item.op.targetPath);
        if (item.backup) {
          summary.updated.push(item.op.targetPath);
        } else {
          summary.created.push(item.op.targetPath);
        }
      }
    } catch (err) {
      // Rollback: restore backups and remove new files
      for (const item of staged) {
        try {
          if (item.backup && existsSync(item.backup)) {
            if (existsSync(item.op.targetPath)) {
              unlinkSync(item.op.targetPath);
            }
            renameSync(item.backup, item.op.targetPath);
          } else if (existsSync(item.op.targetPath)) {
            unlinkSync(item.op.targetPath);
          }
        } catch {
          // best-effort rollback
        }
      }
      summary.errors.push(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      // Cleanup staging directory
      try {
        rmSync(stageDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failure
      }
    }

    return summary;
  }
}
