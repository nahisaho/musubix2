/**
 * P2-01 / DES-INS-002: Detect available platforms from workspace hints and CLI flags.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { PlatformSelection, PlatformHints, InitOptions } from '../../domain/install/types.js';

export class PlatformDetector {
  async detect(
    projectPath: string,
    requested: InitOptions['platform'],
  ): Promise<PlatformSelection> {
    // Explicit flag override
    if (requested !== 'auto') {
      return {
        copilot: requested === 'copilot' || requested === 'both',
        claude: requested === 'claude' || requested === 'both',
        source: 'flag',
        needsConfirmation: false,
      };
    }

    const hints = this.gatherHints(projectPath);

    const copilot = hints.hasVscodeDir;
    // .claude/ with .musubix-managed means self-generated — exclude from detection
    const claude = hints.hasClaudeDir && !hints.hasManagedClaudeMarker;

    if (copilot || claude) {
      return { copilot, claude, source: 'workspace', needsConfirmation: false };
    }

    // claude command exists but no workspace hints → candidate, needs confirmation
    if (hints.hasClaudeCommand) {
      return {
        copilot: false,
        claude: false,
        source: 'candidate',
        needsConfirmation: true,
      };
    }

    // Nothing found — need user prompt
    return {
      copilot: false,
      claude: false,
      source: 'candidate',
      needsConfirmation: true,
    };
  }

  private gatherHints(projectPath: string): PlatformHints {
    return {
      hasVscodeDir: existsSync(resolve(projectPath, '.vscode')),
      hasClaudeDir: existsSync(resolve(projectPath, '.claude')),
      hasManagedClaudeMarker: existsSync(resolve(projectPath, '.claude', '.musubix-managed')),
      hasClaudeCommand: this.hasCommand('claude'),
    };
  }

  private hasCommand(cmd: string): boolean {
    try {
      execSync(`command -v ${cmd}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
