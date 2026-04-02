/**
 * Reasoning Chain Recorder & Explanation Generator
 *
 * Records step-by-step reasoning chains and generates
 * human-readable explanations for SDD decisions.
 *
 * @module explanation
 * @see DES-EXP-001 — 推論説明生成
 */

export interface ReasoningStep {
  id: string;
  description: string;
  evidence: string[];
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ReasoningChain {
  id: string;
  title: string;
  steps: ReasoningStep[];
  conclusion: string;
  overallConfidence: number;
  createdAt: Date;
}

export interface ExplanationOptions {
  format?: 'text' | 'markdown' | 'json';
  includeEvidence?: boolean;
  includeConfidence?: boolean;
  locale?: 'ja' | 'en';
}

export class ReasoningChainRecorder {
  private chains: Map<string, ReasoningChain> = new Map();
  private activeChainId: string | null = null;
  private stepCounter = 0;

  startChain(title: string): string {
    const id = `chain-${Date.now()}-${++this.stepCounter}`;
    this.chains.set(id, {
      id,
      title,
      steps: [],
      conclusion: '',
      overallConfidence: 0,
      createdAt: new Date(),
    });
    this.activeChainId = id;
    return id;
  }

  addStep(
    description: string,
    evidence: string[],
    confidence: number,
    metadata?: Record<string, unknown>,
  ): ReasoningStep {
    if (!this.activeChainId) {
      throw new Error('No active reasoning chain. Call startChain() first.');
    }

    const chain = this.chains.get(this.activeChainId)!;
    const step: ReasoningStep = {
      id: `step-${++this.stepCounter}`,
      description,
      evidence,
      confidence: Math.max(0, Math.min(1, confidence)),
      timestamp: new Date(),
      metadata,
    };

    chain.steps.push(step);
    this.updateConfidence(chain);
    return step;
  }

  conclude(conclusion: string): ReasoningChain {
    if (!this.activeChainId) {
      throw new Error('No active reasoning chain.');
    }

    const chain = this.chains.get(this.activeChainId)!;
    chain.conclusion = conclusion;
    this.activeChainId = null;
    return chain;
  }

  getChain(id: string): ReasoningChain | undefined {
    return this.chains.get(id);
  }

  getAllChains(): ReasoningChain[] {
    return [...this.chains.values()];
  }

  private updateConfidence(chain: ReasoningChain): void {
    if (chain.steps.length === 0) {
      chain.overallConfidence = 0;
      return;
    }
    const sum = chain.steps.reduce((acc, s) => acc + s.confidence, 0);
    chain.overallConfidence = sum / chain.steps.length;
  }
}

export class ExplanationGenerator {
  generate(chain: ReasoningChain, options?: ExplanationOptions): string {
    const format = options?.format ?? 'markdown';
    const includeEvidence = options?.includeEvidence ?? true;
    const includeConfidence = options?.includeConfidence ?? true;

    switch (format) {
      case 'json':
        return JSON.stringify(chain, null, 2);
      case 'text':
        return this.generateText(chain, includeEvidence, includeConfidence);
      case 'markdown':
      default:
        return this.generateMarkdown(chain, includeEvidence, includeConfidence);
    }
  }

  private generateMarkdown(
    chain: ReasoningChain,
    includeEvidence: boolean,
    includeConfidence: boolean,
  ): string {
    const lines: string[] = [];

    lines.push(`# ${chain.title}`);
    lines.push('');

    if (includeConfidence) {
      lines.push(`**信頼度**: ${(chain.overallConfidence * 100).toFixed(1)}%`);
      lines.push('');
    }

    lines.push('## 推論ステップ');
    lines.push('');

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      lines.push(`### ${i + 1}. ${step.description}`);

      if (includeConfidence) {
        lines.push(`信頼度: ${(step.confidence * 100).toFixed(1)}%`);
      }

      if (includeEvidence && step.evidence.length > 0) {
        lines.push('');
        lines.push('根拠:');
        for (const e of step.evidence) {
          lines.push(`- ${e}`);
        }
      }

      lines.push('');
    }

    if (chain.conclusion) {
      lines.push('## 結論');
      lines.push('');
      lines.push(chain.conclusion);
    }

    return lines.join('\n');
  }

  private generateText(
    chain: ReasoningChain,
    includeEvidence: boolean,
    includeConfidence: boolean,
  ): string {
    const lines: string[] = [];

    lines.push(chain.title);
    lines.push('='.repeat(chain.title.length));
    lines.push('');

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      const conf = includeConfidence ? ` [${(step.confidence * 100).toFixed(0)}%]` : '';
      lines.push(`${i + 1}. ${step.description}${conf}`);

      if (includeEvidence && step.evidence.length > 0) {
        for (const e of step.evidence) {
          lines.push(`   → ${e}`);
        }
      }
    }

    if (chain.conclusion) {
      lines.push('');
      lines.push(`結論: ${chain.conclusion}`);
    }

    return lines.join('\n');
  }
}
