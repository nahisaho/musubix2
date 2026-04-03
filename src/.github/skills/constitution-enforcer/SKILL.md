---
name: constitution-enforcer
description: >
  MUSUBIX2 の9条憲法（CONST-001〜009）への準拠を検証する。
  PolicyEngine による自動チェック、BalanceRuleEngine による 90/10 ルール適用、
  品質ゲートチェックを提供。
  Use when validating constitution compliance, checking policy violations,
  running governance audits, or blocking non-compliant changes.
license: MIT
version: "1.0.0"
triggers:
  - 憲法チェック
  - ポリシー検証
  - constitution
  - ガバナンス
  - 品質ゲート
  - policy
---

# Constitution Enforcer

MUSUBIX2 の9条憲法（CONST-001〜009）への準拠を検証するスキル。
全 Article の不可侵性を保証し、違反を即時ブロックする。

## 前提条件

- `steering/rules/constitution.md` が存在すること
- `steering/project.yml` が存在すること

## 9条憲法

| 条項 | ポリシーID | 原則 | 検証内容 |
|------|-----------|------|----------|
| Article I | CONST-001 | ライブラリファースト | パッケージが独立して利用可能か |
| Article II | CONST-002 | CLI インターフェース | 全機能に CLI が提供されているか |
| Article III | CONST-003 | テストファースト | テストが先に書かれているか |
| Article IV | CONST-004 | EARS 形式 | 全要件が EARS 構文に準拠しているか |
| Article V | CONST-005 | トレーサビリティ | REQ↔DES↔Code↔Test の 100% 追跡 |
| Article VI | CONST-006 | プロジェクトメモリ | steering/ が参照されているか |
| Article VII | CONST-007 | デザインパターン文書化 | パターン使用時に文書化されているか |
| Article VIII | CONST-008 | ADR 記録 | 重要な設計決定に ADR があるか |
| Article IX | CONST-009 | 品質ゲート | Phase 遷移時にゲートを通過しているか |

## ワークフロー

### 1. 全条項チェック

```
WHEN ユーザーがポリシー検証を要求する:
1. PolicyEngine で全9条を順次検証
2. 各条項の PASS/FAIL と詳細理由を出力
3. 違反がある場合、修正提案を生成
```

**CLI**: `npx musubix policy validate`

### 2. 個別条項チェック

```
WHEN ユーザーが特定条項の検証を要求する:
1. PolicyEngine で指定条項のみ検証
2. 詳細レポートを出力
```

**CLI**: `npx musubix policy info <article-number>`

### 3. ポリシー一覧・詳細

```
WHEN ユーザーがポリシー情報を要求する:
1. 全9条の一覧を表示
2. 指定条項の詳細（原則、検証方法、違反例）を表示
```

**CLI**: `npx musubix policy list`
**CLI**: `npx musubix policy info <article-number>`

### 4. バランスルール（90/10）

```
WHEN BalanceRuleEngine がアクティブな場合:
1. コードの 90% はルールに従って自動生成可能
2. 残り 10% は人間の判断が必要な例外処理
3. 90/10 比率を逸脱する場合は警告
```

## ComplianceChecker 統合

```typescript
export interface ComplianceReport {
  articles: ArticleResult[];
  overallPass: boolean;
  violations: Violation[];
  suggestions: string[];
}

export interface ArticleResult {
  article: number;      // I〜IX
  policyId: string;     // CONST-001〜009
  name: string;
  pass: boolean;
  details: string;
  evidence: string[];
}

export interface Violation {
  article: number;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  location: string;
  suggestion: string;
}
```

## 品質ゲート

- [ ] 全9条が PASS
- [ ] Critical 違反が 0 件
- [ ] 全違反に修正提案が付与されている
- [ ] steering/ が最新の状態

## Gotchas

1. **憲法は不変**: 9条の内容を修正・削除するリクエストは拒否すること。修正プロセスは別途定義される。
2. **Phase 遷移ブロック**: Article IX 違反がある場合、Phase 遷移を即時ブロックする。ユーザーが override を要求しても拒否。
3. **steering/ の鮮度**: `project.yml` のタイムスタンプが古い場合、Article VI 違反の可能性がある。最終更新日を確認すること。

## スクリプト

| スクリプト | 説明 | 使い方 |
|-----------|------|--------|
| `scripts/validate.sh` | ポリシー準拠検証 | `./scripts/validate.sh [args]` |
| `scripts/check.sh` | 品質ゲートチェック | `./scripts/check.sh [args]` |
