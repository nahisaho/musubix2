# MUSUBIX2 — Specification Driven Development System

## プロジェクト概要

MUSUBIX2 はニューロシンボリック AI コーディングシステムの SDD（Specification Driven Development）基盤である。
TypeScript / Node.js 20+ / ESM のモノレポ構成で、25 パッケージを npm workspaces で管理する。

## アーキテクチャ原則

| 原則 | 説明 |
|------|------|
| **ライブラリファースト** | 各機能を独立パッケージとして設計。アプリ依存を排除 |
| **CLIファースト** | 全機能に Commander.js ベースの CLI インターフェースを提供 |
| **テストファースト** | Red→Green→Blue サイクル。Vitest カバレッジ 80% 以上 |
| **関心の分離** | 4層: Domain / Application / Infrastructure / Interface |
| **依存性逆転** | インターフェースによる抽象化。具象への直接依存を禁止 |
| **Git Native** | 全永続化データを JSON / YAML / Markdown 形式で保存 |

## 9条憲法（不可侵）

| 条項 | 原則 | 検証手段 |
|------|------|----------|
| Article I | ライブラリファースト | constitution-enforcer |
| Article II | CLI インターフェース | constitution-enforcer |
| Article III | テストファースト | test-engineer |
| Article IV | EARS 形式 | requirements-analyst |
| Article V | トレーサビリティ | traceability-auditor |
| Article VI | プロジェクトメモリ | steering/ 参照 |
| Article VII | デザインパターン文書化 | design-generator |
| Article VIII | ADR 記録 | design-generator |
| Article IX | 品質ゲート | test-engineer |

## SDD ワークフロー（5フェーズ）

```
Phase 1: Requirements → Phase 2: Design → Phase 3: Tasks → Phase 4: Implementation → Phase 5: Complete
```

- **Phase 遷移には前フェーズの承認が必須**（REQ-SDD-002a/b/c）
- 各 Phase で品質ゲートを通過すること（REQ-SDD-003）

## ディレクトリ構成

```
src/
├── packages/
│   ├── core/                  # @nahisaho/musubix-core
│   ├── knowledge/             # @musubix/knowledge
│   ├── decisions/             # @musubix/decisions
│   ├── policy/                # @musubix/policy
│   ├── codegraph/             # @nahisaho/musubix-codegraph
│   ├── dfg/                   # @nahisaho/musubix-dfg
│   ├── formal-verify/         # @nahisaho/musubix-formal-verify
│   ├── lean/                  # @nahisaho/musubix-lean
│   ├── security/              # @nahisaho/musubix-security
│   ├── workflow-engine/       # @nahisaho/musubix-workflow-engine
│   ├── skill-manager/         # @nahisaho/musubix-skill-manager
│   ├── agent-orchestrator/    # @nahisaho/musubix-agent-orchestrator
│   ├── expert-delegation/     # @nahisaho/musubix-expert-delegation
│   ├── assistant-axis/        # @nahisaho/musubix-assistant-axis
│   ├── mcp-server/            # @nahisaho/musubix-mcp-server
│   ├── sdd-ontology/          # @nahisaho/musubix-sdd-ontology
│   ├── ontology-mcp/          # @nahisaho/musubix-ontology-mcp
│   ├── neural-search/         # @nahisaho/musubix-neural-search
│   ├── wake-sleep/            # @nahisaho/musubix-wake-sleep
│   ├── library-learner/       # @nahisaho/musubix-library-learner
│   ├── synthesis/             # @nahisaho/musubix-synthesis
│   ├── pattern-mcp/           # @nahisaho/musubix-pattern-mcp
│   ├── deep-research/         # @nahisaho/musubix-deep-research
│   ├── musubi/                # @nahisaho/musubi
│   └── musubix/               # musubix (umbrella)
├── steering/
│   ├── product.ja.md
│   ├── structure.ja.md
│   ├── tech.ja.md
│   ├── rules/constitution.md
│   └── project.yml
├── .github/
│   ├── copilot-instructions.md
│   ├── AGENTS.md
│   └── skills/
├── docker/
├── virtual-projects/
└── testing/
```

## パッケージ内部構成（4層）

```
packages/<name>/
├── src/
│   ├── domain/           # ドメインモデル、インターフェース
│   ├── application/      # ユースケース、サービス
│   ├── infrastructure/   # 外部アダプター、ファイルI/O
│   └── interface/
│       └── cli/          # Commander.js コマンド
├── tests/
├── package.json
└── tsconfig.json
```

## コーディング規約

- **言語**: TypeScript 5.3+ / ESM (`type: "module"`)
- **ビルド**: `tsc -b` インクリメンタルビルド
- **テスト**: Vitest
- **リンター**: ESLint
- **CLI**: Commander.js, `registerXCommand(program)` パターン
- **エラー**: `ActionableError` + `GracefulDegradation`（CircuitBreaker, retryWithBackoff）
- **リポジトリ**: `IRepository` / `ISearchableRepository` / `IPaginatedRepository`
- **ファクトリ**: `createInMemoryRepository` 等

## EARS 要件構文

全要件は EARS（Easy Approach to Requirements Syntax）形式で記述する:

| パターン | 構文 |
|----------|------|
| UBIQUITOUS | THE システム SHALL... |
| EVENT-DRIVEN | WHEN \<event\>, THE システム SHALL... |
| STATE-DRIVEN | WHILE \<state\>, THE システム SHALL... |
| UNWANTED | THE システム SHALL NOT... |
| OPTIONAL | WHERE \<feature\>, THE システム SHALL... |
| COMPLEX | IF \<condition\>, THEN THE システム SHALL... |

## 仕様文書

- **要件定義書**: `references/musubix2/REQ-MUSUBIX2-001.md` (v1.5, 69 要件)
- **設計書**: `references/musubix2/DES-MUSUBIX2-001.md` (v1.5, 69 DES 仕様)
- **実装計画**: `references/musubix2/PLAN-MUSUBIX2-001.md` (77 タスク, 8 フェーズ)

## Review Orchestration (Cross-Model Review)

SDD アーティファクトの品質保証には、複数AIモデルによる交互レビューを実施する：

1. **交互レビュー**: opus-4.6 → gpt-5.4 → opus-4.6 → ... (エラー0まで)
2. **最終合意**: 両モデルが同時にPASSすること
3. **実装許可**: requirements, design, plan 全てが承認済みであること

`ReviewOrchestrator` クラス（`@musubix2/agent-orchestrator`）を使用する。

## Steering 参照ルール

全スキル実行前に `steering/` を参照すること:
- `product.ja.md` — プロダクトコンテキスト
- `structure.ja.md` — アーキテクチャパターン
- `tech.ja.md` — 技術スタック
- `rules/constitution.md` — 9条憲法
- `project.yml` — プロジェクト設定
