# MUSUBIX2 — Specification Driven Development システム 機能要件定義書

**文書ID**: REQ-MUSUBIX2-001
**プロジェクト**: MUSUBIX2
**バージョン**: 1.5
**作成日**: 2026-04-01
**ステータス**: Draft
**準拠規格**: EARS（Easy Approach to Requirements Syntax）
**参照元**: references/musubix v3.8.2 分析結果

---

## 1. 文書概要

### 1.1 目的

本文書は、ニューロシンボリックAIコーディングシステム「MUSUBIX2」の機能要件を、EARS形式で定義する。references/musubix（v3.8.2）の全25パッケージの分析に基づき、Specification Driven Development（SDD）に必要な全機能を洗い出し、体系化した。

### 1.2 スコープ

本システムの対象範囲：

| カテゴリ | 対象機能 |
|----------|----------|
| **SDD ワークフロー** | 要件定義、設計、タスク分解、実装、完了の5フェーズ管理 |
| **要件分析** | EARS形式変換・検証、オントロジーマッピング |
| **設計生成** | C4ダイアグラム、ADR管理、SOLID検証 |
| **コード生成・検証** | テンプレート生成、静的解析、セキュリティスキャン |
| **トレーサビリティ** | 要件↔設計↔コード↔テスト間の100%追跡 |
| **知識管理** | Git native知識グラフ、ADR、ポリシーエンジン |
| **ニューロシンボリック統合** | LLM（ニューラル）+ 知識グラフ/ルール（シンボリック）統合 |
| **形式検証** | Z3/SMT検証、Lean 4定理証明 |
| **セキュリティ分析** | 脆弱性検出、シークレットスキャン、テイント解析 |
| **学習システム** | Wake-Sleep、ライブラリ学習、ニューラルサーチ、合成 |
| **コードグラフ** | 多言語AST解析、依存関係グラフ、GraphRAG |
| **エージェント連携** | オーケストレーション、エキスパート委譲、スキル管理 |
| **MCP サーバー** | Model Context Protocol対応ツール群 |
| **CLI** | 全機能のコマンドラインインターフェース |
| **ガバナンス** | 憲法条項、ポリシーエンジン、品質ゲート |

### 1.3 EARS パターン凡例

| パターン | 説明 | 構文 |
|----------|------|------|
| **UBIQUITOUS** | 常に満たすべき要件 | THE システム SHALL... |
| **EVENT-DRIVEN** | イベント発生時の要件 | WHEN \<event\>, THE システム SHALL... |
| **STATE-DRIVEN** | 特定状態における要件 | WHILE \<state\>, THE システム SHALL... |
| **UNWANTED** | 回避すべき動作 | THE システム SHALL NOT... |
| **OPTIONAL** | 機能オプション | WHERE \<feature\>, THE システム SHALL... |
| **COMPLEX** | 条件付き要件 | IF \<condition\>, THEN THE システム SHALL... |

### 1.4 優先度定義

| 優先度 | 説明 |
|--------|------|
| **P0** | 必須 — リリースブロッカー |
| **P1** | 重要 — できる限り実装 |
| **P2** | 任意 — 時間があれば実装 |

---

## 2. アーキテクチャ要件

### REQ-ARC-001: モノレポ構成

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL npm workspaces によるモノレポ構成を採用し、
AND THE 各機能 SHALL 独立したパッケージとして `packages/` 配下に配置され、
AND THE パッケージ SHALL TypeScript (5.3+) / Node.js (20+) / ESM で統一される。

**受入基準**:
- [ ] `packages/*` 配下に各機能パッケージが存在
- [ ] ルート `package.json` に `workspaces` 設定
- [ ] `tsc -b` でインクリメンタルビルドが成功
- [ ] 全パッケージが ESM (`type: "module"`)

**トレーサビリティ**: DES-ARC-001
**パッケージ**: `musubix`（workspace root）, 各 `packages/*`
**CLI**: N/A

---

### REQ-ARC-002: ライブラリファースト原則

**種別**: STATE-DRIVEN
**優先度**: P0

**要件**:
WHILE システムが開発される際,
THE 各機能 SHALL 独立したライブラリとして実装され、
AND THE ライブラリ SHALL 独自のテストスイートを持ち、
AND THE ライブラリ SHALL 公開APIを `src/index.ts` からエクスポートし、
AND THE ライブラリ SHALL アプリケーションコードに依存してはならない。

**受入基準**:
- [ ] 各機能が独立パッケージとして実装
- [ ] パッケージごとに独立したテストスイート
- [ ] ライブラリからアプリケーションへの依存が0件
- [ ] 公開APIが `src/index.ts` から一元エクスポート

**トレーサビリティ**: DES-ARC-002
**パッケージ**: `core`, `musubix`, 各 `packages/*`
**CLI**: N/A
**憲法準拠**: Article I（Library-First Principle）

---

### REQ-ARC-003: CLIインターフェース必須

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL すべての主要機能をCLI経由で提供し、
AND THE CLI SHALL `--help` フラグでヘルプを表示し、
AND THE CLI SHALL 一貫した引数パターン（フラグ、オプション）を使用し、
AND THE CLI SHALL 終了コード規約（0=成功、非0=エラー）に従う。

**受入基準**:
- [ ] 全主要機能がCLIコマンドで実行可能
- [ ] `npx musubix --help` で全コマンド一覧表示
- [ ] 各サブコマンドに `--help` オプション
- [ ] 終了コードが 0=成功、非0=エラー

**トレーサビリティ**: DES-ARC-003
**パッケージ**: `core`（`cli/`）
**CLI**: `npx musubix --help`
**憲法準拠**: Article II（CLI Interface Mandate）

---

### REQ-ARC-004: レイヤードアーキテクチャ

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE 各パッケージ SHALL 4層アーキテクチャに従い、
AND THE Domain層 SHALL 他のいかなる層にも依存せず、
AND THE Application層 SHALL Domain層のみに依存し、
AND THE Infrastructure層 SHALL Application層のポートを実装し、
AND THE Interface層 SHALL Application層に依存する。

**受入基準**:
- [ ] Domain層: `domain/` — エンティティ、値オブジェクト、ドメインサービス
- [ ] Application層: `application/` — アプリケーションサービス、DTO
- [ ] Infrastructure層: `infrastructure/` — リポジトリ実装、外部連携
- [ ] Interface層: `cli/`, `mcp/` — CLIハンドラ、MCPハンドラ
- [ ] 依存方向が外→内で統一

**トレーサビリティ**: DES-ARC-004
**パッケージ**: 各 `packages/*`
**CLI**: N/A

---

## 3. SDDワークフロー要件

### REQ-SDD-001: 5フェーズワークフロー管理

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE ワークフローエンジン SHALL 以下の5フェーズを管理し、
Phase 1: 要件定義 → Phase 2: 設計 → Phase 3: タスク分解 → Phase 4: 実装 → Phase 5: 完了
AND THE エンジン SHALL 各フェーズの承認状態を追跡し、
AND THE エンジン SHALL フェーズ遷移時に品質ゲートを実行する。

**受入基準**:
- [ ] 5フェーズの状態遷移管理
- [ ] 各フェーズに承認ステータス（draft → approved）
- [ ] フェーズ遷移時の品質ゲート検証
- [ ] MCPまたは内部API経由でフェーズ状態を取得可能

**トレーサビリティ**: DES-SDD-001
**パッケージ**: `workflow-engine`
**CLI**: N/A

---

### REQ-SDD-002a: 未承認での実装遷移禁止

**種別**: UNWANTED
**優先度**: P0

**要件**:
THE システム SHALL NOT 承認済みの要件定義書・設計書・タスク分解なしに実装フェーズ（Phase 4）への遷移を許可する。

**受入基準**:
- [ ] Phase 2 → Phase 4 の直接遷移が禁止
- [ ] Phase 1〜3 の全承認が前提条件として定義

**トレーサビリティ**: DES-SDD-002a
**パッケージ**: `workflow-engine`（`PhaseController`）
**憲法準拠**: N/A（workflow-engine 前提条件検証）
**CLI**: N/A

---

### REQ-SDD-002b: Phase 4遷移時の承認検証

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN Phase 4（実装）への遷移が要求された場合,
THE ワークフローエンジン SHALL Phase 1（要件定義）、Phase 2（設計）、Phase 3（タスク分解）のすべてが `approved` 状態であることを検証する。

**受入基準**:
- [ ] Phase 1〜3 の承認ステータスチェック
- [ ] 各フェーズにアーティファクトが1件以上存在することの確認
- [ ] `workflow-engine` の `PhaseController` で自動実行

**トレーサビリティ**: DES-SDD-002b
**パッケージ**: `workflow-engine`（`PhaseController`）
**憲法準拠**: N/A（workflow-engine 前提条件検証）
**CLI**: N/A

---

### REQ-SDD-002c: 未承認時のエラー表示

**種別**: COMPLEX
**優先度**: P0

**要件**:
IF Phase 1〜3 のいずれかが未承認の場合,
THEN THE ワークフローエンジン SHALL 遷移をブロックし、不足しているフェーズを明示した詳細なエラーメッセージを表示する。

**受入基準**:
- [ ] 未承認フェーズの一覧表示
- [ ] 日本語エラーメッセージ（`⛔ 実装を開始できません。以下が不足しています:` 形式）
- [ ] ブロッキング（遷移不可）

**トレーサビリティ**: DES-SDD-002c
**パッケージ**: `workflow-engine`（`PhaseController`）
**憲法準拠**: N/A（workflow-engine 前提条件検証）
**CLI**: N/A

---

### REQ-SDD-003: 品質ゲート管理

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN フェーズ遷移が要求された場合,
THE 品質ゲートランナー SHALL 遷移先フェーズに対応する検証ルールを実行し、
AND THE ランナー SHALL 検証結果（pass/fail）とバイオレーション詳細を返却する。

**検証ステージ**:

| ステージ | 検証内容 | トリガー |
|----------|----------|----------|
| 要件 → 設計 | EARS形式、トレーサビリティ | 設計開始前 |
| 設計 → タスク | ライブラリファースト、CLI、プロジェクトメモリ、デザインパターン文書化、ADR記録 | タスク分解前 |
| タスク → 実装 | テストファースト、トレーサビリティ | 実装開始前 |
| 実装 → 完了 | テストファースト、トレーサビリティ、品質ゲート | デプロイ前 |

**受入基準**:
- [ ] 4段階の検証ステージ
- [ ] 各ステージで対応する憲法条項を検証
- [ ] バイオレーション詳細レポート生成
- [ ] ゲート失敗時のブロッキング

**トレーサビリティ**: DES-SDD-003
**パッケージ**: `workflow-engine`（`QualityGateRunner`）
**CLI**: N/A

---

### REQ-SDD-004: アーティファクトステータス管理

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL SDDアーティファクト（要件書、設計書、タスク書）をファイルベースで管理し、
AND THE システム SHALL タスク文書から一覧・統計・構造検証を提供する。

**受入基準**:
- [ ] タスク文書の構造検証
- [ ] タスク一覧表示
- [ ] タスク統計表示（total/completed/remaining）
- [ ] 既定のタスク文書パス指定（`storage/tasks/tasks.md`）
- [ ] CLI: `npx musubix tasks validate <file>`
- [ ] CLI: `npx musubix tasks list [--file <path>]`
- [ ] CLI: `npx musubix tasks stats [--file <path>]`

**トレーサビリティ**: DES-SDD-004
**パッケージ**: `workflow-engine`, `core`（`tasks` CLI）
**CLI**: `npx musubix tasks validate <file>`, `npx musubix tasks list [--file <path>]`, `npx musubix tasks stats [--file <path>]`

---

## 4. プロジェクト初期化要件

### REQ-SDD-005: プロジェクト初期化

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN ユーザーがSDDプロジェクトの初期化を要求した場合,
THE システム SHALL ステアリングファイル、ストレージディレクトリ、設定ファイルを含むSDD対応プロジェクト構造を生成する。

**受入基準**:
- [ ] `steering/` ディレクトリ（product, structure, tech, rules）の生成
- [ ] `storage/specs/` ディレクトリの生成
- [ ] `--name` オプションによるプロジェクト名指定
- [ ] `--force` オプションによる既存ファイル上書き
- [ ] パス指定による任意ディレクトリへの初期化
- [ ] CLI: `npx musubix init [path] [--name <name>] [--force]`

**トレーサビリティ**: DES-SDD-005
**パッケージ**: `core`（`cli/`）
**憲法準拠**: Article VI（Project Memory）
**CLI**: `npx musubix init [path] [--name <name>] [--force]`

---

## 5. 要件分析要件

### REQ-REQ-001: EARS形式要件分析

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 自然言語の要件テキストが入力された場合,
THE 要件分析エンジン SHALL テキストをEARS形式に変換し、
AND THE エンジン SHALL 5つの主要EARSパターン（Event-driven, State-driven, Unwanted, Optional, Ubiquitous）を識別し、
AND THE エンジン SHALL 各パターンの信頼度スコアを計算する。

**信頼度ボーナス**:

| パターン | 構文 | ボーナス |
|----------|------|----------|
| Event-driven | `WHEN <trigger>, THE <system> SHALL <action>` | +0.25 |
| State-driven | `WHILE <state>, THE <system> SHALL <action>` | +0.25 |
| Unwanted | `THE <system> SHALL NOT <behavior>` | +0.20 |
| Optional | `WHERE <feature>, THE <system> SHALL <action>` | +0.20 |
| Ubiquitous | `THE <system> SHALL <action>` | +0.00 |

**受入基準**:
- [ ] 5パターンの正確な識別
- [ ] 信頼度スコアの算出
- [ ] 高信頼度（≥0.85）での早期終了最適化
- [ ] Markdownブロッククォート形式対応
- [ ] 自然言語からEARS変換

**トレーサビリティ**: DES-REQ-001
**パッケージ**: `core`（`requirements/`）
**CLI**: `npx musubix requirements analyze <file>`

---

### REQ-REQ-002: EARS形式検証

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 要件文書が入力された場合,
THE バリデータ SHALL 各要件のEARS構文準拠を検証し、
AND THE バリデータ SHALL 非準拠の要件に対してバイオレーション詳細を報告する。

**受入基準**:
- [ ] EARS構文準拠チェック
- [ ] バイオレーション箇所の特定と報告
- [ ] 修正サジェストの提示
- [ ] 要件マッピング・検索インターフェース
- [ ] CLI: `npx musubix requirements validate <file>`
- [ ] CLI: `npx musubix requirements map|search`

**トレーサビリティ**: DES-REQ-002
**パッケージ**: `core`（`validators/`）
**憲法準拠**: Article IV（EARS Requirements Format）
**CLI**: `npx musubix requirements validate <file>`, `npx musubix requirements map|search`

---

### REQ-REQ-003: 対話的要件作成

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN ユーザーが新規要件作成を要求した場合,
THE システム SHALL 対話的に要件情報を収集し、
AND THE システム SHALL EARS形式の要件文書を自動生成する。

**受入基準**:
- [ ] 対話的要件収集フロー
- [ ] EARS形式での自動出力
- [ ] 受入基準の自動生成
- [ ] CLI: `npx musubix requirements new <feature>`

**トレーサビリティ**: DES-REQ-003
**パッケージ**: `core`（`requirements/`）
**CLI**: `npx musubix requirements new <feature>`

---

## 6. 設計生成要件

### REQ-DES-001: 要件からの設計生成

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 承認済み要件文書が入力された場合,
THE 設計エンジン SHALL 要件から設計文書を自動生成し、
AND THE 設計 SHALL SOLID原則に準拠し、
AND THE 設計 SHALL 要件とのトレーサビリティリンクを含む。

**受入基準**:
- [ ] 要件 → 設計の自動生成
- [ ] SOLID原則準拠検証
- [ ] 要件IDへのトレーサビリティリンク
- [ ] CLI: `npx musubix design generate <requirements>`

**トレーサビリティ**: DES-DES-001
**パッケージ**: `core`（`design/`）
**CLI**: `npx musubix design generate <requirements>`

---

### REQ-DES-002: C4ダイアグラム生成

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 設計文書が入力された場合,
THE システム SHALL C4モデル（Context, Container, Component）のダイアグラムを生成する。

**受入基準**:
- [ ] Context、Container、Componentの3レベル生成
- [ ] 要素と関係の自動抽出
- [ ] CLI: `npx musubix design c4 <file>`

**トレーサビリティ**: DES-DES-002
**パッケージ**: `core`（`design/`）
**CLI**: `npx musubix design c4 <file>`

---

### REQ-DES-003: ADR（Architecture Decision Record）管理

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN アーキテクチャ決定が必要な場合,
THE ADRマネージャ SHALL ADRを作成・管理し、
AND THE マネージャ SHALL ADRのステータス（proposed → accepted → deprecated → superseded）を追跡し、
AND THE マネージャ SHALL ADRの検索・インデクシングを提供する。

**受入基準**:
- [ ] ADR作成（テンプレートベース）
- [ ] ステータスライフサイクル管理
- [ ] 全文検索・フィルタリング
- [ ] CLI: `npx musubix decision create|list|get|accept|deprecate|search|index`

**トレーサビリティ**: DES-DES-003
**パッケージ**: `decisions`
**CLI**: `npx musubix decision create|list|get|accept|deprecate|search|index`

---

### REQ-DES-004: 設計検証

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 設計文書の検証が要求された場合,
THE バリデータ SHALL SOLID原則への準拠を検証し、
AND THE バリデータ SHALL トレーサビリティカバレッジを検証する。

**受入基準**:
- [ ] SOLID準拠チェック
- [ ] トレーサビリティカバレッジ計算
- [ ] バイオレーション報告
- [ ] CLI: `npx musubix design validate <file>`
- [ ] CLI: `npx musubix design traceability [--min-coverage 80]`
- [ ] CLI: `npx musubix design patterns`

**トレーサビリティ**: DES-DES-004
**パッケージ**: `core`（`design/`）
**CLI**: `npx musubix design validate <file>`, `npx musubix design traceability [--min-coverage 80]`, `npx musubix design patterns`

---

## 7. コード生成・解析要件

### REQ-COD-001: コード生成

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 承認済み設計文書が入力された場合,
THE コードジェネレータ SHALL 設計からコードスケルトンを生成し、
AND THE ジェネレータ SHALL テストコードを同時生成するオプションを提供する。

**コード生成テンプレート（12タイプ）**:

| タイプ | 説明 |
|--------|------|
| class | クラス定義 |
| interface | インターフェース |
| function | 関数 |
| module | モジュール |
| test | テストファイル |
| api-endpoint | APIエンドポイント |
| model | データモデル |
| repository | リポジトリ |
| service | サービス層 |
| controller | コントローラ |
| value-object | Value Object（function-based） |
| entity | エンティティ（status transition, counter reset） |

**受入基準**:
- [ ] 12テンプレートタイプの生成
- [ ] `--full-skeleton` オプション
- [ ] `--with-tests` でテスト同時生成
- [ ] CLI: `npx musubix codegen generate <design> [--full-skeleton] [--with-tests]`

**トレーサビリティ**: DES-COD-001
**パッケージ**: `core`（`codegen/`）
**CLI**: `npx musubix codegen generate <design> [--full-skeleton] [--with-tests]`

---

### REQ-COD-002: 静的解析

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN コードパスが指定された場合,
THE 解析エンジン SHALL ソースコードの静的解析を実行し、
AND THE エンジン SHALL コード品質メトリクスを報告する。

**受入基準**:
- [ ] コード品質メトリクス算出
- [ ] 問題箇所の特定
- [ ] CLI: `npx musubix codegen analyze <path>`

**トレーサビリティ**: DES-COD-002
**パッケージ**: `core`（`codegen/`）
**CLI**: `npx musubix codegen analyze <path>`

---

### REQ-COD-003: セキュリティスキャン

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN コードパスが指定された場合,
THE セキュリティスキャナ SHALL 脆弱性・シークレット・テイント解析を実行し、
AND THE スキャナ SHALL 脅威レベルと修正提案を含むレポートを生成する。

**スキャン機能**:

| 機能 | 説明 |
|------|------|
| 脆弱性スキャン | SAST、SCA、コンテナ、IaC |
| シークレット検出 | ハードコードされた資格情報の検出 |
| テイント解析 | データフロー追跡による汚染伝播分析 |
| 依存関係監査 | CVEデータベース照合 |
| コンプライアンス | セキュリティポリシー準拠チェック |
| AI解析 | AIモデル固有のセキュリティ問題 |

**受入基準**:
- [ ] 6種類のセキュリティスキャン
- [ ] 脅威レベル分類（Critical/High/Medium/Low）
- [ ] 修正提案の自動生成
- [ ] CVEキャッシュによる高速照合
- [ ] CLI: `npx musubix codegen security <path>`

**トレーサビリティ**: DES-COD-003
**パッケージ**: `security`
**CLI**: `npx musubix codegen security <path>`

---

### REQ-COD-004: ドメインスキャフォールド

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN ドメインモデル名が指定された場合,
THE スキャフォールダ SHALL DDDパターンに基づくプロジェクト構造を自動生成する。

**受入基準**:
- [ ] ドメインモデルスキャフォールド（エンティティ、VO、ステータス遷移指定）
- [ ] ミニマルスキャフォールド
- [ ] APIサービススキャフォールド
- [ ] CLI: `npx musubix scaffold domain-model|minimal|api-service <name>`

**トレーサビリティ**: DES-COD-004
**パッケージ**: `core`（`codegen/`）
**CLI**: `npx musubix scaffold domain-model|minimal|api-service <name>`

---

### REQ-COD-005: テスト生成

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN ソースコードパスが指定された場合,
THE テストジェネレータ SHALL 対象コードに対応するテストファイルを自動生成する。

**受入基準**:
- [ ] ソースコードからのテストケース自動生成
- [ ] EARS要件IDとの紐付け
- [ ] テストファイルの適切な配置（対応ソースファイルと同ディレクトリまたはtests/）
- [ ] Vitest形式でのテスト出力
- [ ] CLI: `npx musubix test generate <path>`
- [ ] CLI: `npx musubix test coverage`

**トレーサビリティ**: DES-COD-005
**パッケージ**: `core`（`codegen/`）
**憲法準拠**: Article III（Test-First Imperative）
**CLI**: `npx musubix test generate <path>`, `npx musubix test coverage`

---

### REQ-COD-006: ステータス遷移分析

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN 仕様ファイルが指定された場合,
THE 解析エンジン SHALL エンティティのステータス遷移を抽出し可視化する。

**受入基準**:
- [ ] 仕様からのステータス遷移抽出
- [ ] `--enum` オプションによるEnum定義出力
- [ ] CLI: `npx musubix codegen status <spec> [--enum]`

**トレーサビリティ**: DES-COD-006
**パッケージ**: `core`（`codegen/`）
**CLI**: `npx musubix codegen status <spec> [--enum]`

---

## 8. トレーサビリティ要件

### REQ-TRC-001: 100%トレーサビリティ管理

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL 要件↔設計↔コード↔テスト間の100%トレーサビリティを維持し、
AND THE システム SHALL 各アーティファクトに一意なID体系（REQ-XXX-NNN, DES-XXX-NNN, TSK-XXX-NNN）を適用し、
AND THE システム SHALL カバレッジを重み付け平均で算出する。

**カバレッジ計算（重み付け平均）**:

| アーティファクト | 重み |
|-----------------|------|
| 要件 | 30% |
| 設計 | 20% |
| コード | 30% |
| テスト | 20% |

**受入基準**:
- [ ] 一意ID体系の適用
- [ ] 双方向トレーサビリティリンク
- [ ] カバレッジ率の自動計算
- [ ] トレーサビリティマトリクス生成
- [ ] リンクインデックスによるO(1)検索

**トレーサビリティ**: DES-TRC-001
**パッケージ**: `core`（`traceability/`）
**憲法準拠**: Article V（Traceability Mandate）
**CLI**: N/A

---

### REQ-TRC-002: トレーサビリティマトリクス

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN トレーサビリティマトリクスの生成が要求された場合,
THE システム SHALL 全アーティファクト間のリンクマトリクスを生成し、
AND THE システム SHALL カバレッジギャップを報告する。

**受入基準**:
- [ ] マトリクス生成（YAML/Markdown出力）
- [ ] カバレッジギャップの自動検出
- [ ] CLI: `npx musubix trace matrix [-p <project>]`

**トレーサビリティ**: DES-TRC-002
**パッケージ**: `core`（`traceability/`）
**CLI**: `npx musubix trace matrix [-p <project>]`

---

### REQ-TRC-003: トレーサビリティ検証・同期

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN トレーサビリティ検証が要求された場合,
THE システム SHALL ソースコード・テストファイルからトレーサビリティIDを抽出し、
AND THE システム SHALL マトリクスとの整合性を検証する。

**ID抽出パターン**:
- `REQ-[A-Z0-9]+-\d{3}`
- `IMP-\d+\.\d+-\d{3}(?:-\d{2})?`

**受入基準**:
- [ ] ソースコード・テストからのID自動抽出
- [ ] マトリクスとの整合性検証
- [ ] 同期（`--dry-run` オプション付き）
- [ ] 影響範囲分析
- [ ] CLI: `npx musubix trace validate && npx musubix trace sync [--dry-run]`
- [ ] CLI: `npx musubix trace impact`

**トレーサビリティ**: DES-TRC-003
**パッケージ**: `core`（`traceability/`）
**CLI**: `npx musubix trace validate`, `npx musubix trace sync [--dry-run]`, `npx musubix trace impact`

---

## 9. 知識管理要件

### REQ-KNW-001: 知識グラフストア

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE 知識ストア SHALL Git nativeなJSON形式でエンティティ・リレーションを永続化し、
AND THE ストア SHALL CRUD操作・検索・トラバーサルを提供し、
AND THE ストア SHALL ファイルベースの永続化（`.knowledge/graph.json`）を行う。

**受入基準**:
- [ ] エンティティ・リレーションのCRUD
- [ ] 検索・クエリ機能
- [ ] グラフトラバーサル
- [ ] JSON形式でのGit friendly永続化
- [ ] CLI: `npx musubix knowledge add|get|delete|query|traverse|stats|link`

**トレーサビリティ**: DES-KNW-001
**パッケージ**: `knowledge`
**CLI**: `npx musubix knowledge add|get|delete|query|traverse|stats|link`

---

### REQ-KNW-002: ポリシーエンジン

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE ポリシーエンジン SHALL 憲法条項（9条）に基づくバリデーションルールを実行し、
AND THE エンジン SHALL バイオレーション検出時にセバリティ付きレポートを生成し、
AND THE エンジン SHALL 自動修正機能を提供する。

**受入基準**:
- [ ] 9条の憲法ポリシーの検証
- [ ] セバリティレベル（Blocker/Warning/Info）
- [ ] 自動修正（FixResult）
- [ ] CLI: `npx musubix policy validate|list|info|check`

**トレーサビリティ**: DES-KNW-002
**パッケージ**: `policy`
**憲法準拠**: Article I〜IX
**CLI**: `npx musubix policy validate|list|info|check`

---

### REQ-KNW-003: プロジェクトメモリ（ステアリング）

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL プロジェクトメモリ（steering/）を参照してからコード生成・設計を行い、
AND THE ステアリングファイル SHALL プロダクトコンテキスト、構造、技術スタックを定義する。

**ステアリングファイル構成**:

| ファイル | 役割 | 参照タイミング |
|----------|------|----------------|
| `steering/product.ja.md` | プロダクトコンテキスト | プロジェクト理解時 |
| `steering/structure.ja.md` | アーキテクチャパターン | 設計・実装時 |
| `steering/tech.ja.md` | 技術スタック | 技術選定時 |
| `steering/rules/*.md` | 憲法ガバナンス | コード生成時 |
| `steering/project.yml` | プロジェクト設定 | 常時 |

**受入基準**:
- [ ] ステアリングファイルの生成テンプレート
- [ ] 全スキルがステアリング参照後に実行
- [ ] ステアリング更新時の整合性チェック

**トレーサビリティ**: DES-KNW-003
**パッケージ**: `core`（`cli/`、steering読み込み）
**憲法準拠**: Article VI（Project Memory）
**CLI**: N/A

---

## 10. ニューロシンボリック統合要件

### REQ-INT-001: ニューロシンボリック統合レイヤー

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE 統合レイヤー SHALL ニューラル（LLM）結果とシンボリック（知識グラフ/ルール）結果を統合し、
AND THE レイヤー SHALL 以下の決定ルールに従う:

| シンボリック結果 | ニューラル信頼度 | 最終決定 |
|-----------------|-----------------|---------|
| invalid | - | ニューラル結果を棄却 |
| valid | ≥0.8 | ニューラル結果を採用 |
| valid | <0.8 | シンボリック結果を優先 |

**受入基準**:
- [ ] シンボリック検証による棄却ゲート
- [ ] 信頼度閾値に基づく結果選択
- [ ] 統合結果の説明生成
- [ ] 信頼度スコアのトレース

**トレーサビリティ**: DES-INT-001
**パッケージ**: `core`（`symbolic/`）
**CLI**: N/A

---

### REQ-INT-002: オントロジー推論

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN オントロジークエリが実行された場合,
THE オントロジーエンジン SHALL OWL 2 RL推論を実行し、
AND THE エンジン SHALL SPARQL風クエリインターフェースを提供し、
AND THE エンジン SHALL N3/Turtle形式のオントロジーをサポートする。

**受入基準**:
- [ ] OWL 2 RL推論エンジン
- [ ] トリプルストア（追加・検索・削除）
- [ ] 整合性チェック
- [ ] プライバシー保護機能
- [ ] CLI: `npx musubix ontology validate|check-circular|stats`

**トレーサビリティ**: DES-INT-002
**パッケージ**: `ontology-mcp`
**CLI**: `npx musubix ontology validate|check-circular|stats`

---

### REQ-INT-003: SDDオントロジー

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE SDDオントロジー SHALL EARS、C4、トレーサビリティのフォーマルな表現をTurtle形式で提供し、
AND THE オントロジー SHALL ローダとバリデータを含む。

**オントロジーモジュール**:

| モジュール | 対象 |
|-----------|------|
| core | SDD基本概念 |
| ears | EARS要件パターン |
| c4 | C4アーキテクチャモデル |
| traceability | トレーサビリティリンク |

**受入基準**:
- [ ] 4モジュールのTurtle定義
- [ ] ローダ（動的読み込み）
- [ ] バリデータ（構文・セマンティクス検証）
- [ ] CLI: `npx musubix ontology validate|check-circular|stats`

**トレーサビリティ**: DES-INT-003
**パッケージ**: `sdd-ontology`
**CLI**: `npx musubix ontology validate|check-circular|stats`

---

## 11. 形式検証要件

### REQ-FV-001: Z3/SMT検証

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN 要件または設計の形式検証が要求された場合,
THE 形式検証エンジン SHALL EARS要件をSMT式に変換し、
AND THE エンジン SHALL Z3ソルバーで充足可能性を検証し、
AND THE エンジン SHALL 検証結果とカウンターエグザンプルを報告する。

**受入基準**:
- [ ] EARS → SMT変換
- [ ] Z3ソルバー統合
- [ ] 事前条件/事後条件の検証
- [ ] トレーサビリティリンク付き検証結果

**トレーサビリティ**: DES-FV-001
**パッケージ**: `formal-verify`
**CLI**: N/A

---

### REQ-FV-002: Lean 4定理証明

**種別**: EVENT-DRIVEN
**優先度**: P2

**要件**:
WHEN Lean 4ベースの形式検証が要求された場合,
THE Lean統合エンジン SHALL EARS要件をLean 4定理に変換し、
AND THE エンジン SHALL 証明の生成と検証を行い、
AND THE エンジン SHALL 証明結果をトレーサビリティシステムに統合する。

**受入基準**:
- [ ] EARS → Lean 4変換
- [ ] 環境検出（Lean 4インストール確認）
- [ ] 証明生成・検証
- [ ] ハイブリッド検証（Z3 + Lean 4）
- [ ] レポート生成

**トレーサビリティ**: DES-FV-002
**パッケージ**: `lean`
**CLI**: N/A

---

## 12. コードグラフ要件

### REQ-CG-001: 多言語コードグラフ解析

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN コードパスが指定された場合,
THE コードグラフエンジン SHALL 16言語のソースコードをAST解析し、
AND THE エンジン SHALL 依存関係・呼び出しグラフ・実装グラフを構築する。

**対応言語（16言語）**:
C, C++, C#, Go, HCL, Java, Kotlin, Lua, PHP, Python, Ruby, Rust, Scala, Swift, TypeScript, JavaScript

**受入基準**:
- [ ] 16言語のTree-sitterベースAST解析
- [ ] 依存関係グラフ構築
- [ ] 呼び出しグラフ構築
- [ ] GraphRAGセマンティック検索
- [ ] ストレージ（メモリ、SQLite、知識グラフアダプタ）
- [ ] CLI: `npx musubix cg index|query|search|deps|callers|callees|languages|stats`

**トレーサビリティ**: DES-CG-001
**パッケージ**: `codegraph`
**CLI**: `npx musubix cg index|query|search|deps|callers|callees|languages|stats`

---

### REQ-CG-002: データフロー/制御フロー解析

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN ソースコードの解析が要求された場合,
THE DFGエンジン SHALL データフローグラフ（DFG）と制御フローグラフ（CFG）を構築する。

**受入基準**:
- [ ] DFG構築
- [ ] CFG構築
- [ ] 解析結果のクエリインターフェース

**トレーサビリティ**: DES-CG-002
**パッケージ**: `dfg`
**CLI**: N/A

---

### REQ-CG-003: テスト配置検証

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN テスト配置検証が要求された場合,
THE バリデータ SHALL テストファイルの適切な配置（対応するソースファイルとの関連）を検証する。

**受入基準**:
- [ ] テストファイルとソースファイルの対応検証
- [ ] 不足テストの検出
- [ ] レポート生成

**トレーサビリティ**: DES-CG-003
**パッケージ**: `codegraph`（`validator/`）
**CLI**: N/A

---

## 13. 学習システム要件

### REQ-LRN-001: 自己学習システム

**種別**: STATE-DRIVEN
**優先度**: P1

**要件**:
WHILE システムが稼働中,
THE 学習システム SHALL コード生成・設計・テストのパターンを収集・学習し、
AND THE システム SHALL ベストプラクティスとして蓄積する。

**学習済みパターンカテゴリ**:

| カテゴリ | 例 |
|----------|-----|
| コード | Entity Input DTO, Date-based ID, Value Objects, Result Type |
| 設計 | Status Transition Map, Repository Async, Service Layer DI |
| テスト | Test Counter Reset, Vitest ESM Configuration |

**受入基準**:
- [ ] パターン収集・蓄積
- [ ] ベストプラクティスCLI（一覧・詳細・フィルタ）
- [ ] 信頼度スコア付きパターン管理
- [ ] レコメンデーション機能（コード/設計/テスト）
- [ ] パターン追加・削除
- [ ] カテゴリ別フィルタリング
- [ ] CLI: `npx musubix learn status|dashboard|patterns|best-practices|bp-list|bp-show|recommend|add-pattern|remove-pattern`

**トレーサビリティ**: DES-LRN-001
**パッケージ**: `core`（`learning/`）
**CLI**: `npx musubix learn status|dashboard|patterns|best-practices|bp-list|bp-show|recommend|add-pattern|remove-pattern`

---

### REQ-LRN-002: Wake-Sleepサイクル

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN Wake-Sleepサイクルが起動された場合,
THE Wakeフェーズ SHALL パターンを抽出・圧縮し、
AND THE Sleepフェーズ SHALL パターンを統合・プルーニングし、
AND THE サイクルマネージャ SHALL リソース制約の中で学習を最適化する。

**受入基準**:
- [ ] Wakeフェーズ（パターン抽出・圧縮）
- [ ] Sleepフェーズ（統合・プルーニング）
- [ ] サイクル管理（リソース制御）
- [ ] 学習データのエクスポート・インポート
- [ ] CLI: `npx musubix learn wake|sleep|cycle|compress|decay|feedback|export|import`

**トレーサビリティ**: DES-LRN-002
**パッケージ**: `wake-sleep`
**CLI**: `npx musubix learn wake|sleep|cycle|compress|decay|feedback|export|import`

---

### REQ-LRN-003: ライブラリ学習（DreamCoder方式）

**種別**: EVENT-DRIVEN
**優先度**: P2

**要件**:
WHEN ライブラリ学習が要求された場合,
THE ライブラリラーナー SHALL コードコーパスから再利用可能な抽象パターンを学習し、
AND THE ラーナー SHALL E-graphベースの等価性探索を行い、
AND THE ラーナー SHALL 階層的ライブラリを構築する。

**受入基準**:
- [ ] パターンマイニング・抽象化
- [ ] E-graph等価性探索
- [ ] 階層的ライブラリ構築
- [ ] インクリメンタル更新
- [ ] CLI: `npx musubix library learn|query|stats`

**トレーサビリティ**: DES-LRN-003
**パッケージ**: `library-learner`
**CLI**: `npx musubix library learn|query|stats`

---

### REQ-LRN-004: ニューラルサーチ

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN セマンティック検索が要求された場合,
THE ニューラルサーチエンジン SHALL 埋め込みベースの類似度検索を実行し、
AND THE エンジン SHALL 学習ベースのプルーニングで精度を向上させる。

**受入基準**:
- [ ] 埋め込みベース類似度スコアリング
- [ ] 学習ベースプルーニング
- [ ] キャッシュ機能
- [ ] フュージョン（複数ソース統合）

**トレーサビリティ**: DES-LRN-004
**パッケージ**: `neural-search`
**CLI**: N/A

---

### REQ-LRN-005: プログラム合成

**種別**: EVENT-DRIVEN
**優先度**: P2

**要件**:
WHEN 入出力例が提供された場合,
THE 合成エンジン SHALL DSLベースのプログラム合成（PBE）を実行し、
AND THE エンジン SHALL ウィットネス関数で探索空間を削減し、
AND THE エンジン SHALL バージョンスペースで仮説を管理する。

**受入基準**:
- [ ] DSLビルダー・型システム
- [ ] PBE（Programming by Example）合成
- [ ] ウィットネス関数
- [ ] バージョンスペース管理
- [ ] ルール学習・メタ学習
- [ ] CLI: `npx musubix synthesize <examples.json>`

**トレーサビリティ**: DES-LRN-005
**パッケージ**: `synthesis`
**CLI**: `npx musubix synthesize <examples.json>`

---

### REQ-LRN-006: パターン抽出MCP

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN ASTベースのパターン抽出が要求された場合,
THE パターンMCP SHALL ソースコードからデザインパターンを抽出・分類し、
AND THE MCP SHALL パターン圧縮・学習・プライバシー保護を提供する。

**受入基準**:
- [ ] ASTパターン抽出
- [ ] パターンライブラリ管理
- [ ] 圧縮・学習
- [ ] 並行パターン検出
- [ ] プライバシー保護

**トレーサビリティ**: DES-LRN-006
**パッケージ**: `pattern-mcp`
**CLI**: N/A

---

## 14. エージェント・オーケストレーション要件

### REQ-AGT-001: サブエージェントオーケストレーション

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN 複雑なタスクが受信された場合,
THE オーケストレータ SHALL タスクを分解し、
AND THE オーケストレータ SHALL 適切なサブエージェントにディスパッチし、
AND THE オーケストレータ SHALL 並列実行とコンテキスト共有を管理し、
AND THE オーケストレータ SHALL 結果を集約する。

**受入基準**:
- [ ] タスク分解（複雑度分析、依存関係分析）
- [ ] サブエージェントディスパッチ
- [ ] 並列実行エンジン
- [ ] コンテキストマネージャ
- [ ] 結果アグリゲータ
- [ ] ワークストリーム管理

**トレーサビリティ**: DES-AGT-001
**パッケージ**: `agent-orchestrator`
**CLI**: N/A

---

### REQ-AGT-002: エキスパート委譲

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN タスクが専門性を要する場合,
THE エキスパート委譲エンジン SHALL セマンティックルーティングで適切なエキスパートを選択し、
AND THE エンジン SHALL VS Code LM APIまたは外部LLMプロバイダを通じてタスクを委譲する。

**7エキスパート**:

| エキスパート | 専門領域 |
|-------------|---------|
| Architect | システムアーキテクチャ |
| Security | セキュリティ分析 |
| Code Reviewer | コードレビュー |
| Plan Reviewer | プランレビュー |
| EARS Analyst | EARS要件分析 |
| Formal Verifier | 形式検証 |
| Ontology Reasoner | オントロジー推論 |

**受入基準**:
- [ ] 7エキスパートの定義と実装
- [ ] セマンティックルーター
- [ ] プロアクティブ委譲（自動トリガー）
- [ ] アドバイザリーモード / 実装モード
- [ ] リトライハンドラ

**トレーサビリティ**: DES-AGT-002
**パッケージ**: `expert-delegation`
**CLI**: N/A

---

### REQ-AGT-003: ワークフローエンジン

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE ワークフローエンジン SHALL フェーズ遷移制御、状態追跡、品質ゲート実行を提供する。

**コンポーネント**:

| コンポーネント | 役割 |
|--------------|------|
| PhaseController | フェーズ遷移制御・前提条件チェック |
| StateTracker | 現在のワークフロー状態追跡 |
| QualityGateRunner | 品質ゲート検証実行 |

**受入基準**:
- [ ] PhaseController（遷移制御、前提条件強制）
- [ ] StateTracker（状態追跡）
- [ ] QualityGateRunner（品質ゲート実行）

**トレーサビリティ**: DES-AGT-003
**パッケージ**: `workflow-engine`
**CLI**: N/A

---

### REQ-AGT-004: スキル管理

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE スキルマネージャ SHALL スキルの登録・読み込み・検証・実行を管理し、
AND THE システム SHALL `.github/skills` ディレクトリベースのスキル配布形式をサポートする。

**CLIで管理されるスキル機能**:

| 項目 | 内容 |
|------|------|
| スキル配置 | `.github/skills/<skill-name>/SKILL.md` |
| メタデータ | YAML frontmatter（`name`, `description` 必須） |
| 操作 | list / validate / create |
| テンプレート生成 | `skills create` による雛形生成 |

**受入基準**:
- [ ] スキルレジストリ
- [ ] スキル読み込み（動的ロード）
- [ ] スキル検証（スキーマ準拠チェック）
- [ ] スキル作成（テンプレート生成）
- [ ] `.github/skills` ディレクトリ構造のサポート
- [ ] CLI: `npx musubix skills list|validate|create`

**トレーサビリティ**: DES-AGT-004
**パッケージ**: `skill-manager`
**CLI**: `npx musubix skills list|validate|create`

---

### REQ-AGT-005: ペルソナ安定化

**種別**: STATE-DRIVEN
**優先度**: P1

**要件**:
WHILE AIアシスタントが稼働中,
THE ペルソナモニタ SHALL ペルソナドリフトを検出し、
AND THE アイデンティティマネージャ SHALL アシスタントの一貫性を維持する。

**受入基準**:
- [ ] ドリフト検出（DriftAnalyzer）
- [ ] ドメイン分類（DomainClassifier）
- [ ] アイデンティティ管理（IdentityManager）
- [ ] ペルソナモニタリング
- [ ] メトリクスエクスポート

**トレーサビリティ**: DES-AGT-005
**パッケージ**: `assistant-axis`
**CLI**: N/A

---

## 15. MCPサーバー要件

### REQ-MCP-001: Model Context Protocolサーバー

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE MCPサーバー SHALL 105以上のMCPツールをAIプラットフォームに公開し（※参照実装 `getAllTools()` 実数に基づく）、
AND THE サーバー SHALL ツール・プロンプト・リソースの3種類のMCPプリミティブを提供する。

**ツールカテゴリ**:

| カテゴリ | 内容 |
|----------|------|
| SDD | 要件分析、設計生成、コード生成、トレーサビリティ |
| Knowledge | 知識グラフ操作 |
| Policy | ポリシー検証 |
| Decision | ADR管理 |
| Symbolic | シンボリック推論 |
| Ontology | オントロジー操作 |
| Agent | エージェント操作 |
| Workflow | ワークフロー管理 |
| Skill | スキル実行 |
| Watch | ファイル監視 |
| CodeQL | CodeQL統合 |
| Team | チーム管理 |
| Spaces | スペース管理 |
| AssistantAxis | ペルソナ安定化 |

**受入基準**:
- [ ] MCP SDK統合（`@modelcontextprotocol/sdk`）
- [ ] 105+ツール定義
- [ ] プロンプト・リソース提供
- [ ] プラットフォームアダプタ
- [ ] CLI: `npx musubix-mcp`

**トレーサビリティ**: DES-MCP-001
**パッケージ**: `mcp-server`
**CLI**: `npx musubix-mcp`

---

## 16. ディープリサーチ要件

### REQ-RSC-001: 反復的リサーチエンジン

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN リサーチクエリが入力された場合,
THE リサーチエンジン SHALL 検索→読解→推論の反復ループを実行し、
AND THE エンジン SHALL 複数プロバイダ（Jina, Brave, DuckDuckGo, VS Code LM, Expert）を統合し、
AND THE エンジン SHALL セキュアな推論とレポート生成を行う。

**受入基準**:
- [ ] 反復的検索-読解-推論ループ
- [ ] 複数検索プロバイダ統合
- [ ] 知識ベース蓄積
- [ ] セキュリティフィルタリング
- [ ] レポート生成
- [ ] CLI: `npx musubix deep-research <query> [-i <iterations>] [-o <file>]`

**トレーサビリティ**: DES-RSC-001
**パッケージ**: `deep-research`
**CLI**: `npx musubix deep-research <query> [-i <iterations>] [-o <file>]`

---

## 16.5 スキルハーネス要件

### REQ-SKL-001: スキルランタイム契約

**種別**: UBIQUITOUS
**優先度**: P1

**要件**:
THE スキル実行環境 SHALL 全Agent Skillsに共通のランタイム契約を提供し、
AND THE 契約 SHALL 実行・検証・初期化・後処理に加えて入力/出力スキーマと能力宣言を自己記述できる。

**受入基準**:
- [ ] SkillRuntimeContract が SkillExecutor を拡張
- [ ] 入力/出力スキーマの自己記述API
- [ ] 能力宣言API
- [ ] 実行メトリクスとエラー表現を共通化
- [ ] CLI: `npx musubix skills execute <name> [--input <json>] [--dry-run] [--timeout <ms>]`

**トレーサビリティ**: DES-SKL-001
**パッケージ**: `skill-manager`
**CLI**: `npx musubix skills execute <name> [--input <json>] [--dry-run] [--timeout <ms>]`

---

### REQ-SKL-002: スキルI/Oスキーマ

**種別**: UBIQUITOUS
**優先度**: P1

**要件**:
THE スキルシステム SHALL SKILL.md のfrontmatterから型付きI/Oスキーマを導出し、
AND THE システム SHALL 実行時バリデーションとMCP入力スキーマ生成に同一スキーマを利用する。

**受入基準**:
- [ ] frontmatter から SkillIOSchema を生成
- [ ] JSON Schema互換表現
- [ ] 実行時バリデーション
- [ ] MCP ToolDefinition inputSchema 生成
- [ ] CLI: `npx musubix skills schema <name> [--format json|yaml]`

**トレーサビリティ**: DES-SKL-002
**パッケージ**: `skill-manager`
**CLI**: `npx musubix skills schema <name> [--format json|yaml]`

---

### REQ-SKL-003: スキルテストハーネス

**種別**: UBIQUITOUS
**優先度**: P1

**要件**:
THE システム SHALL スキルを分離環境で決定論的に実行できるテストハーネスを提供し、
AND THE ハーネス SHALL モック注入・ライフサイクル検証・メトリクス収集をサポートする。

**受入基準**:
- [ ] SkillTestHarness の提供
- [ ] モック依存注入
- [ ] deterministic mode / seed 指定
- [ ] init/validate/execute/teardown の検証
- [ ] CLI: `npx musubix skills test <name> [--input <json>] [--deterministic] [--seed <n>]`

**トレーサビリティ**: DES-SKL-003
**パッケージ**: `skill-manager`, `workflow-engine`
**CLI**: `npx musubix skills test <name> [--input <json>] [--deterministic] [--seed <n>]`

---

### REQ-SKL-004: Agent-Skillルーティング

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN エージェントタスクが分解または委譲される場合,
THE システム SHALL 必要能力に基づいて適切なスキル候補を解決し、
AND THE システム SHALL スキル候補を信頼度付きで順位付けできる。

**受入基準**:
- [ ] SkillRouter による解決
- [ ] CapabilityMatcher による能力照合
- [ ] 複数候補のランク付け
- [ ] SubagentSpec / ExpertType からの変換
- [ ] CLI: `npx musubix skills resolve <task-description> [--capabilities <cap1,cap2>]`

**トレーサビリティ**: DES-SKL-004
**パッケージ**: `agent-orchestrator`, `expert-delegation`, `skill-manager`
**CLI**: `npx musubix skills resolve <task-description> [--capabilities <cap1,cap2>]`

---

### REQ-SKL-005: MCP-Skillブリッジ

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN スキルが追加・更新・削除された場合,
THE システム SHALL SKILL.md からMCP ToolDefinition を自動生成してMCPサーバーへ同期し、
AND THE システム SHALL スキル実行をMCPツールとして公開する。

**受入基準**:
- [ ] SkillToMCPBridge による自動登録
- [ ] SKILL.md から ToolDefinition 生成
- [ ] 追加/更新/削除の同期
- [ ] SkillManager.execute() 経由の実行
- [ ] CLI: `npx musubix skills mcp-sync [--watch]`

**トレーサビリティ**: DES-SKL-005
**パッケージ**: `mcp-server`, `skill-manager`
**CLI**: `npx musubix skills mcp-sync [--watch]`

---

### REQ-SKL-006: スキル依存・バージョン管理

**種別**: UBIQUITOUS
**優先度**: P1

**要件**:
THE スキルマネージャ SHALL スキル依存関係とバージョン互換性を検証し、
AND THE システム SHALL 循環依存・欠落依存・非互換バージョンを検出して報告する。

**受入基準**:
- [ ] 依存解決
- [ ] 欠落依存の検出
- [ ] 循環依存の検出
- [ ] 互換性マトリクスの生成
- [ ] CLI: `npx musubix skills deps <name> [--tree]`

**トレーサビリティ**: DES-SKL-006
**パッケージ**: `skill-manager`
**CLI**: `npx musubix skills deps <name> [--tree]`

---

## 17. ガバナンス要件

### REQ-GOV-001: 憲法ガバナンス

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL 以下の9条の憲法条項を強制する:

| 条項 | 原則 | 強制手段 |
|------|------|----------|
| Article I | ライブラリファースト | `constitution-enforcer` |
| Article II | CLIインターフェース | `constitution-enforcer` |
| Article III | テストファースト | `constitution-enforcer`, `test-engineer` |
| Article IV | EARS形式 | `constitution-enforcer`, `requirements-analyst` |
| Article V | トレーサビリティ | `traceability-auditor` |
| Article VI | プロジェクトメモリ | 全スキル |
| Article VII | デザインパターン文書化 | `policy` |
| Article VIII | ADR記録 | `policy`, `decisions` |
| Article IX | 品質ゲート | `policy`, `workflow-engine` |

**受入基準**:
- [ ] 9条の全条項を検証可能
- [ ] 条項違反時のブロッキング
- [ ] 設計パターン・ADR・品質ゲートの検証
- [ ] 憲法条項は不変（修正プロセスは別途定義）

**トレーサビリティ**: DES-GOV-001
**パッケージ**: `policy`, `workflow-engine`
**CLI**: `npx musubix policy validate|list|info|check`

---

### REQ-GOV-002: テストファースト強制

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL テストファースト（Red-Green-Blue）開発サイクルを強制し、
AND THE システム SHALL テストカバレッジ80%以上を要求する。

**受入基準**:
- [ ] テストファーストサイクルの強制
- [ ] カバレッジ80%以上のゲートチェック
- [ ] 全EARS要件に対応するテストの存在確認

**トレーサビリティ**: DES-GOV-002
**パッケージ**: `policy`, `workflow-engine`
**憲法準拠**: Article III, Article IX
**CLI**: `npx musubix policy validate|check`

---

## 18. 説明生成要件

### REQ-EXP-001: 推論説明生成

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN 推論結果の説明が要求された場合,
THE 説明エンジン SHALL 推論グラフを構築し、
AND THE エンジン SHALL 人間が理解可能な説明を生成する。

**受入基準**:
- [ ] 推論グラフ構築
- [ ] 自然言語説明生成
- [ ] CLI: `npx musubix explain why|graph <id>`

**トレーサビリティ**: DES-EXP-001
**パッケージ**: `core`（`explanation/`）
**CLI**: `npx musubix explain why|graph <id>`

---

## 19. ドメインサポート要件

### REQ-DOM-001: 62ドメイン対応

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL 62業種ドメイン・約430コンポーネントのテンプレートを提供する。

**ドメインカテゴリ（主要）**:

| カテゴリ | 例 |
|----------|-----|
| 汎用 | general |
| 業種特化 | healthcare, banking, manufacturing, logistics |
| 教育 | education, elearning |
| エンタメ | game, music, streaming |
| 交通 | travel, aviation, railway |
| IT | telecom, iot, security |

**受入基準**:
- [ ] 62ドメイン定義
- [ ] 約430コンポーネントテンプレート
- [ ] ドメイン別スキャフォールド生成

**トレーサビリティ**: DES-DOM-001
**パッケージ**: `core`（`codegen/`）, `sdd-ontology`
**CLI**: N/A

---

## 20. パフォーマンス要件

### REQ-PER-001: 処理性能

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL 以下の性能基準を満たす:

| 機能 | 目標 |
|------|------|
| EARS検証（単一要件） | <1ms |
| パターンマッチング | <5ms |
| トレーサビリティリンク検索 | O(1) |
| C4モデル生成 | <10ms |
| 全テスト実行 | <数秒 |

**受入基準**:
- [ ] ベンチマークテスト（`npx musubix perf benchmark|startup|memory|cache-stats|cache-clear`）
- [ ] 各機能が目標値以内

**トレーサビリティ**: DES-PER-001
**パッケージ**: `core`（`perf/`）
**CLI**: `npx musubix perf benchmark|startup|memory|cache-stats|cache-clear`

---

## 21. インフラストラクチャ要件

### REQ-INF-001: ビルド・テスト・CI

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL 以下のビルド・テスト・品質ツールチェーンを提供する:

| ツール | 用途 |
|--------|------|
| `tsc -b` | TypeScriptインクリメンタルビルド |
| Vitest | テストランナー（5,738+テスト） |
| ESLint | リンター（strict, 120文字） |
| Prettier | フォーマッタ |

**受入基準**:
- [ ] `npm run build` — 全パッケージビルド
- [ ] `npm run test` — 全テスト実行
- [ ] `npm run lint` — リント
- [ ] `npm run typecheck` — 型チェック
- [ ] `npm run format` — フォーマット
- [ ] `npm run clean` — クリーンアップ

**トレーサビリティ**: DES-INF-001
**パッケージ**: `musubix`（workspace root）, 各 `packages/*`
**CLI**: `npm run build|test|lint|typecheck|format|clean`

---

### REQ-INF-002: Docker対応

**種別**: OPTIONAL
**優先度**: P1

**要件**:
WHERE Docker環境が利用可能な場合,
THE システム SHALL Docker Composeによる開発環境を提供する。

**受入基準**:
- [ ] Dockerfile定義
- [ ] docker-compose.yml
- [ ] 開発環境のワンコマンド起動

**トレーサビリティ**: DES-INF-002
**パッケージ**: `docker/`
**CLI**: `docker compose up`

---

### REQ-INF-003: 仮想プロジェクト

**種別**: UBIQUITOUS
**優先度**: P1

**要件**:
THE システム SHALL SDDワークフローの練習・検証用に仮想プロジェクトを提供し、
AND THE 仮想プロジェクト SHALL 完全なSDD成果物（REQ/DES/TSK）を含む。

**受入基準**:
- [ ] 16以上の仮想プロジェクト
- [ ] 各プロジェクトに要件・設計・タスクの成果物
- [ ] 多様なドメイン（ペットクリニック、駐車場、図書館、配送、ジム、予約、診療所、不動産、在庫、プロジェクト管理、eラーニング、従業員管理、家計簿、チケット予約、IoT、APIゲートウェイ）

**トレーサビリティ**: DES-INF-003
**パッケージ**: `virtual-projects/`
**CLI**: N/A

---

## 22. 監視・レポーティング要件

### REQ-MON-001: ファイル監視

**種別**: STATE-DRIVEN
**優先度**: P1

**要件**:
WHILE ファイル監視モードが有効な場合,
THE ウォッチャー SHALL ファイル変更を検知し、
AND THE ウォッチャー SHALL リント・テスト・セキュリティスキャンを自動実行する。

**受入基準**:
- [ ] ファイル変更検知
- [ ] `--lint` リント自動実行
- [ ] `--test` テスト自動実行
- [ ] `--security` セキュリティスキャン自動実行
- [ ] CLI: `npx musubix watch [paths] [--lint] [--test] [--security]`

**トレーサビリティ**: DES-MON-001
**パッケージ**: `core`（`watch/`）
**CLI**: `npx musubix watch [paths] [--lint] [--test] [--security]`

---

### REQ-MON-002: 品質ゲートレポート

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN 品質ゲートレポート生成が要求された場合,
THE レポートジェネレータ SHALL 全品質ゲートの状態・結果を集計したレポートを生成する。

**受入基準**:
- [ ] 品質ゲート結果集計
- [ ] レポート生成（Markdown形式）

**トレーサビリティ**: DES-MON-002
**パッケージ**: `scripts/`, `workflow-engine`
**CLI**: N/A

---

## 23. CLI拡張要件

### REQ-CLI-001: インタラクティブREPL

**種別**: EVENT-DRIVEN
**優先度**: P1

**要件**:
WHEN ユーザーがREPLモードを起動した場合,
THE システム SHALL インタラクティブなコマンドライン環境を提供し、
AND THE REPL SHALL タブ補完・永続ヒストリ・セッション変数を提供する。

**受入基準**:
- [ ] タブ補完（コマンド/サブコマンド/オプション/ファイル）
- [ ] 永続ヒストリ・ヒストリ検索
- [ ] セッション変数（`set VAR=...`、`$VAR`、`_` で直前の結果参照）
- [ ] 出力フォーマット切替（JSON/table/YAML/auto）
- [ ] コンテキストアウェアプロンプト（プロジェクト名/フェーズ表示）
- [ ] ビルトインコマンド（`help`, `exit`, `history`, `set`, `env`, `clear`）
- [ ] CLI: `npx musubix repl`

**トレーサビリティ**: DES-CLI-001
**パッケージ**: `core`（`cli/`）
**CLI**: `npx musubix repl`

---

## 24. パッケージ構成要件

### REQ-PKG-001: パッケージ一覧

**種別**: UBIQUITOUS
**優先度**: P0

**要件**:
THE システム SHALL 以下のパッケージ構成で提供される:

| # | パッケージ名 | カテゴリ | 優先度 |
|---|-------------|----------|--------|
| 1 | `@nahisaho/musubix-core` | Core | P0 |
| 2 | `@nahisaho/musubix-mcp-server` | MCP | P0 |
| 3 | `@musubix/knowledge` | Knowledge | P0 |
| 4 | `@musubix/decisions` | SDD | P0 |
| 5 | `@musubix/policy` | Governance | P0 |
| 6 | `@nahisaho/musubix-sdd-ontology` | SDD | P0 |
| 7 | `@nahisaho/musubix-codegraph` | Analysis | P0 |
| 8 | `@nahisaho/musubix-workflow-engine` | Agent | P0 |
| 9 | `@nahisaho/musubix-skill-manager` | Agent | P0 |
| 10 | `@nahisaho/musubix-agent-orchestrator` | Agent | P0 |
| 11 | `@nahisaho/musubix-security` | Security | P0 |
| 12 | `@nahisaho/musubix-ontology-mcp` | MCP | P0 |
| 13 | `@nahisaho/musubix-assistant-axis` | Agent | P1 |
| 14 | `@nahisaho/musubix-expert-delegation` | Agent | P1 |
| 15 | `@nahisaho/musubix-pattern-mcp` | MCP | P1 |
| 16 | `@nahisaho/musubix-formal-verify` | Verification | P1 |
| 17 | `@nahisaho/musubix-neural-search` | Learning | P1 |
| 18 | `@nahisaho/musubix-dfg` | Analysis | P1 |
| 19 | `@nahisaho/musubix-wake-sleep` | Learning | P1 |
| 20 | `@nahisaho/musubix-deep-research` | Research | P1 |
| 21 | `@nahisaho/musubix-lean` | Verification | P2 |
| 22 | `@nahisaho/musubix-library-learner` | Learning | P2 |
| 23 | `@nahisaho/musubix-synthesis` | Learning | P2 |
| 24 | `@nahisaho/musubi` | Core wrapper alias | P0 |
| 25 | `musubix` | Umbrella | P0 |

**受入基準**:
- [ ] 25パッケージの定義
- [ ] パッケージ間依存関係の整合性
- [ ] 全パッケージのビルド・テスト成功

**トレーサビリティ**: DES-PKG-001
**パッケージ**: `musubix`（workspace root）
**CLI**: N/A

---

## 25. 要件サマリ

### 要件数統計

| カテゴリ | 要件数 | P0 | P1 | P2 |
|----------|--------|----|----|-----|
| アーキテクチャ | 4 | 4 | 0 | 0 |
| SDDワークフロー | 7 | 7 | 0 | 0 |
| 要件分析 | 3 | 2 | 1 | 0 |
| 設計生成 | 4 | 4 | 0 | 0 |
| コード生成・解析 | 6 | 4 | 2 | 0 |
| トレーサビリティ | 3 | 3 | 0 | 0 |
| 知識管理 | 3 | 3 | 0 | 0 |
| ニューロシンボリック | 3 | 3 | 0 | 0 |
| 形式検証 | 2 | 0 | 1 | 1 |
| コードグラフ | 3 | 1 | 2 | 0 |
| 学習システム | 6 | 0 | 4 | 2 |
| エージェント | 5 | 3 | 2 | 0 |
| スキルハーネス | 6 | 0 | 6 | 0 |
| MCPサーバー | 1 | 1 | 0 | 0 |
| ディープリサーチ | 1 | 0 | 1 | 0 |
| ガバナンス | 2 | 2 | 0 | 0 |
| 説明生成 | 1 | 0 | 1 | 0 |
| ドメインサポート | 1 | 1 | 0 | 0 |
| パフォーマンス | 1 | 1 | 0 | 0 |
| インフラ | 3 | 1 | 2 | 0 |
| 監視・レポート | 2 | 0 | 2 | 0 |
| CLI拡張 | 1 | 0 | 1 | 0 |
| パッケージ構成 | 1 | 1 | 0 | 0 |
| **合計** | **69** | **41** | **25** | **3** |

---

## 26. 用語集

| 用語 | 定義 |
|------|------|
| **SDD** | Specification Driven Development — 仕様駆動開発 |
| **EARS** | Easy Approach to Requirements Syntax — 要件構文の簡易アプローチ |
| **MCP** | Model Context Protocol — AIモデルコンテキストプロトコル |
| **ADR** | Architecture Decision Record — アーキテクチャ決定記録 |
| **C4** | Context, Container, Component, Code — 4レベルアーキテクチャモデル |
| **DFG** | Data Flow Graph — データフローグラフ |
| **CFG** | Control Flow Graph — 制御フローグラフ |
| **PBE** | Programming by Example — 例示によるプログラミング |
| **SMT** | Satisfiability Modulo Theories — 理論付き充足可能性 |
| **GraphRAG** | Graph Retrieval-Augmented Generation — グラフ検索拡張生成 |
| **DDD** | Domain-Driven Design — ドメイン駆動設計 |
| **OWL** | Web Ontology Language — ウェブオントロジー言語 |

---

## 27. 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|-----------|------|----------|--------|
| 1.0 | 2026-04-01 | 初版作成（references/musubix v3.8.2分析に基づく） | MUSUBIX2 |
| 1.1 | 2026-04-01 | レビュー反映: Critical 3件・Major 6件・Minor 10件修正 | MUSUBIX2 |
| 1.2 | 2026-04-01 | 最終レビュー反映: Major 2件（パッケージ/CLIフィールド統一）・Minor 1件（品質ゲート用語整合）修正 | MUSUBIX2 |
| 1.3 | 2026-04-01 | 再レビュー反映: SDD-001/004 と GOV-002 を参照実装整合へ修正 | MUSUBIX2 |
| 1.4 | 2026-04-01 | コスメティック修正: PER-001受入基準にcache系追加、MCP-001ツール数を実数(105)に修正 | MUSUBIX2 |
| 1.5 | 2026-04-02 | スキルハーネス要件を追加: REQ-SKL-001〜006（ランタイム契約、I/Oスキーマ、テストハーネス、Agent-Skillルーティング、MCP-Skillブリッジ、依存・バージョン管理）を新設し、DES-SKL-001〜006とのトレーサビリティを復旧 | MUSUBIX2 |

---

**Powered by MUSUBIX2** — Specification Driven Development for Neuro-Symbolic AI Systems
