# MUSUBIX2 コマンド辞典

MUSUBIX2 CLI の全コマンドを機能別に整理したリファレンスです。各コマンドの用途・
サブコマンド・主要フラグ・使用例をまとめています。

> 対象バージョン: MUSUBIX2 `v0.5.93`。各コマンドは `musubix <command> --help` でも
> 使い方を確認できます。「やりたいことから引く」場合は
> [コマンド逆引き辞典](./command-cookbook-ja.md) を参照してください。

## 目次

- [共通事項](#共通事項)
- [1. プロジェクト管理](#1-プロジェクト管理)（`init` / `status` / `scaffold`）
- [2. 要件（Requirements）](#2-要件requirements)（`requirements` / `req` / `req:wizard` / `req:interview`）
- [3. 設計（Design）](#3-設計design)（`design` / `design:verify` / `design:c4`）
- [4. コード生成・テスト](#4-コード生成テスト)（`codegen` / `test:gen`）
- [5. 形式検証（Formal Verify）](#5-形式検証formal-verify)（`verify`）
- [6. トレーサビリティ](#6-トレーサビリティ)（`trace` / `trace:verify`）
- [7. コードグラフ（CodeGraph）](#7-コードグラフcodegraph)（`cg`）
- [8. セキュリティ](#8-セキュリティ)（`security`）
- [9. 静的解析](#9-静的解析)（`dfg` / `explain`）
- [10. タスク管理](#10-タスク管理)（`tasks`）
- [11. ワークフロー・ポリシー](#11-ワークフローポリシー)（`workflow` / `policy`）
- [12. ナレッジ・オントロジー・意思決定](#12-ナレッジオントロジー意思決定)（`knowledge` / `ontology` / `decision`）
- [13. 検索・リサーチ・学習・合成](#13-検索リサーチ学習合成)（`search` / `deep-research` / `learn` / `synthesis`）
- [14. スキル・MCP・その他](#14-スキルmcpその他)（`skills` / `mcp` / `repl` / `watch`）
- [終了コード](#終了コード)

---

## 共通事項

- **フラグ記法**: `--key value` と `--key=value` の両方に対応します。値なしのフラグ
  （`--strict` / `--json` / `--force` など）はブール値として扱われます。
- **`--json`**: 対応コマンドは機械可読な JSON を出力します（後述の各コマンドを参照）。
- **バージョン確認**: `musubix --version` / `-v` / `version`。
- **ヘルプ**: `musubix --help`（全コマンド一覧）、`musubix <command> --help`（個別）。
- **要件 ID**: `REQ-<ドメイン>-<番号>`。ドメインは **英字 2〜6 文字**（例 `REQ-AUTH-001`）。
- **改行コード**: LF / CRLF / CR いずれも解析可能（Windows 編集ファイルも可）。

---

## 1. プロジェクト管理

### `init` — プロジェクト初期化 / AI プラットフォーム連携

```
musubix init [path] [--name <name>] [--force] [--platform auto|copilot|claude|both] [--dry-run] [--update]
```

SDD の骨格（`steering/`・`storage/specs/`・`musubix.config.json`）を生成します。
`--platform` を付けると AI エージェント連携ファイルも生成します。

| フラグ | 説明 |
|--------|------|
| `--name <name>` | プロジェクト名（英字始まり・英数/ハイフン/アンダースコア、最大64文字） |
| `--platform claude` | `CLAUDE.md`・`.mcp.json`・`.claude/skills/`（8スキル）を生成 |
| `--platform copilot` | `.github/copilot-instructions.md`・`.vscode/mcp.json`・`.github/skills/`（GitHub Copilot / Copilot CLI 用） |
| `--platform both` | claude と copilot 両方 |
| `--force` | 既存ファイルを上書き（既定は冪等・上書きなし） |
| `--dry-run` | 生成せず計画だけ表示 |

```bash
musubix init myapp --name "MyApp" --platform both
```

### `status` — プロジェクト状況

```
musubix status
```

現在のワークフローフェーズと次にやるべきことを表示します。

### `scaffold` — 雛形生成

```
musubix scaffold <project|package|skill> <name>
```

| サブコマンド | 生成物 |
|-------------|--------|
| `project <name>` | SDD プロジェクト骨格 |
| `package <name>` | `packages/<name>/`（package.json・tsconfig・src・tests） |
| `skill <name>` | `skills/<name>/`（skill.json・index.ts・tests） |

```bash
musubix scaffold package mylib
```

---

## 2. 要件（Requirements）

### `requirements` / `req` — 要件分析・検証

```
musubix requirements <analyze|validate> <file>
musubix req <analyze|validate> <file>          # 別名
```

EARS 形式の要件を解析し、パターン（ubiquitous / event-driven / state-driven /
unwanted / optional / complex）と信頼度を判定します。

| サブコマンド | 説明 |
|-------------|------|
| `analyze <file>` | 各要件のパターンと信頼度を表示 |
| `validate <file>` | EARS 妥当性検証（SHALL 欠落・低信頼度・**重複ID**を警告） |

```bash
musubix req validate storage/specs/requirements/requirements.md
```

> `**要件**:` マーカーは任意。見出し直下に EARS 文を直接書いても解析されます。

### `req:wizard` — 要件作成ウィザード

```
musubix req:wizard
```

対話的に要件を作成する手順を案内します。

### `req:interview` — 要件インタビュー（1問1答）

```
musubix req:interview [<input>] [--answer <id> <text>] [--state] [--generate] [--reset]
```

状態は `.musubix/interview.json` に永続化され、コマンド呼び出しをまたいで継続します。

| フラグ | 説明 |
|--------|------|
| `<input>` | 入力テキストからインタビュー開始（再スタート） |
| `--answer <id> <text>` | 質問 `<id>` に回答 |
| `--state` | 現在の状態（進捗率・回答済み）を表示 |
| `--generate` | 収集した情報から要件ドキュメントを生成 |
| `--reset` | 状態をクリア |

```bash
musubix req:interview "チーム向けタスク管理アプリ"
musubix req:interview --answer project-name "TaskApp"
musubix req:interview --generate
```

---

## 3. 設計（Design）

### `design` — 設計生成 / 検証

```
musubix design generate <requirements.md> [--out <design.json>]
musubix design verify <design.json>
```

要件を **ドメイン（IDプレフィックス）ごとに凝集** し、EARS パターンから設計パターン
（Observer / State / Strategy / Feature Toggle / Chain of Responsibility）を検出します。
`--out` で後続コマンドに渡せる再利用可能な JSON を書き出します。

```bash
musubix design generate requirements.md --out design.json
```

### `design:verify` — SOLID 検証

```
musubix design:verify <design.json>
```

設計 JSON を SOLID 原則（SRP / ISP / DIP …）で検証し、スコア（0〜100）と違反を報告します。

### `design:c4` — C4 モデル図生成

```
musubix design:c4 <design.json|requirements.md> [--level context|container|component|code] [--format mermaid|plantuml]
```

| フラグ | 説明 |
|--------|------|
| `--level` | 図の粒度（既定 `context`） |
| `--format` | `mermaid`（既定）または `plantuml` |

```bash
musubix design:c4 design.json --level container --format plantuml
```

---

## 4. コード生成・テスト

### `codegen` — コード生成

```
musubix codegen [generate] <name|design.json|requirements.md> [--type <type>] [--out <file>]
musubix codegen <name> --lang typescript
```

要件/設計から型安全な実装骨格を生成します。戻り値型・引数・設計パターン・State enum・
interface（DIP）・トレーサビリティコメントを自動反映し、生成物は `tsc --strict` を通ります。

| フラグ | 値 |
|--------|-----|
| `--type` | `class`（既定）/ `interface` / `function` / `test` / `module` / `cli-command` / `enum` / `repository` / `factory` / `event` / `dto` / `validator` |
| `--out <file>` | ファイルに書き出し（親ディレクトリは自動作成） |
| `--lang` | TypeScript のみ（`--lang python` 等はエラー） |

```bash
musubix codegen generate design.json --out src/app.ts
```

### `test:gen` — テスト生成

```
musubix test:gen <source.ts|dir>
```

TS/JS ソースから Vitest 雛形を生成します（公開メソッドごとに 1 テスト）。**TS/JS 専用**
（他言語はエラー）。ディレクトリを渡すとファイルごとに生成します。

```bash
musubix test:gen src/app.ts
```

---

## 5. 形式検証（Formal Verify）

### `verify` — EARS → SMT 論理整合性検証

```
musubix verify <requirements.md>
```

EARS 要件を SMT-LIB2 に変換し、論理的整合性を検証します（z3 が無ければ mock ソルバー）。
IF-THEN は含意 `(=> 条件 動作)`、`SHALL NOT` は否定 `(not 動作)`、複合は `(and …)`。
矛盾する要件は `inconsistent` として検出されます。

```bash
musubix verify requirements.md
```

---

## 6. トレーサビリティ

### `trace` — トレーサビリティ解析

```
musubix trace <matrix|impact> [--specs <file>] [--src <dir>] [--json]
```

生成コードの `// Implements: REQ-…` コメントを解析し、要件↔コードの被覆を計測します。

| サブコマンド | 説明 | `--json` |
|-------------|------|---------|
| `matrix` | 要件×ファイルのトレース行列＋被覆率 | ✅ |
| `impact <REQ-ID>` | 要件変更時の影響範囲（シンボル単位） | ✅ |

```bash
musubix trace matrix --specs requirements.md --src src
musubix trace impact REQ-AUTH-001 --specs requirements.md --src src --json
```

### `trace:verify` — 未参照要件の検出（CI 向け）

```
musubix trace:verify [--specs <file>] [--src <dir>] [--strict]
```

未被覆の要件があると `--strict` で非ゼロ終了します（CI ゲート向け）。

---

## 7. コードグラフ（CodeGraph）

### `cg` — 依存グラフ分析・リファクタリング支援

```
musubix cg <subcommand> [args]
```

多言語（TypeScript / JavaScript / Python / Java / Go / Rust / C / C++ / C# …）の
**ファイル依存グラフ** を構築・分析します。フラグメント引数は **ファイル名（basename）**
を優先照合します。

| サブコマンド | 説明 | `--json` |
|-------------|------|---------|
| `index <path>` | グラフを構築（`.musubix/codegraph.json` に保存） | — |
| `search <query>` | シンボル名で検索 | — |
| `stats [fragment]` | ノード/エッジ数・種別内訳・最多被呼び出し関数 | ✅ |
| `deps <fragment>` | ファイルの外向き依存 | — |
| `impact <fragment>` | 逆到達（何が依存しているか）。`--direct` / `--depth N` | ✅ |
| `path <from> <to>` | 依存経路の最短鎖。`--all` | ✅ |
| `candidates [N]` | リライト候補ランキング（自己完結度×利用度−循環） | ✅ |
| `cycles [fragment]` | 循環依存（強連結成分） | ✅ |
| `gate [--max-cycles N] [--forbid A:B[,C:D]]` | CI 品質ゲート（引数なしは `--max-cycles 0`） | ✅ |
| `export [--format dot\|json] [--out <file>]` | グラフを DOT / JSON で出力。`--cluster` | — |
| `diff <baseline> [current]` | 2 スナップショットの差分 | ✅ |
| `languages` | 対応言語一覧 | — |

```bash
musubix cg index src
musubix cg cycles
musubix cg gate --max-cycles 0 --forbid "ui:db"
```

---

## 8. セキュリティ

### `security` — セキュリティスキャン

```
musubix security <path> [--fail-on critical|high|medium|low|info] [--exclude-tests] [--json]
```

シークレット・インジェクション（SQL/コマンド/コード/XSS/パストラバーサル）を検出します。
taint 解析は変数をまたぐデータフローを追跡し、**Python / PHP / JS / TS / Go / Java / C# /
Kotlin / Swift / Rust** をカバー。設定ファイル（`.env` / `.yml` / `.json` / `.toml` …）の
ハードコード秘密情報も検出します（パラメータ化クエリ・低エントロピー値は誤検出しません）。

| フラグ | 説明 |
|--------|------|
| `--fail-on <severity>` | 指定重大度以上で非ゼロ終了（CI 向け） |
| `--exclude-tests` | テストファイルを除外 |

```bash
musubix security src --fail-on high
```

---

## 9. 静的解析

### `dfg` — データフロー解析

```
musubix dfg <file> [--unused]
```

定義・使用・到達定義を解析し、未使用変数を検出します（シンプルな JS/TS 向け）。

```bash
musubix dfg src/util.ts --unused
```

### `explain` — コード説明

```
musubix explain <file-or-snippet>
```

コードを行単位で解析し、推論ステップと信頼度を表示します（言語非依存）。

---

## 10. タスク管理

### `tasks` — タスク解析

```
musubix tasks <validate|list|stats> [--file <path>]
```

`- [ ] TASK-001 | タイトル | high | simple` 形式のタスクを解析します。

| サブコマンド | 説明 |
|-------------|------|
| `validate <file>` | タスク定義を検証 |
| `list <file>` | タスク一覧を表形式で表示 |
| `stats <file>` | 集計（Total / Completed / Blocked / Pending） |

---

## 11. ワークフロー・ポリシー

### `workflow` — SDD フェーズ管理

```
musubix workflow <status|approve|transition> [phase] [--json]
```

フェーズ順: `requirements → design → task-breakdown → implementation → completion`。

| サブコマンド | 説明 | `--json` |
|-------------|------|---------|
| `status` | 現在フェーズと承認状況 | ✅ |
| `approve <phase>` | フェーズを承認（未知フェーズはエラー） | — |
| `transition <phase>` | フェーズ遷移（ゲート未通過は拒否） | — |

### `policy` — 憲法ポリシー検証

```
musubix policy <validate|list|info> [args]
```

| サブコマンド | 説明 |
|-------------|------|
| `validate <path>` | 成果物を 9 憲法条項で検証 |
| `list` | 憲法条項一覧 |
| `info <article-number>` | 条項の詳細 |

---

## 12. ナレッジ・オントロジー・意思決定

### `knowledge` — ナレッジグラフ操作

```
musubix knowledge <get|put|delete|link|query|traverse|search|stats> [args] [--json] [--path <dir>]
```

| サブコマンド | 説明 |
|-------------|------|
| `put <id> <type> [name]` | エンティティ追加 |
| `get <id>` | エンティティ取得 |
| `delete <id>` | 削除 |
| `link <from> <rel> <to>` | 関係を追加 |
| `query <filter>` | エンティティ検索 |
| `traverse <startId> [--depth N]` | グラフ探索（既定深さ 3） |
| `search <term>` | テキスト検索 |
| `stats` | 統計（`--json` 対応） |

```bash
musubix knowledge put user1 entity Alice
musubix knowledge link user1 knows user2
musubix knowledge traverse user1 --depth 10
```

### `ontology` — オントロジー（トリプル）管理

```
musubix ontology <add|list|query|validate|stats> [args] [--json]
```

| サブコマンド | 説明 |
|-------------|------|
| `add <s> <p> <o>` | トリプル追加 |
| `list` | 全トリプル（`--json` 対応） |
| `query <subject> [predicate] [object]` | パターン検索（`--json` 対応） |
| `validate` | 整合性検証 |
| `stats` | トリプル数（`--json` 対応） |

```bash
musubix ontology add Dog rdfs:subClassOf Animal
musubix ontology query Dog --json
```

### `decision` — ADR（アーキテクチャ決定記録）管理

```
musubix decision <create|list|get|accept|deprecate|search|index> [args] [--json]
```

| サブコマンド | 説明 |
|-------------|------|
| `create <title> [--context …] [--decision …] [--consequences …]` | ADR 作成 |
| `list` | 一覧（`--json` 対応） |
| `get <id>` / `accept <id>` / `deprecate <id>` | 取得 / 承認 / 非推奨化 |
| `search <query>` | 検索 |
| `index` | インデックス表示 |

---

## 13. 検索・リサーチ・学習・合成

### `search` — TF-IDF セマンティック検索

```
musubix search <query> [--corpus <dir>] [--top <n>]
```

コーパス内の文書をクエリとの関連度でランク付けします（既定コーパス `.`、上位 5 件）。

### `deep-research` — ディープリサーチ

```
musubix deep-research <query|iterative|evidence> [args]
```

### `learn` — ライブラリ/コードパターン学習

```
musubix learn <analyze|patterns|suggest> [args]
```

### `synthesis` — プログラム合成

```
musubix synthesis <fromExamples|dsl|version-space> [args]
```

| サブコマンド | 説明・例 |
|-------------|---------|
| `fromExamples "in=out" …` | 入出力例から変換規則を合成 |
| `dsl <input> --ops <op[:arg],…>` | DSL 変換パイプライン（`trim` / `upper` / `lower` / `reverse` / `capitalize` / `camelCase` / `snakeCase` / `replace:from:to` / `prefixRemove:p` / `suffixAppend:s` / `repeat:n`） |
| `version-space [--positive …] [--negative …]` | バージョン空間学習 |

```bash
musubix synthesis fromExamples "John Doe=John" "Jane Smith=Jane"
musubix synthesis dsl "hello world" --ops camelCase,capitalize
```

---

## 14. スキル・MCP・その他

### `skills` — Agent Skill 管理

```
musubix skills <list|validate|create> [args]
```

| サブコマンド | 説明 |
|-------------|------|
| `list` | 登録済みスキル一覧 |
| `validate <path>` | スキル定義（name/description/action 必須）を検証 |
| `create <name>` | スキル雛形を生成 |

### `mcp` — MCP サーバー起動

```
musubix mcp [--transport stdio|sse] [--port 3100]
```

**61 ツール / 13 カテゴリ** を公開する MCP サーバーを起動します（既定 stdio）。
Claude Code / GitHub Copilot / GitHub Copilot CLI から接続できます。

### `repl` — インタラクティブ REPL

```
musubix repl
```

`help` / `history` / `clear` / `exit` などのコマンドを対話実行します。

### `watch` — ファイル監視

```
musubix watch <glob-pattern>
```

---

## 終了コード

| コード | 名前 | 意味 |
|--------|------|------|
| `0` | SUCCESS | 成功 |
| `1` | GENERAL_ERROR | 一般エラー（ファイル未検出・例外など） |
| `2` | VALIDATION_ERROR | 検証エラー（不正な引数・要件/設計の不備など） |
| `3` | CONFIG_ERROR | 設定エラー |
| `4` | PHASE_BLOCKED | ワークフローのフェーズ遷移がゲートで拒否された |

CI では `--fail-on`（security）・`--strict`（trace:verify）・`cg gate` の終了コードを
利用してパイプラインを制御できます。

---

**関連**: [コマンド逆引き辞典](./command-cookbook-ja.md) ｜
[グリーンフィールド ガイド](./guide-greenfield-ja.md) ｜
[リファクタリング ガイド](./guide-refactoring-ja.md) ｜
[自然言語ガイド](./guide-natural-language-ja.md) ｜
[CodeGraph](./codegraph.md)
