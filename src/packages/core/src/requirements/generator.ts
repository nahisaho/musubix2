/**
 * Requirements Document Generator — Generate EARS-compliant requirements specs
 *
 * Converts a RequirementsContext (gathered by the interviewer) into a
 * structured, EARS-formatted requirements specification document.
 */

import type { EARSPattern, GeneratedRequirement } from './index.js';
import type { RequirementsContext, FeatureInput } from './interviewer.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeneratedRequirementsDoc {
  title: string;
  markdown: string;
  requirements: GeneratedRequirement[];
  metadata: {
    generatedAt: Date;
    context: RequirementsContext;
    requirementCount: number;
    earsCompliance: number;
  };
}

// ─── Generator Class ────────────────────────────────────────────────────────

export class RequirementsDocGenerator {
  private counter = 0;

  /**
   * Generate a complete requirements specification from gathered context
   */
  generate(context: RequirementsContext): GeneratedRequirementsDoc {
    this.counter = 0;
    const requirements: GeneratedRequirement[] = [];

    // 1. Functional requirements from features
    for (const feature of context.features ?? []) {
      requirements.push(this.featureToRequirement(feature));
    }

    // 2. Non-functional requirements
    if (context.performance) {
      requirements.push(this.nfrToRequirement('performance', context.performance));
    }
    if (context.security) {
      requirements.push(this.nfrToRequirement('security', context.security));
    }
    if (context.scalability) {
      requirements.push(this.nfrToRequirement('scalability', context.scalability));
    }
    if (context.availability) {
      requirements.push(this.nfrToRequirement('availability', context.availability));
    }

    // 3. Constraint requirements
    for (const constraint of context.constraints ?? []) {
      requirements.push(this.constraintToRequirement(constraint));
    }

    // 4. Integration requirements
    for (const integration of context.integrations ?? []) {
      requirements.push(this.integrationToRequirement(integration));
    }

    const title = `${context.projectName ?? 'Untitled'} — 要件仕様書`;
    const markdown = this.formatMarkdown(context, requirements);
    const earsCount = requirements.filter((r) => r.earsText.includes('SHALL')).length;
    const earsCompliance = requirements.length > 0
      ? Math.round((earsCount / requirements.length) * 100)
      : 0;

    return {
      title,
      markdown,
      requirements,
      metadata: {
        generatedAt: new Date(),
        context,
        requirementCount: requirements.length,
        earsCompliance,
      },
    };
  }

  private nextId(): string {
    this.counter++;
    return `REQ-GEN-${String(this.counter).padStart(3, '0')}`;
  }

  private featureToRequirement(feature: FeatureInput): GeneratedRequirement {
    const id = this.nextId();
    const pattern = this.detectPattern(feature);
    const earsText = this.buildEARSText(pattern, feature.name, feature.description);
    const acceptanceCriteria = [
      `- [ ] ${feature.name} が正常に動作すること`,
      `- [ ] エラー時に適切なメッセージが表示されること`,
      '- [ ] テストが作成されていること',
    ];
    const markdown = this.formatReqMarkdown(id, feature.name, earsText, pattern, acceptanceCriteria, feature.priority);

    return { id, earsText, pattern, acceptanceCriteria, markdown };
  }

  private nfrToRequirement(category: string, description: string): GeneratedRequirement {
    const id = this.nextId();
    const labels: Record<string, string> = {
      performance: 'パフォーマンス',
      security: 'セキュリティ',
      scalability: 'スケーラビリティ',
      availability: '可用性',
    };
    const name = labels[category] ?? category;
    const pattern: EARSPattern = 'ubiquitous';
    const earsText = `The system SHALL satisfy ${name} requirement: ${description}.`;
    const acceptanceCriteria = [
      `- [ ] ${name}要件（${description}）を満たすこと`,
      '- [ ] 測定・検証が可能であること',
    ];
    const markdown = this.formatReqMarkdown(id, `${name}要件`, earsText, pattern, acceptanceCriteria);

    return { id, earsText, pattern, acceptanceCriteria, markdown };
  }

  private constraintToRequirement(constraint: string): GeneratedRequirement {
    const id = this.nextId();
    const pattern: EARSPattern = 'ubiquitous';
    const earsText = `The system SHALL comply with constraint: ${constraint}.`;
    const acceptanceCriteria = [
      `- [ ] 制約事項（${constraint}）に準拠すること`,
    ];
    const markdown = this.formatReqMarkdown(id, `制約: ${constraint}`, earsText, pattern, acceptanceCriteria);

    return { id, earsText, pattern, acceptanceCriteria, markdown };
  }

  private integrationToRequirement(integration: string): GeneratedRequirement {
    const id = this.nextId();
    const pattern: EARSPattern = 'event-driven';
    const earsText = `WHEN the system interfaces with ${integration}, the system SHALL exchange data correctly.`;
    const acceptanceCriteria = [
      `- [ ] ${integration} との連携が正常に動作すること`,
      `- [ ] ${integration} 障害時にエラーハンドリングが行われること`,
    ];
    const markdown = this.formatReqMarkdown(id, `外部連携: ${integration}`, earsText, pattern, acceptanceCriteria);

    return { id, earsText, pattern, acceptanceCriteria, markdown };
  }

  private detectPattern(feature: FeatureInput): EARSPattern {
    if (feature.earsPattern) {
      return feature.earsPattern as EARSPattern;
    }
    const text = `${feature.name} ${feature.description}`.toLowerCase();

    if (/\b(when|event|trigger|イベント|トリガー)\b/.test(text)) return 'event-driven';
    if (/\b(while|state|状態|モード)\b/.test(text)) return 'state-driven';
    if (/\b(not|禁止|しない|制限|error|エラー)\b/.test(text)) return 'unwanted';
    if (/\b(if|optional|オプション|有効)\b/.test(text)) return 'optional';
    return 'ubiquitous';
  }

  private buildEARSText(pattern: EARSPattern, name: string, description: string): string {
    const action = description || name;
    switch (pattern) {
      case 'ubiquitous':
        return `The system SHALL provide ${action}.`;
      case 'event-driven':
        return `WHEN ${name} is triggered, the system SHALL ${action}.`;
      case 'state-driven':
        return `WHILE the relevant state holds, the system SHALL ${action}.`;
      case 'unwanted':
        return `The system SHALL NOT allow ${action} without proper handling.`;
      case 'optional':
        return `WHERE ${name} is enabled, the system SHALL ${action}.`;
      case 'complex':
        return `WHILE the condition holds, WHEN ${name} occurs, the system SHALL ${action}.`;
    }
  }

  private formatReqMarkdown(
    id: string,
    name: string,
    earsText: string,
    pattern: EARSPattern,
    criteria: string[],
    priority?: 'P0' | 'P1' | 'P2',
  ): string {
    const lines = [
      `### ${id}: ${name}`,
      '',
      `**種別**: ${pattern.toUpperCase()}`,
      `**優先度**: ${priority ?? 'P1'}`,
      '',
      '**要件**:',
      earsText,
      '',
      '**受入基準**:',
      ...criteria,
    ];
    return lines.join('\n');
  }

  private formatMarkdown(context: RequirementsContext, requirements: GeneratedRequirement[]): string {
    const now = new Date().toISOString().slice(0, 10);
    const projectName = context.projectName ?? 'Untitled';
    const sections: string[] = [];

    // Header
    sections.push(`# ${projectName} — 要件仕様書`);
    sections.push('');
    sections.push(`生成日: ${now}`);
    sections.push('');

    // 1. Overview
    sections.push('## 1. 概要');
    sections.push('');
    sections.push(context.projectDescription ?? '（説明なし）');
    sections.push('');

    // 2. Scope
    sections.push('## 2. スコープ');
    sections.push('');
    if (context.projectDomain) {
      sections.push(`**種別**: ${context.projectDomain}`);
      sections.push('');
    }
    if (context.targetUsers && context.targetUsers.length > 0) {
      sections.push('**対象ユーザー**:');
      for (const user of context.targetUsers) {
        sections.push(`- ${user}`);
      }
      sections.push('');
    }

    // 3. Stakeholders
    if (context.stakeholders && context.stakeholders.length > 0) {
      sections.push('## 3. ステークホルダー');
      sections.push('');
      for (const sh of context.stakeholders) {
        sections.push(`- ${sh}`);
      }
      sections.push('');
    }

    // 4. Functional Requirements
    const funcReqs = requirements.filter((r) =>
      !r.id.includes('NFR') &&
      r.earsText.includes('SHALL') &&
      !r.earsText.includes('constraint') &&
      !r.earsText.includes('interfaces with'),
    );
    if (funcReqs.length > 0 || (context.features ?? []).length > 0) {
      sections.push('## 4. 機能要件');
      sections.push('');
      for (const req of funcReqs) {
        sections.push(req.markdown);
        sections.push('');
      }
    }

    // 5. Non-functional Requirements
    const nfrs = requirements.filter((r) =>
      r.earsText.includes('satisfy') || r.earsText.includes('パフォーマンス') || r.earsText.includes('セキュリティ'),
    );
    if (nfrs.length > 0) {
      sections.push('## 5. 非機能要件');
      sections.push('');
      for (const req of nfrs) {
        sections.push(req.markdown);
        sections.push('');
      }
    }

    // 6. Constraints
    const constraintReqs = requirements.filter((r) => r.earsText.includes('constraint'));
    if (constraintReqs.length > 0) {
      sections.push('## 6. 制約事項');
      sections.push('');
      for (const req of constraintReqs) {
        sections.push(req.markdown);
        sections.push('');
      }
    }

    // 7. External Integrations
    const integReqs = requirements.filter((r) => r.earsText.includes('interfaces with'));
    if (integReqs.length > 0) {
      sections.push('## 7. 外部連携');
      sections.push('');
      for (const req of integReqs) {
        sections.push(req.markdown);
        sections.push('');
      }
    }

    // 8. Tech Stack
    if (context.techStack && context.techStack.length > 0) {
      sections.push('## 8. 技術スタック');
      sections.push('');
      for (const tech of context.techStack) {
        sections.push(`- ${tech}`);
      }
      sections.push('');
    }

    // 9. Acceptance Criteria
    if (context.acceptanceCriteria && context.acceptanceCriteria.length > 0) {
      sections.push('## 9. 受入基準');
      sections.push('');
      for (const ac of context.acceptanceCriteria) {
        sections.push(`- [ ] ${ac}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createRequirementsDocGenerator(): RequirementsDocGenerator {
  return new RequirementsDocGenerator();
}
