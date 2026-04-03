# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
