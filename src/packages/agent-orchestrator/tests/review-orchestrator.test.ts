import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReviewOrchestrator,
  createReviewOrchestrator,
  type ReviewFunction,
  type ReviewIssue,
  type ReviewModelId,
  type ReviewResult,
  type SDDArtifactType,
} from '../src/review-orchestrator.js';

// ── Helpers ──

function makeIssue(overrides?: Partial<ReviewIssue>): ReviewIssue {
  return {
    id: overrides?.id ?? 'ISS-001',
    severity: overrides?.severity ?? 'error',
    location: overrides?.location ?? 'REQ-SDD-001',
    message: overrides?.message ?? 'Test issue',
    suggestion: overrides?.suggestion,
  };
}

function makePassReviewer(modelId: ReviewModelId): ReviewFunction {
  return (artifact, _content, _prev): ReviewResult => ({
    model: modelId,
    artifactType: artifact,
    pass: true,
    issues: [],
    timestamp: new Date(),
    round: 0,
  });
}

function makeFailReviewer(modelId: ReviewModelId, issues?: ReviewIssue[]): ReviewFunction {
  return (artifact, _content, _prev): ReviewResult => ({
    model: modelId,
    artifactType: artifact,
    pass: false,
    issues: issues ?? [makeIssue()],
    timestamp: new Date(),
    round: 0,
  });
}

describe('DES-AGT-002: ReviewOrchestrator', () => {
  let orchestrator: ReviewOrchestrator;

  beforeEach(() => {
    orchestrator = createReviewOrchestrator();
  });

  // ── 1. Basic alternating review ──

  describe('alternating review pattern', () => {
    it('should alternate between model A and model B', async () => {
      const callOrder: ReviewModelId[] = [];

      const trackerA: ReviewFunction = (artifact, _content, _prev) => {
        callOrder.push('opus-4.6');
        return {
          model: 'opus-4.6',
          artifactType: artifact,
          pass: callOrder.length >= 3,
          issues: callOrder.length < 3 ? [makeIssue({ id: `A-${callOrder.length}` })] : [],
          timestamp: new Date(),
          round: 0,
        };
      };

      const trackerB: ReviewFunction = (artifact, _content, _prev) => {
        callOrder.push('gpt-5.4');
        return {
          model: 'gpt-5.4',
          artifactType: artifact,
          pass: callOrder.length >= 4,
          issues: callOrder.length < 4 ? [makeIssue({ id: `B-${callOrder.length}` })] : [],
          timestamp: new Date(),
          round: 0,
        };
      };

      orchestrator.registerReviewer('opus-4.6', trackerA);
      orchestrator.registerReviewer('gpt-5.4', trackerB);

      await orchestrator.reviewArtifact('requirements', 'content');

      expect(callOrder).toEqual(['opus-4.6', 'gpt-5.4', 'opus-4.6', 'gpt-5.4']);
    });
  });

  // ── 2. Convergence ──

  describe('convergence', () => {
    it('should approve when both models pass consecutively', async () => {
      let callCount = 0;

      // Model A: fails round 1, passes round 3
      const reviewerA: ReviewFunction = (artifact) => {
        callCount++;
        const pass = callCount > 2;
        return {
          model: 'opus-4.6',
          artifactType: artifact,
          pass,
          issues: pass
            ? []
            : [makeIssue({ id: `A-${callCount}`, message: `Issue from A round ${callCount}` })],
          timestamp: new Date(),
          round: 0,
        };
      };

      // Model B: fails round 2, passes round 4
      const reviewerB: ReviewFunction = (artifact) => {
        callCount++;
        const pass = callCount > 3;
        return {
          model: 'gpt-5.4',
          artifactType: artifact,
          pass,
          issues: pass
            ? []
            : [makeIssue({ id: `B-${callCount}`, message: `Issue from B round ${callCount}` })],
          timestamp: new Date(),
          round: 0,
        };
      };

      orchestrator.registerReviewer('opus-4.6', reviewerA);
      orchestrator.registerReviewer('gpt-5.4', reviewerB);

      const result = await orchestrator.reviewArtifact('requirements', 'SDD content');

      expect(result.finalStatus).toBe('approved');
      expect(result.consensusReached).toBe(true);
      expect(result.approvedBy).toContain('opus-4.6');
      expect(result.approvedBy).toContain('gpt-5.4');
      expect(result.totalRounds).toBe(4);
    });
  });

  // ── 3. Max rounds exceeded ──

  describe('max rounds exceeded', () => {
    it('should reject when maxRounds is reached without consensus', async () => {
      orchestrator = createReviewOrchestrator({ maxRounds: 3 });
      orchestrator.registerReviewer('opus-4.6', makeFailReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makeFailReviewer('gpt-5.4'));

      const result = await orchestrator.reviewArtifact('design', 'content');

      expect(result.finalStatus).toBe('max-rounds-exceeded');
      expect(result.consensusReached).toBe(false);
      expect(result.totalRounds).toBe(3);
      expect(result.approvedBy).toEqual([]);
      expect(result.rounds).toHaveLength(3);
    });
  });

  // ── 4. Final consensus — both pass ──

  describe('final consensus check', () => {
    it('should approve when both models pass in parallel', async () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makePassReviewer('gpt-5.4'));

      const result = await orchestrator.finalConsensusCheck('requirements', 'content');

      expect(result.approved).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].pass).toBe(true);
      expect(result.results[1].pass).toBe(true);
    });
  });

  // ── 5. Final consensus — one fails ──

  describe('final consensus failure', () => {
    it('should not approve when one model fails', async () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.registerReviewer(
        'gpt-5.4',
        makeFailReviewer('gpt-5.4', [makeIssue({ id: 'FAIL-1' })]),
      );

      const result = await orchestrator.finalConsensusCheck('design', 'content');

      expect(result.approved).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.results.find((r) => r.model === 'gpt-5.4')?.pass).toBe(false);
    });
  });

  // ── 6. Pipeline review — all pass ──

  describe('pipeline review', () => {
    it('should review all artifacts in SDD order and approve', async () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makePassReviewer('gpt-5.4'));

      const artifacts = new Map<SDDArtifactType, string>([
        ['requirements', 'REQ content'],
        ['design', 'DES content'],
        ['plan', 'PLAN content'],
      ]);

      const results = await orchestrator.reviewPipeline(artifacts);

      expect(results.size).toBe(3);
      expect(results.get('requirements')?.finalStatus).toBe('approved');
      expect(results.get('design')?.finalStatus).toBe('approved');
      expect(results.get('plan')?.finalStatus).toBe('approved');
      expect(orchestrator.canProceedToImplementation()).toBe(true);
    });
  });

  // ── 7. Pipeline early stop ──

  describe('pipeline early stop', () => {
    it('should stop pipeline when an artifact fails', async () => {
      let artifactsSeen: SDDArtifactType[] = [];

      const selectiveReviewer =
        (modelId: ReviewModelId): ReviewFunction =>
        (artifact, _content, _prev) => {
          artifactsSeen.push(artifact);
          const pass = artifact !== 'design';
          return {
            model: modelId,
            artifactType: artifact,
            pass,
            issues: pass ? [] : [makeIssue({ location: 'DES-ARC-003' })],
            timestamp: new Date(),
            round: 0,
          };
        };

      orchestrator = createReviewOrchestrator({ maxRounds: 2 });
      orchestrator.registerReviewer('opus-4.6', selectiveReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', selectiveReviewer('gpt-5.4'));

      const artifacts = new Map<SDDArtifactType, string>([
        ['requirements', 'REQ content'],
        ['design', 'DES content'],
        ['plan', 'PLAN content'],
      ]);

      const results = await orchestrator.reviewPipeline(artifacts);

      expect(results.get('requirements')?.finalStatus).toBe('approved');
      expect(results.get('design')?.finalStatus).toBe('max-rounds-exceeded');
      expect(results.has('plan')).toBe(false);
      expect(orchestrator.canProceedToImplementation()).toBe(false);
    });
  });

  // ── 8. History tracking ──

  describe('history and summary', () => {
    it('should track history and return correct summary', async () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makePassReviewer('gpt-5.4'));

      await orchestrator.reviewArtifact('requirements', 'content');
      await orchestrator.reviewArtifact('design', 'content');

      const history = orchestrator.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].artifact).toBe('requirements');
      expect(history[1].artifact).toBe('design');

      const summary = orchestrator.getSummary();
      expect(summary.approvedArtifacts).toEqual(['requirements', 'design']);
      expect(summary.totalRounds).toBeGreaterThanOrEqual(2);
    });

    it('should count issues found and resolved', async () => {
      let callCount = 0;

      const diminishingReviewer =
        (modelId: ReviewModelId): ReviewFunction =>
        (artifact) => {
          callCount++;
          // Rounds 1-2: issues, Rounds 3-4: pass
          const pass = callCount > 2;
          return {
            model: modelId,
            artifactType: artifact,
            pass,
            issues: pass
              ? []
              : [makeIssue({ id: `ISS-${callCount}`, message: `Issue ${callCount}` })],
            timestamp: new Date(),
            round: 0,
          };
        };

      orchestrator.registerReviewer('opus-4.6', diminishingReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', diminishingReviewer('gpt-5.4'));

      await orchestrator.reviewArtifact('requirements', 'content');

      const summary = orchestrator.getSummary();
      expect(summary.issuesFound).toBe(2);
      expect(summary.issuesResolved).toBe(2);
    });
  });

  // ── 9. Custom config ──

  describe('custom config', () => {
    it('should respect custom maxRounds', async () => {
      orchestrator = createReviewOrchestrator({ maxRounds: 3 });
      orchestrator.registerReviewer('opus-4.6', makeFailReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makeFailReviewer('gpt-5.4'));

      const result = await orchestrator.reviewArtifact('plan', 'content');

      expect(result.totalRounds).toBe(3);
      expect(result.rounds).toHaveLength(3);
    });

    it('should use default config values', () => {
      orchestrator = createReviewOrchestrator();
      // Verify defaults by running and checking behavior
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makePassReviewer('gpt-5.4'));
      expect(orchestrator.canProceedToImplementation()).toBe(false);
    });

    it('should support custom artifact types', async () => {
      orchestrator = createReviewOrchestrator({ artifactTypes: ['requirements'] });
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', makePassReviewer('gpt-5.4'));

      await orchestrator.reviewArtifact('requirements', 'content');

      expect(orchestrator.canProceedToImplementation()).toBe(true);
    });
  });

  // ── 10. Previous issues passed to next reviewer ──

  describe('previous issues forwarding', () => {
    it('should pass issues from round N to reviewer in round N+1', async () => {
      const receivedIssues: ReviewIssue[][] = [];

      const issueTracker =
        (modelId: ReviewModelId, issueCount: number): ReviewFunction =>
        (artifact, _content, previousIssues) => {
          receivedIssues.push([...previousIssues]);
          const issues =
            issueCount > 0
              ? Array.from({ length: issueCount }, (_, i) =>
                  makeIssue({ id: `${modelId}-${i}`, message: `From ${modelId}` }),
                )
              : [];
          return {
            model: modelId,
            artifactType: artifact,
            pass: issues.length === 0,
            issues,
            timestamp: new Date(),
            round: 0,
          };
        };

      // Model A produces 2 issues, Model B produces 0 (passes)
      orchestrator.registerReviewer('opus-4.6', issueTracker('opus-4.6', 2));
      orchestrator.registerReviewer('gpt-5.4', issueTracker('gpt-5.4', 0));

      await orchestrator.reviewArtifact('requirements', 'content');

      // Round 1 (Model A): receives empty previous issues
      expect(receivedIssues[0]).toEqual([]);
      // Round 2 (Model B): receives Model A's 2 issues
      expect(receivedIssues[1]).toHaveLength(2);
      expect(receivedIssues[1][0].id).toBe('opus-4.6-0');
    });
  });

  // ── Error cases ──

  describe('error handling', () => {
    it('should throw when reviewer is not registered', async () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      // gpt-5.4 not registered

      await expect(orchestrator.reviewArtifact('requirements', 'content')).rejects.toThrow(
        'Both reviewers must be registered',
      );
    });

    it('should throw on finalConsensusCheck without both reviewers', async () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));

      await expect(orchestrator.finalConsensusCheck('requirements', 'content')).rejects.toThrow(
        'Both reviewers must be registered',
      );
    });

    it('should allow unregistering a reviewer', () => {
      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      orchestrator.unregisterReviewer('opus-4.6');

      orchestrator.registerReviewer('opus-4.6', makePassReviewer('opus-4.6'));
      // No error — re-registration works
    });
  });

  // ── Async reviewer support ──

  describe('async reviewers', () => {
    it('should support async review functions', async () => {
      const asyncReviewer =
        (modelId: ReviewModelId): ReviewFunction =>
        async (artifact) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return {
            model: modelId,
            artifactType: artifact,
            pass: true,
            issues: [],
            timestamp: new Date(),
            round: 0,
          };
        };

      orchestrator.registerReviewer('opus-4.6', asyncReviewer('opus-4.6'));
      orchestrator.registerReviewer('gpt-5.4', asyncReviewer('gpt-5.4'));

      const result = await orchestrator.reviewArtifact('requirements', 'content');
      expect(result.finalStatus).toBe('approved');
    });
  });
});
