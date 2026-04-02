// DES-AGT-002: Expert Delegation
// REQ-AGT-002 traceability

// ── Types ──

export type ExpertDomain =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'security'
  | 'testing'
  | 'devops'
  | 'architecture'
  | 'documentation';

export interface TriggerPattern {
  keywords: string[];
  domain: ExpertDomain;
  priority: number;
}

export interface Expert {
  id: string;
  name: string;
  domain: ExpertDomain;
  capabilities: string[];
  triggerPatterns: TriggerPattern[];
}

export interface DelegationResult {
  expertId: string;
  domain: ExpertDomain;
  confidence: number;
  matchedTriggers: string[];
}

// ── SemanticRouter ──

export class SemanticRouter {
  private experts: Expert[] = [];

  registerExpert(expert: Expert): void {
    this.experts.push(expert);
  }

  getExpert(id: string): Expert | undefined {
    return this.experts.find((e) => e.id === id);
  }

  listExperts(domain?: ExpertDomain): Expert[] {
    if (domain === undefined) return [...this.experts];
    return this.experts.filter((e) => e.domain === domain);
  }

  route(query: string): DelegationResult[] {
    const lowerQuery = query.toLowerCase();
    const results: DelegationResult[] = [];

    for (const expert of this.experts) {
      const matchedTriggers: string[] = [];
      let totalKeywords = 0;
      let matchedCount = 0;

      for (const pattern of expert.triggerPatterns) {
        for (const keyword of pattern.keywords) {
          totalKeywords++;
          if (lowerQuery.includes(keyword.toLowerCase())) {
            matchedCount++;
            matchedTriggers.push(keyword);
          }
        }
      }

      if (matchedCount > 0 && totalKeywords > 0) {
        const maxPriority = Math.max(...expert.triggerPatterns.map((p) => p.priority));
        const confidence = (matchedCount / totalKeywords) * (maxPriority / 10);

        results.push({
          expertId: expert.id,
          domain: expert.domain,
          confidence: Math.min(confidence, 1),
          matchedTriggers,
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  getBestMatch(query: string): DelegationResult | null {
    const results = this.route(query);
    return results.length > 0 ? results[0] : null;
  }
}

// ── Factory ──

export function createSemanticRouter(): SemanticRouter {
  return new SemanticRouter();
}
