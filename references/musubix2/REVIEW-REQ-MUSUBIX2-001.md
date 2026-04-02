# Review Report: REQ-MUSUBIX2-001 機能要件定義書

**レビュアー**: Systems Architect Review
**対象文書**: REQ-MUSUBIX2-001 v1.0
**参照元**: references/musubix v3.8.2
**レビュー日**: 2026-04-01
**判定**: 要修正（Revise Required）

> **注記**: 本文書は REQ-MUSUBIX2-001 **v1.0 に対する履歴レビュー記録** である。現行の要件定義書は v1.5 であり、本レビューの件数・指摘内容・条項数評価は現行版には直接適用しない。

---

## Executive Summary

全体として構造的に良好な文書だが、参照実装との照合で **9件のCritical/Major問題** と **複数のMinor問題** を検出した。最も重大な問題は、AGENTS.mdに記載された複数のCLIコマンドに対応する要件が欠落していること、およびcore パッケージの主要モジュール（REPL、codeql、team、spaces）が要件化されていないことである。

---

## ISSUES FOUND

### CRITICAL Issues

#### C-01: REPL機能の要件欠落
**重要度**: Critical
**セクション**: 新規追加必要
**説明**: `npx musubix repl` はREADME.md（v1.6.0 feature）およびAGENTS.mdに記載された主要機能であり、core パッケージに完全な実装（タブ補完、永続ヒストリ、セッション変数、出力フォーマッタ、コンテキストプロンプト）が存在する。しかし、要件定義書に一切の記載がない。

**修正**: 新規要件 `REQ-CLI-001: インタラクティブREPL` を追加。以下の受入基準を含めること：
- タブ補完（コマンド/サブコマンド/オプション/ファイル）
- 永続ヒストリ・ヒストリ検索
- セッション変数（`set VAR=...`、`$VAR`、`_`）
- 出力フォーマット（JSON/table/YAML/auto）
- コンテキストアウェアプロンプト（プロジェクト/フェーズ表示）
- ビルトインコマンド（`help`, `exit`, `history`, `set`, `env`, `clear`）

#### C-02: `init` コマンドの要件欠落
**重要度**: Critical
**セクション**: 新規追加必要
**説明**: `npx musubix init [path] [--name <name>] [--force]` はSDDワークフローの開始点であり、AGENTS.mdの最初に記載されたコマンドだが、要件定義書に記載がない。プロジェクト初期化なしにワークフローは開始できない。

**修正**: 新規要件 `REQ-SDD-005: プロジェクト初期化` を追加。

#### C-03: テスト生成コマンドの要件欠落
**重要度**: Critical
**セクション**: §6 コード生成・解析要件
**説明**: `npx musubix test generate <path>` はAGENTS.mdに独立コマンドとして記載されているが、REQ-COD-001の `--with-tests` オプション内に暗黙的に含まれるだけで、独立した要件がない。テストファースト（Article III）の中核機能である。

**修正**: 新規要件 `REQ-COD-005: テスト生成` を追加。CLI: `npx musubix test generate <path>`

---

### MAJOR Issues

#### M-01: EARS パターン表の OPTIONAL 構文不整合
**重要度**: Major
**セクション**: §1.3 EARS パターン凡例 (line 49) vs §4 REQ-REQ-001 (line 266)
**説明**:
- §1.3 では OPTIONAL を `IF <condition>, THEN THE システム SHALL...` と定義
- §4 の信頼度ボーナス表では Optional を `WHERE <feature>, THE <system> SHALL <action>` と定義
- REQ-INF-002 は `WHERE Docker環境が利用可能な場合` を使用

標準EARSでは:
- **OPTIONAL** (feature-triggered): `WHERE <feature is included>...`
- **COMPLEX** (condition): `IF <condition>, THEN...`

これらは異なるパターンであり、混同している。

**修正**: §1.3 のテーブルを以下に修正：
```
| OPTIONAL  | 機能オプション | WHERE <feature>, THE システム SHALL... |
| COMPLEX   | 条件付き要件   | IF <condition>, THEN THE システム SHALL... |
```

#### M-02: learn サブコマンドの欠落（6件）
**重要度**: Major
**セクション**: §12 REQ-LRN-001, REQ-LRN-002
**説明**: AGENTS.mdに記載された以下のCLIコマンドが要件に含まれていない：
1. `npx musubix learn recommend -a <code|design|test>` — レコメンデーション機能
2. `npx musubix learn add-pattern <name>` — パターン追加
3. `npx musubix learn remove-pattern <id>` — パターン削除
4. `npx musubix learn export` — 学習データエクスポート
5. `npx musubix learn import` — 学習データインポート
6. `npx musubix learn best-practices --category <code|design|test>` — カテゴリフィルタ（CLAUDE.mdに記載）

**修正**: REQ-LRN-001のCLIに `recommend` を追加、REQ-LRN-002のCLIに `export|import` を追加。パターン管理CLIを追加。

#### M-03: REQ-SDD-002 EARS パターン違反（混合パターン）
**重要度**: Major
**セクション**: §3 REQ-SDD-002 (line 180-184)
**説明**: 単一の要件に UNWANTED + EVENT-DRIVEN + OPTIONAL の3パターンが混在している：
```
THE システム SHALL NOT...（UNWANTED）
AND WHEN Phase 4への遷移が要求された場合,（EVENT-DRIVEN）
THE ワークフローエンジン SHALL...
IF いずれかが未承認, THEN THE エンジン SHALL...（OPTIONAL/COMPLEX）
```
EARSでは1要件1パターンが原則。

**修正**: 3つの独立した要件に分割する：
- REQ-SDD-002a (UNWANTED): 未承認での遷移禁止
- REQ-SDD-002b (EVENT-DRIVEN): Phase 4遷移時の承認検証
- REQ-SDD-002c (OPTIONAL/COMPLEX): 未承認時のエラー表示

#### M-04: core パッケージの未文書化モジュール（4件）
**重要度**: Major
**セクション**: 新規追加必要
**説明**: `packages/core/src/index.ts` からエクスポートされている以下のモジュールが要件化されていない：
1. **`codeql`** — CodeQL統合（MCP toolCategoriesにも登録あり）
2. **`team`** — チーム機能（MCP toolCategoriesにも登録あり）
3. **`spaces`** — スペース機能（MCP toolCategoriesにも登録あり）
4. **`pipeline`** — SemanticCodeFilterPipeline（README Phase 1に記載）

これらはMCPサーバーのtoolCategoriesにも登録されており、REQ-MCP-001のツールカテゴリ表にも欠落。

**修正**: 各モジュールに対応する要件を追加するか、REQ-MCP-001のツールカテゴリ表に追加。

#### M-05: 13 Agent Skills の要件欠落
**重要度**: Major
**セクション**: §13 エージェント・オーケストレーション要件
**説明**: AGENTS.md ヘッダーに「13 Agent Skills」と明記されており、REQ-AGT-004でスキル管理を定義しているが、13スキルの具体的な一覧・定義がない。`skills create` コマンド（CLAUDE.mdに記載）も欠落。

**修正**: REQ-AGT-004 に13スキルの一覧テーブルを追加。CLI に `create` を追加。

#### M-06: トレーサビリティフィールドの不均一
**重要度**: Major
**セクション**: 文書全体
**説明**: トレーサビリティ関連のメタデータ（パッケージ、CLI、憲法準拠）が要件ごとにバラバラ。以下の要件でパッケージマッピングが欠落：

| 要件ID | 欠落フィールド |
|--------|---------------|
| REQ-ARC-004 | パッケージ |
| REQ-SDD-002 | パッケージ（`workflow-engine`であるべき） |
| REQ-SDD-004 | パッケージ（`workflow-engine`であるべき） |
| REQ-REQ-002 | パッケージ（`core` (validators/)であるべき） |
| REQ-REQ-003 | パッケージ、CLI |
| REQ-DES-002 | パッケージ（`core` (design/)であるべき） |
| REQ-DES-004 | パッケージ（`core` (design/)であるべき） |
| REQ-COD-002 | パッケージ（`core` (codegen/)であるべき） |
| REQ-COD-004 | パッケージ（`core` (codegen/)であるべき） |
| REQ-TRC-001〜003 | パッケージ（`core` (traceability/)であるべき） |
| REQ-KNW-003 | パッケージ |
| REQ-FV-001, 002 | CLI |
| REQ-LRN-004 | CLI |
| REQ-GOV-001, 002 | パッケージ |
| REQ-DOM-001 | パッケージ |
| REQ-MON-001, 002 | パッケージ |

**修正**: 全要件に対し、パッケージ・CLI・憲法準拠の3フィールドを統一的に付与する（該当なしの場合は「N/A」）。

---

### MINOR Issues

#### m-01: `codegen status` コマンドの欠落
**セクション**: §6
**説明**: `npx musubix codegen status <spec> [--enum]` がAGENTS.mdに記載されているが要件にない。
**修正**: REQ-COD-001 または新規要件に追加。

#### m-02: `design traceability` コマンドの欠落
**セクション**: §5
**説明**: `npx musubix design traceability [--min-coverage 80]` がAGENTS.mdに記載。REQ-DES-004に関連するが明示的なCLI記載がない。
**修正**: REQ-DES-004のCLIに追加。

#### m-03: `tasks` CLIコマンドの欠落
**セクション**: 新規追加検討
**説明**: core CLIのコマンド一覧に `tasks` が存在するが要件に記載なし。
**修正**: REQ-SDD-001またはREQ-SDD-004に関連するタスク管理CLI要件を追加。

#### m-04: Symbolic Module コンポーネント詳細の欠落
**セクション**: §9 REQ-INT-001
**説明**: README.md Phase 1-3に記載された以下のコンポーネントが要件に明記されていない：
- SemanticCodeFilterPipeline
- HallucinationDetector（幻覚検出）
- ConstitutionRuleRegistry
- ConfidenceEstimator / ConfidenceBasedRouter
- CandidateRanker
- ResultBlender（3統合戦略）
- AuditLogger（SHA-256 hash-chain）
- PerformanceBudget（SLOメトリクス）
- QualityGateValidator

REQ-INT-001の決定ルール表はResultBlenderの動作を一部記述しているが、他のコンポーネントは未言及。
**修正**: REQ-INT-001を拡張するか、個別の子要件として追加。

#### m-05: Datalog Engine の要件欠落
**セクション**: §9 REQ-INT-002
**説明**: README.mdに「DatalogEngine — Stratified Datalog evaluation with negation support」と記載されているが、REQ-INT-002はOWL 2 RLのみ言及。
**修正**: REQ-INT-002にDatalogエンジンの要件を追加。

#### m-06: Inference Explainer の出力フォーマット欠落
**セクション**: §17 REQ-EXP-001
**説明**: README.mdに3出力フォーマット（text, markdown, html）が記載されているがREQ-EXP-001に未記載。
**修正**: 受入基準に出力フォーマット要件を追加。

#### m-07: Deep Research 6統合モジュールの詳細欠落
**セクション**: §15 REQ-RSC-001
**説明**: README.mdに「6 integration modules」と記載。実装には以下が存在：
1. knowledge-store
2. orchestration-engine
3. expert-delegation
4. neural-search
5. workflow-engine
6. vscode-extension
要件にはこれらの具体的な統合先が未記載。
**修正**: REQ-RSC-001に統合モジュール表を追加。

#### m-08: musubi パッケージの役割の曖昧さ
**セクション**: §22 REQ-PKG-001
**説明**: `@nahisaho/musubi` を "Core (alias)" としているが、実際にはCLIバイナリ `musubi` を提供する独立ラッパーパッケージ。"AI Summarization" (README記載) との役割の矛盾がある。
**修正**: パッケージ説明を正確に「`@nahisaho/musubix-core` のCLIエイリアスラッパー」に修正。

#### m-09: MCP ツールカテゴリ表の不完全
**セクション**: §14 REQ-MCP-001
**説明**: MCPサーバーのtoolCategoriesには12カテゴリ（sdd, agent, workflow, skill, knowledge, policy, decision, watch, codeql, team, spaces, assistantAxis）が登録されているが、要件の表には9カテゴリしかない。
**欠落**: watch, codeql, team, spaces, assistantAxis
**修正**: REQ-MCP-001のツールカテゴリ表を12カテゴリに更新。

#### m-10: 要件数統計表の未整合リスク
**セクション**: §23
**説明**: 修正後に要件数が増加するため、サマリ表（合計57件）の更新が必要。

---

## MISSING ITEMS (Requirements to Add)

| 新規要件ID | タイトル | 優先度 | 根拠 |
|-----------|---------|--------|------|
| REQ-CLI-001 | インタラクティブREPL | P1 | AGENTS.md, README v1.6.0 |
| REQ-SDD-005 | プロジェクト初期化 (`init`) | P0 | AGENTS.md 最初のコマンド |
| REQ-COD-005 | テスト生成 (`test generate`) | P0 | AGENTS.md, Article III |
| REQ-LRN-007 | パターン管理（追加/削除） | P1 | AGENTS.md `add-pattern`, `remove-pattern` |
| REQ-LRN-008 | 学習データ エクスポート/インポート | P1 | AGENTS.md `export`, `import` |
| REQ-LRN-009 | レコメンデーション | P1 | AGENTS.md `recommend -a` |
| REQ-INT-004 | Datalog評価エンジン | P1 | README v1.4.5 |
| REQ-INT-005 | セマンティックコードフィルタパイプライン | P1 | README Phase 1 |
| REQ-INT-006 | 幻覚検出 (HallucinationDetector) | P1 | README Phase 1 |
| REQ-MON-003 | 監査ログ (AuditLogger) | P1 | README Phase 3 |

---

## SUMMARY OF FIXES BY PRIORITY

| 優先度 | 件数 | 内容 |
|--------|------|------|
| Critical | 3 | REPL/init/test generate の要件欠落 |
| Major | 6 | EARSパターン違反、CLIコマンド欠落、トレーサビリティ不均一 |
| Minor | 10 | コンポーネント詳細、統合モジュール、MCP カテゴリ補完 |
| 新規追加 | 10 | 参照実装に存在する未定義機能 |

---

## POSITIVE OBSERVATIONS

1. **パッケージ名の正確性**: REQ-PKG-001の全25パッケージ名が `package.json` と完全一致
2. **憲法条項の正確性**: REQ-GOV-001が9条の憲法条項を定義している
3. **C4/EARS/ADR等の基本SDD機能**: 網羅的にカバーされている
4. **優先度分類**: P0/P1/P2の分類が適切
5. **受入基準**: 各要件に具体的なチェックリスト形式の受入基準が付与されている
6. **用語集**: 主要用語が定義されている

---

**End of Review**
