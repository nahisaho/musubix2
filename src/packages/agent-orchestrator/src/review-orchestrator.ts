// DES-AGT-002: Cross-model review orchestration for SDD artifacts
// REQ-SDD-003 traceability — quality gate enforcement via multi-model consensus
// Pattern: alternating reviews between two LLM models until consensus

// ── Types ──

export type ReviewModelId = 'opus-4.6' | 'gpt-5.4';

export interface ReviewConfig {
  models: [ReviewModelId, ReviewModelId];
  maxRounds: number;
  requiredConsensus: number;
  artifactTypes: SDDArtifactType[];
}

export type SDDArtifactType = 'requirements' | 'design' | 'plan';

export interface ReviewIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  location: string;
  message: string;
  suggestion?: string;
}

export interface ReviewResult {
  model: ReviewModelId;
  artifactType: SDDArtifactType;
  pass: boolean;
  issues: ReviewIssue[];
  timestamp: Date;
  round: number;
}

export interface ReviewRound {
  roundNumber: number;
  reviews: ReviewResult[];
  allPassed: boolean;
}

export interface ReviewOrchestrationResult {
  artifact: SDDArtifactType;
  rounds: ReviewRound[];
  finalStatus: 'approved' | 'rejected' | 'max-rounds-exceeded';
  totalRounds: number;
  consensusReached: boolean;
  approvedBy: ReviewModelId[];
}

export interface ReviewFunction {
  (
    artifact: SDDArtifactType,
    content: string,
    previousIssues: ReviewIssue[],
  ): Promise<ReviewResult> | ReviewResult;
}

// ── SDD artifact ordering ──

const SDD_ARTIFACT_ORDER: readonly SDDArtifactType[] = ['requirements', 'design', 'plan'];

// ── ReviewOrchestrator ──

export class ReviewOrchestrator {
  private config: ReviewConfig;
  private reviewers: Map<ReviewModelId, ReviewFunction>;
  private history: ReviewOrchestrationResult[];

  constructor(config?: Partial<ReviewConfig>) {
    this.config = {
      models: config?.models ?? ['opus-4.6', 'gpt-5.4'],
      maxRounds: config?.maxRounds ?? 5,
      requiredConsensus: config?.requiredConsensus ?? 2,
      artifactTypes: config?.artifactTypes ?? ['requirements', 'design', 'plan'],
    };
    this.reviewers = new Map();
    this.history = [];
  }

  registerReviewer(modelId: ReviewModelId, fn: ReviewFunction): void {
    this.reviewers.set(modelId, fn);
  }

  unregisterReviewer(modelId: ReviewModelId): void {
    this.reviewers.delete(modelId);
  }

  async reviewArtifact(
    artifactType: SDDArtifactType,
    content: string,
  ): Promise<ReviewOrchestrationResult> {
    const [modelA, modelB] = this.config.models;
    const reviewerA = this.reviewers.get(modelA);
    const reviewerB = this.reviewers.get(modelB);

    if (!reviewerA || !reviewerB) {
      throw new Error(
        `Both reviewers must be registered. Missing: ${[
          !reviewerA ? modelA : '',
          !reviewerB ? modelB : '',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }

    const rounds: ReviewRound[] = [];
    // Track the last pass status per model for consecutive consensus
    const lastPassByModel = new Map<ReviewModelId, boolean>();
    let previousIssues: ReviewIssue[] = [];

    for (let roundNum = 1; roundNum <= this.config.maxRounds; roundNum++) {
      const currentModelId = roundNum % 2 === 1 ? modelA : modelB;
      const currentReviewer = this.reviewers.get(currentModelId)!;

      const result = await currentReviewer(artifactType, content, previousIssues);
      // Ensure round number and model are set correctly
      const reviewResult: ReviewResult = {
        ...result,
        model: currentModelId,
        round: roundNum,
      };

      const round: ReviewRound = {
        roundNumber: roundNum,
        reviews: [reviewResult],
        allPassed: reviewResult.pass,
      };
      rounds.push(round);

      lastPassByModel.set(currentModelId, reviewResult.pass);
      previousIssues = reviewResult.issues;

      // Check consensus: requiredConsensus unique models must have PASS as their last result
      const passingModels = this.config.models.filter((m) => lastPassByModel.get(m) === true);
      if (passingModels.length >= this.config.requiredConsensus) {
        const result: ReviewOrchestrationResult = {
          artifact: artifactType,
          rounds,
          finalStatus: 'approved',
          totalRounds: roundNum,
          consensusReached: true,
          approvedBy: passingModels,
        };
        this.history.push(result);
        return result;
      }
    }

    // Max rounds exceeded without consensus
    const orchestrationResult: ReviewOrchestrationResult = {
      artifact: artifactType,
      rounds,
      finalStatus: 'max-rounds-exceeded',
      totalRounds: this.config.maxRounds,
      consensusReached: false,
      approvedBy: [],
    };
    this.history.push(orchestrationResult);
    return orchestrationResult;
  }

  async reviewPipeline(
    artifacts: Map<SDDArtifactType, string>,
  ): Promise<Map<SDDArtifactType, ReviewOrchestrationResult>> {
    const results = new Map<SDDArtifactType, ReviewOrchestrationResult>();

    // Review in SDD order, filtered to configured artifact types
    const orderedTypes = SDD_ARTIFACT_ORDER.filter((t) =>
      this.config.artifactTypes.includes(t),
    );

    for (const artifactType of orderedTypes) {
      const content = artifacts.get(artifactType);
      if (content === undefined) {
        continue;
      }

      const result = await this.reviewArtifact(artifactType, content);
      results.set(artifactType, result);

      // Stop pipeline if artifact is not approved
      if (result.finalStatus !== 'approved') {
        break;
      }
    }

    return results;
  }

  async finalConsensusCheck(
    artifactType: SDDArtifactType,
    content: string,
  ): Promise<{ approved: boolean; results: ReviewResult[] }> {
    const [modelA, modelB] = this.config.models;
    const reviewerA = this.reviewers.get(modelA);
    const reviewerB = this.reviewers.get(modelB);

    if (!reviewerA || !reviewerB) {
      throw new Error(
        `Both reviewers must be registered for consensus check. Missing: ${[
          !reviewerA ? modelA : '',
          !reviewerB ? modelB : '',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }

    // Run both models in parallel
    const [resultA, resultB] = await Promise.all([
      reviewerA(artifactType, content, []),
      reviewerB(artifactType, content, []),
    ]);

    const results: ReviewResult[] = [
      { ...resultA, model: modelA, round: 0 },
      { ...resultB, model: modelB, round: 0 },
    ];

    return {
      approved: resultA.pass && resultB.pass,
      results,
    };
  }

  canProceedToImplementation(): boolean {
    return this.config.artifactTypes.every((type) =>
      this.history.some((r) => r.artifact === type && r.finalStatus === 'approved'),
    );
  }

  getHistory(): ReviewOrchestrationResult[] {
    return [...this.history];
  }

  getSummary(): {
    totalRounds: number;
    issuesFound: number;
    issuesResolved: number;
    approvedArtifacts: string[];
  } {
    let totalRounds = 0;
    let issuesFound = 0;
    const approvedArtifacts: string[] = [];

    for (const result of this.history) {
      totalRounds += result.totalRounds;
      for (const round of result.rounds) {
        for (const review of round.reviews) {
          issuesFound += review.issues.length;
        }
      }
      if (result.finalStatus === 'approved') {
        approvedArtifacts.push(result.artifact);
      }
    }

    // Issues resolved = issues from non-final rounds (issues that were addressed before consensus)
    let issuesInFinalRound = 0;
    for (const result of this.history) {
      if (result.rounds.length > 0) {
        const lastRound = result.rounds[result.rounds.length - 1];
        for (const review of lastRound.reviews) {
          issuesInFinalRound += review.issues.length;
        }
      }
    }
    const issuesResolved = issuesFound - issuesInFinalRound;

    return { totalRounds, issuesFound, issuesResolved, approvedArtifacts };
  }
}

// ── Factory ──

export function createReviewOrchestrator(config?: Partial<ReviewConfig>): ReviewOrchestrator {
  return new ReviewOrchestrator(config);
}
