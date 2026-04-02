// DES-AGT-002: Delegation Engine
// REQ-AGT-002 traceability

import { SemanticRouter } from './index.js';

// ── Types ──

export type DelegationStrategy = 'round-robin' | 'best-match' | 'load-balanced';

export interface DelegationRequest {
  query: string;
  requiredDomain?: string;
  priority?: number;
}

export interface DelegationResponse {
  expertId: string;
  confidence: number;
  delegatedAt: Date;
}

// ── DelegationEngine ──

export class DelegationEngine {
  private router: SemanticRouter;
  private strategy: DelegationStrategy;
  private history: DelegationResponse[] = [];
  private roundRobinIndex = 0;

  constructor(router: SemanticRouter, strategy: DelegationStrategy = 'best-match') {
    this.router = router;
    this.strategy = strategy;
  }

  delegate(request: DelegationRequest): DelegationResponse | null {
    const candidates = this.router.route(request.query);

    // Filter by required domain if specified
    const filtered = request.requiredDomain
      ? candidates.filter((c) => c.domain === request.requiredDomain)
      : candidates;

    if (filtered.length === 0) return null;

    let chosen: typeof filtered[number];

    switch (this.strategy) {
      case 'round-robin': {
        const idx = this.roundRobinIndex % filtered.length;
        chosen = filtered[idx];
        this.roundRobinIndex++;
        break;
      }
      case 'load-balanced': {
        // Least-recently-delegated strategy
        const recentIds = new Set(this.history.slice(-10).map((h) => h.expertId));
        const notRecent = filtered.filter((c) => !recentIds.has(c.expertId));
        chosen = notRecent.length > 0 ? notRecent[0] : filtered[0];
        break;
      }
      case 'best-match':
      default:
        chosen = filtered[0]; // Already sorted by confidence
        break;
    }

    const response: DelegationResponse = {
      expertId: chosen.expertId,
      confidence: chosen.confidence,
      delegatedAt: new Date(),
    };

    this.history.push(response);
    return response;
  }

  delegateBatch(requests: DelegationRequest[]): DelegationResponse[] {
    const responses: DelegationResponse[] = [];
    for (const req of requests) {
      const result = this.delegate(req);
      if (result) responses.push(result);
    }
    return responses;
  }

  getStrategy(): DelegationStrategy {
    return this.strategy;
  }

  setStrategy(strategy: DelegationStrategy): void {
    this.strategy = strategy;
  }

  getHistory(): DelegationResponse[] {
    return [...this.history];
  }
}

// ── Factory ──

export function createDelegationEngine(router: SemanticRouter): DelegationEngine {
  return new DelegationEngine(router);
}
