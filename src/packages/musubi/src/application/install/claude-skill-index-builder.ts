/**
 * P2-05 / DES-SKL-002: Build skill index section for CLAUDE.md.
 */
import type { SkillIndexItem } from '../../domain/install/types.js';

export class ClaudeSkillIndexBuilder {
  build(items: SkillIndexItem[]): string {
    if (items.length === 0) return '';

    const lines: string[] = [
      '## スキル一覧',
      '',
      '| スキル | 概要 | 起動条件 | パス |',
      '|--------|------|---------|------|',
    ];

    for (const item of items) {
      const triggers = item.triggers.join(', ') || '—';
      lines.push(`| **${item.name}** | ${item.summary} | ${triggers} | \`${item.path}\` |`);
    }

    return lines.join('\n');
  }
}
