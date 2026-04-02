/**
 * Balance Rule Engine (90/10 rule)
 *
 * Enforces the 90/10 governance rule: 90% of code follows
 * automated rules, 10% requires human judgment.
 *
 * @module policy/balance-rule
 * @see DES-GOV-001 — BalanceRuleEngine
 */

export interface BalanceMetrics {
  totalItems: number;
  automatedItems: number;
  manualItems: number;
  ratio: number;
  compliant: boolean;
}

export interface BalanceRuleConfig {
  automatedThreshold: number;
  warningThreshold: number;
}

export const DEFAULT_BALANCE_CONFIG: BalanceRuleConfig = {
  automatedThreshold: 0.90,
  warningThreshold: 0.85,
};

export class BalanceRuleEngine {
  private config: BalanceRuleConfig;

  constructor(config?: Partial<BalanceRuleConfig>) {
    this.config = { ...DEFAULT_BALANCE_CONFIG, ...config };
  }

  evaluate(automated: number, manual: number): BalanceMetrics {
    const total = automated + manual;
    if (total === 0) {
      return { totalItems: 0, automatedItems: 0, manualItems: 0, ratio: 1.0, compliant: true };
    }

    const ratio = automated / total;
    return {
      totalItems: total,
      automatedItems: automated,
      manualItems: manual,
      ratio,
      compliant: ratio >= this.config.automatedThreshold,
    };
  }

  isWarning(metrics: BalanceMetrics): boolean {
    return metrics.ratio < this.config.automatedThreshold && metrics.ratio >= this.config.warningThreshold;
  }

  isCritical(metrics: BalanceMetrics): boolean {
    return metrics.ratio < this.config.warningThreshold;
  }

  getSuggestion(metrics: BalanceMetrics): string | null {
    if (metrics.compliant) {
      return null;
    }
    const needed = Math.ceil(
      (this.config.automatedThreshold * metrics.totalItems - metrics.automatedItems) /
      (1 - this.config.automatedThreshold),
    );
    return `Add ${needed} more automated items or reduce manual items to achieve ${this.config.automatedThreshold * 100}% automation.`;
  }
}
