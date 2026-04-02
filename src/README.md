# MUSUBIX2

**Specification Driven Development (SDD) System** — AI 支援による要件駆動開発ツール

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## プロジェクト概要

MUSUBIX2 は **Specification Driven Development (SDD)** を実現するシステムです。
要件定義 → 設計 → 実装 のワークフローを強制し、すべてのコードが EARS 形式の要件にトレーサブルであることを保証します。

主な特徴:

- **EARS 形式の要件管理** — Easy Approach to Requirements Syntax による構造化された要件記述
- **100% トレーサビリティ** — 要件 ↔ 設計 ↔ コード ↔ テスト間の完全な追跡
- **品質ゲート** — フェーズ遷移時の自動検証
- **MCP サーバー** — 105 以上のツールを備えた Model Context Protocol 対応
- **形式検証** — EARS → SMT-LIB2 変換による Z3 / Lean 4 検証

---

## アーキテクチャ

- **モノレポ構成**: 25 パッケージ（npm workspaces）
- **言語**: TypeScript（ESM）
- **テストフレームワーク**: Vitest
- **ビルド**: `tsc -b`（プロジェクト参照）
- **ランタイム**: Node.js ≥ 20

```
src/
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
| `musubi` | コア SDD 操作を包む軽量ラッパー |
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

## セットアップ

```bash
cd src
npm install
npm run build    # または: npx tsc -b
npm run test     # または: npx vitest run
```

---

## SDD ワークフロー

MUSUBIX2 は 5 フェーズの開発ワークフローを強制します:

```
┌─────────────┐    ┌─────────────┐    ┌────────────────┐    ┌────────────────┐    ┌─────────────┐
│ Requirements │───▶│   Design    │───▶│ Task Breakdown │───▶│ Implementation │───▶│ Completion  │
│   要件定義    │    │    設計     │    │   タスク分解    │    │     実装       │    │    完了     │
└─────────────┘    └─────────────┘    └────────────────┘    └────────────────┘    └─────────────┘
      │                  │                   │                      │                    │
  EARS形式で         設計文書を           実装タスクに          テストファースト       品質ゲート
  要件を記述        作成・レビュー          分割              で実装・検証          を通過して完了
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

## 開発コマンド

```bash
# ビルド
npx tsc -b

# テスト実行
npx vitest run

# カバレッジ付きテスト
npx vitest run --coverage

# リント
npx eslint packages/*/src

# フォーマット
npx prettier --write "packages/*/src/**/*.ts"

# 型チェック
npm run typecheck

# クリーン
npm run clean
```

---

## テスト

- **テストファイル数**: 73
- **テスト数**: 952
- **カバレッジ**: 95%+
- **フレームワーク**: Vitest

```bash
# 全テスト実行
npm run test

# ユニットテストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# カバレッジレポート
npm run test:coverage
```

---

## ライセンス

[MIT](../LICENSE)
