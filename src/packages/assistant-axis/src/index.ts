// DES-AGT-005: Persona Stabilization
// REQ-AGT-005 traceability

// ── Types ──

export type DomainCategory = 'technical' | 'creative' | 'analytical' | 'operational' | 'unknown';

export type DriftLevel = 'none' | 'minor' | 'moderate' | 'severe';

export interface DriftAnalysis {
  level: DriftLevel;
  originalDomain: DomainCategory;
  currentDomain: DomainCategory;
  confidence: number;
  message: string;
}

export interface IdentityProfile {
  name: string;
  primaryDomain: DomainCategory;
  boundaries: string[];
  strengths: string[];
}

// ── Keyword maps ──

const DOMAIN_KEYWORDS: Record<Exclude<DomainCategory, 'unknown'>, string[]> = {
  technical: [
    'code',
    'deploy',
    'api',
    'bug',
    'test',
    'function',
    'class',
    'module',
    'compile',
    'debug',
  ],
  creative: [
    'design',
    'ui',
    'ux',
    'color',
    'layout',
    'style',
    'theme',
    'visual',
    'animation',
    'graphic',
  ],
  analytical: [
    'analyze',
    'data',
    'metrics',
    'report',
    'statistics',
    'trend',
    'insight',
    'measure',
    'benchmark',
    'chart',
  ],
  operational: [
    'deploy',
    'ci',
    'pipeline',
    'server',
    'infrastructure',
    'monitor',
    'scale',
    'provision',
    'container',
    'cluster',
  ],
};

const RELATED_DOMAINS: Record<DomainCategory, DomainCategory[]> = {
  technical: ['analytical', 'operational'],
  creative: ['analytical'],
  analytical: ['technical', 'operational'],
  operational: ['technical', 'analytical'],
  unknown: [],
};

// ── DomainClassifier ──

export class DomainClassifier {
  classify(text: string): { domain: DomainCategory; confidence: number } {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let matched = 0;
      for (const kw of keywords) {
        if (lowerText.includes(kw)) {
          matched++;
        }
      }
      if (matched > 0) {
        scores[domain] = matched / keywords.length;
      }
    }

    const entries = Object.entries(scores).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) {
      return { domain: 'unknown', confidence: 0 };
    }

    const [topDomain, topScore] = entries[0];
    return { domain: topDomain as DomainCategory, confidence: topScore };
  }

  classifyBatch(texts: string[]): Array<{ domain: DomainCategory; confidence: number }> {
    return texts.map((t) => this.classify(t));
  }
}

// ── DriftAnalyzer ──

export class DriftAnalyzer {
  private profile: IdentityProfile;
  private classifier: DomainClassifier;

  constructor(profile: IdentityProfile) {
    this.profile = profile;
    this.classifier = new DomainClassifier();
  }

  analyze(conversationHistory: string[]): DriftAnalysis {
    if (conversationHistory.length === 0) {
      return {
        level: 'none',
        originalDomain: this.profile.primaryDomain,
        currentDomain: this.profile.primaryDomain,
        confidence: 1,
        message: 'No conversation history to analyze.',
      };
    }

    const classifications = this.classifier.classifyBatch(conversationHistory);
    const domainCounts = new Map<DomainCategory, number>();

    for (const c of classifications) {
      domainCounts.set(c.domain, (domainCounts.get(c.domain) ?? 0) + 1);
    }

    // Find majority domain
    let majorityDomain: DomainCategory = 'unknown';
    let maxCount = 0;
    for (const [domain, count] of domainCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        majorityDomain = domain;
      }
    }

    const uniqueDomains = new Set(
      classifications.map((c) => c.domain).filter((d) => d !== 'unknown'),
    );

    const primary = this.profile.primaryDomain;
    const avgConfidence =
      classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;

    if (majorityDomain === primary) {
      return {
        level: 'none',
        originalDomain: primary,
        currentDomain: majorityDomain,
        confidence: avgConfidence,
        message: 'Conversation is aligned with primary domain.',
      };
    }

    const relatedDomains = RELATED_DOMAINS[primary] ?? [];
    if (relatedDomains.includes(majorityDomain)) {
      return {
        level: 'minor',
        originalDomain: primary,
        currentDomain: majorityDomain,
        confidence: avgConfidence,
        message: `Conversation drifted to related domain: ${majorityDomain}.`,
      };
    }

    if (uniqueDomains.size >= 3) {
      return {
        level: 'severe',
        originalDomain: primary,
        currentDomain: majorityDomain,
        confidence: avgConfidence,
        message: `Conversation fragmented across ${uniqueDomains.size} domains.`,
      };
    }

    return {
      level: 'moderate',
      originalDomain: primary,
      currentDomain: majorityDomain,
      confidence: avgConfidence,
      message: `Conversation drifted to unrelated domain: ${majorityDomain}.`,
    };
  }

  getProfile(): IdentityProfile {
    return this.profile;
  }
}

// ── IdentityManager ──

export class IdentityManager {
  private profiles: Map<string, IdentityProfile> = new Map();

  registerProfile(profile: IdentityProfile): void {
    this.profiles.set(profile.name, profile);
  }

  getProfile(name: string): IdentityProfile | undefined {
    return this.profiles.get(name);
  }

  listProfiles(): IdentityProfile[] {
    return Array.from(this.profiles.values());
  }

  createAnalyzer(profileName: string): DriftAnalyzer | null {
    const profile = this.profiles.get(profileName);
    if (!profile) {
      return null;
    }
    return new DriftAnalyzer(profile);
  }
}

// ── Factories ──

export function createDomainClassifier(): DomainClassifier {
  return new DomainClassifier();
}

export function createIdentityManager(): IdentityManager {
  return new IdentityManager();
}
