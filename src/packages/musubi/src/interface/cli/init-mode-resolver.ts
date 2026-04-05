/**
 * P3-01 / DES-INS-001: Resolve init mode from CLI argv.
 * Legacy mode: musubix init [path] [--name <name>] [--force]
 * Bootstrap mode: musubix init [--platform ...] [--dry-run] [--update]
 */
import type { InitMode } from '../../domain/install/types.js';

const BOOTSTRAP_FLAGS = ['platform', 'dry-run', 'update'];

export class InitModeResolver {
  resolve(flags: Record<string, string | boolean>): InitMode {
    for (const flag of BOOTSTRAP_FLAGS) {
      if (flag in flags) return 'platform-bootstrap';
    }
    return 'legacy-project-init';
  }
}
