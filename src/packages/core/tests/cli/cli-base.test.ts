import { describe, it, expect } from 'vitest';
import {
  ExitCode,
  formatSuccess,
  formatError,
  formatWarning,
  formatInfo,
  formatTable,
} from '../../src/interface/cli/index.js';

describe('REQ-ARC-003: CLI base', () => {
  it('should have standard exit codes', () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.GENERAL_ERROR).toBe(1);
    expect(ExitCode.VALIDATION_ERROR).toBe(2);
    expect(ExitCode.CONFIG_ERROR).toBe(3);
    expect(ExitCode.PHASE_BLOCKED).toBe(4);
  });

  it('should format success message', () => {
    expect(formatSuccess('done')).toBe('✅ done');
  });

  it('should format error message', () => {
    expect(formatError('fail')).toBe('❌ fail');
  });

  it('should format warning message', () => {
    expect(formatWarning('caution')).toContain('caution');
  });

  it('should format info message', () => {
    expect(formatInfo('note')).toContain('note');
  });

  it('should format table', () => {
    const table = formatTable(
      ['ID', 'Status'],
      [
        ['REQ-001', 'PASS'],
        ['REQ-002', 'FAIL'],
      ],
    );
    expect(table).toContain('ID');
    expect(table).toContain('Status');
    expect(table).toContain('REQ-001');
    expect(table).toContain('FAIL');
    expect(table).toContain('---');
  });
});
