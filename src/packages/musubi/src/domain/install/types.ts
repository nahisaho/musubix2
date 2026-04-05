/**
 * P1-01 / DES-INS-001〜006, DES-SAF-001
 * Domain types for the dual-platform install system.
 */

// ── Init Options ───────────────────────────────────────────────────────────

export type InitMode = 'legacy-project-init' | 'platform-bootstrap';

export interface InitOptions {
  projectPath: string;
  platform: 'auto' | 'copilot' | 'claude' | 'both';
  force: boolean;
  dryRun: boolean;
  update: boolean;
}

export interface InitSummary {
  detectedPlatforms: PlatformSelection;
  created: string[];
  updated: string[];
  skipped: string[];
  warnings: string[];
  durationMs: number;
}

// ── Platform Detection ─────────────────────────────────────────────────────

export interface PlatformSelection {
  copilot: boolean;
  claude: boolean;
  source: 'flag' | 'workspace' | 'candidate' | 'prompt';
  needsConfirmation: boolean;
}

export interface PlatformHints {
  hasVscodeDir: boolean;
  hasClaudeDir: boolean;
  hasManagedClaudeMarker: boolean;
  hasClaudeCommand: boolean;
}

// ── Install Planning ───────────────────────────────────────────────────────

export interface PlannedArtifact {
  path: string;
  platform: 'copilot' | 'claude' | 'shared';
  category: 'instruction' | 'skill' | 'mcp-config' | 'marker' | 'log';
  transactionalGroup?: 'claude-setup';
}

export interface InstallPlan {
  artifacts: PlannedArtifact[];
  transactionalGroups: string[];
  requiresConfirmation: boolean;
  warnings: string[];
}

// ── Generated Artifacts ────────────────────────────────────────────────────

export interface GeneratedFile {
  path: string;
  content: string;
  managed: boolean;
}

export interface GeneratedDirectory {
  basePath: string;
  files: GeneratedFile[];
}

export type GeneratedArtifacts = Array<GeneratedFile | GeneratedDirectory>;

// ── Workspace State ────────────────────────────────────────────────────────

export interface WorkspaceSnapshot {
  existingFiles: Map<string, { exists: boolean; managed: boolean }>;
  projectRoot: string;
}

export type WriteMode = 'create' | 'replace' | 'append-section' | 'merge-json' | 'merge-directory';

export interface WriteOperation {
  targetPath: string;
  mode: WriteMode;
  content?: string;
  jsonPatch?: Record<string, unknown>;
}

export interface WriteSummary {
  created: string[];
  updated: string[];
  skipped: string[];
  errors: string[];
}

// ── Install Context ────────────────────────────────────────────────────────

export interface InstallContext {
  projectPath: string;
  options: InitOptions;
  selection: PlatformSelection;
  project: ProjectContext;
}

export interface ProjectContext {
  projectName: string;
  packageManager: 'npm';
  rootStructure: string[];
  skillNames: string[];
  constitutionSummary: string[];
}

// ── MCP Config ─────────────────────────────────────────────────────────────

export interface LaunchDefinition {
  command: string;
  args: string[];
  transport: 'stdio' | 'sse';
}

export interface McpConfigDocument {
  path: '.vscode/mcp.json' | '.mcp.json';
  json: Record<string, unknown>;
}

// ── Asset Catalog ──────────────────────────────────────────────────────────

export interface AssetEntry {
  platform: 'copilot' | 'claude';
  skillName: string;
  sourcePath: string;
  assetKinds: Array<'skill' | 'script' | 'reference'>;
  checksum: string;
}

export interface SkillsManifest {
  version: string;
  generatedAt: string;
  entries: AssetEntry[];
}

// ── Skill Index ────────────────────────────────────────────────────────────

export interface SkillIndexItem {
  name: string;
  summary: string;
  triggers: string[];
  path: string;
}

// ── Transaction ────────────────────────────────────────────────────────────

export interface TransactionResult {
  committed: boolean;
  rolledBack: boolean;
  failures: string[];
}

// ── Update ─────────────────────────────────────────────────────────────────

export interface UpdateResult {
  backups: string[];
  updatedPaths: string[];
  diffSummary: string[];
}

// ── Dry Run ────────────────────────────────────────────────────────────────

export interface DryRunItem {
  path: string;
  action: 'create' | 'update' | 'skip';
  mode: WriteMode;
  reason: string;
}

// ── SSE ────────────────────────────────────────────────────────────────────

export interface SseServerOptions {
  port: number;
  endpointPath: '/sse';
  messagePath: '/messages';
}

export interface McpCliOptions {
  transport: 'stdio' | 'sse';
  port?: number;
}
