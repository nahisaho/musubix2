/**
 * P3-03 / DES-SAF-002: Format dry-run plan as readable table.
 */
import type { WriteOperation, DryRunItem } from '../../domain/install/types.js';
import { existsSync } from 'node:fs';

export class DryRunReporter {
  format(operations: WriteOperation[]): string {
    const items: DryRunItem[] = operations.map(op => {
      const exists = existsSync(op.targetPath);
      let action: 'create' | 'update' | 'skip';
      let reason: string;

      if (op.mode === 'create' && !op.content) {
        action = 'skip';
        reason = 'Existing file, --force not set';
      } else if (exists) {
        action = 'update';
        reason = `Mode: ${op.mode}`;
      } else {
        action = 'create';
        reason = 'New file';
      }

      return { path: op.targetPath, action, mode: op.mode, reason };
    });

    const lines = [
      '',
      '  Dry Run — no files will be written',
      '  ────────────────────────────────────',
      '',
    ];

    const icons = { create: '✚', update: '↻', skip: '⊘' } as const;

    for (const item of items) {
      lines.push(`  ${icons[item.action]} [${item.action.toUpperCase().padEnd(6)}] ${item.path}`);
      lines.push(`    └─ ${item.reason}`);
    }

    lines.push('');
    const counts = {
      create: items.filter(i => i.action === 'create').length,
      update: items.filter(i => i.action === 'update').length,
      skip: items.filter(i => i.action === 'skip').length,
    };
    lines.push(`  Summary: ${counts.create} create, ${counts.update} update, ${counts.skip} skip`);
    lines.push('');

    return lines.join('\n');
  }
}
