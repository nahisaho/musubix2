---
name: orchestrator
description: >
  SDD ワークフロー全体のオーケストレーション — スキルルーティング、フェーズ遷移管理、品質ゲート制御。
  Use when routing tasks to the correct skill, managing phase transitions,
  or running the full SDD workflow.
license: MIT
version: "1.0.0"
triggers:
  - ワークフロー
  - フェーズ遷移
  - オーケストレーション
  - タスクルーティング
  - SDD 全体管理
  - phase transition
  - orchestrate
  - route
---

# MUSUBIX2 SDD Orchestrator

SDD（Specification Driven Development）ワークフローのルーティングとフェーズ遷移を管理するスキル。
全スキルへのタスク振り分け、Phase 遷移条件の検証、品質ゲート制御を担当する。

## 前提条件

- `steering/` を参照済みであること（Article VI: プロジェクトメモリ）
- 対象プロジェクトに SDD ワークフローが適用されていること

## ルーティングルール

### WHEN/DO マッピング

| WHEN（トリガー） | DO（スキル） |
|------------------|-------------|
| 要件を作成・分析・検証する | → `requirements-analyst` |
| 設計書を生成・レビュー・検証する | → `design-generator` |
| コードを生成・スキャフォールド・解析する | → `code-generator` |
| テストを作成・実行・カバレッジ確認する | → `test-engineer` |
| トレーサビリティを確認・マトリクス生成する | → `traceability-auditor` |
| 憲法準拠・ポリシー違反を検証する | → `constitution-enforcer` |
| レビュー・合意チェック・品質検証する | → `review-orchestrator` |
| SDD ワークフロー全体を実行する | → `orchestrator`（Phase 遷移ルール参照） |

### タスク分類ツリー

```
ユーザー入力
├── 仕様関連?
│   ├── 要件? → requirements-analyst
│   └── 設計? → design-generator
├── 実装関連?
│   ├── コード生成? → code-generator
│   └── テスト? → test-engineer
├── 品質関連?
│   ├── トレーサビリティ? → traceability-auditor
│   ├── ポリシー? → constitution-enforcer
│   └── レビュー / 合意チェック? → review-orchestrator
└── ワークフロー? → orchestrator（Phase 遷移ルール）
```

## Phase 遷移ルール

```
Phase 1 (Requirements) ──⏸️承認──→ Phase 2 (Design) ──⏸️承認──→ Phase 3 (Tasks)
    ──⏸️承認──→ Phase 4 (Implementation) ──⏸️承認──→ Phase 5 (Complete)
```

### 遷移条件

| 遷移 | 条件 |
|------|------|
| Phase 1 → 2 | 全要件が EARS 形式準拠、requirements-analyst による検証 PASS |
| Phase 2 → 3 | 全 DES が REQ にトレース可能、design-generator による検証 PASS |
| Phase 3 → 4 | タスク分解完了、traceability-auditor でカバレッジ 100% |
| Phase 4 → 5 | テストカバレッジ 80%+、constitution-enforcer で全条項 PASS |

### ⏸️ 承認ポイント

各 Phase 遷移時にユーザー承認を要求する。自動スキップ禁止。

## レビューオーケストレーション

SDD 成果物の品質保証には `review-orchestrator` スキルを使用する。
詳細は `skills/review-orchestrator/SKILL.md` を参照。

### プロセス

1. 各フェーズの成果物が完成したら `review-orchestrator` を起動
2. opus-4.6 と gpt-5.4 が交互にレビュー（エラー 0 まで）
3. 両モデルの最終合意チェック（両方 PASS 必須）
4. 全アーティファクト承認後に実装フェーズへ遷移可能

### ルーティング

| トリガー | スキル |
|---------|--------|
| レビュー / review / 品質検証 | `review-orchestrator` |
| 合意チェック / consensus | `review-orchestrator` |
| 実装許可 / proceed to implementation | `review-orchestrator` |

## 禁止事項

- Phase をスキップしてはならない
- 承認なしで次 Phase に遷移してはならない
- テストなしでコードをコミットしてはならない
- EARS 形式に従わない要件を承認してはならない
- steering/ の参照をスキップしてはならない

## 緊急度トリアージ

| 緊急度 | 対応 |
|--------|------|
| 🔴 Critical | constitution-enforcer 違反 → 即時修正、Phase 進行ブロック |
| 🟡 Major | テストカバレッジ不足 → test-engineer で補完後に進行 |
| 🟢 Minor | ドキュメント不備 → 次回レビューで対応可 |

## 使用パッケージ

- `@musubix2/workflow-engine` — `PhaseController`: Phase 遷移状態管理
- `@musubix2/agent-orchestrator` — `SubagentDispatcher`: スキルルーティング実行
