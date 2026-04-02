/**
 * Interactive Requirements Creation — DES-REQ-003
 * RequirementWizard and AcceptanceCriteriaGenerator
 */

export type EARSPattern = 'ubiquitous' | 'event-driven' | 'state-driven' | 'unwanted' | 'optional' | 'complex';

export interface WizardStep {
  id: string;
  prompt: string;
  validate: (input: string) => boolean;
  transform: (input: string) => Record<string, unknown>;
}

export interface GeneratedRequirement {
  id: string;
  earsText: string;
  pattern: EARSPattern;
  acceptanceCriteria: string[];
  markdown: string;
}

export interface ProjectContext {
  projectName: string;
  domain?: string;
  existingRequirements?: string[];
}

// Standard wizard steps
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'feature-name',
    prompt: '機能名を入力してください:',
    validate: (input) => input.trim().length > 0,
    transform: (input) => ({ featureName: input.trim() }),
  },
  {
    id: 'pattern',
    prompt: 'EARSパターンを選択 (ubiquitous/event-driven/state-driven/unwanted/optional/complex):',
    validate: (input) => ['ubiquitous', 'event-driven', 'state-driven', 'unwanted', 'optional', 'complex'].includes(input.trim()),
    transform: (input) => ({ pattern: input.trim() }),
  },
  {
    id: 'trigger',
    prompt: 'トリガー条件 (event-driven/complexの場合):',
    validate: () => true,  // optional
    transform: (input) => ({ trigger: input.trim() || undefined }),
  },
  {
    id: 'condition',
    prompt: '前提条件 (state-driven/complexの場合):',
    validate: () => true,  // optional
    transform: (input) => ({ condition: input.trim() || undefined }),
  },
  {
    id: 'action',
    prompt: 'システムが行うべき動作:',
    validate: (input) => input.trim().length > 0,
    transform: (input) => ({ action: input.trim() }),
  },
];

export class RequirementWizard {
  private steps: WizardStep[];
  private counter: number = 0;

  constructor(steps?: WizardStep[]) {
    this.steps = steps ?? [...WIZARD_STEPS];
  }

  getSteps(): WizardStep[] {
    return [...this.steps];
  }

  /**
   * Generate a requirement from collected wizard answers.
   * In interactive mode, this would be called after collecting all answers.
   */
  generate(answers: Record<string, string>): GeneratedRequirement {
    const featureName = answers['feature-name'] ?? 'Feature';
    const pattern = (answers['pattern'] ?? 'ubiquitous') as EARSPattern;
    const trigger = answers['trigger'];
    const condition = answers['condition'];
    const action = answers['action'] ?? 'perform the action';

    this.counter++;
    const id = `REQ-GEN-${String(this.counter).padStart(3, '0')}`;
    
    const earsText = this.buildEARSText(pattern, trigger, condition, action);
    const acceptanceCriteria = this.generateAcceptanceCriteria(pattern, action, trigger, condition);
    
    const markdown = this.formatMarkdown(id, featureName, earsText, pattern, acceptanceCriteria);

    return { id, earsText, pattern, acceptanceCriteria, markdown };
  }

  private buildEARSText(pattern: EARSPattern, trigger?: string, condition?: string, action?: string): string {
    const act = action ?? 'perform the action';
    switch (pattern) {
      case 'ubiquitous':
        return `The system SHALL ${act}.`;
      case 'event-driven':
        return `WHEN ${trigger ?? 'the event occurs'}, the system SHALL ${act}.`;
      case 'state-driven':
        return `WHILE ${condition ?? 'the condition holds'}, the system SHALL ${act}.`;
      case 'unwanted':
        return `IF ${condition ?? 'an error occurs'}, THEN the system SHALL ${act}.`;
      case 'optional':
        return `WHERE ${trigger ?? 'the feature is enabled'}, the system SHALL ${act}.`;
      case 'complex':
        return `WHILE ${condition ?? 'the condition holds'}, WHEN ${trigger ?? 'the event occurs'}, the system SHALL ${act}.`;
    }
  }

  private generateAcceptanceCriteria(_pattern: EARSPattern, action: string, trigger?: string, condition?: string): string[] {
    const criteria: string[] = [];
    criteria.push(`- [ ] ${action} が正常に実行されること`);
    if (trigger) criteria.push(`- [ ] ${trigger} の発生時にのみ動作すること`);
    if (condition) criteria.push(`- [ ] ${condition} の状態でのみ動作すること`);
    criteria.push(`- [ ] エラー時に適切なメッセージが表示されること`);
    return criteria;
  }

  private formatMarkdown(id: string, name: string, earsText: string, pattern: EARSPattern, criteria: string[]): string {
    return [
      `### ${id}: ${name}`,
      '',
      earsText,
      '',
      `**パターン**: ${pattern}`,
      '',
      '**受入基準**:',
      ...criteria,
    ].join('\n');
  }
}

export class AcceptanceCriteriaGenerator {
  generate(requirementText: string, context: ProjectContext): string[] {
    const criteria: string[] = [];
    
    // Basic criteria from requirement text
    criteria.push(`- [ ] ${context.projectName}: 要件を満たす動作が実装されていること`);
    
    // Pattern-based criteria
    if (requirementText.includes('SHALL')) {
      criteria.push('- [ ] SHALL句の動作が必ず実行されること');
    }
    if (requirementText.includes('WHEN')) {
      criteria.push('- [ ] トリガー条件が正しく検出されること');
    }
    if (requirementText.includes('WHILE')) {
      criteria.push('- [ ] 状態条件が正しく評価されること');
    }
    if (requirementText.includes('IF')) {
      criteria.push('- [ ] 異常系の処理が適切であること');
    }
    
    // Standard criteria
    criteria.push('- [ ] テストが作成されていること');
    criteria.push('- [ ] ドキュメントが更新されていること');
    
    return criteria;
  }
}

export function createRequirementWizard(): RequirementWizard {
  return new RequirementWizard();
}

export function createAcceptanceCriteriaGenerator(): AcceptanceCriteriaGenerator {
  return new AcceptanceCriteriaGenerator();
}
