# MUSUBIX2

[![CI](https://github.com/nahisaho/musubix2/actions/workflows/ci.yml/badge.svg)](https://github.com/nahisaho/musubix2/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/musubix2.svg)](https://www.npmjs.com/package/musubix2)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

**Specification Driven Development (SDD) System** — AI 支援による要件駆動開発ツール

[English](README.md) | **日本語**

---

## プロジェクト概要

MUSUBIX2 は **Specification Driven Development (SDD)** を実現するシステムです。
要件定義 → 設計 → 実装 のワークフローを強制し、すべてのコードが EARS 形式の要件にトレーサブルであることを保証します。

### 主な特徴

- **EARS 形式の要件管理** — Easy Approach to Requirements Syntax による構造化された要件記述
- **要件ヒアリング** — 情報不足時の1問1答による情報収集 → 要件定義書自動生成
- **100% トレーサビリティ** — 要件 ↔ 設計 ↔ コード ↔ テスト間の完全な追跡
- **品質ゲート** — フェーズ遷移時の自動検証
- **デュアルプラットフォームセットアップ** — GitHub Copilot / Claude Code を自動検出し、ワンコマンドでセットアップ
- **Agent Skills** — 8つの SDD スキルを同梱（オーケストレーション、要件、設計、コード生成、テスト、トレース、憲法、レビュー）
- **MCP サーバー** — 61 ツール、JSON-RPC 2.0、stdio/SSE トランスポート対応
- **形式検証** — EARS → SMT-LIB2 変換による Z3 / Lean 4 検証
- **多言語 AST パーサー** — Python, Java, Go, Rust, Ruby, PHP の再帰降下パーサー
- **Git ネイティブ知識** — Git 履歴から知識グラフを自動構築（共変更分析、著者エキスパート）
- **ニューロシンボリック AI** — TF-IDF 検索、Wake-Sleep パターン、E-graph 学習、プログラム合成

---

## インストール

```bash
npm install musubix2
```

## クイックスタート

プロジェクトに SDD をセットアップします（検出されたプラットフォーム向けにインストラクション・Agent Skills・MCP 設定を生成）:

```bash
npx musubix2 init --platform auto    # GitHub Copilot / Claude Code を自動検出
npx musubix2 init --platform both    # 両プラットフォームをセットアップ
npx musubix2 init --dry-run          # ファイルを書き込まずに変更計画をプレビュー
npx musubix2 init --update           # 既存設定を更新（.bak バックアップ付き）
```

プラットフォームごとの生成ファイル:

| プラットフォーム | ファイル |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/skills/*`, `.vscode/mcp.json` |
| Claude Code | `CLAUDE.md`, `.claude/skills/*`, `.mcp.json` |

MCP サーバーの直接起動:

```bash
npx musubix2 mcp                     # stdio トランスポート（デフォルト）
npx musubix2 mcp --transport sse     # HTTP/SSE トランスポート
```

stdio サーバーはクライアントセッション中は常駐し、全13カテゴリ 61 ツールを公開します（`tools/list`）。全カテゴリ（SDD コア・知識グラフ・セキュリティ・コード解析・オントロジー・合成・ADR・リサーチ・ニューラル・ワークフロー・ポリシー・形式検証・スキル）が実パッケージ API で動作します。`verify.z3.solve` / `verify.lean.run` は別途ローカルの Z3 / Lean ツールチェーンが必要です。

### 開発（ソースから）

```bash
git clone https://github.com/nahisaho/musubix2.git
cd musubix2/src
npm install
npm run build    # または: npx tsc -b
npm run test     # または: npx vitest run
```

---

## アーキテクチャ

- **モノレポ構成**: 26 パッケージ（npm workspaces）
- **言語**: TypeScript（ESM）
- **テストフレームワーク**: Vitest
- **ビルド**: `tsc -b`（プロジェクト参照）
- **ランタイム**: Node.js ≥ 20

```
musubix2/
└── src/
    ├── packages/          # 26 ワークスペースパッケージ
    ├── steering/          # プロジェクト憲法・ルール・ADR
    ├── storage/specs/     # SDD 文書: requirements/ designs/ plans/ reviews/
    ├── package.json       # ルートワークスペース定義
    ├── tsconfig.json      # TypeScript プロジェクト参照
    └── vitest.config.ts   # テスト設定
```

---

## パッケージ一覧

| パッケージ | 説明 |
|---|---|
| `agent-orchestrator` | サブエージェントを管理し、タスク委譲を行うオーケストレーター |
| `assistant-axis` | アシスタントのアイデンティティ安定化・ドメイン分類・ドリフト分析 |
| `codegraph` | AST 解析・多言語パーサー（6言語）・GraphRAG 検索 |
| `core` | SDD エンジンを提供する MUSUBIX2 の中核ライブラリ |
| `decisions` | アーキテクチャ決定記録（ADR）の管理 |
| `deep-research` | 反復リサーチエンジン・証拠チェーン・セキュリティフィルタ |
| `dfg` | DFG/CFG を構築・解析するデータフローグラフ機能 |
| `expert-delegation` | クエリをドメイン専門家へ意味的に振り分ける委譲エンジン |
| `formal-verify` | EARS → SMT-LIB2 変換・Z3 サブプロセス検証 |
| `git-knowledge` | Git log/blame → 知識グラフ（共変更分析・著者エキスパート） |
| `knowledge` | エンティティ・関係の保存と探索を行う知識グラフ |
| `lean` | Lean 4 EARS → Lean 変換・ハイブリッド検証 |
| `library-learner` | E-graph と構造類似性を使ったライブラリ学習 |
| `mcp-server` | 61 ツール・JSON-RPC 2.0・stdio/SSE トランスポート対応 MCP サーバー |
| `musubi` | コア SDD ラッパー・CLI（29 コマンド）・デュアルプラットフォームインストーラー・スキルパッケージング |
| `neural-search` | TF-IDF 埋め込みベースの類似検索エンジン |
| `ontology-mcp` | N3 トリプルストア・ルールエンジン・一貫性検証 |
| `pattern-mcp` | AST パターン抽出と MCP サーバー機能 |
| `policy` | 憲法的ルールの適用と品質ゲートを担うポリシーエンジン |
| `sdd-ontology` | SDD ワークフロー向けドメイン概念のモデル化 |
| `security` | コンプライアンス確認・脆弱性スキャン・秘密情報検出 |
| `skill-harness` | ランタイム契約・I/O スキーマ・テストハーネス |
| `skill-manager` | プラグ可能なエージェントスキルの登録とライフサイクル管理 |
| `synthesis` | DSL ビルダー（16変換）・バージョンスペース・プログラム合成 |
| `wake-sleep` | N-gram + PMI パターン抽出・Wake-Sleep サイクル |
| `workflow-engine` | SDD フェーズ管理・状態追跡・品質ゲート適用 |

---

## SDD ワークフロー

```
Requirements ──▶ Design ──▶ Task Breakdown ──▶ Implementation ──▶ Completion
  要件定義        設計        タスク分解           実装              完了
```

各フェーズ遷移時に**品質ゲート**が適用され、基準を満たさない場合は次のフェーズに進めません。

### 憲法の原則

| 条項 | 原則 |
|---|---|
| Article I | **ライブラリファースト** — すべてのパッケージは独立したライブラリとして利用可能 |
| Article II | **CLI インターフェース** — `npx musubix <command>` で全機能を実行可能 |
| Article III | **テストファースト** — Red → Green → Blue、カバレッジ閾値 80% |
| Article IV | **EARS 形式** — 6 パターンで構造化された要件記述 |
| Article V | **トレーサビリティ** — 要件 ↔ 設計 ↔ コード ↔ テスト間の 100% 追跡 |
| Article VI | **プロジェクトメモリ** — `steering/` を唯一の信頼できる情報源とする |
| Article VII | **デザインパターン文書化** — パターン適用時は選定理由を文書化 |
| Article VIII | **ADR 記録** — 重要な設計決定は ADR として記録 |
| Article IX | **品質ゲート** — ゲートを通過しないフェーズ遷移はブロック |

---

## CLI コマンド

```bash
npx musubix --help              # ヘルプ表示

# SDD ワークフロー
npx musubix init                # プロジェクト初期化（--platform auto|copilot|claude|both）
                                #   steering/ と storage/specs/requirements.md も雛形生成
npx musubix requirements analyze <file>   # EARS 要件検証（別名: req <file>）
npx musubix req:wizard          # 要件作成ウィザード
npx musubix req:interview       # 1問1答ヒアリング → 要件定義書生成
npx musubix design generate <file>        # 設計生成（または: design <file>）
npx musubix design:c4 <file>    # C4 ダイアグラム生成（--level context|container|component）
npx musubix design:verify <file># 設計検証（SOLID）
npx musubix tasks               # タスク分解管理（validate|list|stats）
npx musubix codegen generate <name|file>  # 名前 / design.json / requirements.md からコード生成
                                #   （--type class|..., --out <file>; // Implements: REQ- コメントを付与）
npx musubix test:gen <file|dir> # テスト生成（ファイル/ディレクトリ対応）
npx musubix trace matrix        # 要件 → コード カバレッジマトリクス（--specs <file> --src <dir>）
npx musubix trace impact <REQ-ID>         # シンボル単位の影響分析（実装コード + 結合要件）
npx musubix trace:verify        # カバレッジ検証（--specs --src [--strict]）
npx musubix workflow            # ワークフロー管理（status|approve|transition、永続化）
npx musubix status              # ステータス表示

# 分析・検証
npx musubix cg index <file|dir> # コードグラフ解析 — docs/codegraph.md 参照
                                #   サブコマンド: index|search|stats|deps|impact|candidates|
                                #   cycles|gate|export|diff|languages
npx musubix cg impact <frag>    # 逆依存の影響分析（--direct, --depth N, --json）
npx musubix cg gate --max-cycles 0 --forbid "ui/:db/"   # CI アーキテクチャゲート（非ゼロ終了）
npx musubix security <file|dir> # セキュリティスキャン（--fail-on <sev>, --exclude-tests）
npx musubix verify <requirements.md>      # EARS→SMT 形式検証と論理整合性チェック
npx musubix dfg <file>          # データフロー解析、未使用定義を検出（--unused）
npx musubix policy              # ポリシー検証
npx musubix ontology add <s> <p> <o>      # オントロジー管理（add|list|validate|stats、永続化）

# 知識・リサーチ
npx musubix knowledge           # 知識グラフ操作（put|get|link|query|stats、永続化）
npx musubix decision            # ADR 管理（create|list|get|accept|deprecate、永続化）
npx musubix deep-research       # ディープリサーチ
npx musubix search <query> --corpus <dir> # コーパス内の TF-IDF セマンティック検索（--top N）

# ニューロシンボリック
npx musubix explain <file|code> # コード説明
npx musubix learn analyze <file|dir>      # ライブラリパターン学習
npx musubix synthesis dsl <input> --ops trim,camelCase,...   # DSL 変換パイプライン
npx musubix skills              # スキル管理（list|validate|create）
npx musubix scaffold package <name>       # スキャフォールド（project|package|skill、実ファイル生成）
npx musubix repl                # 対話型 REPL
npx musubix watch               # ファイル監視

# MCP
npx musubix mcp                 # MCP サーバー起動（--transport stdio|sse, --port）
```

> エラー時は非ゼロ終了コードを返すため（ファイル欠如・引数不正・`--strict`/`--fail-on`
> ゲート失敗）、CI で利用できます。状態を持つコマンド（`knowledge`/`decision`/
> `ontology`/`workflow`）はプロジェクト配下に永続化され、別プロセス間で状態が保持されます。

---

## Agent Skills

`init` 実行時に、8つの SDD Agent Skills が GitHub Copilot（`.github/skills/`）と Claude Code（`.claude/skills/`）向けにインストールされます:

| スキル | 役割 |
|---|---|
| `orchestrator` | タスクのスキルルーティング、フェーズ遷移・品質ゲートの強制 |
| `requirements-analyst` | EARS 要件の作成・検証・1問1答ヒアリング（Phase 1） |
| `design-generator` | SOLID 準拠設計書・C4 ダイアグラム・ADR（Phase 2） |
| `code-generator` | 4層アーキテクチャ準拠のテンプレートベースコード生成（Phase 4） |
| `test-engineer` | Red → Green → Blue の強制、テスト生成、カバレッジゲート |
| `traceability-auditor` | トレーサビリティマトリクス生成、ギャップ検出、影響分析 |
| `constitution-enforcer` | 9条憲法（CONST-001〜009）の準拠検証 |
| `review-orchestrator` | 複数 AI モデルによる交互レビューと合意チェック |

---

## 開発コマンド

```bash
cd src
npx tsc -b                                    # ビルド
npx vitest run                                # テスト実行
npx vitest run --coverage                     # カバレッジ付きテスト
npx eslint packages/*/src                     # リント
npx prettier --write "packages/*/src/**/*.ts" # フォーマット
```

---

## ドキュメント

- [CodeGraph (`cg`) リファレンス](docs/codegraph.md) — 依存分析・影響範囲・循環・CI ゲート
- [English README](README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## ライセンス

[MIT](LICENSE)
