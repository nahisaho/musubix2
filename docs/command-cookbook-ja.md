# MUSUBIX2 コマンド逆引き辞典

**「〜したい」から引く** コマンド逆引きリファレンスです。目的別に、使うコマンドと
最小の実行例を示します。コマンドの詳細仕様は
[コマンド辞典](./command-reference-ja.md) を参照してください。

> 対象バージョン: MUSUBIX2 `v0.5.93`

## 目次

- [はじめる](#はじめる)
- [要件を書く・検証する](#要件を書く検証する)
- [設計する](#設計する)
- [コードを生成する](#コードを生成する)
- [テストを作る](#テストを作る)
- [要件の論理を検証する](#要件の論理を検証する)
- [トレーサビリティを確認する](#トレーサビリティを確認する)
- [既存コードを分析・リファクタする](#既存コードを分析リファクタする)
- [セキュリティを検査する](#セキュリティを検査する)
- [CI に組み込む](#ci-に組み込む)
- [AI エージェントと連携する](#ai-エージェントと連携する)
- [知識・決定を記録する](#知識決定を記録する)
- [その他の便利機能](#その他の便利機能)
- [困ったとき（トラブル逆引き）](#困ったときトラブル逆引き)

---

## はじめる

| やりたいこと | コマンド |
|-------------|---------|
| 新規プロジェクトを作る | `musubix init myapp --name "MyApp"` |
| AI 連携込みで初期化（Claude Code） | `musubix init myapp --platform claude --name "MyApp"` |
| AI 連携込みで初期化（GitHub Copilot / Copilot CLI） | `musubix init myapp --platform copilot --name "MyApp"` |
| 両方の AI プラットフォームを設定 | `musubix init myapp --platform both --name "MyApp"` |
| 何も上書きせず再初期化したい | （既定で冪等。テンプレ再生成は）`musubix init . --force` |
| 今どのフェーズか知りたい | `musubix status` |
| バージョンを確認 | `musubix --version`（`version` / `-v` も可） |
| コマンド一覧を見る | `musubix --help` |
| 特定コマンドの使い方 | `musubix <command> --help` |
| パッケージ/スキルの雛形が欲しい | `musubix scaffold package mylib` / `musubix scaffold skill myskill` |

---

## 要件を書く・検証する

| やりたいこと | コマンド |
|-------------|---------|
| 要件の EARS パターンを見たい | `musubix requirements analyze reqs.md` |
| 要件を検証したい（SHALL 欠落・重複ID など） | `musubix req validate reqs.md` |
| 対話的に要件を作りたい（1問1答） | `musubix req:interview "作りたいものの説明"` |
| インタビューの質問に答える | `musubix req:interview --answer project-name "MyApp"` |
| インタビューの進捗を見る | `musubix req:interview --state` |
| インタビューから要件書を生成 | `musubix req:interview --generate` |
| インタビューをやり直す | `musubix req:interview --reset` |
| 要件作成の手順を知りたい | `musubix req:wizard` |

> 要件は `## REQ-<ドメイン>-<番号>: タイトル` の見出し＋直下に `WHEN … THE system SHALL …`。
> ドメインは英字 2〜6 文字。`**要件**:` マーカーは任意。

---

## 設計する

| やりたいこと | コマンド |
|-------------|---------|
| 要件から設計を生成 | `musubix design generate reqs.md --out design.json` |
| SOLID 原則をチェック | `musubix design:verify design.json` |
| C4 図（Mermaid）を出力 | `musubix design:c4 design.json --level container` |
| C4 図（PlantUML）を出力 | `musubix design:c4 design.json --format plantuml` |
| コンテナ/コンポーネント粒度の図 | `musubix design:c4 design.json --level component` |

---

## コードを生成する

| やりたいこと | コマンド |
|-------------|---------|
| 設計からコード骨格を生成 | `musubix codegen generate design.json --out src/app.ts` |
| 要件から直接コード生成 | `musubix codegen reqs.md --out src/app.ts` |
| 単一のクラス/関数を生成 | `musubix codegen MyService --type class` |
| interface を生成 | `musubix codegen IMyRepo --type interface` |
| repository / factory / dto などを生成 | `musubix codegen X --type repository`（`factory`/`dto`/`enum`/`validator`/`event`…） |

> 生成コードは戻り値型・引数・State enum・interface（DIP）・トレーサビリティコメントを
> 自動反映し、`tsc --strict` を通ります。`--out` の親ディレクトリは自動作成されます。

---

## テストを作る

| やりたいこと | コマンド |
|-------------|---------|
| ソースから Vitest 雛形を生成 | `musubix test:gen src/app.ts` |
| ディレクトリ全体のテスト雛形 | `musubix test:gen src` |

> `test:gen` は TS/JS 専用です。

---

## 要件の論理を検証する

| やりたいこと | コマンド |
|-------------|---------|
| 要件の論理的整合性を検証（SMT） | `musubix verify reqs.md` |
| 矛盾する要件を見つけたい | `musubix verify reqs.md`（`inconsistent` と表示される） |

> `SHALL X` と `SHALL NOT X` の矛盾、`WHILE`/`IF`/`WHEN` の条件付き矛盾を検出します。

---

## トレーサビリティを確認する

| やりたいこと | コマンド |
|-------------|---------|
| 要件↔コードの被覆率を見たい | `musubix trace matrix --specs reqs.md --src src` |
| 被覆率を JSON で取得 | `musubix trace matrix --specs reqs.md --src src --json` |
| ある要件を変えたときの影響範囲 | `musubix trace impact REQ-AUTH-001 --specs reqs.md --src src` |
| 未参照の要件を検出（CI 向け） | `musubix trace:verify --specs reqs.md --src src --strict` |

> コードに `// Implements: REQ-…` コメントがあると被覆として計測されます。

---

## 既存コードを分析・リファクタする

| やりたいこと | コマンド |
|-------------|---------|
| コードグラフを構築 | `musubix cg index src` |
| 循環依存を見つけたい | `musubix cg cycles` |
| あるファイルを変えると何が壊れるか | `musubix cg impact db` |
| A が B にどう依存しているか | `musubix cg path api db` |
| あるファイルの依存先を見る | `musubix cg deps service` |
| リライトしやすいファイルを選ぶ | `musubix cg candidates 5` |
| グラフの統計を見る | `musubix cg stats`（`--json` 可） |
| グラフを図として保存 | `musubix cg export --format dot --out graph.dot` |
| 変更前後のグラフ差分 | `musubix cg export --out base.json --format json` → 変更後 `musubix cg diff base.json` |
| 対応言語を確認 | `musubix cg languages` |
| 未使用変数を検出 | `musubix dfg src/util.ts --unused` |
| コードの意味を説明させる | `musubix explain src/app.ts` |
| コード内のシンボルを検索 | `musubix cg search MyClass` |
| 文書をキーワードで検索 | `musubix search "認証 ログイン" --corpus docs` |

---

## セキュリティを検査する

| やりたいこと | コマンド |
|-------------|---------|
| ディレクトリをスキャン | `musubix security src` |
| 設定ファイルの秘密情報も検査 | `musubix security .`（`.env`/`.yml`/`.json` 等も対象） |
| 重大度しきい値で CI を落とす | `musubix security src --fail-on high` |
| テストファイルを除外 | `musubix security src --exclude-tests` |
| 結果を JSON で取得 | `musubix security src --json` |

> SQL/コマンド/コード/XSS インジェクションの taint 解析は 10 言語（Python/PHP/JS/TS/
> Go/Java/C#/Kotlin/Swift/Rust）に対応。パラメータ化クエリは誤検出しません。

---

## CI に組み込む

| やりたいこと | コマンド |
|-------------|---------|
| 循環依存があれば失敗 | `musubix cg gate --max-cycles 0`（引数なし `cg gate` も同義） |
| レイヤ違反があれば失敗 | `musubix cg gate --forbid "ui:db"` |
| 未参照要件があれば失敗 | `musubix trace:verify --specs reqs.md --src src --strict` |
| 高危険度の脆弱性があれば失敗 | `musubix security src --fail-on high` |

> いずれも違反時に非ゼロ終了します。`--json` を付けて結果を機械可読で取得できます。

```yaml
# 例: GitHub Actions ステップ
- run: npx musubix2 cg index src
- run: npx musubix2 cg gate --max-cycles 0 --forbid "ui:db"
- run: npx musubix2 trace:verify --specs storage/specs/requirements/requirements.md --src src --strict
- run: npx musubix2 security src --fail-on high
```

---

## AI エージェントと連携する

| やりたいこと | コマンド |
|-------------|---------|
| Claude Code 連携をセットアップ | `musubix init . --platform claude` |
| GitHub Copilot / Copilot CLI 連携 | `musubix init . --platform copilot` |
| MCP サーバーを手動起動（stdio） | `musubix mcp` |
| MCP サーバーを SSE で起動 | `musubix mcp --transport sse --port 3100` |

> MCP サーバーは **61 ツール / 13 カテゴリ** を公開し、Claude Code / GitHub Copilot /
> GitHub Copilot CLI から接続できます。詳細は [自然言語ガイド](./guide-natural-language-ja.md)。

---

## 知識・決定を記録する

| やりたいこと | コマンド |
|-------------|---------|
| エンティティを登録 | `musubix knowledge put user1 entity Alice` |
| 関係を張る | `musubix knowledge link user1 knows user2` |
| グラフを辿る（深さ指定） | `musubix knowledge traverse user1 --depth 10` |
| ナレッジを検索 | `musubix knowledge search Alice` |
| オントロジーにトリプル追加 | `musubix ontology add Dog rdfs:subClassOf Animal` |
| トリプルを検索 | `musubix ontology query Dog`（`--json` 可） |
| オントロジーの整合性検証 | `musubix ontology validate` |
| ADR（決定記録）を作る | `musubix decision create "PostgreSQL を採用"` |
| ADR を承認 / 非推奨化 | `musubix decision accept ADR-001` / `deprecate ADR-001` |
| ADR 一覧（JSON） | `musubix decision list --json` |

---

## その他の便利機能

| やりたいこと | コマンド |
|-------------|---------|
| タスクを検証・集計 | `musubix tasks validate tasks.md` / `tasks stats tasks.md` |
| ワークフローを進める | `musubix workflow approve requirements` → `musubix workflow transition design` |
| ワークフロー状況を JSON で | `musubix workflow status --json` |
| 憲法条項を確認 | `musubix policy list` / `musubix policy info 3` |
| 入出力例から変換規則を合成 | `musubix synthesis fromExamples "John Doe=John" "Amy Lee=Amy"` |
| 文字列変換パイプライン | `musubix synthesis dsl "hello world" --ops camelCase` |
| コードパターンを学習 | `musubix learn analyze src` |
| ファイル変更を監視 | `musubix watch "*.md"` |
| 対話シェルを使う | `musubix repl` |

---

## 困ったとき（トラブル逆引き）

| 症状 | 原因・対処 |
|------|-----------|
| `No requirements found in file` | 見出しが `## REQ-XXX-000:` 形式か、ドメインが**英字 2〜6 文字**か確認。1文字/数字入りは不可 |
| `req validate` が全要件「Missing SHALL」 | 本文に EARS 文（`THE system SHALL …`）があるか確認（マーカー無しでも可） |
| `design:verify` が JSON エラー | Markdown を渡していないか。`design generate … --out design.json` の JSON を渡す |
| `codegen` がクラスを生成しない | 存在しないパスを渡していないか（`❌ File not found`）。`--type` の綴りを確認 |
| `test:gen` が汎用スタブしか出ない | TS/JS 以外を渡していないか（TS/JS 専用） |
| `cg …` が空 | 先に `musubix cg index <path>` を実行したか |
| `cg impact X` が意図しないファイル | フラグメントは basename 優先照合。`cg impact db.ts` のように具体化 |
| `--out=file` が効かない（旧版） | v0.5.83+ で `--key=value` 対応。最新版に更新 |
| CRLF ファイルで要件0件（旧版） | v0.5.77+ で CRLF 対応。最新版に更新 |
| セキュリティで秘密情報を見逃す | v0.5.72+ で `.env`/`.yml` 等の設定ファイルも走査。最新版に更新 |
| 並行実行でナレッジ/オントロジーが欠落 | 同一ストアへの並行 CLI 書き込みは非対応。逐次実行する |

---

**関連**: [コマンド辞典](./command-reference-ja.md) ｜
[グリーンフィールド ガイド](./guide-greenfield-ja.md) ｜
[リファクタリング ガイド](./guide-refactoring-ja.md) ｜
[自然言語ガイド](./guide-natural-language-ja.md)
