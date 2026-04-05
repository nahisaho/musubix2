/**
 * P2-08 / DES-INS-001: Build install plan from platform selection and workspace state.
 */
import type {
  PlatformSelection,
  WorkspaceSnapshot,
  InitOptions,
  InstallPlan,
  PlannedArtifact,
} from '../../domain/install/types.js';

export class InstallPlanner {
  async buildPlan(
    selection: PlatformSelection,
    _workspaceState: WorkspaceSnapshot,
    _options: InitOptions,
  ): Promise<InstallPlan> {
    const artifacts: PlannedArtifact[] = [];
    const warnings: string[] = [];
    const transactionalGroups: string[] = [];

    if (selection.copilot) {
      artifacts.push(
        { path: '.github/copilot-instructions.md', platform: 'copilot', category: 'instruction' },
        { path: '.github/skills/', platform: 'copilot', category: 'skill' },
        { path: '.vscode/mcp.json', platform: 'copilot', category: 'mcp-config' },
      );
    }

    if (selection.claude) {
      transactionalGroups.push('claude-setup');
      artifacts.push(
        { path: 'CLAUDE.md', platform: 'claude', category: 'instruction', transactionalGroup: 'claude-setup' },
        { path: '.claude/skills/', platform: 'claude', category: 'skill', transactionalGroup: 'claude-setup' },
        { path: '.mcp.json', platform: 'claude', category: 'mcp-config', transactionalGroup: 'claude-setup' },
        { path: '.claude/.musubix-managed', platform: 'claude', category: 'marker', transactionalGroup: 'claude-setup' },
      );
    }

    if (!selection.copilot && !selection.claude) {
      warnings.push('No platform selected. Run with --platform copilot|claude|both.');
    }

    return {
      artifacts,
      transactionalGroups,
      requiresConfirmation: selection.needsConfirmation,
      warnings,
    };
  }
}
