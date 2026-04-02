// MUSUBIX2 Workflow Engine — SDD phase management, state tracking, and quality gate enforcement

// ── Types ──────────────────────────────────────────────────────────────────

export type WorkflowPhase =
  | 'requirements'
  | 'design'
  | 'task-breakdown'
  | 'implementation'
  | 'completion';

export interface GateResult {
  gateName: string;
  passed: boolean;
  message: string;
}

export interface TransitionResult {
  success: boolean;
  fromPhase: WorkflowPhase;
  toPhase: WorkflowPhase;
  gateResults: GateResult[];
  errors: string[];
}

export interface WorkflowState {
  currentPhase: WorkflowPhase;
  phaseHistory: PhaseHistoryEntry[];
  artifacts: Map<WorkflowPhase, string[]>;
  approvals: Map<WorkflowPhase, boolean>;
}

export interface PhaseHistoryEntry {
  phase: WorkflowPhase;
  enteredAt: Date;
  exitedAt?: Date;
}

export interface WorkflowSnapshot {
  currentPhase: WorkflowPhase;
  phaseHistory: PhaseHistoryEntry[];
  artifactCount: number;
  approvedPhases: WorkflowPhase[];
  timestamp: Date;
}

export interface PhaseChangeEvent {
  fromPhase: WorkflowPhase;
  toPhase: WorkflowPhase;
  timestamp: Date;
  gateResults: GateResult[];
}

export interface MissingPrerequisite {
  phase: WorkflowPhase;
  reason: 'not_approved' | 'no_artifacts';
}

export interface PrerequisiteCheck {
  satisfied: boolean;
  missing: MissingPrerequisite[];
}

export interface PhaseGate {
  name: string;
  phase: WorkflowPhase;
  check: (state: WorkflowState) => GateResult;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const PHASE_ORDER: readonly WorkflowPhase[] = [
  'requirements',
  'design',
  'task-breakdown',
  'implementation',
  'completion',
] as const;

// ── StateTracker ───────────────────────────────────────────────────────────

export class StateTracker {
  private state: WorkflowState;
  private listeners: Array<(event: PhaseChangeEvent) => void> = [];

  constructor() {
    const now = new Date();
    this.state = {
      currentPhase: 'requirements',
      phaseHistory: [{ phase: 'requirements', enteredAt: now }],
      artifacts: new Map<WorkflowPhase, string[]>(),
      approvals: new Map<WorkflowPhase, boolean>(),
    };
  }

  getState(): WorkflowState {
    return this.state;
  }

  getSnapshot(): WorkflowSnapshot {
    let artifactCount = 0;
    for (const arts of this.state.artifacts.values()) {
      artifactCount += arts.length;
    }

    const approvedPhases: WorkflowPhase[] = [];
    for (const [phase, approved] of this.state.approvals.entries()) {
      if (approved) {
        approvedPhases.push(phase);
      }
    }

    return {
      currentPhase: this.state.currentPhase,
      phaseHistory: [...this.state.phaseHistory],
      artifactCount,
      approvedPhases,
      timestamp: new Date(),
    };
  }

  setPhase(phase: WorkflowPhase, gateResults: GateResult[] = []): void {
    const fromPhase = this.state.currentPhase;

    // Close the current history entry
    const currentEntry = this.state.phaseHistory[this.state.phaseHistory.length - 1];
    if (currentEntry && !currentEntry.exitedAt) {
      currentEntry.exitedAt = new Date();
    }

    this.state.currentPhase = phase;
    this.state.phaseHistory.push({ phase, enteredAt: new Date() });

    const event: PhaseChangeEvent = {
      fromPhase,
      toPhase: phase,
      timestamp: new Date(),
      gateResults,
    };

    for (const handler of this.listeners) {
      handler(event);
    }
  }

  addArtifact(phase: WorkflowPhase, artifact: string): void {
    const existing = this.state.artifacts.get(phase) ?? [];
    existing.push(artifact);
    this.state.artifacts.set(phase, existing);
  }

  approve(phase: WorkflowPhase): void {
    this.state.approvals.set(phase, true);
  }

  isApproved(phase: WorkflowPhase): boolean {
    return this.state.approvals.get(phase) === true;
  }

  getArtifacts(phase: WorkflowPhase): string[] {
    return this.state.artifacts.get(phase) ?? [];
  }

  onStateChange(handler: (event: PhaseChangeEvent) => void): void {
    this.listeners.push(handler);
  }
}

// ── PhaseController ────────────────────────────────────────────────────────

export class PhaseController {
  private tracker: StateTracker;
  private gates: PhaseGate[];

  constructor(tracker: StateTracker, gates: PhaseGate[] = []) {
    this.tracker = tracker;
    this.gates = [...gates];
  }

  getCurrentPhase(): WorkflowPhase {
    return this.tracker.getState().currentPhase;
  }

  getNextPhase(): WorkflowPhase | null {
    const current = this.getCurrentPhase();
    const idx = PHASE_ORDER.indexOf(current);
    if (idx < 0 || idx >= PHASE_ORDER.length - 1) {
      return null;
    }
    return PHASE_ORDER[idx + 1];
  }

  getPreviousPhase(): WorkflowPhase | null {
    const current = this.getCurrentPhase();
    const idx = PHASE_ORDER.indexOf(current);
    if (idx <= 0) {
      return null;
    }
    return PHASE_ORDER[idx - 1];
  }

  async canTransition(target: WorkflowPhase): Promise<boolean> {
    // Target must be the immediate next phase
    const next = this.getNextPhase();
    if (target !== next) {
      return false;
    }

    const prereqs = this.checkPrerequisites(target);
    if (!prereqs.satisfied) {
      return false;
    }

    // Run gates
    const state = this.tracker.getState();
    for (const gate of this.gates) {
      if (gate.phase === target) {
        const result = gate.check(state);
        if (!result.passed) {
          return false;
        }
      }
    }

    return true;
  }

  async transitionTo(target: WorkflowPhase): Promise<TransitionResult> {
    const fromPhase = this.getCurrentPhase();
    const errors: string[] = [];
    const gateResults: GateResult[] = [];

    // Must be the immediate next phase
    const next = this.getNextPhase();
    if (target !== next) {
      errors.push(`Cannot transition from '${fromPhase}' to '${target}': must follow phase order`);
      return { success: false, fromPhase, toPhase: target, gateResults, errors };
    }

    // Check prerequisites
    const prereqs = this.checkPrerequisites(target);
    if (!prereqs.satisfied) {
      errors.push(this.formatBlockingError(prereqs.missing));
      return { success: false, fromPhase, toPhase: target, gateResults, errors };
    }

    // Run gates
    const state = this.tracker.getState();
    for (const gate of this.gates) {
      if (gate.phase === target) {
        const result = gate.check(state);
        gateResults.push(result);
        if (!result.passed) {
          errors.push(`Gate '${result.gateName}' failed: ${result.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, fromPhase, toPhase: target, gateResults, errors };
    }

    this.tracker.setPhase(target, gateResults);
    return { success: true, fromPhase, toPhase: target, gateResults, errors };
  }

  checkPrerequisites(target: WorkflowPhase): PrerequisiteCheck {
    const targetIdx = PHASE_ORDER.indexOf(target);
    const missing: MissingPrerequisite[] = [];

    if (target === 'implementation') {
      // DES-SDD-002a/b: requirements, design, task-breakdown must all be approved and have artifacts
      const required: WorkflowPhase[] = ['requirements', 'design', 'task-breakdown'];
      for (const phase of required) {
        if (!this.tracker.isApproved(phase)) {
          missing.push({ phase, reason: 'not_approved' });
        }
        const artifacts = this.tracker.getArtifacts(phase);
        if (artifacts.length === 0) {
          missing.push({ phase, reason: 'no_artifacts' });
        }
      }
    } else if (targetIdx > 0) {
      // For any other transition: the previous phase must be approved
      const prevPhase = PHASE_ORDER[targetIdx - 1];
      if (!this.tracker.isApproved(prevPhase)) {
        missing.push({ phase: prevPhase, reason: 'not_approved' });
      }
    }

    return { satisfied: missing.length === 0, missing };
  }

  registerGate(gate: PhaseGate): void {
    this.gates.push(gate);
  }

  formatBlockingError(missing: MissingPrerequisite[]): string {
    if (missing.length === 0) {
      return 'No blocking issues found.';
    }

    const lines = missing.map((m) => {
      const reason =
        m.reason === 'not_approved'
          ? `フェーズ '${m.phase}' が未承認です`
          : `フェーズ '${m.phase}' に成果物がありません`;
      return `  - ${reason}`;
    });

    return `⛔ 実装を開始できません。以下が不足しています:\n${lines.join('\n')}`;
  }
}

// ── Factory Functions ──────────────────────────────────────────────────────

export function createStateTracker(): StateTracker {
  return new StateTracker();
}

export function createPhaseController(tracker?: StateTracker): PhaseController {
  const t = tracker ?? createStateTracker();
  return new PhaseController(t, createDefaultGates());
}

export {
  ExtendedQualityGateRunner,
  createExtendedQualityGateRunner,
  DEFAULT_EXTENDED_GATE_CONFIG,
  GATE_CONSTITUTION_MAP,
  type ExtendedGateConfig,
  type GateCheckContext,
  type ConstitutionMapping,
  type ViolationEntry,
} from './quality-gates.js';

export {
  TaskBreakdownManager,
  createTaskBreakdownManager,
  type TaskPriority,
  type TaskStatus,
  type TaskInfo,
  type TaskBreakdown,
} from './task-breakdown.js';

export {
  SkillWorkflowBridge,
  createSkillWorkflowBridge,
  type SkillPhaseMapping,
} from './skill-bridge.js';

export function createDefaultGates(): PhaseGate[] {
  return [
    {
      name: 'requirements-artifacts',
      phase: 'design',
      check: (state: WorkflowState): GateResult => {
        const artifacts = state.artifacts.get('requirements') ?? [];
        return {
          gateName: 'requirements-artifacts',
          passed: artifacts.length > 0,
          message:
            artifacts.length > 0
              ? 'Requirements phase has artifacts'
              : 'Requirements phase has no artifacts',
        };
      },
    },
    {
      name: 'design-artifacts',
      phase: 'task-breakdown',
      check: (state: WorkflowState): GateResult => {
        const artifacts = state.artifacts.get('design') ?? [];
        return {
          gateName: 'design-artifacts',
          passed: artifacts.length > 0,
          message:
            artifacts.length > 0 ? 'Design phase has artifacts' : 'Design phase has no artifacts',
        };
      },
    },
    {
      name: 'task-breakdown-artifacts',
      phase: 'implementation',
      check: (state: WorkflowState): GateResult => {
        const artifacts = state.artifacts.get('task-breakdown') ?? [];
        return {
          gateName: 'task-breakdown-artifacts',
          passed: artifacts.length > 0,
          message:
            artifacts.length > 0
              ? 'Task-breakdown phase has artifacts'
              : 'Task-breakdown phase has no artifacts',
        };
      },
    },
    {
      name: 'requirements-impl-artifacts',
      phase: 'implementation',
      check: (state: WorkflowState): GateResult => {
        const artifacts = state.artifacts.get('requirements') ?? [];
        return {
          gateName: 'requirements-impl-artifacts',
          passed: artifacts.length > 0,
          message:
            artifacts.length > 0
              ? 'Requirements phase has artifacts for implementation'
              : 'Requirements phase has no artifacts for implementation',
        };
      },
    },
    {
      name: 'design-impl-artifacts',
      phase: 'implementation',
      check: (state: WorkflowState): GateResult => {
        const artifacts = state.artifacts.get('design') ?? [];
        return {
          gateName: 'design-impl-artifacts',
          passed: artifacts.length > 0,
          message:
            artifacts.length > 0
              ? 'Design phase has artifacts for implementation'
              : 'Design phase has no artifacts for implementation',
        };
      },
    },
    {
      name: 'implementation-artifacts',
      phase: 'completion',
      check: (state: WorkflowState): GateResult => {
        const artifacts = state.artifacts.get('implementation') ?? [];
        return {
          gateName: 'implementation-artifacts',
          passed: artifacts.length > 0,
          message:
            artifacts.length > 0
              ? 'Implementation phase has artifacts'
              : 'Implementation phase has no artifacts',
        };
      },
    },
  ];
}
