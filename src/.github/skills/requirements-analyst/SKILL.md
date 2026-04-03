---
name: requirements-analyst
description: >
  EARS形式で要件を分析・作成・検証する。MarkdownEARSParser による構文検証、
  EARSValidator による信頼度スコア算出、対話的要件ウィザードを提供。
  Use when creating requirements, validating EARS compliance, analyzing
  requirement documents, or starting SDD Phase 1.
license: MIT
version: "1.0.0"
triggers:
  - 要件を作成
  - 要件を分析
  - EARS 検証
  - Phase 1 開始
  - requirements
---

# Requirements Analyst

EARS（Easy Approach to Requirements Syntax）形式で要件を分析・作成・検証するスキル。
SDD ワークフロー Phase 1 の中核。

## 前提条件

- `steering/` を参照済みであること（Article VI: プロジェクトメモリ）
- 対象プロジェクトに `storage/specs/` ディレクトリが存在すること

## EARS パターン分類

| パターン | 構文 | 信頼度ボーナス |
|----------|------|---------------|
| UBIQUITOUS | THE システム SHALL... | +0.00 |
| EVENT-DRIVEN | WHEN \<event\>, THE システム SHALL... | +0.25 |
| STATE-DRIVEN | WHILE \<state\>, THE システム SHALL... | +0.25 |
| UNWANTED | THE システム SHALL NOT... | +0.20 |
| OPTIONAL | WHERE \<feature\>, THE システム SHALL... | +0.20 |
| COMPLEX | IF \<condition\>, THEN THE システム SHALL... | +0.15 |

信頼度 0.85 以上で早期終了最適化。

## ワークフロー

### 1. 要件分析（既存文書の検証）

```
WHEN ユーザーが要件文書の検証を要求する:
1. MarkdownEARSParser で要件を抽出（ParsedRequirement[]）
2. EARSValidator で各要件を分類・信頼度算出
3. 違反箇所の位置特定 + 修正提案を生成
4. RequirementsValidator で構文準拠チェック
5. TraceabilityValidator でカバレッジレポート生成
```

**CLI**: `npx musubix requirements analyze <file>`
**CLI**: `npx musubix requirements validate <file>`

### 2. 対話的要件作成

```
WHEN ユーザーが新規要件の作成を要求する:
1. feature 名をヒアリング
2. EARS パターンを選択（6種類から）
3. トリガー/条件を入力
4. EARS 文を自動生成
5. AcceptanceCriteriaGenerator で受入基準を生成（LLM利用）
6. ユーザー承認 ⏸️
```

**CLI**: `npx musubix requirements new <feature>`

### 3. 要件マッピング・検索

```
WHEN ユーザーが要件の検索・マッピングを要求する:
1. RequirementsValidator.map() でマッピング生成
2. RequirementsValidator.search() で全文検索
```

**CLI**: `npx musubix requirements map|search`

## 要件文書フォーマット

各要件は以下の7フィールドを含む:

```markdown
### REQ-XXX-NNN: タイトル

**種別**: UBIQUITOUS | EVENT-DRIVEN | STATE-DRIVEN | UNWANTED | OPTIONAL | COMPLEX
**優先度**: P0 | P1 | P2

**要件**:
THE システム SHALL...

**受入基準**:
- [ ] 基準1
- [ ] 基準2

**トレーサビリティ**: DES-XXX-NNN
**パッケージ**: `package-name`
**CLI**: `npx musubix ...`
```

## 品質ゲート

- [ ] 全要件が EARS 6パターンのいずれかに分類可能
- [ ] 信頼度スコア 0.70 以上（低い場合は修正提案）
- [ ] 受入基準がチェックリスト形式
- [ ] トレーサビリティフィールドが存在
- [ ] パッケージフィールドが存在

## 4. 要件インタビュー（1問1答フロー）

```
WHEN ユーザーが要件仕様書の生成を要求する:
1. RequirementsInterviewer にユーザーの入力テキストを渡す
2. extractFromInput() でキーワードマッチングにより既知情報を抽出
3. 不足している必須項目を1問ずつ質問（1問1答）
4. 必須項目: プロジェクト名、概要、システム種別、対象ユーザー、主要機能
5. 任意項目: ステークホルダー、ユースケース、パフォーマンス、セキュリティ等
6. 全必須項目が揃ったら RequirementsDocGenerator で EARS 準拠仕様書を生成
7. EARSValidator で生成結果を検証
```

### インタビューフロー詳細

1. **入力分析**: ユーザーの自由記述からプロジェクト名・機能・技術スタック等を自動抽出
2. **不足情報特定**: 必須フィールド（projectName, projectDescription, projectDomain, targetUsers, features）の充足チェック
3. **1問1答**: 不足フィールドごとに1問ずつ質問（日本語メイン、英語サブ）
4. **回答適用**: 回答をコンテキストに格納し、完了率を更新
5. **仕様書生成**: 全必須項目充足後、EARS形式の要件仕様書を自動生成

**CLI**:
```
npx musubix req:interview <input-text>             # 入力分析 → 最初の質問
npx musubix req:interview --answer <id> <response>  # 質問に回答
npx musubix req:interview --state                    # 現在の状態表示
npx musubix req:interview --generate                 # 仕様書生成
npx musubix req:interview --reset                    # リセット
```

**MCP Tools**:
- `sdd.requirements.interview.start` — インタビュー開始
- `sdd.requirements.interview.answer` — 質問に回答
- `sdd.requirements.interview.state` — 状態取得
- `sdd.requirements.interview.generate` — 仕様書生成

## Gotchas

1. **EARS パターン混在に注意**: 1つの要件に複数パターンが混在する場合、COMPLEX に分類する。「WHEN ... WHILE ...」は COMPLEX。
2. **受入基準の粒度**: 「動作すること」のような曖昧な基準は不合格。具体的なコマンド・出力・閾値を含めること。
3. **トレーサビリティの双方向性**: REQ → DES だけでなく、DES → REQ の逆参照も維持する。片方向のみは Article V 違反。
