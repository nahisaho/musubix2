/**
 * DES-SKL-004: Agent-Skill Routing
 * Capability-based skill resolution and routing layer.
 */

// --- Types ---

export interface SkillCapability {
  skillId: string;
  capabilities: string[];
  priority: number;
  domains: string[];
}

export interface RoutingResult {
  skillId: string;
  confidence: number;
  matchedCapabilities: string[];
}

// --- CapabilityMatcher ---

export class CapabilityMatcher {
  match(query: string, capabilities: SkillCapability[]): RoutingResult[] {
    const queryTokens = this._tokenize(query);
    const results: RoutingResult[] = [];

    for (const cap of capabilities) {
      const matched: string[] = [];
      let score = 0;

      for (const capability of cap.capabilities) {
        const capTokens = this._tokenize(capability);
        const overlap = capTokens.filter((t) => queryTokens.includes(t));
        if (overlap.length > 0) {
          matched.push(capability);
          score += overlap.length / Math.max(capTokens.length, 1);
        }
      }

      for (const domain of cap.domains) {
        const domTokens = this._tokenize(domain);
        const overlap = domTokens.filter((t) => queryTokens.includes(t));
        if (overlap.length > 0) {
          score += overlap.length / Math.max(domTokens.length, 1) * 0.5;
        }
      }

      if (matched.length > 0 || score > 0) {
        // Normalize confidence to 0-1 range, factoring priority
        const confidence = Math.min(
          1,
          (score / Math.max(cap.capabilities.length, 1)) * (1 + cap.priority * 0.1),
        );
        results.push({ skillId: cap.skillId, confidence, matchedCapabilities: matched });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\-_.,;:]+/)
      .filter((t) => t.length > 0);
  }
}

// --- SkillRouter ---

export class SkillRouter {
  private capabilities: SkillCapability[] = [];
  private matcher = new CapabilityMatcher();

  register(capability: SkillCapability): void {
    const existing = this.capabilities.findIndex((c) => c.skillId === capability.skillId);
    if (existing >= 0) {
      this.capabilities[existing] = capability;
    } else {
      this.capabilities.push(capability);
    }
  }

  unregister(skillId: string): boolean {
    const index = this.capabilities.findIndex((c) => c.skillId === skillId);
    if (index >= 0) {
      this.capabilities.splice(index, 1);
      return true;
    }
    return false;
  }

  route(query: string): RoutingResult | null {
    const results = this.matcher.match(query, this.capabilities);
    return results.length > 0 ? results[0] : null;
  }

  routeAll(query: string): RoutingResult[] {
    return this.matcher.match(query, this.capabilities);
  }

  getCapabilities(): SkillCapability[] {
    return [...this.capabilities];
  }
}
