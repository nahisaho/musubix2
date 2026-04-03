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
- **100% トレーサビリティ** — 要件 ↔ 設計 ↔ コード ↔ テスト間の完全な追跡
- **品質ゲート** — フェーズ遷移時の自動検証
- **MCP サーバー** — 105 以上のツールを備えた Model Context Protocol 対応
- **形式検証** — EARS → SMT-LIB2 変換による Z3 / Lean 4 検証

---

## インストール

```bash
npm install musubix2
```

## クイックスタート

```bash
git clone https://github.com/nahisaho/musubix2.git
cd musubix2/src
npm install
npm run build    # または: npx tsc -b
npm run test     # または: npx vitest run
```

---

## アーキテクチャ

- **モノレポ構成**: 25 パッケージ（npm workspaces）
- **言語**: TypeScript（ESM）
- **テストフレームワーク**: Vitest
- **ビルド**: `tsc -b`（プロジェクト参照）
- **ランタイム**: Node.js ≥ 20

```
musubix2/
└── src/
    ├── packages/          # 25 ワークスペースパッケージ
    ├── steering/          # プロジェクト憲法・ルール・ADR
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
| `codegraph` | AST 解析・依存関係グラフ・GraphRAG 検索を行うコードグラフ基盤 |
| `core` | SDD エンジンを提供する MUSUBIX2 の中核ライブラリ |
| `decisions` | アーキテクチャ決定記録（ADR）の管理 |
| `deep-research` | セキュリティフィルタ付き知識蓄積リサーチエンジン |
| `dfg` | DFG/CFG を構築・解析するデータフローグラフ機能 |
| `expert-delegation` | クエリをドメイン専門家へ意味的に振り分ける委譲エンジン |
| `formal-verify` | EARS → SMT-LIB2 変換・Z3 検証 |
| `knowledge` | エンティティ・関係の保存と探索を行う知識グラフ |
| `lean` | Lean 4 環境検出・EARS → Lean 変換・ハイブリッド検証 |
| `library-learner` | E-graph を使ったライブラリ学習 |
| `mcp-server` | 105 以上のツールを備えた MCP サーバー |
| `musubi` | コア SDD 操作を包む軽量ラッパー・CLI |
| `neural-search` | 埋め込みベースの類似検索エンジン |
| `ontology-mcp` | N3 トリプルストア・ルールエンジン・一貫性検証 |
| `pattern-mcp` | AST パターン抽出と MCP サーバー機能 |
| `policy` | 憲法的ルールの適用と品質ゲートを担うポリシーエンジン |
| `sdd-ontology` | SDD ワークフロー向けドメイン概念のモデル化 |
| `security` | コンプライアンス確認・脆弱性スキャン・秘密情報検出 |
| `skill-harness` | ランタイム契約・I/O スキーマ・テストハーネス |
| `skill-manager` | プラグ可能なエージェントスキルの登録とライフサイクル管理 |
| `synthesis` | DSL ビルダー・バージョンスペース・プログラム合成 |
| `wake-sleep` | パターン抽出と統合を行う Wake-Sleep サイクル |
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

---

## CLI コマンド

```bash
npx musubix --help          # ヘルプ表示
npx musubix req             # 要件管理
npx musubix design          # 設計生成
npx musubix codegen         # コード生成
npx musubix trace           # トレーサビリティ検証
npx musubix policy          # ポリシー検証
npx musubix workflow        # ワークフロー管理
npx musubix ontology        # オントロジー管理
npx musubix cg              # コードグラフ解析
npx musubix security        # セキュリティスキャン
npx musubix status          # ステータス表示
```

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

- [English README](README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## ライセンス

[MIT](LICENSE)
