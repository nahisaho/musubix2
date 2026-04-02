---
name: design-generator
description: >
  要件定義書から SOLID 準拠の設計文書を生成・検証する。C4 ダイアグラム、
  ADR 管理、パターン検出、SOLIDValidator を提供。
  Use when generating design documents, creating C4 diagrams, managing ADRs,
  validating design patterns, or starting SDD Phase 2.
license: MIT
version: "1.0.0"
triggers:
  - 設計書を生成
  - 設計を検証
  - C4 ダイアグラム
  - ADR 作成
  - Phase 2 開始
  - design
---

# Design Generator

承認済み要件文書から SOLID 準拠の設計文書を生成・検証するスキル。
SDD ワークフロー Phase 2 の中核。

## 前提条件

- Phase 1（Requirements）が承認済みであること
- `steering/` を参照済みであること
- 要件文書（`storage/specs/REQ-*.md`）が存在すること

## ワークフロー

### 1. 設計文書生成

```
WHEN ユーザーが設計文書の生成を要求する:
1. 要件文書を読み込み（ParsedRequirement[]）
2. DesignGenerator.generate() で設計文書を生成
3. SOLIDValidator で SRP/OCP/LSP/ISP/DIP 準拠を検証
4. 各 DES にトレーサビリティリンクを付与
5. ユーザーレビュー ⏸️
```

**CLI**: `npx musubix design generate <req-file>`

### 2. C4 ダイアグラム生成

```
WHEN ユーザーが C4 ダイアグラムの生成を要求する:
1. C4Element と C4Relationship を抽出
2. Context / Container / Component レベルの Mermaid 図を生成
3. 設計文書に埋め込み
```

**CLI**: `npx musubix design c4 <design-file>`

### 3. ADR 管理

```
WHEN ユーザーが ADR の作成・管理を要求する:
1. ADRManager.create() で新規 ADR 作成
2. ステータスライフサイクル: proposed → accepted → deprecated → superseded
3. ADRManager.search() で全文検索
4. ADRManager.index() でインデクシング
```

**CLI**: `npx musubix decisions create|list|get|accept|deprecate|search|index`

### 4. 設計検証

```
WHEN ユーザーが設計文書の検証を要求する:
1. PatternDetector でデザインパターンを検出
2. SOLID 原則への準拠を検証
3. 要件との対応漏れを検出
```

**CLI**: `npx musubix design validate <design-file>`

## 設計文書フォーマット

各 DES 仕様は以下の構成:

```markdown
### DES-XXX-NNN: タイトル

**トレーサビリティ**: REQ-XXX-NNN
**パッケージ**: `package-name`

**設計概要**:
（自然言語の説明）

（TypeScript インターフェース / Mermaid 図）

**CLI契約**: `npx musubix ...`
```

## ADR フォーマット

```markdown
# ADR-NNN: タイトル

**ステータス**: proposed | accepted | deprecated | superseded
**日付**: YYYY-MM-DD

## Context
（決定の背景）

## Decision
（決定内容）

## Consequences
（影響と結果）
```

## 品質ゲート

- [ ] 全 DES が少なくとも1つの REQ にトレース可能
- [ ] TypeScript インターフェースが定義されている
- [ ] CLI 契約が明記されている
- [ ] SOLID 原則への違反がない
- [ ] 重要な設計決定に ADR が作成されている

## Gotchas

1. **DES と REQ の N:M 関係**: 1つの DES が複数の REQ を参照する場合がある。逆も同様。全方向のリンクを維持すること。
2. **Mermaid 記法の制限**: classDiagram で `?` nullable 表記を使う場合、TypeScript 側の `| undefined` と一致させること。
3. **ADR のステータス管理**: `accept` と `deprecate` は状態遷移。直接 `superseded` にはできない（必ず `deprecated` を経由）。
