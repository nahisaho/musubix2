# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-07-09

### Fixed

- **公開バンドルの陳腐化を修正** — `bundle.mjs` が tsc 出力を同一ファイルへ上書きバンドルするため、増分ビルドでは依存パッケージの新コードが取り込まれない問題（0.4.0〜0.4.4 の dist が同一で、specs 標準化コードが未同梱だった原因）。`prepublishOnly` に `npm run clean` を追加しクリーンビルドを強制
- **`skills-manifest.json` 未生成を修正** — `generate-manifest.mjs` が `createHash` を `node:fs` から import しておりクラッシュ、かつビルドチェーンから呼ばれていなかった。このため公開版の `init` はスキルを1つもインストールできなかった。import を修正し `prepublishOnly` に組み込み
- **`.musubix-managed` マーカーのバージョン固定を修正** — `0.4.0` ハードコードを package.json からの動的読込に変更

### Removed

- **postinstall フックを廃止** — npm の install ライフサイクルスクリプト非推奨化に対応し、`postinstall.cjs` / `PostinstallBootstrap` / `WorkspaceRootResolver`（`MUSUBIX_AUTO_INIT=1` オプトイン自動初期化）を削除。セットアップは `npm install musubix2` + `npx musubix2 init` の2ステップで完結（REQ-INS-006 / DES-INS-006 を改訂）

### Changed

- **Agent Skills 最適化** — `orchestrator` SKILL.md を 565 → 454 行に削減（WHEN/DO 表と重複するタスク分類ツリー、実態と乖離した「同梱スキル12種」を含むパッケージング節、JSON-RPC 定型表を削除。ニューロシンボリック3テーブルと使用パッケージ一覧を統合テーブルに集約）
- **`requirements-analyst` SKILL.md 構成修正** — 品質ゲート後に迷い込んでいたインタビュー節をワークフロー内へ移動、二重記載のフロー説明を統合、description / triggers に1問1答ヒアリングを追加
- **README (EN/JA) を v0.4.4 対応に更新** — デュアルプラットフォームセットアップ手順、Agent Skills 一覧（8種）、憲法9条（VII〜IX 追記）、`tasks` / `trace:verify` / `mcp` コマンド、`storage/specs/` 構成を反映

## [0.4.4] - 2026-04-05

### Added

- **specs ディレクトリ標準化** — `storage/specs/{requirements,designs,plans,reviews}` の4分類構成
- **SpecsConfig** — `MuSubixConfig` に追加（既存設定との後方互換マージ対応）
- 全テンプレート（minimal / default / full）が4つの spec サブディレクトリを生成
- SDD 文書（REQ / DES / PLAN / レビュー）を分類別ディレクトリに整理

### Changed

- テスト数: 1630 → **1633**（94 ファイル）

## [0.4.3] - 2026-04-05

### Fixed

- **CLI 起動不能を修正** — `bin/musubix.mjs` が tree-shake 済みの `dist/index.js` ではなく `dist/cli.js` を import するよう変更、ディスパッチャー呼び出しを `dispatcher.run(args)` に簡素化

## [0.4.2] - 2026-04-05

### Fixed

- **postinstall 失敗を修正** — `dist/postinstall-bootstrap.js` を CJS ラッパー `postinstall.cjs` に置換（`npm install` を失敗させない設計、`files` に追加）

## [0.4.1] - 2026-04-05

### Fixed

- **`npm install` 失敗を修正** — 公開パッケージの dependencies から解決不能な `workspace:*` 参照（`@musubix2/mcp-server`）を除去

## [0.4.0] - 2026-04-05

### Added

- **デュアルプラットフォームインストール** — `musubix2 init --platform auto|copilot|claude|both` で GitHub Copilot / Claude Code 両対応セットアップ
- **プラットフォーム自動検出** — `.vscode/`, `.claude/`, CLI 存在チェックで最適プラットフォームを推定
- **テンプレートレンダリング** — `{{PLACEHOLDER}}` 補間で `copilot-instructions.md`, `CLAUDE.md`, MCP 設定を生成
- **Claude アトミックセットアップ** — `CLAUDE.md` + `.claude/skills/*` + `.mcp.json` + `.musubix-managed` マーカーをトランザクション書き込み
- **MCP 設定自動生成** — Copilot (`.vscode/mcp.json`) / Claude (`.mcp.json`) 形式を自動生成
- **`--dry-run` モード** — ファイル書き込みなしで変更計画をプレビュー
- **`--update` モード** — 既存設定の `.bak` バックアップ付き更新
- **`musubix2 mcp` コマンド** — stdio/SSE トランスポートで MCP サーバーを直接起動
- **WorkspaceWriter** — temp→rename アトミック書き込み + ロールバック機構
- **Install ドメインモデル** — 23 型定義（InitOptions, InstallPlan, PlatformSelection 等）
- **4 層アーキテクチャ** — Domain → Infrastructure → Application → Interface の完全分離

### Changed

- テスト数: 1588 → **1630**（94 ファイル、+42 テスト）
- CLI `init` コマンド: `--platform`, `--dry-run`, `--update` フラグ追加
- `package.json`: `.claude` を `files` に追加、`postinstall` スクリプト追加

## [0.3.8] - 2026-04-05

### Added

- **SDD Phase 5 完了** — 77/77 タスク完了、69/69 DES トレーサビリティ（100%）、憲法9条準拠
- `testing/` 共通ヘルパー・フィクスチャ（P0-02）
- 16 仮想プロジェクト（P0-06）

### Changed

- テスト数: 92 ファイル、**1588** テスト全 PASS
- カバレッジ: Stmts 83.4% / Branch 82.31% / Funcs 94.62%

### Fixed

- `prepublishOnly` でビルドを実行し、npm tarball に esbuild バンドルを確実に同梱

## [0.3.1]–[0.3.7] - 2026-04-03

### Fixed

- npm パッケージングの反復修正 — dist バンドル再生成、`bin` エントリ調整
- Agent Skills 同梱の改善 — 各スキルへの `scripts/` 追加（0.3.4）、SKILL.md 更新（0.3.5 / 0.3.7）、`copilot-instructions.md` 更新（0.3.7）

## [0.3.0] - 2026-04-03

### Added

- **MCP Server 本格化** — JSON-RPC 2.0 プロトコル、stdio/SSE/InMemory トランスポート
- **MCP ツールカタログ** — 61 ツール × 13 カテゴリ（SDD, knowledge, policy, ontology, security 等）
- **MCP プロンプト** — 4 SDD テンプレート（要件、設計、レビュー、タスク分解）
- **MCP リソース** — 3 エンドポイント（constitution, EARS patterns, workflow phases）
- **CLI 10 新コマンド** — skills, knowledge, decision, deep-research, repl, scaffold, explain, learn, synthesis, watch（計 28 コマンド）
- **RequirementsInterviewer** — 1問1答ヒアリングで情報収集 → EARS 要件定義書自動生成
- **RequirementsDocGenerator** — 収集情報から EARS 準拠マークダウン仕様書を生成
- **@musubix2/git-knowledge** — Git log/blame から知識グラフ自動構築（共変更分析、著者エキスパート特定）
- **MultiLanguageParser** — Python, Java, Go, Rust, Ruby, PHP の再帰降下 AST パーサー
- **スキルパッケージング** — npm publish 時に .github/skills + copilot-instructions を自動同梱
- **Orchestrator SKILL.md v3.0** — MCP 統合、28 CLI コマンド、Interview フロー、484 行

### Changed

- MCP ツール数: 105 → 61（実装ベースに整理）
- CLI コマンド数: 17 → 28
- テスト数: 1328 → **1588**（92 ファイル）
- パッケージ数: 25 → **26**（git-knowledge 追加）

## [0.2.0] - 2026-04-03

### Added

- **ニューロシンボリック強化** — 8 パッケージをモック → 実装にアップグレード
  - `neural-search`: TF-IDF 埋込みモデル + コサイン類似度
  - `wake-sleep`: N-gram + PMI 統計パターン + Jaccard クラスタリング
  - `library-learner`: E-graph 等価クラス + 構造類似性マージ
  - `formal-verify`: Z3 サブプロセス実行アダプター
  - `lean`: Lean 4 証明ランナー + 一時ファイル実行
  - `codegraph`: TS Compiler API による実 AST パーサー
  - `synthesis`: 16 DSL 変換 + 合成戦略 + バージョンスペース
  - `deep-research`: 反復リサーチエンジン + 証拠チェーン
- **Orchestrator SKILL.md v2.0** — 22 ルーティングルール、ニューロシンボリック統合
- **README** (EN/JA), **CHANGELOG**, **MIT LICENSE**

### Changed

- テスト数: 1193 → 1328（+135）

## [0.1.0] - 2026-04-03

### Added

- **25 packages** in monorepo architecture with npm workspaces
- **SDD Engine** — Requirements → Design → Task Breakdown → Implementation → Completion workflow
- **EARS Requirements** — 6 pattern types (Ubiquitous, Event-Driven, State-Driven, Optional, Unwanted, Complex)
- **Traceability** — Full bidirectional tracing between requirements, design, code, and tests
- **Formal Verification** — EARS → SMT-LIB2 conversion for Z3 verification
- **Lean 4 Integration** — EARS → Lean 4 theorem conversion with environment detection
- **Code Graph** — AST analysis, dependency graphs, and GraphRAG search
- **Knowledge Graph** — Entity-relationship storage and exploration
- **Ontology MCP** — N3 triple store, rule engine, consistency verification
- **Policy Engine** — Constitutional rule enforcement and quality gates
- **Security Scanner** — Compliance checks, vulnerability scanning, secret detection
- **Workflow Engine** — SDD phase management with quality gate enforcement
- **MCP Server** — 105+ tools via Model Context Protocol
- **Agent Orchestrator** — Sub-agent management and cross-model review orchestration
- **Neural Search** — Embedding-based similarity search engine
- **Deep Research** — Knowledge accumulation research engine with security filters
- **Domain Classification** — 62 domains with Japanese keywords and components
- **Code Generation** — 12 template types, 16 programming languages
- **CLI** — 16 commands via `npx musubix <command>`
- **GitHub Copilot Skills** — 8 skills for orchestration, review, requirements, design, codegen, testing, traceability, and constitution enforcement
- **CI/CD** — GitHub Actions with Node.js 20/22 matrix, typecheck, lint, test, coverage
- **1193 tests** across 85 test files with 80% coverage thresholds

### Infrastructure

- TypeScript 5.7+ with ESM (`type: "module"`, `NodeNext`)
- Project References with composite/incremental builds (`tsc -b`)
- Vitest with v8 coverage provider
- ESLint + Prettier formatting
- Docker support

[0.3.0]: https://github.com/nahisaho/musubix2/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nahisaho/musubix2/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nahisaho/musubix2/releases/tag/v0.1.0
