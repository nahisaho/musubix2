/**
 * CLI base — Commander.js registration pattern and exit codes
 *
 * @module interface/cli
 * @see REQ-ARC-003 — CLI interface (Article II)
 */

export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  CONFIG_ERROR: 3,
  PHASE_BLOCKED: 4,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * CLI command registration pattern.
 * Each package exposes registerXCommand(program) to attach subcommands.
 *
 * Usage:
 * ```typescript
 * import { Command } from 'commander';
 * export function registerRequirementsCommand(program: Command): void {
 *   const cmd = program.command('requirements');
 *   cmd.command('analyze <file>')
 *     .description('Analyze EARS requirements')
 *     .action(async (file) => { ... });
 * }
 * ```
 */
export interface CommandRegistrar {
  (program: unknown): void;
}

/**
 * CLI output helpers
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

export function formatError(message: string): string {
  return `❌ ${message}`;
}

export function formatWarning(message: string): string {
  return `⚠️  ${message}`;
}

export function formatInfo(message: string): string {
  return `ℹ️  ${message}`;
}

/**
 * CLI table formatter (simple text table)
 */
export function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map((r) => (r[i] ?? '').length));
    return Math.max(h.length, maxRow);
  });

  const header = headers.map((h, i) => h.padEnd(widths[i])).join(' | ');
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-');
  const body = rows
    .map((row) => row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join(' | '))
    .join('\n');

  return `${header}\n${separator}\n${body}`;
}
