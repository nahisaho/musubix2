# MUSUBIX2 によるAI駆動型アプリケーション開発

> Specification Driven Development とニューロシンボリック AI で実現する、次世代の開発ワークフロー

---

## はじめに

ソフトウェア開発における AI の活用は急速に進化しています。GitHub Copilot や Claude Code といった AI コーディングアシスタントは強力ですが、「仕様なきコード生成」という根本的な問題を抱えています。AI が生成したコードが正しいかどうかを判断するには、そもそも「何を作るべきか」が明確でなければなりません。

**MUSUBIX2** は、この問題に対する解答です。**Specification Driven Development（SDD）** というアプローチにより、要件定義 → 設計 → タスク分解 → 実装という厳格なフローを AI に強制し、**ニューロシンボリック AI** の力で各フェーズを支援します。

### この記事で学べること

- SDD（Specification Driven Development）とは何か
- ニューロシンボリック AI がなぜ開発に有効か
- MUSUBIX2 の Orchestrator がどのようにワークフローを制御するか
- 具体的な開発ステップの流れ

---

## 1. Specification Driven Development（SDD）とは

SDD は「仕様が全てを駆動する」開発手法です。従来の開発では要件が曖昧なまま実装が始まることがありますが、SDD ではそれを構造的に禁止します。

### 従来のAI開発 vs SDD

```
【従来】
ユーザー: 「ログイン機能を作って」
AI: （即座にコードを生成）
→ 問題: 仕様が不明確、テストなし、追跡不能

【SDD】
ユーザー: 「ログイン機能を作って」
AI: 「まず要件を定義します。認証方式はどれを使いますか？」
→ 要件定義 → 設計 → タスク分解 → 実装
→ 全工程でトレーサビリティ保証
```

### 5つのフェーズ

SDD は以下の5フェーズで構成され、各フェーズの遷移にはユーザーの承認が必須です。

```
Phase 1: Requirements（要件定義）
    └── EARS 形式で要件を記述
    └── ユーザーレビュー → ⏸️ 承認

Phase 2: Design（設計）
    └── SOLID 準拠の設計書を生成
    └── ユーザーレビュー → ⏸️ 承認

Phase 3: Task Breakdown（タスク分解）
    └── 設計から実装タスクを分解
    └── ユーザーレビュー → ⏸️ 承認

Phase 4: Implementation（実装）
    └── Red → Green → Blue サイクル

Phase 5: Complete（完了）
    └── 全品質ゲート通過
```

**重要: Phase をスキップすることは一切認められません。** ユーザーが「実装して」と依頼しても、AI はまず Phase 1 から開始します。

### EARS（Easy Approach to Requirements Syntax）

SDD で使用する要件記述形式です。自然言語の曖昧さを排除し、機械的に検証可能な要件を記述します。

| パターン | 構文 | 用途 |
|----------|------|------|
| **UBIQUITOUS** | THE システム SHALL... | 常に成立する要件 |
| **EVENT-DRIVEN** | WHEN \<event\>, THE システム SHALL... | イベント駆動の要件 |
| **STATE-DRIVEN** | WHILE \<state\>, THE システム SHALL... | 状態依存の要件 |
| **UNWANTED** | THE システム SHALL NOT... | 禁止事項 |
| **OPTIONAL** | WHERE \<feature\>, THE システム SHALL... | オプション機能 |
| **COMPLEX** | IF \<condition\>, THEN THE システム SHALL... | 条件付き要件 |

**記述例:**

```markdown
### REQ-AUTH-001: ユーザー認証

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN ユーザーがログインフォームを送信する,
THE システム SHALL パスワードを bcrypt で検証し、
JWT トークンを発行する。

**受入基準**:
- [ ] 正しいパスワードで JWT が発行される
- [ ] 不正なパスワードで 401 エラーが返る
- [ ] JWT の有効期限が 24 時間である
```

---

## 2. ニューロシンボリック AI とは

MUSUBIX2 のもう一つの核心は **ニューロシンボリック AI** です。これは「ニューラル（学習・パターン認識）」と「シンボリック（論理・推論・検証）」を融合したアプローチです。

### なぜ両方が必要なのか

| 手法 | 得意なこと | 苦手なこと |
|------|-----------|-----------|
| **ニューラル** | パターン認識、類似検索、曖昧な入力の処理 | 論理的厳密さ、形式的正しさの保証 |
| **シンボリック** | 論理検証、矛盾検出、トレーサビリティ | 曖昧な入力、パターン学習 |
| **ニューロシンボリック** | 両方の長所を組み合わせ | — |

### MUSUBIX2 のニューロシンボリック構成

#### ニューラル側（学習・検索・パターン認識）

```
neural-search      TF-IDF 埋込み + コサイン類似度
    → 類似要件検索、既存設計の参照、コード重複検出

wake-sleep         N-gram + PMI 統計パターン抽出
    → コードパターンの自動学習、設計パターン発見

library-learner    E-graph 等価クラス + 構造類似性マージ
    → ライブラリ抽象化の発見、リファクタリング候補

deep-research      反復リサーチ + 証拠チェーン
    → 技術調査、ベストプラクティス収集
```

#### シンボリック側（論理・検証・推論）

```
formal-verify      EARS → SMT-LIB2 変換、Z3 サブプロセス検証
    → 要件の形式的一貫性検証、矛盾検出

lean               Lean 4 定理変換 + 証明実行
    → 安全性要件の定理証明

codegraph          TS Compiler API + MultiLanguageParser (6言語)
    → 多言語コード構造分析、影響範囲分析

ontology-mcp       N3 トリプルストア + ルールエンジン
    → ドメインモデル推論、制約検証
```

#### 統合側（合成・変換）

```
synthesis          DSL ビルダー（16変換）+ バージョンスペース
    → コード変換自動化、例示プログラミング

git-knowledge      Git log/blame → 知識グラフ
    → 共変更分析、著者エキスパート特定
```

---

## 3. Orchestrator — ワークフロー制御の司令塔

MUSUBIX2 の中枢は **Orchestrator** です。ユーザーの依頼を解析し、適切なスキルにルーティングし、Phase 遷移を厳格に管理します。

### ルーティングの仕組み

Orchestrator は、ユーザーの入力を以下のツリーで分類します。

```
ユーザー入力
├── 仕様関連?
│   ├── 要件? → requirements-analyst
│   ├── 要件ヒアリング（情報不足）? → requirements-analyst (1問1答)
│   └── 設計? → design-generator
├── 実装関連?
│   ├── コード生成? → code-generator
│   ├── テスト? → test-engineer
│   └── プログラム合成? → synthesis
├── 品質関連?
│   ├── トレーサビリティ? → traceability-auditor
│   ├── ポリシー? → constitution-enforcer
│   ├── レビュー? → review-orchestrator
│   └── 形式検証? → formal-verify / lean
├── 分析関連?
│   ├── AST / コードグラフ? → codegraph
│   ├── データフロー? → dfg
│   └── セキュリティ? → security
├── 知識関連?
│   ├── 知識グラフ? → knowledge
│   ├── Git 履歴知識? → git-knowledge
│   └── ADR? → decisions
└── 学習関連?
    ├── ニューラル検索? → neural-search
    ├── パターン学習? → library-learner
    └── Wake-Sleep? → wake-sleep
```

### Phase 遷移ガード

Orchestrator は「実装に直行しようとする」操作を阻止します。

```
ユーザー: 「〇〇を実装して」
    │
    ├── Phase 1 の要件定義書が存在する？
    │   ├── NO → 「まず要件を定義します」
    │   └── YES → 承認済み？
    │       ├── NO → 「要件のレビューが必要です」
    │       └── YES → Phase 2 チェックへ
    │
    ├── Phase 2 の設計書が承認済み？
    │   ├── NO → 「設計を行います」
    │   └── YES → Phase 3 チェックへ
    │
    ├── Phase 3 のタスク分解が承認済み？
    │   ├── NO → 「タスクを分解します」
    │   └── YES → 実装開始許可 ✅
    │
    └── 全 Phase 承認済み → 実装開始
```

### 8つの専門スキル

Orchestrator は8つの専門スキルを統括し、各フェーズに適切なスキルを割り当てます。

| スキル | 役割 | 担当フェーズ |
|--------|------|-------------|
| **requirements-analyst** | EARS 要件分析・作成・検証 | Phase 1 |
| **design-generator** | SOLID 設計・C4 図・ADR | Phase 2 |
| **code-generator** | コード生成・スキャフォールド | Phase 4 |
| **test-engineer** | Red→Green→Blue テスト | Phase 4 |
| **traceability-auditor** | REQ↔DES↔Code↔Test 追跡 | 全 Phase |
| **constitution-enforcer** | 9条憲法準拠チェック | 全 Phase |
| **review-orchestrator** | 交互レビュー（opus-4.6 / gpt-5.4） | Phase 遷移時 |
| **orchestrator** | ルーティング・Phase 制御 | 全体 |

---

## 4. 開発ステップの実際 — ECサイトを例に

ここでは「EC サイトの商品検索機能」を例に、MUSUBIX2 での開発ステップを解説します。

### Step 1: プロジェクト初期化

```bash
npm install musubix2
npx musubix init
```

これにより以下が生成されます:

```
my-project/
├── steering/           # プロジェクトメモリ（9条憲法含む）
│   ├── product.ja.md
│   ├── structure.ja.md
│   ├── tech.ja.md
│   ├── rules/constitution.md
│   └── project.yml
├── storage/specs/      # 仕様書格納先
├── .github/skills/     # 8 スキル + 30 スクリプト
└── musubix.config.json
```

### Step 2: Phase 1 — 要件定義

ユーザーが「商品検索機能を作りたい」と依頼すると、Orchestrator は Phase 1 を開始します。

#### 2a. 情報収集（1問1答インタビュー）

ユーザーの入力から情報が不足している場合、`RequirementsInterviewer` が1問ずつヒアリングします。

```
AI: プロジェクト名を教えてください。
ユーザー: EC-Search

AI: このシステムの主な対象ユーザーは誰ですか？
ユーザー: 一般消費者と店舗管理者

AI: 主要な機能を教えてください。
ユーザー: キーワード検索、カテゴリ絞り込み、価格範囲フィルタ、ソート
```

必須項目（プロジェクト名、概要、ドメイン、対象ユーザー、主要機能）が揃うまで質問を続けます。

#### 2b. EARS 要件定義書の生成

収集した情報から `RequirementsDocGenerator` が EARS 準拠の要件定義書を自動生成します。

```markdown
### REQ-SEARCH-001: キーワード検索

**種別**: EVENT-DRIVEN
**優先度**: P0

**要件**:
WHEN ユーザーが検索ボックスにキーワードを入力して送信する,
THE システム SHALL 商品名と説明文に対して全文検索を実行し、
関連度順に結果を表示する。

**受入基準**:
- [ ] 検索キーワードに一致する商品が結果に含まれる
- [ ] 結果が関連度順にソートされている
- [ ] 検索結果が 500ms 以内に返る
```

#### 2c. ニューロシンボリック支援

この段階で以下のニューロシンボリック機能が活用されます:

- **neural-search**: 既存プロジェクトの類似要件を検索し、参考情報を提供
- **formal-verify**: EARS 形式の整合性を SMT ソルバー（Z3）で検証
- **knowledge**: 要件間の関係グラフを構築
- **deep-research**: 検索機能のベストプラクティスを調査

#### 2d. レビュー → 承認

```
AI: 要件定義書を作成しました。レビューをお願いします。
    [要件定義書を提示]
ユーザー: REQ-SEARCH-003 の受入基準をもう少し具体的にしてください。
AI: 修正しました。再レビューをお願いします。
ユーザー: 承認します。
AI: Phase 1 完了。Phase 2（設計）に進みます。
```

### Step 3: Phase 2 — 設計

承認された要件から設計書を生成します。

#### 3a. 設計書の生成

`design-generator` が SOLID 原則に準拠した設計を生成します。

```markdown
### DES-SEARCH-001: 検索サービス設計

**トレーサビリティ**: REQ-SEARCH-001 → REQ-SEARCH-004

**設計概要**:
4層アーキテクチャに従い、検索ロジックを分離する。

- Domain: SearchQuery, SearchResult, ProductIndex (インターフェース)
- Application: SearchService (ユースケース)
- Infrastructure: ElasticsearchAdapter (外部アダプタ)
- Interface: SearchCommand (CLI)
```

#### 3b. C4 ダイアグラム

```bash
npx musubix design:c4 design.md --level container
```

Mermaid 形式の C4 Container ダイアグラムが生成されます。

#### 3c. ADR（Architecture Decision Records）

重要な設計決定を ADR として記録します。

```bash
npx musubix decision create "Elasticsearch を検索エンジンとして採用"
```

#### 3d. ニューロシンボリック支援

- **codegraph + MultiLanguageParser**: 既存コードの構造を解析し、設計との整合性を確認
- **git-knowledge**: Git 履歴から共変更パターンとエキスパートを特定
- **ontology-mcp**: ドメインモデルの推論と制約検証

#### 3e. レビュー → 承認

設計書をユーザーに提示し、承認を得ます。

### Step 4: Phase 3 — タスク分解

承認された設計からタスクを分解します。

```markdown
### TASK-SEARCH-001: SearchQuery ドメインモデル

**トレーサビリティ**: REQ-SEARCH-001 → DES-SEARCH-001
**パッケージ**: search
**種別**: backend
**優先度**: P0
**依存**: なし

**実装内容**:
- SearchQuery 値オブジェクトの定義
- SearchResult エンティティの定義
- ProductIndex インターフェースの定義

**受入基準**:
- [ ] テストが書かれている（Red）
- [ ] テストが通る（Green）
- [ ] リファクタリング済み（Blue）
```

タスクは DAG（有向非巡回グラフ）で依存関係が管理され、循環依存がないことが検証されます。

### Step 5: Phase 4 — 実装

タスク順に **Red → Green → Blue** サイクルで実装します。

```
1. RED:   失敗するテストを書く
           describe('REQ-SEARCH-001: キーワード検索', () => { ... })

2. GREEN: テストが通る最小限のコードを書く

3. BLUE:  リファクタリング（テストは緑のまま）
```

#### ニューロシンボリック支援

- **codegraph**: AST 解析で影響範囲を分析
- **git-knowledge**: 共変更ファイルの検出
- **wake-sleep**: コードパターンの自動学習
- **synthesis**: コード変換の自動化
- **security**: 脆弱性スキャン

### Step 6: Phase 5 — 完了

全品質ゲートを通過して完了します。

```bash
npx musubix policy validate        # 9条憲法準拠チェック
npx musubix trace validate          # トレーサビリティ検証
npx musubix trace:verify            # 詳細検証
```

- テストカバレッジ 80% 以上
- 全 EARS 要件にテストが対応
- REQ ↔ DES ↔ Code ↔ Test の100% トレーサビリティ
- 形式検証（Z3 / Lean 4）パス

---

## 5. MCP サーバー — AI エディタとの統合

MUSUBIX2 は **Model Context Protocol（MCP）** サーバーを内蔵しており、Claude Code、GitHub Copilot、Cursor などの AI エディタから直接利用できます。

### アーキテクチャ

```
AI エディタ (Claude Code / Copilot / Cursor)
    │
    ├── stdio ──→ StdioTransport ──→ MCPServer
    └── HTTP  ──→ SSETransport   ──→ MCPServer
                                       │
                    ┌──────────────────┤
                    │                  │                  │
             MCPToolRegistry    PromptRegistry     ResourceRegistry
             (61 tools)         (4 prompts)        (3 resources)
```

### 61 ツール × 13 カテゴリ

| カテゴリ | ツール数 | 代表的なツール |
|---------|---------|---------------|
| sdd-core | 12 | 要件作成、インタビュー、コード生成 |
| knowledge | 7 | エンティティ管理、検索、トラバース |
| code-analysis | 4 | AST 解析、依存グラフ構築 |
| formal-verify | 5 | Z3 検証、Lean 証明、ハイブリッド検証 |
| neural | 5 | ニューラル検索、パターン抽出 |
| security | 4 | 脆弱性スキャン、汚染解析 |
| 他 7 カテゴリ | 24 | ワークフロー、決定記録、合成 等 |

---

## 6. 9条憲法 — 開発のガードレール

MUSUBIX2 は「9条憲法」と呼ばれる不変のルールセットを持ちます。これはプロジェクト全体を通じて一切修正できない制約です。

| 条項 | 原則 | 意味 |
|------|------|------|
| Article I | ライブラリファースト | 各機能を独立パッケージとして設計 |
| Article II | CLI インターフェース | 全機能に CLI を提供 |
| Article III | テストファースト | Red→Green→Blue サイクル必須 |
| Article IV | EARS 形式 | 全要件を EARS 構文で記述 |
| Article V | トレーサビリティ | REQ↔DES↔Code↔Test の100%追跡 |
| Article VI | プロジェクトメモリ | steering/ の参照必須 |
| Article VII | デザインパターン文書化 | パターン使用時に文書化 |
| Article VIII | ADR 記録 | 重要決定を記録 |
| Article IX | 品質ゲート | Phase 遷移時にゲート通過必須 |

`constitution-enforcer` スキルがこれらの条項を自動検証します。

---

## 7. 交互レビュー — マルチモデル品質保証

MUSUBIX2 は **review-orchestrator** スキルにより、複数の AI モデルによる交互レビューを実施します。

```
Phase 1: 交互レビュー
   Model A (Claude Opus 4.6) がレビュー
   → 指摘を Model B (GPT-5.4) に渡す
   → Model B がレビュー
   → エラー 0 になるまで交互に繰り返し（最大 5 ラウンド）

Phase 2: 最終合意チェック
   両モデルが同時にレビュー
   → 両方 PASS で承認

Phase 3: 実装許可判定
   requirements + design + plan 全て承認済み
   → canProceedToImplementation() = true
```

単一モデルでは見落とす問題を、異なる視点の AI が相互に検出します。

---

## 8. CLI コマンド一覧

MUSUBIX2 は 28 の CLI コマンドを提供します。

### 仕様フェーズ

```bash
npx musubix req <file>                    # 要件分析
npx musubix req:wizard                     # 要件作成ウィザード
npx musubix req:interview <input>          # 1問1答インタビュー
npx musubix design <req-file>              # 設計生成
npx musubix design:c4 <file>               # C4 ダイアグラム
npx musubix design:verify <design-file>    # 設計検証
npx musubix decision <subcommand>          # ADR 管理
```

### 実装フェーズ

```bash
npx musubix codegen <name>                 # コード生成
npx musubix test:gen <source-file>         # テスト生成
npx musubix scaffold <type> <name>         # スキャフォールド
npx musubix explain <file>                 # コード説明
npx musubix synthesis <subcommand>         # プログラム合成
```

### 品質・検証

```bash
npx musubix trace <subcommand>             # トレーサビリティ
npx musubix trace:verify                   # 詳細検証
npx musubix policy <subcommand>            # ポリシー検証
npx musubix security <path>                # セキュリティスキャン
```

### 知識・分析

```bash
npx musubix knowledge <subcommand>         # 知識グラフ
npx musubix cg <subcommand>                # コードグラフ
npx musubix deep-research <subcommand>     # ディープリサーチ
npx musubix learn <subcommand>             # パターン学習
```

### ワークフロー

```bash
npx musubix workflow <subcommand>          # ワークフロー管理
npx musubix status                         # ステータス表示
npx musubix tasks <subcommand>             # タスク管理
npx musubix watch <pattern>                # ファイル監視
npx musubix skills <subcommand>            # スキル管理
npx musubix repl                           # 対話型 REPL
```

---

## 9. まとめ

MUSUBIX2 は「AI にコードを書かせる」だけのツールではありません。**仕様を起点に、AI と人間が協調して品質の高いソフトウェアを構築するシステム**です。

### MUSUBIX2 が解決する問題

| 問題 | MUSUBIX2 の解決策 |
|------|-------------------|
| 仕様なきコード生成 | SDD ワークフロー強制（Phase スキップ禁止） |
| 要件の曖昧さ | EARS 形式 + 1問1答インタビュー |
| テスト不足 | Red→Green→Blue サイクル強制 |
| 追跡不能な変更 | 100% トレーサビリティ（REQ↔DES↔Code↔Test） |
| 論理的矛盾 | 形式検証（Z3 / Lean 4） |
| 単一視点のレビュー | 交互レビュー（opus-4.6 × gpt-5.4） |
| 知識の散逸 | 知識グラフ + Git ネイティブ知識抽出 |

### 始め方

```bash
# インストール
npm install musubix2

# プロジェクト初期化
npx musubix init

# ヘルプ表示
npx musubix --help
```

SDD の原則に従い、仕様から始めましょう。AI は強力なツールですが、**仕様なき実装は負債**です。MUSUBIX2 は、その原則を AI 自身に守らせるシステムです。

---

## 参考情報

- **リポジトリ**: [github.com/nahisaho/musubix2](https://github.com/nahisaho/musubix2)
- **npm**: [npmjs.com/package/musubix2](https://www.npmjs.com/package/musubix2)
- **ライセンス**: MIT
- **バージョン**: 0.3.7
- **パッケージ数**: 26
- **テスト数**: 1,588
- **MCP ツール数**: 61
