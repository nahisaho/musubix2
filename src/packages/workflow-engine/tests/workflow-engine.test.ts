import { describe, it, expect, vi } from 'vitest';
import {
  StateTracker,
  PhaseController,
  PHASE_ORDER,
  createStateTracker,
  createPhaseController,
  createDefaultGates,
  type WorkflowPhase,
  type PhaseChangeEvent,
  type PhaseGate,
  type WorkflowState,
} from '../src/index.js';

// ── DES-SDD-001: StateTracker ──────────────────────────────────────────────

describe('DES-SDD-001: StateTracker', () => {
  it('initial state is requirements', () => {
    const tracker = new StateTracker();
    expect(tracker.getState().currentPhase).toBe('requirements');
  });

  it('setPhase updates current phase and history', () => {
    const tracker = new StateTracker();
    tracker.setPhase('design');
    const state = tracker.getState();
    expect(state.currentPhase).toBe('design');
    expect(state.phaseHistory).toHaveLength(2);
    expect(state.phaseHistory[0].phase).toBe('requirements');
    expect(state.phaseHistory[0].exitedAt).toBeInstanceOf(Date);
    expect(state.phaseHistory[1].phase).toBe('design');
  });

  it('addArtifact and getArtifacts', () => {
    const tracker = new StateTracker();
    tracker.addArtifact('requirements', 'req-spec.md');
    tracker.addArtifact('requirements', 'user-stories.md');
    expect(tracker.getArtifacts('requirements')).toEqual(['req-spec.md', 'user-stories.md']);
    expect(tracker.getArtifacts('design')).toEqual([]);
  });

  it('approve and isApproved', () => {
    const tracker = new StateTracker();
    expect(tracker.isApproved('requirements')).toBe(false);
    tracker.approve('requirements');
    expect(tracker.isApproved('requirements')).toBe(true);
  });

  it('getSnapshot returns correct data', () => {
    const tracker = new StateTracker();
    tracker.addArtifact('requirements', 'spec.md');
    tracker.addArtifact('design', 'arch.md');
    tracker.approve('requirements');
    const snap = tracker.getSnapshot();
    expect(snap.currentPhase).toBe('requirements');
    expect(snap.artifactCount).toBe(2);
    expect(snap.approvedPhases).toContain('requirements');
    expect(snap.timestamp).toBeInstanceOf(Date);
  });

  it('onStateChange fires on phase change', () => {
    const tracker = new StateTracker();
    const handler = vi.fn<(event: PhaseChangeEvent) => void>();
    tracker.onStateChange(handler);
    tracker.setPhase('design');
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event.fromPhase).toBe('requirements');
    expect(event.toPhase).toBe('design');
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

// ── DES-SDD-001: PhaseController ───────────────────────────────────────────

describe('DES-SDD-001: PhaseController', () => {
  it('getCurrentPhase returns current', () => {
    const tracker = new StateTracker();
    const ctrl = new PhaseController(tracker);
    expect(ctrl.getCurrentPhase()).toBe('requirements');
  });

  it('getNextPhase returns next in order', () => {
    const tracker = new StateTracker();
    const ctrl = new PhaseController(tracker);
    expect(ctrl.getNextPhase()).toBe('design');
  });

  it('getNextPhase returns null at completion', () => {
    const tracker = new StateTracker();
    tracker.setPhase('completion');
    const ctrl = new PhaseController(tracker);
    expect(ctrl.getNextPhase()).toBeNull();
  });

  it('canTransition returns true for valid next phase', async () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    const ctrl = new PhaseController(tracker);
    expect(await ctrl.canTransition('design')).toBe(true);
  });

  it('canTransition returns false for skipping phases', async () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    const ctrl = new PhaseController(tracker);
    expect(await ctrl.canTransition('task-breakdown')).toBe(false);
  });

  it('transitionTo succeeds when prerequisites met', async () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    const ctrl = new PhaseController(tracker);
    const result = await ctrl.transitionTo('design');
    expect(result.success).toBe(true);
    expect(result.fromPhase).toBe('requirements');
    expect(result.toPhase).toBe('design');
    expect(result.errors).toHaveLength(0);
    expect(tracker.getState().currentPhase).toBe('design');
  });

  it('transitionTo fails when prerequisites not met', async () => {
    const tracker = new StateTracker();
    // requirements not approved
    const ctrl = new PhaseController(tracker);
    const result = await ctrl.transitionTo('design');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(tracker.getState().currentPhase).toBe('requirements');
  });
});

// ── DES-SDD-002a: Unauthorized Transition Prevention ───────────────────────

describe('DES-SDD-002a: Unauthorized Transition Prevention', () => {
  it('cannot transition to implementation without prior approvals', async () => {
    const tracker = new StateTracker();
    // Move through phases but only approve some
    tracker.approve('requirements');
    tracker.setPhase('design');
    tracker.approve('design');
    tracker.setPhase('task-breakdown');
    // task-breakdown NOT approved

    const ctrl = new PhaseController(tracker);
    const result = await ctrl.transitionTo('implementation');
    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('task-breakdown');
  });
});

// ── DES-SDD-002b: Implementation Prerequisites ────────────────────────────

describe('DES-SDD-002b: Implementation Prerequisites', () => {
  it('checkPrerequisites detects missing approvals', () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    // design and task-breakdown not approved
    const ctrl = new PhaseController(tracker);
    const check = ctrl.checkPrerequisites('implementation');
    expect(check.satisfied).toBe(false);
    const phases = check.missing.map((m) => m.phase);
    expect(phases).toContain('design');
    expect(phases).toContain('task-breakdown');
  });

  it('checkPrerequisites passes when all approved and have artifacts', () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    tracker.approve('design');
    tracker.approve('task-breakdown');
    tracker.addArtifact('requirements', 'req.md');
    tracker.addArtifact('design', 'design.md');
    tracker.addArtifact('task-breakdown', 'tasks.md');
    const ctrl = new PhaseController(tracker);
    const check = ctrl.checkPrerequisites('implementation');
    expect(check.satisfied).toBe(true);
    expect(check.missing).toHaveLength(0);
  });

  it('checkPrerequisites fails when requirements phase has 0 artifacts', () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    tracker.approve('design');
    tracker.approve('task-breakdown');
    // no artifacts for requirements
    tracker.addArtifact('design', 'design.md');
    tracker.addArtifact('task-breakdown', 'tasks.md');
    const ctrl = new PhaseController(tracker);
    const check = ctrl.checkPrerequisites('implementation');
    expect(check.satisfied).toBe(false);
    expect(check.missing.some((m) => m.phase === 'requirements' && m.reason === 'no_artifacts')).toBe(true);
  });

  it('implementation transition fails if requirements phase has 0 artifacts', async () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    tracker.setPhase('design');
    tracker.approve('design');
    tracker.addArtifact('design', 'arch.md');
    tracker.setPhase('task-breakdown');
    tracker.approve('task-breakdown');
    tracker.addArtifact('task-breakdown', 'tasks.md');
    // requirements has no artifacts

    const ctrl = new PhaseController(tracker, createDefaultGates());
    const result = await ctrl.transitionTo('implementation');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ── DES-SDD-002c: Error Formatting ────────────────────────────────────────

describe('DES-SDD-002c: Error Formatting', () => {
  it('formatBlockingError produces Japanese message', () => {
    const ctrl = new PhaseController(new StateTracker());
    const msg = ctrl.formatBlockingError([
      { phase: 'design', reason: 'not_approved' },
      { phase: 'task-breakdown', reason: 'no_artifacts' },
    ]);
    expect(msg).toContain('⛔ 実装を開始できません。以下が不足しています:');
    expect(msg).toContain("フェーズ 'design' が未承認です");
    expect(msg).toContain("フェーズ 'task-breakdown' に成果物がありません");
  });
});

// ── Factory functions ──────────────────────────────────────────────────────

describe('Factory functions', () => {
  it('createStateTracker returns a StateTracker', () => {
    const tracker = createStateTracker();
    expect(tracker).toBeInstanceOf(StateTracker);
    expect(tracker.getState().currentPhase).toBe('requirements');
  });

  it('createPhaseController returns a PhaseController with default gates', () => {
    const ctrl = createPhaseController();
    expect(ctrl).toBeInstanceOf(PhaseController);
    expect(ctrl.getCurrentPhase()).toBe('requirements');
  });

  it('createDefaultGates returns gate array', () => {
    const gates = createDefaultGates();
    expect(gates.length).toBeGreaterThan(0);
    for (const gate of gates) {
      expect(gate).toHaveProperty('name');
      expect(gate).toHaveProperty('phase');
      expect(gate).toHaveProperty('check');
    }
  });

  it('registerGate adds a custom gate', async () => {
    const tracker = new StateTracker();
    tracker.approve('requirements');
    const ctrl = new PhaseController(tracker);

    const customGate: PhaseGate = {
      name: 'custom-gate',
      phase: 'design',
      check: (_state: WorkflowState) => ({
        gateName: 'custom-gate',
        passed: false,
        message: 'Custom gate always fails',
      }),
    };
    ctrl.registerGate(customGate);

    const result = await ctrl.transitionTo('design');
    expect(result.success).toBe(false);
    expect(result.gateResults.some((g) => g.gateName === 'custom-gate')).toBe(true);
  });
});
