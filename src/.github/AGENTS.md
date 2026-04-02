# MUSUBIX2 SDD Agent Orchestrator

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
| SDD ワークフロー全体を実行する | → Phase 遷移ルール（後述） |

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
│   └── ポリシー? → constitution-enforcer
└── ワークフロー? → Phase 遷移ルール
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
