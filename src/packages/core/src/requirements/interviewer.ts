/**
 * Requirements Interviewer — 1問1答 (One Question at a Time) Flow
 *
 * Gathers missing information from users through an interactive interview
 * before generating a complete requirements specification.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RequirementsContext {
  projectName?: string;
  projectDescription?: string;
  projectDomain?: string;
  targetUsers?: string[];
  stakeholders?: string[];
  features?: FeatureInput[];
  useCases?: string[];
  performance?: string;
  security?: string;
  scalability?: string;
  availability?: string;
  techStack?: string[];
  constraints?: string[];
  integrations?: string[];
  testingStrategy?: string;
  acceptanceCriteria?: string[];
}

export interface FeatureInput {
  name: string;
  description: string;
  priority?: 'P0' | 'P1' | 'P2';
  earsPattern?: string;
}

export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  questionEn: string;
  hint?: string;
  required: boolean;
  type: 'text' | 'list' | 'choice' | 'confirm';
  choices?: string[];
  followUp?: string;
  validator?: (answer: string) => boolean;
}

export interface InterviewState {
  context: RequirementsContext;
  answeredQuestions: string[];
  currentQuestion: InterviewQuestion | null;
  isComplete: boolean;
  completionPercentage: number;
  missingRequired: string[];
}

export type InterviewResult =
  | { status: 'question'; question: InterviewQuestion; state: InterviewState }
  | { status: 'complete'; context: RequirementsContext; state: InterviewState };

// ─── Question Bank ──────────────────────────────────────────────────────────

function buildQuestionBank(): InterviewQuestion[] {
  return [
    {
      id: 'project-name',
      category: 'projectName',
      question: 'プロジェクト名（システム名）を教えてください。',
      questionEn: 'What is the project/system name?',
      required: true,
      type: 'text',
    },
    {
      id: 'project-description',
      category: 'projectDescription',
      question: 'このシステムの概要を簡潔に説明してください。何を解決するシステムですか？',
      questionEn: 'Briefly describe the system. What problem does it solve?',
      required: true,
      type: 'text',
      hint: '例: ECサイトで商品の検索・購入・配送管理を行うシステム',
    },
    {
      id: 'project-domain',
      category: 'projectDomain',
      question: 'システムの種別を選択してください。',
      questionEn: 'What type of system is this?',
      required: true,
      type: 'choice',
      choices: [
        'Webアプリケーション',
        'モバイルアプリ',
        'API/バックエンド',
        'CLIツール',
        'デスクトップアプリ',
        'IoT/組込み',
        'ライブラリ/SDK',
        'その他',
      ],
    },
    {
      id: 'target-users',
      category: 'targetUsers',
      question: 'このシステムを使用するユーザーは誰ですか？（複数可）',
      questionEn: 'Who are the target users of this system?',
      required: true,
      type: 'list',
      hint: '例: 一般消費者, 管理者, APIクライアント',
    },
    {
      id: 'stakeholders',
      category: 'stakeholders',
      question: 'ステークホルダー（利害関係者）は誰ですか？',
      questionEn: 'Who are the stakeholders?',
      required: false,
      type: 'list',
      hint: '例: プロダクトオーナー, 運用チーム, セキュリティチーム',
    },
    {
      id: 'main-features',
      category: 'features',
      question: '主要な機能を列挙してください。（各機能を改行で区切ってください）',
      questionEn: 'List the main features (one per line).',
      required: true,
      type: 'list',
      hint: '例:\nユーザー認証\n商品検索\nカート管理\n注文処理',
    },
    {
      id: 'use-cases',
      category: 'useCases',
      question: '主要なユースケース（ユーザーがシステムで行う操作シナリオ）を教えてください。',
      questionEn: 'Describe the main use cases.',
      required: false,
      type: 'list',
      hint: '例: ユーザーが商品を検索して購入する, 管理者が在庫を更新する',
    },
    {
      id: 'performance',
      category: 'performance',
      question: 'パフォーマンス要件はありますか？（レスポンスタイム、同時接続数など）',
      questionEn: 'Any performance requirements?',
      required: false,
      type: 'text',
      hint: '例: API レスポンス 200ms 以内, 同時 1000 ユーザー',
    },
    {
      id: 'security',
      category: 'security',
      question: 'セキュリティ要件はありますか？',
      questionEn: 'Any security requirements?',
      required: false,
      type: 'text',
      hint: '例: 認証必須, パスワードハッシュ化, HTTPS通信, データ暗号化',
    },
    {
      id: 'scalability',
      category: 'scalability',
      question: 'スケーラビリティ要件はありますか？',
      questionEn: 'Any scalability requirements?',
      required: false,
      type: 'text',
    },
    {
      id: 'tech-stack',
      category: 'techStack',
      question: '使用する技術スタック（言語、フレームワーク、DB等）の指定はありますか？',
      questionEn: 'Any preferred technology stack?',
      required: false,
      type: 'list',
      hint: '例: TypeScript, Express.js, PostgreSQL, Redis',
    },
    {
      id: 'constraints',
      category: 'constraints',
      question: 'ビジネス上・技術上の制約事項はありますか？',
      questionEn: 'Any business or technical constraints?',
      required: false,
      type: 'list',
    },
    {
      id: 'integrations',
      category: 'integrations',
      question: '外部システムとの連携はありますか？',
      questionEn: 'Any external system integrations?',
      required: false,
      type: 'list',
      hint: '例: 決済API, メール送信サービス, 外部認証(OAuth)',
    },
  ];
}

// ─── Interviewer Class ──────────────────────────────────────────────────────

export class RequirementsInterviewer {
  private state: InterviewState;
  private questions: InterviewQuestion[];

  constructor() {
    this.questions = buildQuestionBank();
    this.state = {
      context: {},
      answeredQuestions: [],
      currentQuestion: null,
      isComplete: false,
      completionPercentage: 0,
      missingRequired: [],
    };
  }

  /**
   * Analyze initial user input and determine what's missing.
   */
  analyzeInput(userInput: string): InterviewResult {
    this.extractFromInput(userInput);
    return this.getNextResult();
  }

  /**
   * Process user's answer to the current question.
   */
  answer(questionId: string, response: string): InterviewResult {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new Error(`Unknown question ID: ${questionId}`);
    }
    this.applyAnswer(questionId, response);
    if (!this.state.answeredQuestions.includes(questionId)) {
      this.state.answeredQuestions.push(questionId);
    }
    return this.getNextResult();
  }

  /** Get the current interview state */
  getState(): InterviewState {
    this.updateState();
    return { ...this.state };
  }

  /** Reset the interview */
  reset(): void {
    this.state = {
      context: {},
      answeredQuestions: [],
      currentQuestion: null,
      isComplete: false,
      completionPercentage: 0,
      missingRequired: [],
    };
  }

  /** Check if enough info is gathered to generate requirements */
  isReadyToGenerate(): boolean {
    const ctx = this.state.context;
    const hasName = !!ctx.projectName;
    const hasDescription = !!ctx.projectDescription;
    const hasUsers = (ctx.targetUsers?.length ?? 0) > 0;
    const hasFeatures = (ctx.features?.length ?? 0) > 0 || (ctx.useCases?.length ?? 0) > 0;
    return hasName && hasDescription && hasUsers && hasFeatures;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private extractFromInput(input: string): void {
    if (!input.trim()) return;

    const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);

    // Try to extract project name from first significant line or patterns
    if (!this.state.context.projectName) {
      const nameMatch = input.match(
        /(?:プロジェクト名|project\s*name|システム名|system\s*name)[：:\s]+(.+)/i,
      );
      if (nameMatch) {
        this.state.context.projectName = nameMatch[1].trim();
        this.state.answeredQuestions.push('project-name');
      } else if (lines.length >= 1 && lines[0].length <= 60) {
        // Short first line is likely a project name
        const firstLine = lines[0].replace(/^#\s*/, '');
        if (firstLine.length > 0 && firstLine.length <= 60 && !firstLine.includes('。')) {
          this.state.context.projectName = firstLine;
          this.state.answeredQuestions.push('project-name');
        }
      }
    }

    // Extract description
    if (!this.state.context.projectDescription) {
      const descMatch = input.match(
        /(?:概要|description|説明)[：:\s]+(.+)/i,
      );
      if (descMatch) {
        this.state.context.projectDescription = descMatch[1].trim();
        this.state.answeredQuestions.push('project-description');
      } else if (lines.length >= 2) {
        // Second line or a long line is likely a description
        const candidate = lines.find((l) => l.length > 30 && l !== this.state.context.projectName);
        if (candidate) {
          this.state.context.projectDescription = candidate;
          this.state.answeredQuestions.push('project-description');
        }
      }
    }

    // Extract domain
    if (!this.state.context.projectDomain) {
      const domainPatterns: [RegExp, string][] = [
        [/(?:web\s*(?:app|アプリ)|webアプリケーション|ウェブ)/i, 'Webアプリケーション'],
        [/(?:mobile|モバイル|ios|android)/i, 'モバイルアプリ'],
        [/(?:api|バックエンド|backend|rest|graphql)/i, 'API/バックエンド'],
        [/(?:cli|コマンドライン|command.?line)/i, 'CLIツール'],
        [/(?:desktop|デスクトップ|electron)/i, 'デスクトップアプリ'],
        [/(?:iot|組込み|embedded|arduino|raspberry)/i, 'IoT/組込み'],
        [/(?:library|ライブラリ|sdk|パッケージ)/i, 'ライブラリ/SDK'],
      ];
      for (const [pattern, domain] of domainPatterns) {
        if (pattern.test(input)) {
          this.state.context.projectDomain = domain;
          this.state.answeredQuestions.push('project-domain');
          break;
        }
      }
    }

    // Extract target users
    if (!this.state.context.targetUsers || this.state.context.targetUsers.length === 0) {
      const userMatch = input.match(
        /(?:ユーザー|user|利用者|対象者)[：:\s]+(.+)/i,
      );
      if (userMatch) {
        this.state.context.targetUsers = this.splitList(userMatch[1]);
        if (this.state.context.targetUsers.length > 0) {
          this.state.answeredQuestions.push('target-users');
        }
      }
    }

    // Extract features from list-like patterns
    if (!this.state.context.features || this.state.context.features.length === 0) {
      const featureMatch = input.match(
        /(?:機能|features?|主要機能)[：:\s]+(.+)/i,
      );
      if (featureMatch) {
        const featureNames = this.splitList(featureMatch[1]);
        if (featureNames.length > 0) {
          this.state.context.features = featureNames.map((name) => ({
            name,
            description: name,
          }));
          this.state.answeredQuestions.push('main-features');
        }
      } else {
        // Look for bullet-point features
        const bulletFeatures = lines
          .filter((l) => /^[-・*]\s+/.test(l))
          .map((l) => l.replace(/^[-・*]\s+/, '').trim())
          .filter(Boolean);
        if (bulletFeatures.length >= 2) {
          this.state.context.features = bulletFeatures.map((name) => ({
            name,
            description: name,
          }));
          this.state.answeredQuestions.push('main-features');
        }
      }
    }

    // Extract tech stack
    if (!this.state.context.techStack || this.state.context.techStack.length === 0) {
      const techMatch = input.match(
        /(?:技術|tech\s*stack|言語|framework|フレームワーク)[：:\s]+(.+)/i,
      );
      if (techMatch) {
        this.state.context.techStack = this.splitList(techMatch[1]);
        if (this.state.context.techStack.length > 0) {
          this.state.answeredQuestions.push('tech-stack');
        }
      } else {
        // Detect well-known technologies
        const techs: string[] = [];
        const techPatterns: [RegExp, string][] = [
          [/\bTypeScript\b/i, 'TypeScript'],
          [/\bJavaScript\b/i, 'JavaScript'],
          [/\bPython\b/i, 'Python'],
          [/\bReact\b/i, 'React'],
          [/\bVue\b/i, 'Vue'],
          [/\bExpress\b/i, 'Express'],
          [/\bPostgreSQL\b/i, 'PostgreSQL'],
          [/\bMySQL\b/i, 'MySQL'],
          [/\bRedis\b/i, 'Redis'],
          [/\bDocker\b/i, 'Docker'],
          [/\bNext\.?js\b/i, 'Next.js'],
          [/\bNode\.?js\b/i, 'Node.js'],
          [/\bGo(?:lang)?\b/, 'Go'],
          [/\bRust\b/i, 'Rust'],
          [/\bJava\b/, 'Java'],
        ];
        for (const [pat, name] of techPatterns) {
          if (pat.test(input)) techs.push(name);
        }
        if (techs.length > 0) {
          this.state.context.techStack = techs;
          this.state.answeredQuestions.push('tech-stack');
        }
      }
    }

    // Extract integrations
    if (!this.state.context.integrations || this.state.context.integrations.length === 0) {
      const intMatch = input.match(
        /(?:連携|integration|外部サービス)[：:\s]+(.+)/i,
      );
      if (intMatch) {
        this.state.context.integrations = this.splitList(intMatch[1]);
        if (this.state.context.integrations.length > 0) {
          this.state.answeredQuestions.push('integrations');
        }
      }
    }

    // Extract security
    if (!this.state.context.security) {
      const secMatch = input.match(
        /(?:セキュリティ|security)[：:\s]+(.+)/i,
      );
      if (secMatch) {
        this.state.context.security = secMatch[1].trim();
        this.state.answeredQuestions.push('security');
      }
    }

    // Extract performance
    if (!this.state.context.performance) {
      const perfMatch = input.match(
        /(?:パフォーマンス|performance|性能)[：:\s]+(.+)/i,
      );
      if (perfMatch) {
        this.state.context.performance = perfMatch[1].trim();
        this.state.answeredQuestions.push('performance');
      }
    }
  }

  private getNextResult(): InterviewResult {
    this.updateState();

    if (this.state.isComplete) {
      return { status: 'complete', context: this.state.context, state: { ...this.state } };
    }

    // Find next unanswered required question, then optional
    const nextQuestion = this.findNextQuestion();
    if (!nextQuestion) {
      this.state.isComplete = true;
      return { status: 'complete', context: this.state.context, state: { ...this.state } };
    }

    this.state.currentQuestion = nextQuestion;
    return { status: 'question', question: nextQuestion, state: { ...this.state } };
  }

  private findNextQuestion(): InterviewQuestion | null {
    // Required questions first
    for (const q of this.questions) {
      if (q.required && !this.state.answeredQuestions.includes(q.id)) {
        return q;
      }
    }

    // If minimum required met, consider complete
    if (this.isReadyToGenerate()) {
      return null;
    }

    // Optional questions
    for (const q of this.questions) {
      if (!q.required && !this.state.answeredQuestions.includes(q.id)) {
        return q;
      }
    }

    return null;
  }

  private applyAnswer(questionId: string, response: string): void {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) return;

    const trimmed = response.trim();
    if (!trimmed) return;

    switch (question.category) {
      case 'projectName':
        this.state.context.projectName = trimmed;
        break;
      case 'projectDescription':
        this.state.context.projectDescription = trimmed;
        break;
      case 'projectDomain':
        this.state.context.projectDomain = trimmed;
        break;
      case 'targetUsers':
        this.state.context.targetUsers = this.splitList(trimmed);
        break;
      case 'stakeholders':
        this.state.context.stakeholders = this.splitList(trimmed);
        break;
      case 'features': {
        const names = this.splitList(trimmed);
        this.state.context.features = names.map((name) => ({
          name,
          description: name,
        }));
        break;
      }
      case 'useCases':
        this.state.context.useCases = this.splitList(trimmed);
        break;
      case 'performance':
        this.state.context.performance = trimmed;
        break;
      case 'security':
        this.state.context.security = trimmed;
        break;
      case 'scalability':
        this.state.context.scalability = trimmed;
        break;
      case 'techStack':
        this.state.context.techStack = this.splitList(trimmed);
        break;
      case 'constraints':
        this.state.context.constraints = this.splitList(trimmed);
        break;
      case 'integrations':
        this.state.context.integrations = this.splitList(trimmed);
        break;
    }
  }

  private updateState(): void {
    const required = this.questions.filter((q) => q.required);
    const answered = required.filter((q) => this.state.answeredQuestions.includes(q.id));
    const total = this.questions.length;
    const totalAnswered = this.state.answeredQuestions.length;

    this.state.completionPercentage = Math.round((totalAnswered / total) * 100);
    this.state.missingRequired = required
      .filter((q) => !this.state.answeredQuestions.includes(q.id))
      .map((q) => q.id);

    // Complete when all required are answered and isReadyToGenerate
    if (answered.length === required.length && this.isReadyToGenerate()) {
      this.state.isComplete = true;
    }
  }

  private splitList(text: string): string[] {
    return text
      .split(/[,、\n]/)
      .map((s) => s.replace(/^[-・*]\s*/, '').trim())
      .filter(Boolean);
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createRequirementsInterviewer(): RequirementsInterviewer {
  return new RequirementsInterviewer();
}
