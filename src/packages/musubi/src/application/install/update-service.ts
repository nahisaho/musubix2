/**
 * P2-09 / DES-UPD-001: Update musubix-managed sections and create .bak backups.
 */
import { existsSync, copyFileSync } from 'node:fs';
import type {
  InstallContext,
  UpdateResult,
  WriteOperation,
} from '../../domain/install/types.js';
import { WorkspaceMergeService } from './workspace-merge-service.js';
import { WorkspaceWriter } from '../../infrastructure/workspace/workspace-writer.js';

export class UpdateService {
  constructor(
    _merger: WorkspaceMergeService,
    private readonly writer: WorkspaceWriter,
  ) {}

  async run(_context: InstallContext, generatedOps: WriteOperation[]): Promise<UpdateResult> {
    const backups: string[] = [];
    const updatedPaths: string[] = [];
    const diffSummary: string[] = [];

    const updateOps = generatedOps.filter(
      op => op.mode === 'append-section' || op.mode === 'merge-json',
    );

    for (const op of updateOps) {
      if (existsSync(op.targetPath)) {
        const bakPath = `${op.targetPath}.bak`;
        copyFileSync(op.targetPath, bakPath);
        backups.push(bakPath);
        diffSummary.push(`${op.targetPath}: ${op.mode}`);
      }
    }

    const summary = await this.writer.execute(updateOps, false);
    updatedPaths.push(...summary.updated);

    return { backups, updatedPaths, diffSummary };
  }
}
