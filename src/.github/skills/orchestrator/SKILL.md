---
name: orchestrator
description: >
  SDD ワークフロー全体のオーケストレーション — スキルルーティング、フェーズ遷移管理、品質ゲート制御、
  ニューロシンボリック機能統合。
  Use when routing tasks to the correct skill, managing phase transitions,
  running the full SDD workflow, or invoking neurosymbolic capabilities.
license: MIT
version: "2.0.0"
triggers:
  - ワークフロー
  - フェーズ遷移
  - オーケストレーション
  - タスクルーティング
  - SDD 全体管理
  - phase transition
  - orchestrate
  - route
  - 形式検証
  - formal verification
  - neural search
  - synthesis
  - research
---

# MUSUBIX2 SDD Orchestrator

SDD（Specification Driven Development）ワークフローのルーティングとフェーズ遷移を管理するスキル。
全スキルへのタスク振り分け、Phase 遷移条件の検証、品質ゲート制御、ニューロシンボリック機能の統合を担当する。

## 前提条件

- `steering/` を参照済みであること（Article VI: プロジェクトメモリ）
- 対象プロジェクトに SDD ワークフローが適用されていること

## ルーティングルール

### WHEN/DO マッピング

| WHEN（トリガー） | DO（スキル / パッケージ） |
|------------------|--------------------------|
| 要件を作成・分析・検証する | → `requirements-analyst` |
| 設計書を生成・レビュー・検証する | → `design-generator` |
| コードを生成・スキャフォールド・解析する | → `code-generator` |
| テストを作成・実行・カバレッジ確認する | → `test-engineer` |
| トレーサビリティを確認・マトリクス生成する | → `traceability-auditor` |
| 憲法準拠・ポリシー違反を検証する | → `constitution-enforcer` |
| レビュー・合意チェック・品質検証する | → `review-orchestrator` |
| 形式検証・SMT・Z3 検証する | → `@musubix2/formal-verify` |
| Lean 4 定理証明・ハイブリッド検証する | → `@musubix2/lean` |
| コード解析・AST・依存グラフを生成する | → `@musubix2/codegraph` |
| データフロー・制御フロー分析する | → `@musubix2/dfg` |
| ニューラル検索・類似度検索する | → `@musubix2/neural-search` |
| プログラム合成・DSL 変換する | → `@musubix2/synthesis` |
| パターン学習・E-graph 最適化する | → `@musubix2/library-learner` |
| Wake-Sleep パターン抽出・統合する | → `@musubix2/wake-sleep` |
| 知識グラフ操作・エンティティ管理する | → `@musubix2/knowledge` |
| オントロジー・トリプルストア・推論する | → `@musubix2/ontology-mcp` |
| セキュリティスキャン・脆弱性検出する | → `@musubix2/security` |
| リサーチ・調査・知識蓄積する | → `@musubix2/deep-research` |
| ADR・アーキテクチャ決定を記録する | → `@musubix2/decisions` |
| ドメイン分類・ドリフト分析する | → `@musubix2/assistant-axis` |
| SDD ワークフロー全体を実行する | → `orchestrator`（Phase 遷移ルール参照） |

### タスク分類ツリー

```
ユーザー入力
├── 仕様関連?
│   ├── 要件? → requirements-analyst
│   └── 設計? → design-generator
├── 実装関連?
│   ├── コード生成? → code-generator
│   ├── テスト? → test-engineer
│   └── プログラム合成? → @musubix2/synthesis
├── 品質関連?
│   ├── トレーサビリティ? → traceability-auditor
│   ├── ポリシー? → constitution-enforcer
│   ├── レビュー / 合意チェック? → review-orchestrator
│   ├── 形式検証 (SMT/Z3)? → @musubix2/formal-verify
│   └── 定理証明 (Lean 4)? → @musubix2/lean
├── 分析関連?
│   ├── AST / コードグラフ? → @musubix2/codegraph
│   ├── データフロー / CFG? → @musubix2/dfg
│   ├── セキュリティ? → @musubix2/security
│   └── ドメイン分類? → @musubix2/assistant-axis
├── 知識関連?
│   ├── 知識グラフ? → @musubix2/knowledge
│   ├── オントロジー / 推論? → @musubix2/ontology-mcp
│   ├── リサーチ / 調査? → @musubix2/deep-research
│   └── ADR / 決定記録? → @musubix2/decisions
├── 学習関連?
│   ├── ニューラル検索? → @musubix2/neural-search
│   ├── パターン学習? → @musubix2/library-learner
│   └── Wake-Sleep サイクル? → @musubix2/wake-sleep
└── ワークフロー? → orchestrator（Phase 遷移ルール）
```

## Phase 遷移ルール

```
Phase 1 (Requirements) ──⏸️承認──→ Phase 2 (Design) ──⏸️承認──→ Phase 3 (Task Breakdown)
    ──⏸️承認──→ Phase 4 (Implementation) ──⏸️承認──→ Phase 5 (Complete)
```

### 遷移条件

| 遷移 | 条件 | 検証ツール |
|------|------|-----------|
| Phase 1 → 2 | 全要件が EARS 形式準拠、requirements-analyst 検証 PASS | `requirements-analyst`, `@musubix2/formal-verify` |
| Phase 2 → 3 | 全 DES が REQ にトレース可能、design-generator 検証 PASS | `design-generator`, `traceability-auditor` |
| Phase 3 → 4 | タスク分解完了、カバレッジ 100% | `traceability-auditor`, `@musubix2/workflow-engine` |
| Phase 4 → 5 | テストカバレッジ 80%+、全条項 PASS、形式検証 PASS | `constitution-enforcer`, `@musubix2/formal-verify`, `@musubix2/lean` |

### ⏸️ 承認ポイント

各 Phase 遷移時にユーザー承認を要求する。自動スキップ禁止。

## Phase 3: タスク分解プロセス

Phase 2 (Design) 承認後、実装に入る前にタスク分解を実施する。

### タスク分解フォーマット

各タスクは以下の形式で記述する：

```markdown
### TASK-XXX-NNN: タスクタイトル

**トレーサビリティ**: REQ-XXX-NNN → DES-XXX-NNN
**パッケージ**: 対象パッケージ名
**種別**: backend / frontend / api / test / infra
**優先度**: P0 / P1 / P2
**依存**: TASK-XXX-NNN（なければ「なし」）

**実装内容**:
- 具体的な実装手順 1
- 具体的な実装手順 2

**受入基準**:
- [ ] テストが書かれている（Red）
- [ ] テストが通る（Green）
- [ ] リファクタリング済み（Blue）
```

### 分解ルール

1. **1タスク = 1機能単位**: 1つのAPIエンドポイント、1つのUIコンポーネント、1つのミドルウェア等
2. **粒度基準**: 1タスクは最大 2時間以内で完了できるサイズ
3. **REQ/DES マッピング必須**: すべてのタスクは最低1つの REQ と DES にトレース可能
4. **テストファースト**: 各タスクに Red→Green→Blue サイクルの受入基準を含める
5. **依存関係の明示**: 他タスクへの依存がある場合は `依存` フィールドに記載

### 分解プロセス

```
DES 一覧を入力
    │
    ├── 1. DES ごとにバックエンドタスクを抽出
    │      ├── データモデル定義 → TASK-MDL-*
    │      ├── API ルート実装 → TASK-API-*
    │      └── ミドルウェア → TASK-MID-*
    │
    ├── 2. DES ごとにフロントエンドタスクを抽出
    │      ├── HTML ページ → TASK-UI-*
    │      ├── CSS スタイル → TASK-CSS-*
    │      └── JS ロジック → TASK-JS-*
    │
    ├── 3. 横断的タスクを抽出
    │      ├── セキュリティ → TASK-SEC-*
    │      ├── バリデーション → TASK-VAL-*
    │      ├── エラーハンドリング → TASK-ERR-*
    │      └── インフラ → TASK-INF-*
    │
    ├── 4. テストタスクを抽出
    │      ├── ユニットテスト → TASK-TST-*
    │      ├── 統合テスト → TASK-INT-*
    │      └── E2Eテスト → TASK-E2E-*
    │
    └── 5. 依存関係グラフを生成
           └── DAG で実行順序を決定
```

### タスク分解の品質ゲート

Phase 3 → 4 遷移には以下をすべて満たすこと：

| チェック項目 | 基準 |
|-------------|------|
| REQ カバレッジ | 全 REQ に対応するタスクが存在する（100%） |
| DES カバレッジ | 全 DES に対応するタスクが存在する（100%） |
| テストタスク | 各機能タスクに対応するテストタスクが存在する |
| 依存関係 | 循環依存がない（DAG である） |
| 粒度 | 全タスクが推定2時間以内 |
| フォーマット | 全タスクが TASK-XXX-NNN 形式に準拠 |

### タスク分解レビュー

タスク分解文書もレビュー対象とする：

1. `traceability-auditor` で REQ↔DES↔TASK のカバレッジを検証
2. 依存関係グラフに循環がないことを確認
3. タスク粒度が適切であることを確認
4. **ユーザー承認** を取得してから Phase 4 へ遷移

### 使用パッケージ

- `@musubix2/workflow-engine` — `TaskBreakdownManager`: タスク分解・依存管理
- `@musubix2/codegraph` — `ASTParser`, `GraphEngine`: 既存コード構造からの依存分析
- `@musubix2/dfg` — `DataFlowAnalyzer`: データフロー依存の抽出

## ニューロシンボリック統合

SDD ワークフローの各フェーズでニューロシンボリック機能を活用する。

### ニューラル側（学習・検索・パターン認識）

| パッケージ | 機能 | SDD での利用場面 |
|-----------|------|-----------------|
| `neural-search` | TF-IDF 埋込み + コサイン類似度検索 | 類似要件検索、既存設計の参照、コード重複検出 |
| `wake-sleep` | N-gram + PMI 統計パターン抽出、Jaccard クラスタリング | コードパターンの自動学習、設計パターン発見 |
| `library-learner` | E-graph 等価クラス + 構造類似性マージ | ライブラリ抽象化の発見、リファクタリング候補 |
| `deep-research` | 反復リサーチ + 証拠チェーン + 戦略ベース探索 | 技術調査、ベストプラクティス収集 |

### シンボリック側（論理・検証・推論）

| パッケージ | 機能 | SDD での利用場面 |
|-----------|------|-----------------|
| `formal-verify` | EARS → SMT-LIB2 変換、Z3 サブプロセス検証 | 要件の形式的一貫性検証、矛盾検出 |
| `lean` | Lean 4 定理変換 + 証明実行 | 安全性要件の定理証明、ハイブリッド検証 |
| `codegraph` | TS Compiler API AST + 依存グラフ + GraphRAG | コード構造分析、影響範囲分析 |
| `dfg` | DFG/CFG 構築 + 到達定義 + 使用連鎖 | データフロー分析、セキュリティ汚染解析 |
| `ontology-mcp` | N3 トリプルストア + ルールエンジン + 一貫性検証 | ドメインモデル推論、制約検証 |
| `knowledge` | エンティティ関係グラフ + サブグラフ抽出 | プロジェクト知識管理、関係探索 |

### 統合側（合成・変換）

| パッケージ | 機能 | SDD での利用場面 |
|-----------|------|-----------------|
| `synthesis` | DSL ビルダー（16変換）+ 合成戦略 + バージョンスペース | コード変換自動化、例示プログラミング |
| `pattern-mcp` | AST パターン抽出 + MCP ツール | パターンカタログ管理 |
| `sdd-ontology` | SDD ドメイン概念 + Turtle 定義 | SDD ワークフロー意味モデル |

### Phase 別ニューロシンボリック活用マップ

```
Phase 1 (Requirements)
  ├── neural-search: 類似要件検索
  ├── formal-verify: EARS 形式検証 (SMT)
  ├── knowledge: 要件間関係グラフ
  └── deep-research: 技術調査・ベストプラクティス

Phase 2 (Design)
  ├── codegraph: 既存コード構造分析
  ├── ontology-mcp: ドメインモデル推論
  ├── neural-search: 類似設計パターン検索
  └── decisions: ADR 記録

Phase 3 (Task Breakdown)
  ├── dfg: データフロー依存分析
  ├── library-learner: 再利用可能パターン発見
  └── synthesis: タスク変換ルール生成

Phase 4 (Implementation)
  ├── codegraph: AST 解析 + 影響範囲分析
  ├── wake-sleep: コードパターン学習
  ├── synthesis: コード変換自動化
  ├── security: 脆弱性スキャン
  └── lean: 安全性証明（オプション）

Phase 5 (Complete)
  ├── formal-verify: 最終一貫性検証
  ├── lean: ハイブリッド検証
  ├── knowledge: プロジェクト知識更新
  └── wake-sleep: 学習パターン統合
```

## レビューオーケストレーション

SDD 成果物の品質保証には `review-orchestrator` スキルを使用する。
詳細は `skills/review-orchestrator/SKILL.md` を参照。

### プロセス

1. 各フェーズの成果物が完成したら `review-orchestrator` を起動
2. opus-4.6 と gpt-5.4 が交互にレビュー（エラー 0 まで）
3. 両モデルの最終合意チェック（両方 PASS 必須）
4. 全アーティファクト承認後に実装フェーズへ遷移可能

### ルーティング

| トリガー | スキル |
|---------|--------|
| レビュー / review / 品質検証 | `review-orchestrator` |
| 合意チェック / consensus | `review-orchestrator` |
| 実装許可 / proceed to implementation | `review-orchestrator` |

## CLI コマンドマッピング

| CLI コマンド | パッケージ | 説明 |
|-------------|-----------|------|
| `musubix init` | musubi | プロジェクト初期化 |
| `musubix tasks` | workflow-engine | タスク管理 (validate/list/stats) |
| `musubix req` | core | 要件管理 (create/list/validate/trace) |
| `musubix req:wizard` | core | 要件作成ウィザード |
| `musubix design` | core | 設計生成 |
| `musubix design:c4` | core | C4 ダイアグラム生成 |
| `musubix design:verify` | core | 設計検証 |
| `musubix codegen` | core | コード生成 |
| `musubix test:gen` | core | テスト生成 |
| `musubix trace` | core | トレーサビリティ検証 |
| `musubix trace:verify` | core | トレーサビリティ詳細検証 |
| `musubix policy` | policy | ポリシー検証 |
| `musubix ontology` | ontology-mcp | オントロジー管理 |
| `musubix cg` | codegraph | コードグラフ解析 |
| `musubix security` | security | セキュリティスキャン |
| `musubix workflow` | workflow-engine | ワークフロー管理 |
| `musubix status` | workflow-engine | ステータス表示 |

## 禁止事項

- Phase をスキップしてはならない
- 承認なしで次 Phase に遷移してはならない
- テストなしでコードをコミットしてはならない
- EARS 形式に従わない要件を承認してはならない
- steering/ の参照をスキップしてはならない
- 形式検証をスキップして Phase 4→5 に遷移してはならない

## 緊急度トリアージ

| 緊急度 | 対応 |
|--------|------|
| 🔴 Critical | constitution-enforcer 違反 → 即時修正、Phase 進行ブロック |
| 🔴 Critical | formal-verify 矛盾検出 → 要件修正まで Phase 進行ブロック |
| 🟡 Major | テストカバレッジ不足 → test-engineer で補完後に進行 |
| 🟡 Major | セキュリティ脆弱性検出 → security で修正後に進行 |
| 🟢 Minor | ドキュメント不備 → 次回レビューで対応可 |

## 使用パッケージ

### コア制御
- `@musubix2/workflow-engine` — `PhaseController`, `StateTracker`, `TaskBreakdownManager`
- `@musubix2/agent-orchestrator` — `SubagentDispatcher`, `ReviewOrchestrator`
- `@musubix2/policy` — `PolicyEngine`, `QualityGateRunner`

### ニューラル
- `@musubix2/neural-search` — `TfIdfEmbeddingModel`, `NeuralSearchEngine`
- `@musubix2/wake-sleep` — `WakePhase`, `SleepPhase`, `CycleManager`
- `@musubix2/library-learner` — `EGraphEngine`, `LibraryLearner`
- `@musubix2/deep-research` — `ResearchEngine`, `DepthFirstStrategy`, `BreadthFirstStrategy`

### シンボリック
- `@musubix2/formal-verify` — `EarsToSmtConverter`, `Z3Adapter`, `PreconditionVerifier`
- `@musubix2/lean` — `LeanProofRunner`, `EarsToLeanConverter`, `HybridVerifier`
- `@musubix2/codegraph` — `ASTParser` (TS Compiler API), `GraphEngine`, `GraphRAGSearch`
- `@musubix2/dfg` — `DataFlowAnalyzer`
- `@musubix2/ontology-mcp` — `N3Store`, `RuleEngine`, `ConsistencyValidator`
- `@musubix2/knowledge` — `FileKnowledgeStore`

### 統合
- `@musubix2/synthesis` — `DSLBuilder`, `SynthesisEngine`, `VersionSpaceManager`
- `@musubix2/security` — `SecurityScanner`, `TaintAnalyzer`
- `@musubix2/decisions` — `DecisionManager`
- `@musubix2/assistant-axis` — `DomainClassifier`, `DriftAnalyzer`
