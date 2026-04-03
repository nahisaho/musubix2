---
name: traceability-auditor
description: >
  要件↔設計↔コード↔テスト間の 100% トレーサビリティを監査する。
  トレーサビリティマトリクス生成、ギャップ検出、影響分析、同期検証を提供。
  Use when checking traceability coverage, generating trace matrices,
  analyzing change impact, or validating Article V compliance.
license: MIT
version: "1.0.0"
triggers:
  - トレーサビリティ
  - マトリクス生成
  - 影響分析
  - カバレッジ確認
  - Article V
  - trace
---

# Traceability Auditor

要件 ↔ 設計 ↔ コード ↔ テスト間の 100% トレーサビリティを監査するスキル。
Article V（トレーサビリティ）の執行者。

## 前提条件

- `steering/` を参照済みであること
- 要件文書（`REQ-*.md`）と設計文書（`DES-*.md`）が存在すること

## トレースリンク構造

```
REQ-XXX-NNN ←→ DES-XXX-NNN ←→ src/<package>/... ←→ tests/<package>/...
     ↑                                                        ↑
     └────────────────── EARS ID リンケージ ──────────────────┘
```

## ワークフロー

### 1. トレーサビリティマトリクス生成

```
WHEN ユーザーがトレーサビリティマトリクスの生成を要求する:
1. TraceabilityManager で全 TraceLink を収集
2. MatrixGenerator でマトリクスを生成
3. GapInfo で未カバー項目を検出
4. Markdown 形式で出力
```

**CLI**: `npx musubix trace matrix [--format md|json|csv]`

### 2. ギャップ検出

```
WHEN ユーザーがトレーサビリティギャップの検出を要求する:
1. 全 REQ ID を抽出
2. 各 REQ に対応する DES を検索
3. 各 DES に対応するソースファイルを検索
4. 各ソースに対応するテストを検索
5. 欠落リンクをレポート
```

**CLI**: `npx musubix trace gaps`

### 3. 影響分析

```
WHEN ユーザーが変更影響分析を要求する:
1. ImpactAnalyzer で変更された REQ/DES を特定
2. 影響を受けるコード・テストを列挙
3. 必要な更新箇所をレポート
```

**CLI**: `npx musubix trace impact <req-id|des-id>`

### 4. トレーサビリティ同期

```
WHEN ユーザーがトレーサビリティの同期を要求する:
1. TraceSyncService で REQ ↔ DES ↔ コード間のリンクを検証
2. 不整合を検出してレポート
3. --dry-run で変更プレビュー
4. 承認後に自動修正
```

**CLI**: `npx musubix trace sync [--dry-run]`

## マトリクス出力フォーマット

```markdown
| REQ ID | DES ID | Package | Source | Test | Status |
|--------|--------|---------|--------|------|--------|
| REQ-ARC-001 | DES-ARC-001 | core | ✅ | ✅ | COVERED |
| REQ-ARC-002 | DES-ARC-002 | core | ✅ | ❌ | PARTIAL |
| REQ-SKL-001 | DES-SKL-001 | skill-manager | ❌ | ❌ | MISSING |
```

## 品質ゲート

- [ ] 全 REQ に対応する DES が存在する（REQ → DES 100%）
- [ ] 全 DES に対応するソースコードが存在する（DES → Code）
- [ ] 全 REQ に対応するテストが存在する（REQ → Test）
- [ ] 双方向リンクが維持されている（REQ ← → DES）
- [ ] ギャップ数が 0

## Gotchas

1. **N:M 関係の扱い**: 1つの REQ が複数の DES にマッピングされる場合がある。マトリクスでは全組み合わせを列挙すること。
2. **DES-SDD-002a/b/c のような複合 ID**: サフィックス付き ID も個別にトレースすること。グループ化表記（`002a/b/c`）は表示用。
3. **コード内の REQ ID コメント**: `// REQ-XXX-NNN` 形式のコメントを検索対象にする。テスト内の `describe('REQ-XXX-NNN: ...')` も対象。

## スクリプト

| スクリプト | 説明 | 使い方 |
|-----------|------|--------|
| `scripts/verify.sh` | トレーサビリティ検証 | `./scripts/verify.sh [args]` |
| `scripts/matrix.sh` | トレーサビリティマトリクス生成 | `./scripts/matrix.sh [args]` |
| `scripts/verify-detailed.sh` | 詳細トレーサビリティ検証 | `./scripts/verify-detailed.sh [args]` |
