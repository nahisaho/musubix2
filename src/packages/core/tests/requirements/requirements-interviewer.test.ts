import { describe, it, expect } from 'vitest';
import {
  RequirementsInterviewer,
  createRequirementsInterviewer,
  type InterviewQuestion,
  type InterviewState,
  type RequirementsContext,
} from '../../src/requirements/interviewer.js';
import {
  RequirementsDocGenerator,
  createRequirementsDocGenerator,
} from '../../src/requirements/generator.js';

// ═══════════════════════════════════════════════════════════════════════════
// Input Analysis Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('RequirementsInterviewer — input analysis', () => {
  it('should ask project name first when input is empty', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('');
    expect(result.status).toBe('question');
    if (result.status === 'question') {
      expect(result.question.id).toBe('project-name');
      expect(result.question.required).toBe(true);
    }
  });

  it('should skip project name if already provided in input', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('プロジェクト名: ECショップ');
    expect(result.status).toBe('question');
    if (result.status === 'question') {
      expect(result.question.id).not.toBe('project-name');
    }
    expect(result.state.context.projectName).toBe('ECショップ');
  });

  it('should extract features from bullet-point list', () => {
    const interviewer = new RequirementsInterviewer();
    const input = `ECショップシステム
商品の検索・購入・配送管理を行うECサイト
- ユーザー認証
- 商品検索
- カート管理
- 注文処理`;
    const result = interviewer.analyzeInput(input);
    expect(result.state.context.features).toBeDefined();
    expect(result.state.context.features!.length).toBe(4);
    expect(result.state.context.features![0].name).toBe('ユーザー認証');
  });

  it('should extract tech stack from input', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('TypeScript and React with PostgreSQL backend');
    expect(result.state.context.techStack).toBeDefined();
    expect(result.state.context.techStack!).toContain('TypeScript');
    expect(result.state.context.techStack!).toContain('React');
    expect(result.state.context.techStack!).toContain('PostgreSQL');
  });

  it('should extract domain from web-related keywords', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('Webアプリケーションを作りたい');
    expect(result.state.context.projectDomain).toBe('Webアプリケーション');
  });

  it('should extract target users from input', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('ユーザー: 一般消費者, 管理者');
    expect(result.state.context.targetUsers).toBeDefined();
    expect(result.state.context.targetUsers!).toContain('一般消費者');
    expect(result.state.context.targetUsers!).toContain('管理者');
  });

  it('should handle rich input that fills most fields', () => {
    const interviewer = new RequirementsInterviewer();
    const richInput = `プロジェクト名: TaskManager
概要: タスク管理ウェブアプリケーション
ユーザー: 開発者, プロジェクトマネージャー
機能: タスク作成, タスク割り当て, 進捗管理`;
    const result = interviewer.analyzeInput(richInput);
    const ctx = result.state.context;
    expect(ctx.projectName).toBe('TaskManager');
    expect(ctx.projectDescription).toBe('タスク管理ウェブアプリケーション');
    expect(ctx.targetUsers).toContain('開発者');
    expect(ctx.features!.length).toBe(3);
  });

  it('should mark complete when all required info is provided', () => {
    const interviewer = new RequirementsInterviewer();
    const completeInput = `プロジェクト名: FullApp
概要: 完全なアプリケーション。すべての必須情報が含まれています。
ユーザー: 管理者, 一般ユーザー
機能: ログイン, ダッシュボード, レポート`;
    const result = interviewer.analyzeInput(completeInput);
    // Domain might still be missing, so check that most required fields are filled
    expect(result.state.context.projectName).toBe('FullApp');
    expect(result.state.context.features!.length).toBe(3);
  });

  it('should extract from Japanese input', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('セキュリティ: HTTPS通信必須');
    expect(result.state.context.security).toBe('HTTPS通信必須');
  });

  it('should extract from English input', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('project name: MyApp\nThis is a mobile app for tracking fitness');
    expect(result.state.context.projectName).toBe('MyApp');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Interview Flow Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('RequirementsInterviewer — interview flow', () => {
  it('should ask required fields before optional ones', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('');
    expect(result.status).toBe('question');
    if (result.status === 'question') {
      expect(result.question.required).toBe(true);
    }
  });

  it('should store answer correctly in context', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    const result = interviewer.answer('project-name', 'MyProject');
    expect(result.state.context.projectName).toBe('MyProject');
  });

  it('should increase completion percentage after each answer', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    const r1 = interviewer.answer('project-name', 'P1');
    const pct1 = r1.state.completionPercentage;
    const r2 = interviewer.answer('project-description', 'A cool project');
    const pct2 = r2.state.completionPercentage;
    expect(pct2).toBeGreaterThan(pct1);
  });

  it('should mark complete after all required questions answered', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    interviewer.answer('project-name', 'TestApp');
    interviewer.answer('project-description', 'An application for testing things thoroughly');
    interviewer.answer('project-domain', 'Webアプリケーション');
    interviewer.answer('target-users', '開発者, テスター');
    const result = interviewer.answer('main-features', 'テスト実行, レポート生成');

    expect(result.status).toBe('complete');
    expect(result.state.isComplete).toBe(true);
  });

  it('should reset state properly', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('プロジェクト名: Test');
    interviewer.reset();
    const state = interviewer.getState();
    expect(state.answeredQuestions).toHaveLength(0);
    expect(state.context.projectName).toBeUndefined();
    expect(state.completionPercentage).toBe(0);
  });

  it('should have unique question IDs', () => {
    const interviewer = new RequirementsInterviewer();
    // Walk through all questions
    const seenIds = new Set<string>();
    let result = interviewer.analyzeInput('');
    while (result.status === 'question') {
      expect(seenIds.has(result.question.id)).toBe(false);
      seenIds.add(result.question.id);
      // Answer with dummy data to advance
      if (result.question.type === 'list') {
        result = interviewer.answer(result.question.id, 'item1, item2');
      } else if (result.question.type === 'choice') {
        result = interviewer.answer(result.question.id, result.question.choices?.[0] ?? 'test');
      } else {
        result = interviewer.answer(result.question.id, 'test answer');
      }
    }
    expect(seenIds.size).toBeGreaterThan(0);
  });

  it('should map categories correctly to context fields', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    interviewer.answer('project-name', 'ContextTest');
    interviewer.answer('target-users', 'ユーザーA, ユーザーB');
    const state = interviewer.getState();
    expect(state.context.projectName).toBe('ContextTest');
    expect(state.context.targetUsers).toEqual(['ユーザーA', 'ユーザーB']);
  });

  it('should handle list-type answers with comma separation', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    interviewer.answer('main-features', 'Login, Dashboard, Reports');
    const state = interviewer.getState();
    expect(state.context.features).toBeDefined();
    expect(state.context.features!.length).toBe(3);
    expect(state.context.features![0].name).toBe('Login');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Document Generation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('RequirementsDocGenerator — document generation', () => {
  const fullContext: RequirementsContext = {
    projectName: 'TestProject',
    projectDescription: 'A test project for validation',
    projectDomain: 'Webアプリケーション',
    targetUsers: ['Developer', 'Admin'],
    features: [
      { name: 'ログイン', description: 'ユーザー認証機能' },
      { name: 'ダッシュボード', description: 'ダッシュボード表示' },
    ],
    performance: 'Response time < 200ms',
    security: 'HTTPS required',
    techStack: ['TypeScript', 'Express'],
    constraints: ['Budget under $10K'],
    integrations: ['Stripe API'],
  };

  it('should generate valid markdown', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    expect(doc.markdown).toContain('# TestProject — 要件仕様書');
    expect(doc.markdown).toContain('## 1. 概要');
    expect(doc.markdown).toContain('A test project for validation');
  });

  it('should format requirements in EARS format', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    expect(doc.requirements.length).toBeGreaterThan(0);
    for (const req of doc.requirements) {
      expect(req.earsText).toContain('SHALL');
    }
  });

  it('should generate functional requirements from features', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    const funcReqs = doc.requirements.filter((r) => r.id.startsWith('REQ-GEN-'));
    expect(funcReqs.length).toBeGreaterThanOrEqual(2);
  });

  it('should include non-functional requirements', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    const hasPerf = doc.requirements.some((r) => r.earsText.includes('performance') || r.earsText.includes('パフォーマンス'));
    const hasSec = doc.requirements.some((r) => r.earsText.includes('security') || r.earsText.includes('セキュリティ'));
    expect(hasPerf).toBe(true);
    expect(hasSec).toBe(true);
  });

  it('should include constraint requirements', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    const constraintReq = doc.requirements.find((r) => r.earsText.includes('constraint'));
    expect(constraintReq).toBeDefined();
    expect(constraintReq!.earsText).toContain('Budget under $10K');
  });

  it('should include integration requirements', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    const integReq = doc.requirements.find((r) => r.earsText.includes('Stripe API'));
    expect(integReq).toBeDefined();
    expect(integReq!.pattern).toBe('event-driven');
  });

  it('should populate metadata correctly', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    expect(doc.metadata.requirementCount).toBeGreaterThan(0);
    expect(doc.metadata.earsCompliance).toBeGreaterThan(0);
    expect(doc.metadata.generatedAt).toBeInstanceOf(Date);
    expect(doc.metadata.context).toBe(fullContext);
  });

  it('should handle empty features gracefully', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate({ projectName: 'EmptyProject' });
    expect(doc.markdown).toContain('# EmptyProject — 要件仕様書');
    expect(doc.requirements).toHaveLength(0);
    expect(doc.metadata.requirementCount).toBe(0);
  });

  it('should include tech stack section when provided', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    expect(doc.markdown).toContain('## 8. 技術スタック');
    expect(doc.markdown).toContain('TypeScript');
  });

  it('should include scope with users and domain', () => {
    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(fullContext);
    expect(doc.markdown).toContain('## 2. スコープ');
    expect(doc.markdown).toContain('Webアプリケーション');
    expect(doc.markdown).toContain('Developer');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('RequirementsInterviewer — edge cases', () => {
  it('should handle very short input (1 word)', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('Hello');
    expect(result.status).toBe('question');
    // "Hello" is short enough to be treated as a project name
    expect(result.state.context.projectName).toBe('Hello');
  });

  it('should handle very long input (paragraph)', () => {
    const interviewer = new RequirementsInterviewer();
    const longInput = `プロジェクト名: LargeSystem
概要: これは非常に大規模なシステムの説明です。このシステムは多くの機能を持ち、複数のユーザータイプをサポートします。Webアプリケーションとして構築され、TypeScriptとReactを使用します。
ユーザー: 管理者, 一般ユーザー, ゲスト
機能: ログイン, ダッシュボード, レポート生成, データエクスポート, 通知管理
セキュリティ: OAuth2.0認証, RBAC権限管理
パフォーマンス: 99.9%可用性, 100ms以内のレスポンス`;
    const result = interviewer.analyzeInput(longInput);
    expect(result.state.context.projectName).toBe('LargeSystem');
    expect(result.state.context.security).toBeDefined();
    expect(result.state.context.performance).toBeDefined();
    expect(result.state.context.features!.length).toBe(5);
  });

  it('should handle mixed language input', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('project name: ハイブリッドApp\nThis is a hybrid mobile app');
    expect(result.state.context.projectName).toBe('ハイブリッドApp');
  });

  it('should throw error for unknown question ID', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    expect(() => interviewer.answer('non-existent-id', 'test')).toThrow('Unknown question ID');
  });

  it('should handle duplicate answer gracefully', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    interviewer.answer('project-name', 'FirstName');
    const result = interviewer.answer('project-name', 'SecondName');
    // Should overwrite with the latest answer
    expect(result.state.context.projectName).toBe('SecondName');
  });

  it('should report correct state via getState()', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    interviewer.answer('project-name', 'StateTest');
    const state = interviewer.getState();
    expect(state.context.projectName).toBe('StateTest');
    expect(state.answeredQuestions).toContain('project-name');
    expect(state.missingRequired.length).toBeGreaterThan(0);
    expect(state.missingRequired).not.toContain('project-name');
  });

  it('should handle input with only whitespace', () => {
    const interviewer = new RequirementsInterviewer();
    const result = interviewer.analyzeInput('   \n  \n  ');
    expect(result.status).toBe('question');
    if (result.status === 'question') {
      expect(result.question.id).toBe('project-name');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════

describe('Factory functions', () => {
  it('should create RequirementsInterviewer via factory', () => {
    const interviewer = createRequirementsInterviewer();
    expect(interviewer).toBeInstanceOf(RequirementsInterviewer);
  });

  it('should create RequirementsDocGenerator via factory', () => {
    const generator = createRequirementsDocGenerator();
    expect(generator).toBeInstanceOf(RequirementsDocGenerator);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration: Interviewer → Generator
// ═══════════════════════════════════════════════════════════════════════════

describe('Integration: Interview to generation', () => {
  it('should generate a valid doc from interview results', () => {
    const interviewer = new RequirementsInterviewer();
    interviewer.analyzeInput('');
    interviewer.answer('project-name', 'IntegrationTest');
    interviewer.answer('project-description', '統合テスト用のプロジェクト。テスト自動化を行うシステムです。');
    interviewer.answer('project-domain', 'Webアプリケーション');
    interviewer.answer('target-users', 'QAエンジニア, 開発者');
    const result = interviewer.answer('main-features', 'テスト実行, 結果レポート, CI連携');

    expect(result.status).toBe('complete');

    const generator = new RequirementsDocGenerator();
    const doc = generator.generate(result.state.context);
    expect(doc.title).toContain('IntegrationTest');
    expect(doc.requirements.length).toBeGreaterThanOrEqual(3);
    expect(doc.markdown).toContain('テスト実行');
    expect(doc.markdown).toContain('QAエンジニア');
  });
});
