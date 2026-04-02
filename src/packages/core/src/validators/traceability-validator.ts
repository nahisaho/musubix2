/**
 * TraceabilityValidator — DES-REQ-002
 * Validates coverage between requirements, design specs, and tests.
 */

export interface TraceLink {
  sourceId: string; // e.g., REQ-001
  targetId: string; // e.g., DES-001
  type: 'requirement-to-design' | 'design-to-test' | 'requirement-to-test';
}

export interface CoverageGap {
  id: string;
  type: 'untested' | 'undesigned' | 'orphaned-test' | 'orphaned-design';
  message: string;
}

export interface TraceabilityCoverageReport {
  totalRequirements: number;
  coveredRequirements: number;
  coveragePercent: number;
  gaps: CoverageGap[];
  links: TraceLink[];
}

export class TraceabilityValidator {
  /**
   * Validate traceability coverage.
   * @param requirementIds - list of requirement IDs (e.g., ['REQ-001', 'REQ-002'])
   * @param designIds - list of design spec IDs (e.g., ['DES-001', 'DES-002'])
   * @param testIds - list of test IDs (e.g., ['TEST-001'])
   * @param links - existing trace links between them
   */
  validateCoverage(
    requirementIds: string[],
    designIds: string[],
    testIds: string[],
    links: TraceLink[],
  ): TraceabilityCoverageReport {
    const gaps: CoverageGap[] = [];

    // Check requirements with no design link
    const reqsWithDesign = new Set(
      links.filter((l) => l.type === 'requirement-to-design').map((l) => l.sourceId),
    );
    for (const reqId of requirementIds) {
      if (!reqsWithDesign.has(reqId)) {
        gaps.push({
          id: reqId,
          type: 'undesigned',
          message: `Requirement ${reqId} has no linked design specification`,
        });
      }
    }

    // Check requirements with no test link (direct or through design)
    const reqsWithTest = new Set(
      links.filter((l) => l.type === 'requirement-to-test').map((l) => l.sourceId),
    );
    const designsWithTest = new Set(
      links.filter((l) => l.type === 'design-to-test').map((l) => l.sourceId),
    );
    // Requirements covered through design chain
    const reqsWithDesignThatHasTest = new Set(
      links
        .filter((l) => l.type === 'requirement-to-design' && designsWithTest.has(l.targetId))
        .map((l) => l.sourceId),
    );

    for (const reqId of requirementIds) {
      if (!reqsWithTest.has(reqId) && !reqsWithDesignThatHasTest.has(reqId)) {
        gaps.push({
          id: reqId,
          type: 'untested',
          message: `Requirement ${reqId} has no linked test (direct or through design)`,
        });
      }
    }

    // Check orphaned tests (test IDs not linked to any requirement or design)
    const linkedTestTargets = new Set(
      links
        .filter((l) => l.type === 'requirement-to-test' || l.type === 'design-to-test')
        .map((l) => l.targetId),
    );
    for (const testId of testIds) {
      if (!linkedTestTargets.has(testId)) {
        gaps.push({
          id: testId,
          type: 'orphaned-test',
          message: `Test ${testId} is not linked to any requirement or design`,
        });
      }
    }

    // Check orphaned designs
    const linkedDesignTargets = new Set(
      links.filter((l) => l.type === 'requirement-to-design').map((l) => l.targetId),
    );
    for (const desId of designIds) {
      if (!linkedDesignTargets.has(desId)) {
        gaps.push({
          id: desId,
          type: 'orphaned-design',
          message: `Design ${desId} is not linked to any requirement`,
        });
      }
    }

    const coveredRequirements = requirementIds.filter(
      (r) => reqsWithDesign.has(r) && (reqsWithTest.has(r) || reqsWithDesignThatHasTest.has(r)),
    ).length;

    return {
      totalRequirements: requirementIds.length,
      coveredRequirements,
      coveragePercent:
        requirementIds.length > 0
          ? Math.round((coveredRequirements / requirementIds.length) * 100)
          : 100,
      gaps,
      links,
    };
  }
}

export function createTraceabilityValidator(): TraceabilityValidator {
  return new TraceabilityValidator();
}
