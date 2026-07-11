# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.86] - 2026-07-12

dogfooding 実装テスト 50 本（第 16 巡）を実施し、1 件の不具合を修正。i18n パスとガイドを重点検証。

### Fixed

- **`test:gen` が非 TS/JS ファイルに対して誤解を招く汎用スタブを生成していた** — テストジェネレータは Vitest 用で `export function`/`export class` を解析するため TS/JS 専用だが、Python など（`EXT_TO_LANG` の全 16 言語）を受理し、関数を解析できずに `describe('module')` の汎用 Vitest スタブを出力していた（Python に TS テストを生成）。TS/JS 拡張子（ts/tsx/js/jsx/mjs/cjs）のみを対象とし、それ以外は「TS/JS のみ対応」と明示してエラーにするよう修正

### Verified

- 全日本語タイトル要件の codegen（valid TS・tsc 通過・SOLID 100）、混在 JP/EN タイトル、絵文字・全角・全角スペースを含む要件、MCP 13 カテゴリ 61 ツールの整合、自然言語ガイドのツール名 40 件が全て実在、Chain of Responsibility 検出、リファクタリングガイドの cg フロー

## [0.5.85] - 2026-07-12

dogfooding 実装テスト 50 本（第 15 巡）を実施し、1 件の不具合を修正＋ガイドのドリフトを解消。MCP stdio プロトコル（JSON-RPC）を実測検証。

### Fixed

- **非ASCII（日本語）タイトルの要件で interface が生成されず、偽の DIP 違反で SOLID スコアが下がっていた** — 0.5.69 の `suggestInterfaces` 修正で非英数字を除去した結果、日本語タイトルは語が残らず interface が空になっていた（codegen は `I<Service>` を生成するのに design:verify では「interface なし」と判定され不整合）。タイトルから語が得られない場合は英語の SHALL 句（操作名）から interface 名を導出するフォールバックを追加（`短縮リンク作成` → `ICreateShortLink`）。グリーンフィールドガイドの URL 短縮サービス例が再び SOLID 100/100 になった

### Docs

- グリーンフィールドガイドのメソッド例を現行挙動に更新（`createShortLink(longUrl)` → `createShortLink(longURL)`、`redirectOriginalUrl` → `redirectOriginalURL`）。0.5.79/0.5.81 の頭字語ケース保持により、要件文の「long URL」から `longURL` が生成される

### Verified

- MCP stdio（initialize / tools/list=61 / tools/call / 不正 JSON 耐性 / 未知ツールの isError）、グリーンフィールドガイドの全コマンド（analyze/design/verify/codegen）

## [0.5.84] - 2026-07-12

dogfooding 実装テスト 50 本（第 14 巡）を実施し、1 件の不具合を修正。

### Fixed

- **`cg stats --json` が JSON を出力しなかった** — 他の cg サブコマンド（impact/export/diff/path/cycles）が `--json` に対応する中、`cg stats` だけがフラグを無視して人間可読テキストを出力し、JSON としてパースできなかった。nodes/edges/languages/files/nodeKinds/edgeKinds/topCalledFunctions を含む JSON を出力するよう対応（テキスト出力は従来どおり）

### Verified

- `--key=value` 記法を全コマンドで確認、パス処理（空白入り・相対 `../`・末尾スラッシュ・`./`・ドット入りファイル名）、cg 系 `--json` の妥当性（impact/export/diff/path/cycles/candidates）、プロジェクト名バリデーション（空・数字始まり）

## [0.5.83] - 2026-07-12

dogfooding 実装テスト 50 本（第 13 巡）を実施し、2 件の不具合を修正。

### Fixed

- **`--key=value` 記法が解釈されなかった** — `codegen r.md --out=dist/app.ts` のような等号記法が未対応で、フラグ全体（`out=dist/app.ts`）が boolean フラグ名として扱われ `--out` が効かず（標準出力に出力）ファイルが書かれなかった。`--key=value` と `--key value` の両方を解釈するよう修正
- **値なしの `--out` が生の Node エラーでクラッシュ** — `codegen r.md --out`（値なし）はフラグが boolean `true` になり、`writeFileSync(true, …)` が `ERR_INVALID_ARG_TYPE` を投げていた。文字列以外のフラグ値は「未指定」として扱う `flagStr` ヘルパーを追加し、クラッシュを防止

### Verified

- neural search の境界条件（重複文書・topK>コーパス・空クエリ・topK=0）、SOLID スコアの下限、coverage の丸め（3/7=43%）、50 要件のトレース（0.3 秒）、ontology 推移推論（Dog⊑…⊑LivingThing）、フラグ解析（未知フラグ無視・重複フラグ・短縮フラグ）

## [0.5.82] - 2026-07-12

dogfooding 実装テスト 50 本（第 12 巡）を実施し、1 件の不具合を修正。

### Fixed

- **`search`（TF-IDF）で語彙が 128 を超えると無関係な文書に誤った類似度が付いていた** — fit 済みモデルが `vocabIdx % dimensions`（既定 128 次元）でバケットを決めるため、語彙が 128 語を超えると別々の語が衝突し、クエリ語を全く含まない文書（例: コードファイル）に 0.493 のような偽スコアが付いていた。fit 時にベクトル次元を語彙サイズまで拡張し、各語が自身のインデックスを衝突なく使えるよう修正。クエリ語を共有しない文書はスコア 0 になった

### Verified

- dfg（複数行関数本体、未使用/使用前定義）、cg candidates（関数を持つファイルのランキング）、cg deps 方向、Feature Toggle + State の同居 codegen、頭字語エンティティ（JWT）、synthesis（prefix 除去・大文字化・矛盾例）、重複 ID 検出、ネストディレクトリのセキュリティ走査

## [0.5.81] - 2026-07-12

dogfooding 実装テスト 50 本（第 11 巡）を実施し、2 件の不具合を修正。

### Fixed

- **設定値のシークレット検出で低エントロピーのダミー値を誤検出** — `API_KEY=aaaaaaaaaaaaaaaa` や `abababab` のような明らかにダミーの値をハードコード秘密情報として検出していた。異なる文字が 4 種未満の値は本物の鍵ではないとして除外（実際の高エントロピー鍵・AWS シークレットは従来どおり検出）
- **パラメータ名の先頭が全大文字の頭字語だと不自然な camelCase になっていた** — `accepts a JSON payload` から `jSONPayload` という引数名を生成していた。先頭語が全大文字の頭字語（JSON/API など）の場合は全体を小文字化し、慣用的な `jsonPayload` にするよう修正

### Verified

- taint sanitizer（`?` パラメータ化 / `encodeURIComponent` / `parseInt` / `Number()` は無害、`String()` キャストは検出）、multi-hop 伝播、テンプレートリテラルのメソッド呼び出し、Python `%`/`.format` 検出、param 推論（複数引数・複合名詞）、コレクション型推論

## [0.5.80] - 2026-07-12

dogfooding 実装テスト 50 本（第 10 巡）を実施し、1 件の不具合を修正。

### Fixed

- **「list/array/collection of X」がコレクション型として推論されなかった** — codegen の戻り値型推論で `SHALL return a list of OrderItems` が `ListOrderItems`（実在しない造語型）になっていた。先頭のコレクション語（list/array/collection/set/sequence）＋任意の「of」を検出し、後続の名詞のコレクション（`OrderItems[]`）として推論するよう修正。エンティティスタブも `interface OrderItems {}` を宣言し、生成物は tsc を通る（`UserProfile` などのケース保持や `session token` → `SessionToken` は従来どおり）

### Verified

- コレクション各形（`set of Tags` → `Tags[]`、`sequence of Events` → `Events[]`、二重 `[]` なし）、Strategy/CoR パターン検出、要件ドキュメント生成、エンティティスタブ宣言＋ tsc 通過、EARS 全パターン分類

## [0.5.79] - 2026-07-12

dogfooding 実装テスト 50 本（第 9 巡）を実施し、2 件の不具合を修正。

### Fixed

- **PascalCase のエンティティ型名が小文字化されていた** — codegen の型推論で `SHALL return a UserProfile` が `Userprofile`（内部の大文字が消失）になり、`OrderLineItem` も `Orderlineitem` になっていた。`pascalJoin`/`camelJoin` が各語の先頭以外を強制小文字化していたのが原因。既存の内部大文字を保持しつつ先頭のみ正規化するよう修正（`session token` → `SessionToken` など従来の挙動は維持）
- **`knowledge traverse` がデフォルト深さ 3 で長い連鎖を無言で切り捨てていた** — 6 ノードの連鎖でも 4 ノードしか返さず、全グラフに到達する手段が無かった。`--depth N` を追加（不正値はエラー）

### Verified

- 全 6 EARS パターン、param 推論、State enum、SMT 意味論、多言語 CodeGraph、workflow 状態機械、エラーパス（読取専用/ディレクトリ/バイナリ/構文エラーファイル）のハンドリング、決定性、`--depth` の境界

## [0.5.78] - 2026-07-11

dogfooding 実装テスト 50 本（第 8 巡）を実施し、1 件の不具合を修正。

### Fixed

- **`workflow approve` / `workflow transition` が未知のフェーズ名を受理していた** — `workflow approve bogus` が「✅ Approved: bogus」と成功していた。`PHASE_ORDER`（requirements/design/task-breakdown/implementation/completion）に対して検証し、未知のフェーズはエラーにするよう修正

### Known limitations (verified, not fixed)

- 複数の CLI プロセスが同一のストアファイル（`.knowledge`/`.musubix`）へ**並行書き込み**すると lost-update が発生しうる（read-modify-write の競合）。逐次実行では正常。CLI の通常利用（逐次）では問題にならず、ファイルロックの導入はコストが見合わないため据え置き
- **UTF-16 エンコードのファイル**は未対応（UTF-8 前提）。要件/ソースファイルは UTF-8 が標準

### Verified

- 全 6 EARS パターン → 設計パターン検出、param 推論（`provides X and Y` → 2 引数）、State enum の状態重複排除、複合 EARS の SMT 分解（`(and active triggered)`）、SHALL NOT の否定意味論、coverage の丸め、ドメインコード境界（2〜6 文字）、design/codegen の決定性

## [0.5.77] - 2026-07-11

dogfooding 実装テスト 50 本（第 7 巡）を実施し、1 件の不具合を修正。MCP 61 ツールを全数監査し、正常性を確認。

### Fixed

- **CRLF（Windows）改行の要件ファイルが「要件なし」と判定されていた** — MarkdownEARSParser が `\n` のみで行分割していたため、行末に残る `\r` が見出し正規表現の `(.*)$`（`.` は `\r` に一致しない）を破壊し、Windows で編集した要件ファイルが 0 件と解析されていた。`\r\n` / `\r`（旧 Mac）/ `\n` すべてで分割するよう修正。req validate / requirements analyze / design / codegen / verify / trace の全パイプラインで CRLF・CR-only・混在改行が扱えるようになった

### Verified

- **MCP 61 ツールを全数監査**（正しいパラメータで実行）— エラー 0・偽の空応答 0。0.5.76 で修正した policy カテゴリを含め、全ツールが健全であることを確認
- State パターンの状態推論 → enum 生成（tsc 通過）、cg gate の多重 forbid/layering、design 生成の決定性、混在パターン検出、大文字小文字・タブ・BOM・特殊文字・10k 文字行などのロバスト性

## [0.5.76] - 2026-07-11

dogfooding 実装テスト 50 本（第 6 巡）を実施し、5 件の不具合を修正。うち 3 件は MCP の policy カテゴリ全体が静かに機能不全だった問題。

### Fixed

- **MCP policy ツール群が実在しないメソッドを呼び出し、エラーを握りつぶして偽の成功を返していた** — `policy.articles.list` は `listArticles()`（正しくは `listPolicies()`）を呼び常に `[]` を返し、`policy.validate` は `validate()`（正しくは `validateAll()`、async）を呼び常に `{valid:true}`（偽の合格）を返し、`policy.gate.run` は `run()`（正しくは `runAll()`、async）を呼び常に `{passed:true}` を返していた。いずれも `catch` が例外を握りつぶして偽の結果を返していた。正しいメソッド呼び出しに修正し、`catch` はエラーを表面化するよう変更（9 条文の一覧・実際のコンプライアンスレポート・実ゲート結果を返すようになった）
- **`design:verify` が部分的な JSON でクラッシュ** — セクションが `interfaces`/`requirementIds` を欠く手書き/不完全な design JSON に対し `Cannot read properties of undefined (reading 'length')` で異常終了していた。欠損フィールドを許容するよう防御的に修正
- **`neural.embed` が常に全ゼロベクトルを返していた** — 単一文書で TF-IDF を fit すると全語の IDF が `log(1/1)=0` となりゼロベクトルになっていた。sklearn 方式の平滑化 IDF（`log((1+N)/(1+df))+1`）に変更し、単一文書でも有用な（TF 重み付き）ベクトルを返すよう修正

### Verified

- MCP 全ツールを正しいパラメータで検証（lean/z3/neural/code-graph）、Observer パターン → codegen 雛形の正確性、大規模 CodeGraph（30 ファイル 0.4 秒）、混在言語 EARS、部分/不正 JSON へのロバスト性

## [0.5.75] - 2026-07-11

dogfooding 実装テスト 50 本（第 5 巡）を実施し、2 件の不具合を修正。

### Fixed

- **`repl` が実質的に動作していなかった** — ハンドラがバナーとプロンプトを表示して即座に return するだけのスタブで、標準入力を読まず REPL ループが存在しなかった（`help` 等のコマンドを実行できなかった）。`ReplEngine.eval` を readline ループに接続し、実際に対話実行できるよう実装（`help`/`history`/`clear`/`exit`、未知コマンドのエラー表示）。テスト容易性のため入出力ストリームを引数で受け取れるようにした
- **`trace impact --json` が無視されていた** — 常に人間可読形式で出力していた（`trace matrix`（0.5.74 で修正）・`cg impact`・`cg diff` は対応済み）。`--json` で target/level/affectedIds/affectedSymbols/affectedRequirements を含む JSON を出力するよう対応

### Verified

- REPL コマンド実行（help/history/clear/未知コマンド）、CodeGraph リファクタリングワークフロー（cycles/candidates）、100 要件のパフォーマンス（0.3 秒）、フルチェーンの REQ-ID 整合性（design→codegen→test→trace）、コードブロック内の偽 REQ 無視、多条件 IF の形式化が正常動作

## [0.5.74] - 2026-07-11

dogfooding 実装テスト 50 本（第 4 巡）を実施し、4 件の不具合を修正。

### Fixed

- **`req:interview`（1問1答）が回を進められなかった** — インタビュー状態をモジュール内シングルトンで保持していたため、CLI 呼び出しごとに別プロセスとなり状態が失われ、最初の質問から先へ進めなかった。状態を `.musubix/interview.json` に永続化し、呼び出しをまたいで継続できるよう修正（core に `restoreState` を追加）。`--reset` でクリア、入力テキスト指定で再スタート
- **`--out` が親ディレクトリを作成しなかった** — `codegen … --out src/app.ts` を `src/` が無いプロジェクト（init 直後）で実行すると ENOENT で失敗していた（ガイド記載の手順が新規プロジェクトで失敗）。親ディレクトリを自動作成するよう修正（codegen / design generate / cg export の全 `--out` に適用）
- **`trace matrix --json` が Markdown を出力** — `--json` フラグが無視され表形式のみだった（`trace impact` / `cg diff` は対応済み）。requirements/files/links/completeness/coverage を含む JSON を出力するよう対応
- **MCP `synthesis.dsl.build` が `repeat` op 未対応** — CLI は `repeat:n` をサポートするが MCP ツールは未対応で CLI/MCP に差異があった。`repeat` を追加してパリティを回復

### Verified

- MCP 61 ツールを正しいパラメータで再検証（synthesis DSL 全 op、interview stateless フロー、neural/research/workflow 等）。EARS 6 パターン分類、SOLID 検証、多言語 CodeGraph、フルパイプライン（init→analyze→design→codegen→verify）が正常動作

## [0.5.73] - 2026-07-11

dogfooding 実装テスト 50 本（第 3 巡）を実施し、2 件の不具合を修正。MCP サーバー 61 ツールを正しいパラメータで再検証し、全ツールのロジックが正常であることを確認。

### Fixed

- **`codegen <予約語>` が非コンパイルコードを生成** — `codegen class` が `export class class {`（TS 予約語）を出力し `tsc` が通らなかった。予約語（class/interface/function/return/… など）が名前として渡された場合は `_` を付与してサニタイズ（`class_`）。既存の先頭数字サニタイズ（`3Foo`→`_3Foo`）と一貫した挙動
- **`design:c4 --format plantuml` が無視されていた** — 常に Mermaid を出力していた（生成器に `toPlantUML` があるにもかかわらず未接続）。`--format mermaid|plantuml` を尊重するよう接続し、未知のフォーマットはエラーとするよう修正

### Verified

- MCP 61 ツールを全カテゴリ（formal-verify / synthesis / neural / research / workflow / policy 等）で正しいパラメータ実行し、ロジックの正常性を確認（例: workflow ゲートが未承認遷移を正しく拒否、version-space が `startsWithUpper` 仮説を学習）
- SOLID 検証（ISP/DIP 違反検出）、依存スキャナ（child_process 検出）、多言語 CodeGraph（Python/Go/Rust/Java）、decision フルライフサイクル、cg gate（循環・禁止エッジ）が正常動作

## [0.5.72] - 2026-07-11

dogfooding 実装テスト 50 本（第 2 巡）を実施し、5 件の不具合＋テスト分離を修正。

### Fixed

- **セキュリティスキャンが設定ファイルを検査していなかった** — `.env`/`.yml`/`.yaml`/`.json`/`.toml`/`.ini` などが `EXT_TO_LANG` に含まれず走査対象外だった。ハードコードされた秘密情報が最も多く存在するのは設定ファイルであるため、シークレット検出対象に設定/インフラ系拡張子を追加（package-lock.json の整合ハッシュ等は誤検出しない）
- **AWS シークレットアクセスキーが検出されなかった** — `AKIA…` のアクセスキー ID は検出していたが、40 文字のシークレットキー値（`AWS_SECRET_ACCESS_KEY=…`）は未検出だった。変数名アンカー＋40 文字 base64 のパターンを追加
- **設定形式のハードコード秘密情報（`api_key: …` / `password: …`）が未検出** — 既存の password 検出は `=` とクォート必須で YAML/env 形式（`:`・クォート無し）を拾えなかった。プレースホルダ・環境変数参照・boolean を除外するバリデータ付きのパターンを追加
- **`codegen --type <不正値>` が `undefined` を出力** — 未知のテンプレート種別で `undefined` を標準出力していた。有効な種別一覧を示してエラーにするよう修正
- **`codegen <存在しないパス>` がパス名からクラスを生成** — 存在しないファイルパスをクラス名として扱い無意味なクラスを生成していた。パス様の引数が存在しない場合は「File not found」エラーにするよう修正

### Tests

- ontology の CLI テストの一部が cwd の `.musubix` を汚染し、実行順序により空ストア前提のテストが不安定だった。一時ディレクトリで分離するよう修正

MCP サーバー 61 ツールも直接検証し、全カテゴリで正常動作を確認。

## [0.5.71] - 2026-07-11

dogfooding 実装テスト 50 本を実施し、5 件の不具合を発見・修正。

### Fixed

- **Java / C# / Kotlin / Swift の SQL インジェクションが検出されなかった** — taint 解析の代入検出が `Type name = value` 形式の C 系宣言を認識していなかった（変数名の前に型が来るため型を変数名と誤認）。型・修飾子トークンの前置を許容する正規表現に変更し、`String q = "…"+id`（Java）、`string q = …`（C#）、`val q = …`（Kotlin）などを解析できるようにした（パラメータ化クエリは誤検出しない）
- **JS/TS の innerHTML への文字列連結による XSS を見逃していた** — `el.innerHTML = "<b>" + name` は文字列リテラルで始まるため「静的」と判定され検出されなかった。文字列リテラル＋`+` 連結を動的とみなすよう XSS パターンを拡張（純粋な静的リテラルは従来どおり無視）
- **`trace matrix` が未被覆でも「Completeness: 100%」と表示** — 完全性をソース×ターゲットのペア密度で計算し、ターゲットが 0 件だと `totalPairs===0` で 100% にフォールバックしていた。要件（ソース）のうちリンクを持つ割合で計算するよう変更（未被覆要件は 0%）
- **重複する要件 ID が警告されなかった** — 同一 REQ-ID が複数回出現してもトレーサビリティ上問題なく通過していた。`req validate` で重複 ID を検出し警告・非ゼロ終了するよう追加
- **Rust の SQL インジェクションが検出されなかった** — `format!()` マクロを動的文字列とみなしていなかった点と、`query(&q)` の参照引数 `&q` をシンクが捕捉できなかった点を修正

これらにより taint 解析が Python/PHP/JS/TS に加え Go/Java/C#/Kotlin/Swift/Rust をカバー。

## [0.5.70] - 2026-07-11

dogfooding 実装テスト 10 本を実施し、3 件の不具合を発見・修正。

### Fixed

- **Go の SQL インジェクションが検出されなかった** — taint 解析に 3 つのギャップ: (1) Go の `:=` 短縮変数宣言を代入として認識していなかった、(2) シンク照合が大文字始まりのメソッド名（Go/Java/C# の `db.Query`/`Execute`/`QueryRow`、`executeQuery`）に一致していなかった、(3) シンク正規表現を再構築する際に元のフラグ（`i`）を捨てて `g` 固定にしていた。3 点すべて修正し、`q := "…"+id; db.Query(q)` のような Go のインジェクションを検出できるようになった（パラメータ化クエリは誤検出しない）
- **`cg export` が依存の無い孤立ファイルを出力から欠落** — ファイル一覧をエッジの端点からのみ構築していたため、import/参照を持たない単一ファイルが export（DOT/JSON）に含まれなかった。全インデックス済みファイルから一覧を構成するよう修正
- **`cg export --format json` の出力を `cg diff` のベースラインに使えなかった** — export は `{files, edges}`（ファイルレベル）を書き出す一方、`cg diff` は `{nodes, edges}`（シンボルレベル）の `nodes` を読んでいたため、export したスナップショットをベースラインにすると全ファイルが「追加」と誤報告されていた。両フォーマットを受理するよう `cg diff` を修正（生の codegraph.json ベースラインも従来どおり動作）

## [0.5.69] - 2026-07-11

dogfooding 実装テスト（複数ドメインの大きめ要件セット）で 2 件を発見・修正。

### Fixed

- **設計の interface 名が無効な TS 識別子になることがある** — `suggestInterfaces` がタイトルを空白のみで分割し、句読点を除去していなかったため、「In-progress tracking」というタイトルから `IIn-progressTracking`（ハイフン入り＝無効な識別子）が生成され、design.json の `interfaces` に保存されていた。`pascal` と同様に単語ごとに非英数字を除去するよう修正（→ `IProgressTracking`）。現状 codegen はこの名前を直接使わないため生成コードは壊れていなかったが、設計成果物のデータ品質として修正
- **`codegen --lang python` が無言で TypeScript を出力** — codegen は TypeScript 専用だが、`--lang` フラグは解釈されず無視され、要求と異なる言語（TS）が出力されていた。TypeScript 以外が指定された場合は明示的にエラーとするよう修正（`--lang typescript` と未指定は従来どおり動作）

## [0.5.68] - 2026-07-11

dogfooding 実装テストで、知識グラフのリレーションが CLI/MCP 経由で壊れて保存される不具合を発見・修正。

### Fixed

- **`knowledge link` で作成したリレーションが `traverse` で辿れない** — CLI と MCP サーバーの両方が、リレーションを `{from, to, type}`（`as any` キャストで型エラーを握りつぶし）として保存していた。実際の `Relation` 型は `{id, source, target, type}` であり、`getRelations`/`traverse` は `source`/`target` を参照するため、保存されたリレーションはすべて不可視となり、`knowledge traverse` が始点ノード 1 件しか返さなかった。正しいフィールド名（＋安定した `id`）で保存するよう両方を修正。これによりリンクした先のノードまで多段でトラバースできるようになった

`verify` の矛盾検出（無条件の `SHALL X` と `SHALL NOT X`）が正しく `inconsistent` を報告することも確認済み。

## [0.5.67] - 2026-07-11

dogfooding 実装テストで、CodeGraph のフラグメント照合がディレクトリ接頭辞に誤反応する不具合を発見・修正。

### Fixed

- **`cg path` / `cg impact` / `cg cycles` の短いフラグメントがディレクトリ名に誤反応** — フラグメントをフルパスに対して部分一致（`filePath.includes(frag)`）していたため、`src/` 配下のすべてのファイルがフラグメント `c` に一致していた（`sr`c`/` の `c`）。その結果 `cg path b c` が本来の `b→c`（1 hop）ではなく、ターゲット `c` を始点ファイル `src/b.ts` に解決して 0 hop の退化パスを返していた。ファイル名（basename）を優先して照合し、basename に一致が無い場合のみフルパス（`services/` などのディレクトリ指定）へフォールバックするよう修正（`matchFilesByFragment` を追加、`impact`/`path`/`cycles` で共有）

## [0.5.66] - 2026-07-11

dogfooding 実装テストで、taint dataflow アナライザが JavaScript/TypeScript を実質的に解析できていない不具合を発見・修正。

### Fixed

- **taint 解析が JS/TS の変数宣言を追跡できていなかった** — 代入検出の正規表現が `name = value`（Python/PHP 形式）のみに対応し、`const`/`let`/`var` 宣言を認識していなかった。このため TS で「動的に組み立てた文字列を変数に代入 → クエリに渡す」という最頻出の SQL/コマンド/コード インジェクション経路がすべて見逃されていた。宣言キーワード（＋任意の型注釈 `: T`）を認識するよう修正。`constant` のような変数名を誤ってキーワードと解釈しないよう、後続の空白を必須化
- **テンプレートリテラルが動的文字列として扱われていなかった** — `` `SELECT … ${x}` `` を静的文字列とみなしていた。`${…}` 補間を持つテンプレートリテラルを動的とみなすよう修正
- **`blankNonCode` がテンプレートリテラルの `${…}` を空白化していた** — 文字列内部を伏せる処理がバッククォート文字列の補間式（実行されるコード）まで消していたため、上記の検出が効かなかった。`${…}`（ネストした波括弧を含む）を保持しつつ、リテラル部分のみ空白化するよう修正

これらにより、`const sql = "… '" + id + "'"; query(sql)` や `` const sql = `… ${id}`; db.execute(sql) `` のような TS のインジェクションが検出されるようになった（パラメータ化クエリ・無害なテンプレートリテラルは誤検出しない）。

## [0.5.65] - 2026-07-11

dogfooding 実験で見つけた 4 件の不具合を修正。

### Fixed

- **`req validate` / `requirements analyze` がマーカー無し要件を誤判定** — 見出し直下に EARS 文を直接書いた要件（`**要件**:` マーカー無し）は本文が空として扱われ、全要件が「ubiquitous / confidence 0.30 / Missing SHALL」と誤報告されていた。マーカーが無い場合は本文の散文行（フィールドマーカー・見出し・チェックリストを除く）を要件文とみなすフォールバックを追加
- **`design:c4 --level` が無視されていた** — `container`/`component` を指定しても常に `C4Context` ヘッダを出力していた。レベルに応じて `C4Container` / `C4Component` を出力するよう修正
- **`design:c4` が未宣言要素への関係を出力** — 関係フィルタが「どちらか一方の端点がレベルに含まれる」条件（`||`）で、そのレベルに宣言されていない要素への `Rel(...)` を生成していた。両端点が宣言済みの場合のみ出力（`&&`）するよう修正。あわせて Mermaid で無効なハイフン付き ID（`REQ-ORD-001`）を有効なエイリアス（`REQ_ORD_001`）にエスケープ
- **`test:gen` が非ソースファイルを無言で受理** — 明示指定した単一ファイルは拡張子フィルタを素通りし、Markdown 要件を渡すと無意味なスタブを出力していた。`collectFiles` が単一ファイルにもフィルタを適用するよう修正し、`test:gen` / `design:verify` に Markdown を渡した際は次に取るべきコマンドを案内

## [0.5.64] - 2026-07-11

実装実験で見つけた 3 件の改善を実施。

### Fixed

- **セキュリティ検出の重複** — taint と dataflow の両アナライザが同一の SQL injection を報告し、同じ行の同じ問題が 2 件出ていた。`(ファイル, 行, 種別)` で重複排除し、信頼度の高い方を残すよう修正
- **要件が見つからない時のヒントが古い ID ルールを表示** — 「3-letter domain code」と案内していたが、実際のルールは **2〜6 文字**（0.5.49 で変更済み）。メッセージを「2–6 letter domain code」に更新

### Improved

- **codegen のパラメータ推論** — メソッドが常に引数なし `()` だったのを、要件の入力句から引数を推論。`WHEN a user submits an email and password, …` → `createAccount(email: string, password: string): Account`（入力導入動詞: submits/provides/sends/enters/supplies/accepts/receives/uploads/passes）。入力句が無ければ従来どおり引数なし。core から `deriveParams` を追加

### Tests

- core: 入力句からのパラメータ推論、入力句なしで引数空
- musubi: 同一行の重複検出が 1 件に集約、ID 診断メッセージが「2–6 letter」
- 全 **1913 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.63] - 2026-07-11

監査で見つかった 2 件を修正。

### Fixed

- **非ASCII（日本語）タイトルのコンポーネント名が空の `Service` になっていた** — 要件タイトルが日本語（例: 「クリック計測」）だと PascalCase 化で ASCII が残らず、コンポーネント名が単なる `Service` になっていた。**タイトルから ASCII が得られない場合は導出した操作名にフォールバック**するよう修正（「クリック計測」→ `RecordClickEventService`）
- **モックソルバー（z3 未導入時）が明白な論理矛盾を検出できていなかった** — `THE system SHALL grant access` と `THE system SHALL NOT grant access` を両方含む要件が「consistent」と報告されていた。**同一アトムが無条件に真と偽の両方で assert される矛盾を検出**する健全（sound）なチェックを追加し、z3 なしでも `verify` が inconsistent（終了コード 1）を返すように。条件付き assert（`(=> cond X)`）は強制ではないため無視（完全ではないが健全 —— 残りは実 z3 が担う）

### Tests

- core: 非ASCII タイトルの命名フォールバック（`RecordClickEventService`）
- formal-verify: z3 なしでの無条件矛盾検出（`grant` vs `not grant` → inconsistent）
- 全 **1909 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.62] - 2026-07-11

### Fixed

- **`generateSmtLib2Script` が未宣言シンボルを含む不正な SMT-LIB2 を生成していた** — 変数宣言は要件文を単語分割したトークン（`grant`・`access`）から作られる一方、assertion はサニタイズした複合シンボル（`grant_access`）を使っており、z3 に通すと「unknown constant」で拒否されていた。**assertion が実際に参照するシンボル（action / trigger / condition のサニタイズ名）を宣言する** よう修正し、生成スクリプトが z3 で検査可能に:
  - 例: `THE system SHALL grant access.` → `(declare-const grant_access Bool)` ＋ `(assert (=> true grant_access))`
  - 全 EARS パターン（event-driven の trigger、state-driven / complex の condition/trigger 等）で assertion シンボルと宣言が一致
  - これにより、z3 を導入すれば要件間の論理矛盾（例: `SHALL grant` と `SHALL NOT grant`）が正しく unsat として検出可能に

### Tests

- formal-verify: 全 assertion シンボルが宣言されること、複合シンボル（`grant_access`）が宣言され単語（`grant`）は宣言されないことを検証
- 全 **1907 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.61] - 2026-07-10

### Fixed

- **ローカル ビルドの `init --platform` が空のスキルを生成する開発体験の問題を修正** — スキル資産はパッケージ内のステージ済みパス（`prepublishOnly` の `copy-assets` で配置）からのみ読まれていた。公開版は正常だが、ローカルでビルドしたバイナリで dogfooding すると `.claude/skills/*/SKILL.md` が `_Asset not found during packaging._` の空スタブになっていた。`readAsset` にモノレポ ソース（`src/.github/skills/`）へのフォールバックを追加し、ステージ済み資産が無くても実スキル内容を配置するよう修正:
  - 探索順: ①ステージ済み（公開版・高速パス）→ ②リポジトリ ソース（同一相対パス）→ ③`.claude/skills/…` を `.github/skills/…` にマップ（Claude スキルは `.github/skills` から派生生成されるため）
  - **公開版の挙動は不変**（①が最初にヒット）。ローカル `init` が本物のスキル（orchestrator 454 行等）を配置するようになった
  - 注: 公開済み `musubix2@0.5.60` の `npx … init --platform claude` は元々正常（本修正はローカル/ソース ビルドの開発体験向上）

### Tests

- 全 **1906 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.60] - 2026-07-10

開発ガイド作成中のドッグフーディングで発見した `init` の重大バグを修正。

### Fixed

- **`musubix init <dir> --name <name>`（レガシー モード）がファイルを一切書き込んでいなかった** — `ProjectInitializer.init()` は生成すべきファイル一覧を計算するだけで `writeFileSync` しておらず、「✅ Initialized project」と成功を報告しつつ steering/ ・storage/ ・musubix.config.json を作成していなかった（`--platform` を付けた platform-bootstrap モードは正常だった）。テンプレートに内容を持たせ、**実際にディレクトリとファイルを生成**するよう修正:
  - `steering/`（product/structure/tech/project.yml/rules/constitution.md）、`storage/specs/{requirements,designs,plans,reviews}`、`storage/tasks/tasks.md`、`musubix.config.json` を生成
  - **冪等**: 既存ファイルは `--force` なしでは上書きしない（編集済みの内容を保護）
  - 不正なプロジェクト名では何も書き込まない

### Tests

- core: 実ファイル生成の検証（ディスク上に存在すること）、config 内容、テンプレート差、冪等性（上書き保護）、不正名で未書き込み — すべて一時ディレクトリで実行
- musubi: init 系テストを一時 cwd／一時ディレクトリ経由に修正しリポジトリ汚染を防止
- 全 **1906 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.59] - 2026-07-10

design の interface 抽象を codegen に活用。凝集サービスに interface を生成し `implements` するとともに、生成コードが型チェックを通るよう推論エンティティ型のスタブも出力。

### Improved

- **凝集サービスの interface 抽出（DIP）** — 複数の操作を持つサービスに対し、その公開メソッドを宣言する `interface I<Service>` を生成し、クラスに `implements` させる:
  - 例: `PayService`（charge/refund/capture）→ `export interface IPayService { … } export class PayService implements IPayService`
  - **単一メソッドのクラスは具象のまま**（過度な抽象化を避ける。憲法 Article VIII: Anti-Abstraction）
  - パターン雛形（Observer の `on`/`emit` 等）は実装詳細として interface に含めない
- **推論エンティティ型のスタブ生成** — 戻り値型推論で生成される未定義エンティティ型（例: 「issue a session token」→ `SessionToken`）に対し、`export interface <Type> { /* TODO */ }` のプレースホルダ宣言を出力。これで**生成ファイル全体が `tsc --strict` を通過**するようになった（従来はエンティティ戻り型が未宣言でコンパイル不能だった潜在バグを解消）

### Tests

- core: interface 抽出＋implements、Observer 雛形を contract から除外
- musubi: 複数操作サービスの interface 抽出、エンティティ型スタブ、単一メソッドは具象維持
- 全 **1906 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.58] - 2026-07-10

0.5.57 の State パターン雛形を強化。プレースホルダ（Idle/Active/Done）ではなく、要件の WHILE 節から実際の状態名を推論するようにした。

### Improved

- **State enum を WHILE 節から推論** — state-driven 要件の `WHILE <主語> is <状態>` から状態名を抽出し、状態機械の enum を生成。初期状態 `Idle` を先頭に付与:
  - 例（ストリーム処理）: 「WHILE the pipeline is running」→ `{ Idle, Running }`、「WHILE the pipeline is draining」→ `{ Idle, Draining }`、「WHILE the pipeline is paused」→ `{ Idle, Paused }`
  - `is` の無い節は末尾語を採用（「WHILE draining」→ `Draining`）、複数 WHILE 要件の状態は 1 enum に統合
  - 推論できない場合は従来のプレースホルダ（Idle/Active/Done）にフォールバック
  - 生成コードは `tsc --strict` を通過
- `DesignComponent.states` / `CodeGenOptions.states` を追加し、design → codegen へ推論状態を伝播

### Tests

- core: WHILE からの状態推論（`is` あり／なし）、推論状態からの enum 生成、プレースホルダ フォールバック
- 全 **1903 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.57] - 2026-07-10

design で検出した設計パターンを codegen の雛形に反映。生成コードが「空クラス＋メソッドスタブ」から、パターンに応じた構造を持つ骨格になった。

### Improved

- **検出パターンを codegen のクラス骨格に反映** — design セクションの `patterns` を codegen に受け渡し、クラス生成時に構造を scaffold:
  - **Observer**（WHEN/event-driven）→ リスナー登録簿 `listeners` と `on(handler)` / `emit(event)` メソッド
  - **State**（WHILE/state-driven）→ プレースホルダの状態 enum（`XState { Idle/Active/Done }`）と `private state` フィールド
  - **Feature Toggle**（WHERE/optional）→ `constructor(private readonly enabled = false)` と各メソッド先頭のフラグ ガード（戻り型に応じ `return;` / `return false;` / `return [];`）
  - 複数パターンは合成される（例: complex 由来の Observer+State を 1 クラスに）。パターン無指定時は従来どおり（後方互換）
  - 生成コードは `tsc --strict` を通過することを確認
- `CodeGenOptions` に `patterns?: string[]` を追加、CLI は design JSON のセクション patterns を各コンポーネント target へ伝播

### Tests

- core: Feature Toggle ガード（void/boolean）、Observer レジストリ、State enum、パターン合成、無指定時の後方互換
- musubi: WHERE design セクション → 生成クラスに Feature Toggle scaffolding
- 全 **1900 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.56] - 2026-07-10

RBAC/権限ドメイン（禁止・ロール条件が多い）で E2E ドッグフーディングを実施。新しい要件構造（`WHERE <条件>, SHALL NOT <動作>` の複合、ハイフン語 "re-authentication"、多数の prohibition）を通したが**ハードなバグは検出されず**、直近の修正（0.5.49〜0.5.55）でパイプラインが堅牢化したことを確認。その不変条件を統合テストとして固定化。

### Tests（Article IX: Integration Testing）

- **SDD パイプライン全体の統合テストを追加** — requirements → design → codegen → verify → trace を実際のハンドラで通し、4 ドメインの E2E で確立した不変条件を回帰から保護:
  - ドメイン凝集（ACC×3 → 1 `AccService`）、Feature Toggle パターン（WHERE）
  - codegen のトレーサビリティ コメント（`// Implements: REQ-`）
  - **SMT の意味論**: `WHERE + SHALL NOT` → ガード付き否定 `(=> lacks_permission (not expose_resource))`、`IF-THEN` → 正の含意、単独 `SHALL NOT` → 否定
  - trace 100% とシンボル単位の結合（同一サービスの要件のみ coupled）
- RBAC E2E 検証: analyze 8/8、verify 全 SMT 正常（WHERE+SHALL NOT の複合含む）、trace 100%、security 0、test:gen 13
- 全 **1893 テスト**緑 / lint 0 errors / branch coverage 81.7% / clean `tsc -b`

## [0.5.55] - 2026-07-10

複数の E2E ドッグフーディングで確認されていた唯一の未対応（optional/WHERE の設計パターン欠落）を修正。

### Fixed

- **optional（WHERE）要件が設計パターンにマップされず Simple Implementation にフォールバックしていた** — `WHERE <機能> is enabled, THE system SHALL …` を **Feature Toggle** パターンにマップ（`req.pattern === 'optional'` または `\bWHERE\b`）。これで 6 つの EARS パターン全てが設計パターンを持つ（WHEN→Observer, WHILE→State, IF→Strategy, WHERE→Feature Toggle, complex→Chain of Responsibility, ubiquitous→Simple Implementation）
- **キーワード検出の部分一致バグを修正** — `req.text.includes('IF')` が単語内の "IF" にも一致していた（例: 「**verify** the signature」が誤って Strategy パターンを付与）。単語境界（`\bIF\b` 等）に変更し WHEN/WHILE/IF/WHERE すべてで誤検出を防止

### Tests

- core: WHERE → Feature Toggle、`verify` が IF と誤認されないこと
- 全 **1892 テスト**緑 / lint 0 errors / branch coverage 81.6% / clean `tsc -b`

## [0.5.54] - 2026-07-10

MCP catalog（61 ツール）の網羅テストを追加し、重量級パッケージのツールも含めて全ハンドラの動作を検証。

### Tests

- **全 61 MCP ツール ハンドラの網羅スモークテスト** — 各ツールを「全パラメータ指定」と「空引数」の 2 通りで呼び出し、well-formed な `ToolResult`（成功 or graceful failure）を返し例外を投げないこと、失敗時に旧来の誤メッセージ "Core package not available" を出さないことを検証。使い捨て cwd で実行し、cwd 相対ストアへの書き込みが他スイートを汚染しないよう隔離
  - 空引数呼び出しにより各ハンドラの `?? default` フォールバックの**両側**（指定時／省略時）を網羅 → `catalog.ts` の branch coverage 48% → **70%**
  - 重量級パッケージ（neural-search/synthesis/formal-verify/deep-research 等）はコードが除外対象の `index.ts` に集約されているため、ツール呼び出しでカバレッジ分母を増やさず、グローバル branch は 80.2% → **81.6%** に上昇（ゲート調整不要）
- 全 **1890 テスト**緑 / lint 0 errors / branch coverage 81.6% / clean `tsc -b`

## [0.5.53] - 2026-07-10

状態機械中心のドメイン（ストリーム処理パイプライン: 取込/ドレイン/一時停止/チェックポイント/冪等化）で E2E ドッグフーディング。WHILE 状態遷移が多い要件構造で、SMT 変換の意味論バグを発見・修正。

### Fixed

- **`SHALL NOT` が state-driven/event-driven/optional/complex パターンで無視され、意味が反転していた** — 従来 `unwanted` パターンでしか否定を扱っておらず、「WHILE paused, THE system SHALL NOT accept new events」（一時停止中は受け付けない）が `(=> paused accept_new_events)`（=受け付ける）と**逆の意味**に変換されていた。要件文に `SHALL NOT` があれば**パターンに関わらず動作を否定**するよう修正 → `(=> the_pipeline_is_paused (not accept_new_events))`
  - 設計側（`deriveMethodSignature`）は既に `reject…(): boolean` と否定を捉えていたため、formal-verify のみの不整合だった

### Validation（E2E — ストリーム 8 要件）

- analyze 8/8 分類（state-driven ×3・complex・optional・unwanted 含む）、verify 全 SMT が意味的に正しい（WHILE+SHALL NOT の否定、IF-THEN の含意、complex の (and …)）、trace 100%（INGEST×2 が凝集し `trace impact` で結合表示）、security 0、test:gen 22

### Tests

- formal-verify: state-driven + SHALL NOT が動作を否定すること
- 全 **1829 テスト**緑 / lint 0 errors / branch coverage 80.2% / clean `tsc -b`

## [0.5.52] - 2026-07-10

相互依存の高いドメイン（決済基盤: 認証・課金・返金・台帳・冪等性）で SDD パイプラインを再ドッグフーディング。パイプラインは 8 要件で正常動作（0.5.51 の IF-THEN 修正も冪等性要件で検証）した一方、**設計の凝集度**に改善余地を発見。

### Improved

- **同一ドメインの複数要件を 1 つの凝集サービスに集約** — 従来は要件ごとに単一メソッドのサービスを生成していたため、`REQ-PAY-001/002/003` が `ChargeCardService`/`RefundPaymentService`/`CaptureAuthorizationService` の 3 クラスに分裂し、関連要件が**実装コードを共有せず `trace impact` で結合が見えなかった**。ドメイン（ID プレフィックス）に複数要件がある場合は **1 サービス＋要件ごとのメソッド**に集約するよう変更:
  - 例: PAY×3 → `PayService.chargePaymentMethod/refundOriginalCharge/captureAuthorizedPayment`、LEDGER×2 → `LedgerService.recordLedgerEntry/lockLedger`
  - 単一要件のドメインは従来どおり説明的なタイトル由来名を維持（例: `VerifyTokenService`）
  - 全大文字のドメインコードを Title case に正規化（`PAY`→`Pay`, `LEDGER`→`Ledger`）
  - 結果: 生成クラス数 8→5、`trace impact REQ-PAY-001` が `PayService` と結合要件 `REQ-PAY-002`/`REQ-PAY-003` を正しく報告

- **メソッド名の末尾 filler をさらに拡充** — `within`/`during`/`upon` と数量詞 `six`〜`ten` を追加（例: `captureAuthorizedPaymentWithin`→`captureAuthorizedPayment`）

### Validation（E2E — 決済 8 要件）

- analyze 8/8 分類（6 文字ドメイン `LEDGER` 含む）、verify 全 SMT 正常（冪等性の IF-THEN が含意、PAN の SHALL NOT が否定）、trace 100%、security 0、test:gen 24

### Tests

- core: 複数要件ドメインの凝集サービス、単一要件の説明的命名、全大文字ドメインの正規化
- 全 **1828 テスト**緑 / lint 0 errors / branch coverage 80.3% / clean `tsc -b`

## [0.5.51] - 2026-07-10

別ドメイン（IoT/制御系サーモスタット）で SDD パイプライン全体を再ドッグフーディング。未検証だった EARS パターン（state-driven `WHILE`、complex、optional `WHERE`、IF-THEN）を含む 7 要件を通し、パターン固有のバグ 2 件を発見・修正。

### Fixed

- **IF-THEN 要件の SMT 変換が誤り（意味の反転）** — 「IF `<条件>` THEN THE system SHALL `<動作>`」は「条件成立時に緩和動作を実行する」ガード付き応答だが、formal-verify の `unwanted` パターンが常に `(assert (not <action>))` を出力し、**正の緩和動作を否定**していた（例: 「IF 過熱 THEN SHALL ヒーター停止」→ 誤って「ヒーターを停止しない」）。条件がある場合は `(assert (=> <condition> <action>))`（含意）、純粋な `SHALL NOT` のみ `(not <action>)`（禁止）を出力するよう修正
- **メソッド名の末尾に前置詞/数量詞が残る** — 4 語上限で切った結果、`readCurrentTemperatureEvery` / `lowerTargetByTwo` のように末尾が前置詞・数量詞で終わる不自然な名前になっていた。末尾の filler 語（every/by/two/before/with… や数値）を除去し `readCurrentTemperature` / `lowerTarget` に（先頭の動詞は保持）

### Validation（E2E — 7 パターン）

- requirements: 7/7 を全 EARS パターンで正しく分類（ubiquitous/state-driven/event-driven/unwanted/optional/complex）
- design: 7 コンポーネント（末尾クリーンなメソッド名・パターン検出）、codegen: trace コメント付き 7 クラス、verify: **IF-THEN が含意、SHALL NOT が否定**として正しく SMT 化、trace: 100%、security: 0 findings

### Tests

- core: 末尾前置詞/数量詞のトリム
- formal-verify: ガード付き unwanted（IF-THEN）が含意に変換されること
- 全 **1826 テスト**緑 / lint 0 errors / branch coverage 80.4% / clean `tsc -b`

## [0.5.50] - 2026-07-10

0.5.49 の E2E ドッグフーディングで判明した `trace impact` の粒度問題を修正。

### Improved

- **`trace impact` をシンボル（クラス/関数）単位の解析に変更** — 従来は要件をファイル単位でリンクしていたため、**同じファイルに含まれる無関係な要件がすべて「影響あり」と過剰報告**されていた（例: `REQ-AUTH-001` の影響に task 系要件が全て混入）。`// Implements: REQ-…` コメントや本体参照から要件を**実装クラス/関数に対応付け**、実際にコードを共有する要件だけを「Coupled requirements」として報告するよう改善
  - 出力を「Implementing code（影響を受けるシンボル）」と「Coupled requirements（実装を共有する要件）」に分離
  - シンボルを解決できない参照（例: `export const a = 1` 直前のコメント）はファイル単位にフォールバックし、カバレッジは維持
  - 例: 1 ファイルに 5 クラスがある場合でも、`REQ-AUTH-001` の影響は `AuthenticateService` の 1 シンボルのみ（従来は 5 要件を誤報）。同一クラスを共有する要件（`PaymentService` を実装する `REQ-PAY-001`/`REQ-PAY-002`）は正しく coupled と判定

### Tests

- musubi: 同一ファイル内でクラスが異なる要件は coupled にならず、同一クラスを共有する要件は coupled になることを検証
- 全 **1823 テスト**緑 / lint 0 errors / branch coverage 80.3% / clean `tsc -b`

## [0.5.49] - 2026-07-10

SDD パイプライン全体（init → requirements → design → codegen → test:gen → trace → verify → security）を新規プロジェクトで通し実行するエンドツーエンド ドッグフーディングを実施。パッケージ間連携（connective tissue）の重大な欠陥 2 件を発見・修正。

### Fixed

- **4 文字以上のドメインコードを持つ要件 ID が全パイプラインで無視されていた** — 要件 ID 正規表現が `REQ-[A-Z]{3}-\d{3}`（ちょうど 3 文字）にハードコードされており、`REQ-AUTH-001`・`REQ-ADMIN-001` 等が**パーサ・トレース・C4 導出・codegen 抽出のすべてで暗黙にドロップ**されていた。`[A-Z]{2,6}` に拡張（parser / cli / mcp-server の 7 箇所）
- **design → codegen → trace の連携が切れていた** — codegen が生成コードに要件 ID を出力しないため、`trace matrix` が常に「referenced in code: 0 (0%)」になっていた。生成される各クラスに `// Implements: REQ-XXX-001` の**トレーサビリティ コメント**（憲法 Article V）を付与するよう修正。design JSON の `components[].requirementIds` / 要件 Markdown の ID から導出。結果、パイプライン一気通貫で trace 100%
- **`requirements analyze` の confidence が未丸め表示**（`0.9500000000000001`）だったのを `toFixed(2)` に

### Validation（E2E）

- 5 要件（TSK×3 / AUTH / SEC）の新規プロジェクトで全 8 ステップが正常完了
- requirements: 5/5 解析（AUTH 含む）、design: 3 セクション・5 コンポーネント（戻り値型付き）、codegen: 5 クラス（trace コメント付き）、test:gen: 15 describe/it、**trace: 100% coverage**、verify: 5 要件を SMT 化し整合性 OK、security: 0 findings

### Tests

- core: 2〜6 文字ドメインコードの ID パース
- musubi: codegen が design/要件双方で `// Implements: REQ-…` を出力すること
- 全 **1822 テスト**緑 / lint 0 errors / branch coverage 80.3% / clean `tsc -b`

## [0.5.48] - 2026-07-10

これまで CLI から使えなかった 3 パッケージを **CLI サブコマンドとして公開**（憲法 Article II: CLI Interface Mandate に適合）。ユーザーが直接利用できるようになった。

### Added — 3 つの新コマンド

- **`musubix search <query> [--corpus <dir>] [--top <n>]`**（neural-search）
  コーパス内の文書を TF-IDF でランク付けするセマンティック検索。0.5.47 で修正した精度改善により、共通語を持たない文書は類似度 0 で正しく下位に。
  例: `musubix search "redis cache" --corpus docs/`
- **`musubix verify <requirements.md>`**（formal-verify）
  EARS 要件を SMT-LIB2 に変換し、論理整合性を検証。各要件から action/trigger/condition を抽出して `(assert …)` 式を生成し、全体の consistency をチェック（z3 未導入時は mock ソルバーにフォールバック）。
  例: `WHEN … SHALL issue a session token` → `(assert (=> … issue_a_session_token))`
- **`musubix dfg <file> [--unused]`**（dfg）
  簡易 JS/TS データフロー解析。宣言・代入・return・呼び出しから DFG を構築し、**未使用の定義（デッドストア）**を検出。
  例: `const dead = 99;`（以降未使用）→ `Unused definitions (1): - dead (line 3)`

### Tests

- musubi: search のランキング（無関係文書 0）、verify の SMT 変換＋整合性、dfg の未使用定義検出、各コマンドの引数バリデーション
- 全 **1819 テスト**緑 / lint 0 errors / branch coverage 80.4% / clean `tsc -b`

## [0.5.47] - 2026-07-10

0.5.46 で挙げた残タスク 3 件を実施。CodeGraph の Go パーサ精度、未ドッグフーディング パッケージ（neural-search 他）、MCP catalog のテストカバレッジ。

### CodeGraph パーサ精度（Go）

ドッグフーディングで 3 件の実バグを発見・修正:

- **後方参照のレシーバメソッド** — `func (s *Server) Start()` が `type Server` より前に書かれると struct に紐付かず top-level に浮いていた。パース後に受信側型へ再割り当てするよう修正
- **インターフェースのメソッド未抽出** — `type Handler interface { Serve(...); Name() }` のメソッドシグネチャが children に入っていなかったのを抽出
- **ジェネリック関数の欠落** — `func Map[T any](...)` が型パラメータで正規表現に一致せず捕捉されていなかったのを修正（メソッドも同様）

### 未ドッグフーディング パッケージ（neural-search）

- **TF-IDF 検索の精度バグを修正** — クエリ「redis cache」に対し、共通語を持たない無関係文書が最上位になっていた。原因は 2 つ:
  1. **語彙外（OOV）クエリ語に高い フォールバック IDF** を与えていた（`log(N+1)`）→ どの文書にも一致しない語が最大重みでベクトルを支配。fit 済みモデルでは OOV 語を無視するよう修正
  2. **ハッシュトリックの衝突**（128 次元で `redis`↔`oauth` 等が同一バケットに）→ fit 済みモデルでは語彙インデックスを直接バケットに使い、語彙サイズ ≤ 次元数なら衝突ゼロに
  - 結果: 「redis cache」→ 関連文書が最上位、無関係文書は cos 類似度 0
- git-knowledge / formal-verify / dfg は API 契約どおり正常動作を確認

### テスト（MCP catalog）

- sdd-core 系ツールの**任意パラメータ省略時の既定値経路**を検証するテストを追加（`@musubix2/core` は既にロード済みのため、カバレッジ分母を増やさず catalog.ts の branch を 44% → 48% に改善）

### 検証

- 全 **1812 テスト**緑 / lint 0 errors / branch coverage 80.7% / clean `tsc -b`
- codegraph: Go の後方参照メソッド・interface メソッド・generics、neural-search: OOV/衝突の精度、mcp-server: sdd-core 既定値

## [0.5.46] - 2026-07-10

4 テーマ（A: 生成品質の深掘り、B: MCP 実地検証、C: CodeGraph パーサ精度、D: 未ドッグフーディング パッケージ）を設計・実装。各テーマはドッグフーディングで実バグを発見して修正。

### A. 生成品質の深掘り

- **codegen の戻り値型推論** — メソッドが `(): void` 固定だったのを、動詞から型を推論。生成/取得系（create/issue/get…）→ 目的語の型（`issueSessionToken(): SessionToken`）、検証系（validate/authenticate/`SHALL NOT`…）→ `boolean`、収集系（list/query…）→ `T[]`、それ以外 → `void`
- **`codegen generate --out <file>`** — 生成コードをファイル出力し、そのまま `test:gen` に渡せるように（要件 → 設計 → コード → テストの一気通貫）
- core から `deriveMethodSignature()` を export（`deriveOperation` と共通化）

### B. MCP サーバーの実地検証

- **JSON-RPC ワイヤ経路の E2E テストを追加** — `handleJsonRpc`（stdio トランスポートと同一経路）で `initialize` → `tools/list`（61 ツール）→ `tools/call` を駆動し、requirements → design → codegen のフローが CLI と同等に動くことを検証。未知メソッドの -32601、失敗ツールの `isError`＋実エラー surface も確認

### C. CodeGraph パーサ精度（Rust）

- **struct/impl の重複ノードを解消** — 継承 impl（`impl S { … }`）が `struct:S` とは別に `class:S` を生成して型が二重計上されていた問題を修正。impl のメソッドは既存の struct/enum ノードに集約（trait impl `impl T for S` は従来通り別ノード）
- impl/struct/enum ブロック内の `fn` を `method` として正しく分類

### D. 未ドッグフーディング パッケージ（library-learner）

- **`learn analyze` が制御構文キーワードをパターン誤検出** — `if (…) {`／`for`／`while`／`switch` 等を関数/メソッドとして学習していた問題を修正（`METHOD_RE` にキーワード除外を追加）。`explain` / `deep-research query` / `watch` は正常動作を確認

### Tests

- 全 **1799 テスト**緑 / lint 0 errors / branch coverage 80.3% / clean `tsc -b`
- core: `deriveMethodSignature` の型推論、mcp-server: JSON-RPC E2E、codegraph: Rust struct/impl 集約、library-learner: 制御構文の除外、musubi: codegen `--out`→test:gen 往復・learn のキーワード除外

## [0.5.45] - 2026-07-10

0.5.44 の「生成品質」で積み残していた 2 項目を実装 — **design セクションの詳細化**と **codegen のメソッド生成**。SDD パイプライン（要件 → 設計 → コード）が「空クラス」ではなく実際のメソッド付き骨格を出力するようになった。

### Improved（design セクションの詳細化）

これまで design generate の各セクションは `This section covers N requirement(s): …` の一行のみだった。以下を追加し、実装の指針になる設計文書を出力:

- **責務（Responsibilities）** — 要件ごとに導出した操作名と概要
- **コンポーネント（Components）** — 要件から導いた PascalCase のクラス名＋**メソッドシグネチャ**（例: `UserRegistrationService.createUserAccount()`）
- **データエンティティ** — 要件タイトルから抽出した名詞候補
- 既存の Interfaces / Patterns も CLI 出力に表示（従来は生成のみで非表示だった）
- `DesignSection` に `responsibilities` / `components` / `dataEntities` を追加（後方互換）
- 共有ヘルパー `deriveOperation(text, fallback)` を core から export — EARS の `SHALL <動詞句>` から camelCase 操作名を導出（`SHALL NOT` は `reject…`）

### Improved（codegen のメソッド生成）

`codegen generate` が**空のコンストラクタのみ**のクラスを出力していた問題を解消:

- **要件 Markdown** → 各要件の `SHALL` 句からメソッドを導出（例: 「SHALL create a user account」→ `createUserAccount(): void`）
- **design JSON** → セクションの `components[].methods` を優先的に消費し、メソッド付きクラスを生成
- 生成メソッド本体は `throw new Error('Not implemented')`（実装待ちを明示）

### Tests

- core: `deriveOperation` の 4 ケース、design セクション enrichment（責務/コンポーネント/メソッド/データエンティティ、Service 二重付与の回避）
- musubi: codegen が要件・design 双方からメソッドを生成すること、design 出力が責務/コンポーネント/メソッドを表示すること
- 全 1785 テスト緑・lint 0 errors・branch coverage 80.4%

## [0.5.44] - 2026-07-10

3 領域を検証・修正: ① MCP サーバー、② 生成品質、③ 細かい分析の正確性。

### Fixed（① MCP サーバー）

- **誤解を招くエラー隠蔽** — MCP ツールの多くが `try { … } catch { return fail('Core package not available') }` で**実際のエラーを握りつぶし**、常に「Core package not available」等を返していた（コアは実際には読み込めている）。単一文の catch 55 箇所を、**実エラーメッセージを返す**よう修正。61 ツールの初期化・呼び出しは正常動作を確認（`sdd.design.generate` 等）
- 意図的なフォールバック（既定値を返す 6 箇所）はそのまま維持

### Improved（② 生成品質）

- **`test:gen` のメソッド網羅** — クラスに対し `should be instantiable` のみだったのを、**公開メソッドごとにテストを生成**（`constructor`・`private`/`protected` は除外）。例: `UserService` → `createUser()` / `getUser()` のテストを生成

### Fixed（③ 細かい分析）

- **EARS の If-then 分類** — `IF <条件>, THEN … SHALL …` は EARS の**「unwanted（望ましくない挙動／エラー処理）」パターン**だが `complex` に誤分類されていたのを修正（真の複合は `WHEN…WHILE…` 等の組み合わせのみ）
- **`trace impact` の実データ連携** — 常に空のリンクで解析していたため影響 0 件だったのを、`--specs`/`--src` から実際のトレースリンク（要件↔ソース）を構築して解析。`trace impact REQ-AUT-001` が参照元ソースファイルを列挙

### Validation

- MCP: 不正入力で実エラー（`reqs.map is not a function`）を返す
- `test:gen`: 公開メソッドごとにテスト生成、private は除外
- EARS: `If…then…shall` → `unwanted`（confidence 1）
- `trace impact`: 要件を参照する 2 ソースファイルを検出

### Tests

- core: EARS unwanted 分類、test:gen メソッド網羅の期待値を更新・追加
- mcp-server: 実エラーを surface する検証
- musubi: `trace impact` の実リンク解析を検証

### Chore（CI 復旧）

長期 red だった CI を green に復旧（lint がマスクしていた後続段の失敗も含め順に解消）。

- **Lint** — `curly`/`no-unreachable`/`no-useless-escape` 違反 298 件を解消（大半は `eslint --fix` による波括弧補完、加えて `tasks` の到達不能 `break` 除去、Google API キー正規表現の不要エスケープ修正）
- **cli.ts のソース破損** — 複合キー区切りに使われていたリテラル NUL バイト 4 個を `\t` に置換（`file` がバイナリ判定・grep が binary 扱いになる原因を除去。挙動は不変）
- **`trace` のクラッシュ耐性** — `collectFiles` のディレクトリ走査と `buildCodeTraceData` のファイル読み取りを、走査中に消えるファイル/ディレクトリ（並行クリーンアップ等）で例外を投げず**スキップ**するよう堅牢化。これにより並行テスト実行時の flaky 失敗（`trace validate`/`impact` が既定 `.` を走査中に ENOENT）を解消
- **カバレッジ 80% ゲート** — MCP `errMsg` ヘルパー抽出（55 個の重複三項演算子を 1 分岐に集約）と、requirements/trace/test:gen の分岐テスト追加で branch coverage を 79.2% → 80.1% に回復
- 挙動変更なし・全 1771 テスト緑・`tsc -b`/`typecheck`/`lint`（0 errors）/coverage（80.1%）を確認

## [0.5.43] - 2026-07-10

SDD パイプラインの下流連携（続き）。`codegen` が設計成果物・要件ファイルを受け取れず、ファイルパスを渡すと**不正なクラス名**を生成していた問題を修正。

### Fixed / Added（codegen）

- **設計成果物・要件ファイルからの生成** — `codegen generate <design.json | requirements.md>` が引数を常にクラス名として扱っていたため、`codegen generate requirements.md` が `export class requirements.md {}`（不正な識別子）を生成していた。ファイルの場合は内容を解析し、**コンポーネント／要件ごとにスケルトンを生成**するよう修正:
  - 設計 JSON（`elements`）→ `component`/`container` 要素ごとにクラス
  - 設計 JSON（`sections`）→ セクションごとにクラス
  - Markdown 要件 → 要件ごとにクラス（タイトルから PascalCase 命名）
  - コンポーネント／要件が無いファイルは明確なエラー（VALIDATION_ERROR）
- **名前のサニタイズ** — プレーンな名前指定時、既に有効な識別子（`UserService`/`myFunc`）はそのまま、無効な名前（`my service`）は PascalCase 化（`MyService`）

### Impact（パイプライン疎通）

- `design generate --out design.json` → `codegen generate design.json` がコンポーネント別スケルトンを生成し、設計→コード生成が連携
- `codegen generate requirements.md` が要件別クラス（`Authentication`/`Session` 等）を生成

### Notes（正常動作を確認）

- `test:gen <file|dir>` はソースを解析してクラス・関数ごとの vitest スケルトンを正しく生成

### Tests

- musubi: 要件ファイルからのスケルトン生成、名前サニタイズ、空ファイルのエラーを検証（27 → 30）

## [0.5.42] - 2026-07-10

SDD の end-to-end フロー検証。`design generate` の出力が下流（`design:verify` / `design:c4`）に渡せず**パイプラインが設計工程で途切れていた**問題を解消。

### Added

- **`design generate <requirements.md> --out <design.json>`** — 再利用可能な JSON 設計成果物を書き出し。成果物は `DesignDocument`（`sections` — `design:verify` が読む）と、要件から導出した C4 モデル（`elements`/`relationships` — `design:c4` が読む）を併せ持つため、**単一ファイルで両方の下流コマンドに連携可能**
- `--out` 省略時は従来どおり Markdown を標準出力

### Impact（パイプライン疎通）

- `requirements analyze` → `design generate --out design.json` → `design verify design.json`（SOLID 100/100）→ `design:c4 design.json`（Mermaid C4）が一気通貫で動作
- 従来は `design generate` が標準出力に Markdown を出すだけで、`design:verify`/`design:c4` が要求する JSON 成果物を生成できず、手動での橋渡しも不可能だった

### Tests

- musubi: `design generate --out` の成果物が `design:verify` と `design:c4` の両方で消費可能なことを検証（e2e）

## [0.5.41] - 2026-07-10

`decisions` / `deep-research` / `skills` を dogfooding し、3 つのスタブ／未配線を実装。

### Fixed（decisions）

- **`decision create` が context/decision を無視** — 常に空の ADR を作成していた（`context: '', decision: '', consequences: ''` をハードコード）。`--context` / `--decision` / `--consequences` フラグから本文を設定するよう修正

### Fixed（deep-research）

- **ナレッジグラフ非連携** — `deep-research query|iterative|evidence` が常に空のソース配列で実行され、常に「Sources: 0」だった。**ローカルのナレッジグラフ（`.knowledge`）からトピックに一致するエンティティを取得し、`ResearchSource` に変換して供給**するよう修正。`evidence` は先に `research()` でアキュムレータを満たしてから証拠チェーンを生成

### Fixed（skills）

- **`skills create` がツリーを表示するだけのスタブ** — ファイルを何も書いていなかった。実際に `<name>/skill.json`・`<name>/index.ts`・`<name>/tests/index.test.ts` をディスクに生成するよう修正（既存ディレクトリはエラー）。生成される `skill.json` は `skills validate` を通過

### Validation

- `decision create … --context … --decision …` → `get` が本文を表示
- `deep-research query microservices`（ナレッジに該当エンティティあり）→ Confidence 0.87 / Sources 1（from knowledge graph）、`evidence` が 2 件
- `skills create my-skill` → 実ファイルを生成し `skills validate` に合格

### Notes（正常動作を確認したもの）

- `ontology add/list/stats`、`synthesis dsl`、`policy list/validate`、`decision accept/deprecate/search/index` は正常動作

### Tests

- musubi: decisions のフラグ入力、deep-research のナレッジ連携、skills の実ファイル生成を検証（52 → 55）

## [0.5.40] - 2026-07-10

`trace` / `decisions` / `design:c4` / `deep-research` を dogfooding し、`design:c4` の不親切なクラッシュと `trace validate` のスタブ挙動を修正。

### Fixed（design:c4）

- **Markdown 入力での不可解なクラッシュ** — `design:c4 <requirements.md>` が入力を JSON として解析しようとし `❌ Unexpected token '#' … is not valid JSON` で落ちていた。以下に改善:
  - JSON の C4 モデル（`{title, elements, relationships}`）はそのまま利用
  - **Markdown 要件ファイル（`## REQ-XXX-000:`）から C4 モデルを自動導出**（User＋System、ドメインごとの Container、要件ごとの Component、関係を生成）→ そのまま Mermaid C4 図を出力
  - どちらでもない入力には明確なエラーメッセージ（VALIDATION_ERROR）
  - 入力ファイル不在時のパスチェックを追加

### Fixed（trace validate）

- **`trace validate` がスタブだった** — 空の TraceabilityManager を生成して空の表を出力するだけで、`--specs`/`--src` を無視していた。実際に仕様と実装を突き合わせ、**未カバー要件を列挙**するよう修正。`--strict` で未カバーがあれば非ゼロ終了（CI 用）

### Validation（dogfooding）

- `trace matrix` は正常動作を確認（REQ→コードのマッピング、カバレッジ率、ギャップ検出）
- `decision create/list/get` は正常動作を確認
- `deep-research query` はソース未設定時に妥当なメッセージを返すことを確認（クラッシュなし）
- `design:c4 <requirements.md>` が context/container レベルで有効な Mermaid C4 を生成
- `trace validate --strict` が未カバー要件（`REQ-PAY-001`）で非ゼロ終了

### Tests

- musubi: `design:c4` の Markdown 導出・不正入力エラー、`trace validate` のカバレッジ検査と `--strict` 失敗を検証

## [0.5.39] - 2026-07-10

`requirements`（EARS 検証）と `knowledge`（グラフ）を dogfooding し、パーサーの厳格さと未処理クラッシュを修正。

### Fixed（requirements / EARS パーサー）

- **タイトルなし見出しの取りこぼし** — `## REQ-AUT-001:`（タイトル無し）が見出し正規表現の `(.+)` に一致せず、**ファイル内の全要件が黙って消える**問題を修正（`(.*)` に変更してタイトルを任意化）
- **インライン要件テキストの非対応** — `**要件**: THE … SHALL …`（同一行にテキスト）が「次行にテキスト」を要求する正規表現に一致せず解析されなかった問題を修正（同一行・次行の両方に対応）
- 修正後、タイトル無し＋インライン形式の文書でも 8 要件すべてが正しく解析・分類（良い EARS は高信頼度、曖昧なものは「SHALL 欠如／低信頼度」を検出）

### Fixed（knowledge）

- **`search` のクラッシュ** — `name`/`tags` を持たないエンティティ（CLI で最小構成で作成したもの）に対し `e.name.toLowerCase()` が「Cannot read properties of undefined」で落ちる問題を修正（null 安全化。`query` の text フィルタも同様に修正）
- **CLI `knowledge put` が不完全なエンティティを保存** — `name`/`tags` を付けずに保存していたため `search`/`query` が機能しなかった。`name`（既定は id）と `tags: []` を付与し、任意の `[name]` 引数を追加
- **CLI `knowledge query`** — 従来は型の完全一致のみ。名前・説明の部分一致とエンティティ id 一致も対象にし、`query user` が「user」エンティティを見つけられるように

### Tests

- core: タイトル無し見出し・インライン要件テキストの解析を検証
- knowledge: `name`/`tags` 欠如エンティティでの `search`/`query` 非クラッシュを検証

## [0.5.38] - 2026-07-10

`security` の taint データフロー解析に**サニタイザ認識**を追加。エスケープ／キャスト済みの値を汚染源から除外し、誤検知を削減。

### Fixed

- **サニタイザを通った値の誤検知** — `cmd = "ls " + shlex.quote(x)` や `q = "…%d" % int(uid)`、PHP `"…" . escapeshellarg($x)` のように、動的部分が既知のエスケープ／クォート／数値キャスト関数を通っている場合は汚染扱いしないよう修正
- 認識するサニタイザ: `shlex.quote`/`pipes.quote`/`escapeshellarg`/`escapeshellcmd`、`mysqli_real_escape_string`/`real_escape_string`/`pg_escape_*`/`quote_ident*`、`re.escape`/`html.escape`/`htmlspecialchars`/`htmlentities`、数値キャスト `int`/`float`/`Number`/`parseInt`/`parseFloat`/`Integer.parseInt`
- 汚染の伝播（変数間）にも同じサニタイザ判定を適用

### Impact

- サニタイズ済み／未サニタイズが混在するフィクスチャで、**未サニタイズのケースのみ**を検知（サニタイズ済み 3 件を除外、真陽性 1 件は維持）
- 0.5.37 の検知能力は不変（Django 1・Laravel 0）

### Tests

- security: サニタイザ（`shlex.quote`/`int()`/`escapeshellarg`）経由の値が非検知、未サニタイズは検知を検証（39 → 40）

## [0.5.37] - 2026-07-10

`security` に**ファイル内 taint データフロー解析**（`TaintDataflowAnalyzer`）を追加。パターン検知では見逃していた「変数経由」の注入を検出。

### Added

- **`TaintDataflowAnalyzer`** — 動的に構築された文字列が変数を介して危険なシンクへ流入する経路を追跡（intra-file、行ベースのヒューリスティック、伝播はフィックスポイントまで反復）
  - **汚染源**: `x = "…".format(v)` / `x = f"…{v}"` / `x = "…" % v` / `x = "…" + v` / PHP `$x = "…" . $v`
  - **シンク**: `execute`/`query`/`raw`/`prepare`（SQLi, CWE-89）、`os.system`/`subprocess`/`system`/`popen`/`shell_exec`/`passthru`（コマンドインジェクション, CWE-78）、`eval`（コード注入, CWE-95）
  - シンク引数が「先行行で汚染された素の変数」のときのみ報告し、汚染源／シンクの行番号を提示
  - `SecurityScanner` の既定検知器と CLI（`musubix security`）に統合

### Precision（安全形の除外）

- **パラメータ化クエリ**（定数 SQL + `execute(sql, params)`）は汚染源にならず非検知
- **引数リスト**（`args = [exe] + […]` → `subprocess.run(args)`）はシェル文字列でないため非検知（リストリテラルを汚染源から除外）
- コメント・文字列は事前にブランク化（既存の仕組みを流用）

### Validation

- 目標ケース `q = "…".format(name); cursor.execute(q)` を検出（従来は見逃し）
- 変数経由の f-string SQLi、連結コマンドインジェクション（Python/PHP）を検出
- 実プロジェクトの誤検知は最小（Django 1・Laravel 0・Rails 0・ripgrep 0；Django の 1 件は `sql = "…" + suffix; execute(sql)` の実在パターン）

### Tests

- security: `.format()`/f-string/連結の変数経由注入検出、パラメータ化クエリ・引数リスト・非動的の非検知を検証（36 → 39）

## [0.5.36] - 2026-07-10

`security` の**検知漏れ（recall）を検証**（意図的な脆弱性フィクスチャで測定）し、主要な脆弱性クラスの検出を追加。フィクスチャで検出が 3 → 20 件に向上。

### Added（検知カバレッジ）

- **プロバイダートークン形式** — GitHub（`ghp_`/`gho_`/…）、Slack（`xox[baprs]-`）、Stripe（`sk_live_`/`rk_live_`）、Google API（`AIza…`）。従来は `_`/`-` を含むため長文字列パターンで取りこぼしていた
- **接続文字列内の資格情報** — `scheme://user:pass@host`（プレースホルダ `user:password@`・`${...}`・`<pass>` は除外）
- **コマンドインジェクション** — `os.system()`、`subprocess(…, shell=True)`、PHP `shell_exec`/`passthru`/`proc_open`/`popen`/`system`、Java `Runtime.exec()`
- **SQL インジェクション（拡張）** — DB 呼び出し内の f-string・`.format()`・文字列連結（`execute`/`query`/`raw`/`prepare`）
- **安全でないデシリアライズ** — `pickle.load(s)`、`yaml.load()`、PHP `unserialize()`（**低**重大度：フレームワーク内部で多用されるため）
- **脆弱な暗号ハッシュ** — `hashlib.md5/sha1`、`createHash('md5'/'sha1')`（**低**重大度）

### Notes（精度とのバランス）

- デシリアライズ・弱い暗号は**低重大度の助言**として報告（実プロジェクトで多用され、多くは意図的なため）。`--fail-on high` 等で CI 用にフィルタ可能
- `%` 文字列フォーマットによる SQLi 検出は追加後に不採用 — パラメータ化クエリ（`%s` プレースホルダ）と区別できず誤検知が多いため（Django で 43 件の偽陽性）。f-string／連結／`.format()` のより明確なパターンを採用

### Validation

- 脆弱性フィクスチャ（約22件）: 検出 3 → **20**（secrets 8/8、コマンドインジェクション 6/6、デシリアライズ 2/2、弱い暗号 2/2、SQLi 3/4）
- 実プロジェクトの CRITICAL/HIGH は真陽性を維持（Django 8、Laravel 5）。ノイズになりやすい実在パターンは LOW 助言に整理

### Tests

- security: プロバイダートークン、接続文字列、コマンドインジェクション、f-string/連結 SQLi、デシリアライズ/弱い暗号（低重大度）を検証（33 → 40）

## [0.5.35] - 2026-07-10

`security` パッケージを実プロジェクト（Django/Laravel/Rails/ripgrep）で dogfooding し、**誤検知（false positive）を大幅削減**。

### Fixed（security 精度）

- **eval/exec のメソッド呼び出し・定義・コメント・文字列の誤検知** — `x.eval()`/`$redis->eval()`/`X::exec()`（メソッド呼び出し）、`def eval(...)`（定義）、PHPDoc の `* @method … eval()`（コメント）、`'eval()'`（文字列リテラル）を実際の組み込み `eval(`/`exec(` と誤検知していた。メンバーアクセス演算子（`.`/`->`/`::`）の除外と、**コメント・文字列を位置保存でブランク化**する処理（TaintAnalyzer のみ、行番号は不変）を追加
- **`innerHTML = ""` / 定数代入** — 静的文字列の innerHTML 代入（XSS リスクなし）を除外し、動的代入のみ検知
- **文字セット定数の秘密誤検知** — `RANDOM_STRING_CHARS = "abc…XYZ0-9"`（連続文字列）を除外
- **CamelCase 識別子の秘密誤検知** — `"GDALGetRasterColorInterpretation"`（C-API シンボル名、数字なし）を除外。秘密判定に「数字を含む」要件を追加
- **ハッシュ/チェックサムの秘密誤検知** — SHA-256/1/MD5 等の 32/40/64/128 桁小文字 16 進（Homebrew formula の `sha256` 等）を除外
- **テンプレート/変数のパスワード誤検知** — `%(password)s`/`${pw}`/`#{password}`（Ruby 補間）/`--password=`（CLI フラグ）/`.$var`（連結）を除外
- **ベンダー/圧縮ファイルのスキャン除外** — `.min.js`/`.bundle.js`/`node_modules`/`vendor`/`dist` 等を常にスキップ（jquery/select2 のノイズ源）

### Impact / Validation（誤検知削減）

- **Django**: 約 40 件 → **4 件**（全て実在の `eval`/`exec` 組み込み呼び出し）
- **Laravel**: 44 件 → **3 件**（全て実在の `exec`/`eval`）
- **Rails**: 1 件 → **0 件**
- **ripgrep**: 2 件 → **0 件**
- いずれも真陽性のみが残存、明確な偽陽性はゼロに

### Tests

- security: eval/exec のメソッド/コメント/文字列除外、静的 innerHTML、文字セット/識別子/ハッシュ/テンプレート秘密の除外を検証（22 → 33）

## [0.5.34] - 2026-07-10

PHP（Laravel）・Ruby（Rails）での dogfooding。Ruby の**ネストした class/module 未検出**バグを発見・修正。

### Fixed

- **Ruby のネスト class/module 検出** — Ruby の class/module 正規表現が `^class`/`^module`（行頭）を要求していたため、module 内にネストした定義（Rails 流のコードでは大半）が検出されず、Rails activerecord では `class` ノードがわずか 1 個だった。`^\s*class`/`^\s*module` に変更し、インデントされたネスト定義を捕捉（Python の `def` 修正 0.5.31 と同種）

### Impact / Validation

- **Ruby (Rails activerecord/lib)**: `class` ノード 1 → 602、`module` 399 → 958（ネスト定義 1,100+ 個を回収）。コール解決は元々クリーン（`_read_attribute`/`association` 等の実 Rails メソッドが上位、組み込み衝突なし）— Ruby 用 denylist は不要と判断
- **PHP (Laravel src)**: クリーンと確認。トップは Laravel ヘルパー関数（`enum_value`/`class_basename`/`app`/`data_get`/`__`）。PHP 組み込み関数は再定義不可（fatal error）のため偽エッジを生まない
- 他言語（C/Python/Rust/Go/Java）は Ruby 正規表現変更の影響なし

### Docs

- `docs/codegraph.md` の言語サポート節を更新（Ruby ネスト検出、Rust/Python 組み込み抑制、言語別スコープを明記）

### Tests

- codegraph: ネストした Ruby module/class の検出を検証（41 → 42）

## [0.5.33] - 2026-07-10

Go（Kubernetes）・Rust（ripgrep）・Java（Spring）での dogfooding により、コールグラフ解決の組み込み名 denylist を**呼び出し元の言語ごとにスコープ**する設計へ刷新。

### Fixed

- **Rust std メソッドの誤解決** — `clone`/`as_ref`/`unwrap`/`into` 等が、`#[derive(...)]` により明示 `fn clone` が稀で一意に定義されるため、全 `.clone()` 呼び出しを捕捉していた（ripgrep で calls エッジの **13.5%（446 中 60）が偽陽性**）。Rust 用の std トレイト/変換/Option-Result メソッド denylist を追加
- **言語横断の過剰抑制** — 従来の単一 denylist は、ある言語の組み込み名（Rust `as_bytes`）が別言語の正当な同名メソッド（Django の `as_bytes` ヘルパー）まで抑制していた。denylist を **JS/TS・Python・Rust の言語別バケットに分割し、呼び出し元ファイルの言語で選択**する方式に変更。C/Go/Java はバケットを持たず影響なし（これらは命名規約や多重定義で自然に自己フィルタされる）

### Changed

- `nonCDefNames` スコープ（0.5.25/0.5.32）を廃し、`BUILTINS_BY_LANG`（呼び出し元言語 → 組み込み名集合）に置換。より正確でシンプル

### Impact / Validation

- **Rust (ripgrep)**: calls 446 → 386（`clone`/`as_ref` 偽エッジ除去、std 標的 0）
- **Python (Django)**: `super` 265 → ~0、かつ `as_bytes` 等の**正当な Python メソッドエッジを復元**（従来は誤抑制）
- **Go (k8s pkg/scheduler)**: `NewX`/`MakeX` 規約により元々クリーン、変更なし
- **Java (Spring core)**: `equals`/`toString`/`hashCode` は多重定義で自己フィルタ、変更なし
- **C (Linux kernel)**: calls 8,474 で不変

### Tests

- musubi: Rust std メソッド（`clone`/`as_ref`）が Rust 呼び出し元でのみ抑制され、実関数呼び出しは解決されることを検証（76 → 77）

## [0.5.32] - 2026-07-10

Django（908 Python ファイル）での dogfooding により、Python の**組み込みグローバル関数の誤解決**バグを発見・修正。

### Fixed

- **Python 組み込み名の誤ったコールエッジ** — `super`/`type`/`dict`/`min`/`max` 等の組み込みグローバル関数が、同名のユーザー `def`（例: Django の `loader_tags.py` にある `def super`）に対して**コーパス全体の呼び出しから誤ってエッジ化**されていた。Django では calls エッジの **17.2%（2,896 中 499）が偽陽性**で、`super`（265）が「最も呼ばれる関数」に浮上していた
  - 組み込み denylist に **Python グローバル組み込み関数**（super/type/len/str/int/float/bool/dict/list/tuple/isinstance/property/enumerate/zip/sorted/min/max/sum/abs 等）と **Python 文字列メソッド**（upper/lower/title/startswith/endswith/isdigit 等、小文字系で JS の camelCase とは別）を追加
  - denylist は従来どおり**非 C 定義名に限定**して適用するため、C の同名関数エッジには無影響（カーネルコア calls 8,474 で不変）
  - `open`/`next`/`id` 等、正当なユーザーメソッド名になりやすいものは意図的に除外

### Impact

- Django 再インデックスで calls エッジが 2,896 → 2,481（偽エッジ 415 除去）、組み込み標的エッジ 0 に。「最も呼ばれる関数」が `_lazy_re_compile`/`import_string`/`Migration` 等の実 Django シンボルに正常化。`cg candidates` も `regex_helper.py`/`smartif.py` 等の自己完結モジュールを正しく上位提示

### Tests

- musubi: Python 組み込み名（`type`/`len`）がユーザー `def` に解決されず、実ヘルパー呼び出しは解決されることを検証（75 → 76）

## [0.5.31] - 2026-07-10

残バックログ 4 件をまとめて対応。

### Added

- **`cg path --all`** — 最短依存経路を 1 本ではなく全て（上位 20 本まで）列挙。BFS で全最短前任を記録し、複数ルートを表示（`--json` は `paths[]`）
- **`.github/workflows/architecture-gate.yml`** — `cg gate` を CI で使う実サンプルワークフロー（`workflow_dispatch` 手動トリガーで通常 CI を妨げない）。index → gate → JSON レポート成果物の流れを提示

### Changed

- **`cg candidates` に循環ペナルティ** — スコアを `(functions + dependents) / (1 + external deps + cycle entanglement)` に変更。依存循環に絡むファイル（SCC サイズ−1）を減点し、`cyc` 列を追加。「実際に切り出せる」自己完結ファイルが上位に来る（カーネルコアでは巨大 SCC に属する `lib/string.c` が降格し `lib/rbtree.c` 等が上位化）

### Fixed

- **Python メソッド解決** — インデント付き `def`（クラスメソッド・ネスト関数）が正規表現 `^def` にマッチせず未検出だった問題を修正（`^\s*def` に変更）。Python のクラスメソッド呼び出し `obj.method()` が横断解決されるように
- **組み込み名 denylist の非 C 言語対応** — `map`/`set`/`get`/`append`/`items` 等がユーザー定義に誤解決されるのを防ぐ denylist を、メソッドだけでなく**非 C ファイルで定義された関数**にも適用（Python/TS を保護）。C の同名関数エッジには引き続き無影響（カーネルコア calls 8,474 で不変）。Python コンテナ系メソッド名も denylist に追加

### Validated

- Java のメソッドは従来どおり検出・解決されることを確認（アクセス修飾子付きシグネチャ）

### Docs

- `docs/codegraph.md` に「言語サポート状況」節、`path --all`、candidates 循環ペナルティ、CI サンプルへのリンクを追記

### Tests

- codegraph: Python インデント `def` 検出の期待値を修正
- musubi: Python メソッド解決、candidates 循環ペナルティ、`path --all` の複数経路を検証（72 → 75）

## [0.5.30] - 2026-07-10

CodeGraph に**依存経路探索 `cg path`** を追加。2 ファイル間の最短依存チェーンを表示し、「なぜ A が B に依存するのか」を可視化する。

### Added

- **`cg path <from-fragment> <to-fragment> [--json]`** — `<from>` にマッチするファイルから `<to>` にマッチするファイルへの最短依存経路（depends-on エッジ上の BFS）を表示。経路がなければ「No dependency path」、`--json` で `{ from, to, hops, path[] }` を出力
- `impact`（影響を受ける集合）に対し、`path` は実際の依存チェーンを示す補完的な分析

### Impact

- Linux カーネルコアで `cg path printk/printk.c lib/cmdline.c` は 1 ホップ（直接呼び出し）、`cg path kernel/audit.c lib/cmdline.c` は 3 ホップの推移チェーンを表示。`cg path lib/cmdline.c kernel/audit.c` は `cmdline.c → vsprintf.c → capability.c → audit.c` という（一見意外だが実在する）連鎖を発見 — カーネルのユーティリティ層の密結合を可視化

### Tests

- musubi: 方向付き最短経路（a→b→c の 2 ホップ）、逆方向の経路なし、JSON 出力、引数不足エラーを検証（71 → 72）

## [0.5.29] - 2026-07-10

CodeGraph の `cg export` に**ディレクトリクラスタリング `--cluster`** を追加し、大規模グラフを Graphviz で見やすく出力できるようにした。

### Added

- **`cg export --cluster`**（DOT のみ）— ファイルノードをディレクトリ単位の `subgraph cluster_<dir>` にグループ化し、各クラスタにディレクトリ名ラベルを付与。カーネルコアのような大規模グラフの可読性が大幅に向上
- ドキュメント `docs/codegraph.md` の export 節に `--cluster` を追記

### Impact

- Linux カーネルコアで `cg export cmdline.c --cluster` が `kernel`/`kernel/cgroup`/`kernel/dma`/`lib` など 9 個のディレクトリクラスタに整理された DOT を生成（`dot -Tsvg` でそのまま可視化可能）。非 `--cluster` 時は従来どおりフラット出力（後方互換）

### Tests

- musubi: `--cluster` の subgraph 生成・ラベル・波括弧バランス、非クラスタ時のフラット出力を検証

## [0.5.28] - 2026-07-10

CodeGraph に**CI 品質ゲート `cg gate`** を追加。アーキテクチャルールを検証し、違反時に非ゼロ終了コードを返す。0.5.27 の分析基盤を CI 連携に発展。

### Added

- **`cg gate [--max-cycles N] [--forbid A:B[,C:D]] [--json]`** — 現在のグラフに対してルールを評価し、違反があれば exit code 1（成功は 0、ルール未指定は 2）
  - `--max-cycles N`: 依存循環が N を超えたら失敗
  - `--forbid A:B`: 「A にマッチするファイルが B にマッチするファイルへ依存」を禁止（カンマ区切りで複数ルール）。レイヤリング違反の検出に有用
  - `--json`: `{ passed, checks: [{rule, pass, detail, offenders}] }` を出力
- 内部リファクタ: Tarjan の循環検出を `findDependencyCycles()` に抽出し `cycles`/`gate` で共用

### Impact

- Linux カーネルコアで `cg gate --max-cycles 0` は 5 循環を検出して失敗（exit 1）、`--max-cycles 10` は成功。`cg gate --forbid lib/:kernel/` は `lib/` → `kernel/` の依存 431 件を検出（レイヤリング観察）。CI で「新規循環禁止」「レイヤ違反禁止」を自動判定可能に

### Tests

- musubi: 循環・レイヤリングルールの合否と終了コード、JSON 出力、ルール未指定エラーを検証（70 → 71）

## [0.5.27] - 2026-07-10

CodeGraph の分析コマンドに**機械可読な `--json` 出力**を追加。CI ゲートや自動化スクリプトへ結果を連携できる。

### Added

- **`--json` フラグ**（`cg impact` / `cg cycles` / `cg candidates` / `cg diff`）— 人間向けの整形出力に代えて構造化 JSON を出力
  - `impact --json`: `{ filter, depth, seeds, direct[], indirect[], total, counts }`
  - `cycles --json`: `{ count, cycles: [[files…]…] }`
  - `candidates --json`: `{ total, candidates: [{file, functions, externalDeps, dependents, score}…] }`
  - `diff --json`: `{ baseline, current, filesAdded[], filesRemoved[], edgesAdded[], edgesRemoved[], counts }`
- 各サブコマンドの `--help` に `--json` を明記

### Impact

- Linux カーネルコアで `cg impact … --json` / `cg cycles --json` / `cg candidates --json` / `cg diff … --json` がいずれも妥当な JSON を出力（例: diff で `edgesAdded` 6,004 件を配列で取得）。`jq` 連携や CI での依存契約チェックが可能に

### Tests

- musubi: impact/candidates/cycles/diff の JSON 構造をパースして検証（69 → 70）

## [0.5.26] - 2026-07-10

CodeGraph に**グラフ差分 `cg diff`** を追加。2 つのグラフスナップショット間で、ファイルと依存関係の増減を比較できる（変更影響レビュー・ブランチ間比較に有用）。

### Added

- **`cg diff <baseline.json> [current.json]`** — 2 つの永続化グラフ（`.musubix/codegraph.json` 形式）を比較し、追加/削除されたファイルと、ファイルレベル依存エッジ（call/import を解決）の増減を報告。`current` 省略時は作業中の `.musubix/codegraph.json` を使用。各リストは 25 件で打ち切り、差分なしは「No differences ✅」
- 内部リファクタ: export/diff 共通のファイルレベルエッジ解決を `resolveFileEdges()` に、任意パスのグラフ読み込みを `loadGraphFromPath()` に集約

### Impact

- Linux カーネルコアで、`lib/` のみ → `kernel/`+`lib/` の差分が「Files +496 / Dependency edges +6004」と表示。逆方向は削除（-496 / -6004）、同一グラフは差分なしを正しく検出

### Tests

- musubi: ファイル・依存追加の検出、同一グラフの差分なし、baseline 欠如時のエラーを検証（67 → 69）

## [0.5.25] - 2026-07-10

CodeGraph に**クラスメソッド呼び出しの解決**（`obj.method()`）を追加。従来 TS/JS のクラスメソッドはクラスノードの子として解析されるだけでグラフに登録されず、OO コードのコールグラフが不完全だった（musubix2 自身の TS ソースで検証）。

### Added

- **メソッドノードのグラフ登録** — インデックス時にクラスの子メソッドを平坦化してグラフに追加。`cg search`/`cg stats` でメソッドが可視化され、`method` ノードとして計上される
- **メソッド呼び出しのコールグラフ解決** — `obj.method()` を一意なメソッド定義に解決してエッジ化（関数と同じ一意名ヒューリスティック）。`cg impact`/`cg deps`/`cg cycles`/`cg export` がメソッド呼び出しを追跡

### Fixed

- **組み込みメソッド名の誤解決を抑止** — `map`/`filter`/`set`/`get`/`forEach` 等の標準ライブラリ名（`Array.map`・`Map.set` など）がユーザー定義メソッドに誤ってエッジ化されるのを防ぐ denylist を追加。**メソッド定義名に限定**して適用するため C の関数エッジには影響しない（カーネルコアの calls エッジ数は 8,474 で不変）

### Impact

- musubix2 自身の TS ソース（`src/packages`）で `method` ノード 853 個を新規登録、`registerAgent()`/`completeTask()` 等の実メソッド呼び出しを解決。`cg impact agent-orchestrator` がメソッド経由の依存元を追跡可能に。組み込み名（`.map()` 等）由来の誤エッジは 0
- C（カーネルコア）グラフは完全に不変（メソッド概念なし）

### Tests

- musubi: クロスファイルのメソッド呼び出し解決、組み込みメソッド名の非解決を検証（65 → 67）

## [0.5.24] - 2026-07-10

CodeGraph に**循環依存検出 `cg cycles`** を追加。ファイルレベルの強連結成分（SCC）を検出し、アーキテクチャ上の循環依存を可視化する。

### Added

- **`cg cycles [path-fragment] [N]`** — ファイルレベル依存グラフの強連結成分（メンバー2件以上）を Tarjan 法で検出し、循環依存として大きい順に表示。各サイクルのファイル一覧は 15 件で打ち切り（`… and X more`）、`N` で表示サイクル数を制限（既定20）、`path-fragment` で対象を限定。循環がなければ「No circular file dependencies found ✅」
- 内部リファクタ: impact/export/cycles で共通の解決マップ構築を `buildResolutionMaps()` に集約

### Impact

- Linux カーネルコアで密結合な中核 SCC（417 ファイル）と、実際に修正候補となる小さな循環（`dma/direct↔mapping↔ops_helpers`、`mpi-add/div/mod`、`chacha` 系）を検出

### Tests

- musubi: 相互依存（a.c ↔ b.c）の検出と非循環グラフのクリーン報告を検証（63 → 65）

## [0.5.23] - 2026-07-10

CodeGraph に**グラフ出力 `cg export`** を追加。依存グラフを外部ツールで可視化・解析できるようにした。

### Added

- **`cg export [path-fragment] [--format dot|json] [--out <file>]`** — シンボルエッジをファイル→ファイルに解決した**ファイルレベル依存グラフ**を出力
  - `--format dot`（既定）: Graphviz DOT。ノードはファイル（ラベルは basename）、`imports` は破線・`calls` は実線で区別
  - `--format json`: `{ files: [...], edges: [{from,to,kind}] }` の正規化 JSON
  - `--out <file>` でファイル書き込み（省略時は標準出力）。`path-fragment` で部分グラフに限定（大規模グラフのサブセット可視化に有用）

### Impact

- Linux カーネルコアで `cg export cmdline.c` が 25 ファイル / 26 エッジの部分グラフ（`cmdline.c → string.c/ctype.c` は破線 import、呼び出し元 → `cmdline.c` は実線 call）を出力。全体は 914 ファイル / 7,036 エッジの DOT を生成

### Tests

- musubi: DOT/JSON 出力構造、`--out` ファイル書き込み、不正フォーマット拒否を検証（62 → 63）

## [0.5.22] - 2026-07-09

CodeGraph の使い勝手を 3 点強化。

### Added

- **`cg impact <path> --depth N`** — 逆到達解析（推移）を N ホップに制限。`--depth 1` は `--direct` と等価。出力に `within depth N` を明示し、深さ別に影響範囲を絞り込める（コアユーティリティの巨大な推移閉包を段階的に調査可能）
- **サブコマンド個別 `--help`** — `cg <sub> --help` で各サブコマンド（index/search/stats/deps/impact/candidates/languages）の詳細な使い方・オプションを表示。`cg --help` はサブコマンド一覧を提示

### Validated

- **`cg candidates` / `cg stats` の言語横断動作を確認**（従来 C 中心）。TypeScript・Python プロジェクトで関数検出・コールグラフ・書き換え候補ランキング・最多呼び出し関数が正しく機能することをテストで担保

### Impact

- Linux カーネルコアで `cg impact lib/cmdline.c --depth 1/2` が 21 / 265 ファイル、無制限で 829 ファイルと段階表示。TS/Python の小規模プロジェクトで `cg candidates` が中核ファイル（`core.ts`/`lib.py`）を正しく上位提示

### Tests

- musubi: `--depth` の境界、TS での candidates、サブコマンド help を検証（59 → 62）

## [0.5.21] - 2026-07-09

CodeGraph のコールグラフ解決を **C の `static`（内部リンケージ）認識**に対応。0.5.18 は「コーパス全体で一意な名前」のみをエッジ化していたため、カーネルに多い同名 `static` ヘルパー（`show`/`open`/`probe` 等）は一切エッジ化されず、また同名 `static` を持つ一意グローバル関数も誤って除外されていた。

### Fixed

- **`static` 同名関数の解決** — C パーサーが関数定義の `static` 修飾を `metadata.static` として記録。インデックス時のコールグラフ解決を C のスコープ規則に従わせた:
  - 呼び出し元が同名を定義していれば**ファイル内でローカル束縛**（`static` は同一ファイルの定義に解決）→ 横断エッジを張らない
  - それ以外は外部リンケージ関数へ解決 — **グローバル（非 static）定義が一意なときのみ**エッジ化
- これにより、①ファイルローカル `static` への誤った横断エッジを除去（別ファイルから `static` は呼べない）、②同名 `static` に隠れていた一意グローバルへの呼び出しを回収。`cg impact` の `defFiles` 解決も非 static 定義のみを対象に

### Impact

- Linux カーネルコアで `calls` エッジが 8,671 → 8,474 に純化（誤エッジ除去が回収を上回る、いずれも精度向上）。同名 `static` を10個持つ一意グローバルが正しく10エッジで解決され、`static` のみの名前は0エッジに。`cg impact lib/cmdline.c` は 21 direct を維持

### Tests

- codegraph: `static`/グローバルのリンケージ記録を検証
- musubi: `static` 同名はローカル束縛・グローバル呼び出しは横断解決されることを検証（58 → 59）

## [0.5.20] - 2026-07-09

CodeGraph に**書き換え候補ランキング `cg candidates`** を追加し、`cg stats` を充実化。当初の「Rust で置き換えられる部分を調査」というタスクを、手動探索ではなくコマンド一発で支援できるようにした。

### Added

- **`cg candidates [N]`** — 各ファイルを「隔離した書き換え（例: Rust 化）への適性」でランキング。スコア = （関数数 + 依存元数）/（1 + 外部依存数）で、実装量があり（関数）・よく使われ（依存元）・移植すべき外部依存が少ない（self-contained）ファイルを上位に。テスト/フィクスチャファイルは除外。`N` で表示件数指定（既定15）
- **`cg stats` の内訳表示** — ファイル数、ノード種別内訳（function/import/variable/class）、エッジ種別内訳（calls/imports）、最も呼ばれている関数 Top5（call in-degree）を追加

### Changed

- `cg` の usage に `candidates` を追記、`impact` の `--direct` を明記

### Impact

- Linux カーネルコアで `cg candidates` が `lib/string.c` / `lib/maple_tree.c` / `lib/xarray.c` / `lib/kstrtox.c` / `lib/rbtree.c` など、実際に Rust-for-Linux で議論される純粋データ構造・ユーティリティを上位提示。`cg stats` は最多呼び出し関数（memset 214, memcpy 180, strcmp 114 …）を可視化

### Tests

- musubi: `cg stats` の内訳/Top 関数表示、`cg candidates` の順位付けとテストファイル除外を検証（56 → 58）

## [0.5.19] - 2026-07-09

`cg impact` に**直接／推移（indirect）依存の区別**と `--direct` フラグを追加。0.5.18 でコアユーティリティ（`lib/cmdline.c`）の影響範囲が 836 ファイルと出て「広すぎて actionable でない」問題に対応。

### Added

- **`cg impact <path> --direct`** — 深さ1（直接呼び出し／直接 import）の依存のみを表示。推移閉包が巨大になるコアユーティリティで、実際に手を入れるべき直接の呼び出し元を即座に把握できる
- **直接／推移の内訳表示** — 通常の `cg impact` も「N direct / M indirect (transitive)」に分けて列挙し、末尾に `Total: X 件 (N direct, M indirect)` を表示

### Fixed

- グローバル引数パーサーが `--` フラグを吸収し、サブコマンドハンドラーに渡していなかった問題を修正（`cg` アクションで `--direct` をハンドラーへ転送）

### Impact

- `cg impact lib/cmdline.c` の出力が「835 件が推移的に影響」から「**21 direct / 814 indirect**」に分離。`--direct` で 21 件の実際の呼び出し元（`printk.c`/`profile.c`/`signal.c` は `get_option`、`crash_reserve.c`/`dma/*` は `memparse` など）だけを提示

### Tests

- musubi: 直接／推移の分離表示と `--direct` による推移依存の抑制を検証

## [0.5.18] - 2026-07-09

CodeGraph にシンボルレベルの**コールグラフ（`calls`）エッジ抽出**を追加。0.5.17 で判明した「`cg impact`/`cg deps` が `#include` エッジしか辿らず、ヘッダー経由で多用途に呼ばれるモジュールを『孤立リーフ』と誤報告する」偽陰性を解消。

### Added

- **横断コールグラフエッジ** — インデックス時に各ファイルの関数呼び出し（`name(`）を抽出（コメント・文字列リテラルを除去、制御構文キーワードを除外）し、第2フェーズで「コーパス全体で**一意に定義**された関数名」への呼び出しのみを `calls` エッジ化。カーネルに多い同名 `static` ヘルパーによる過剰接続を避けつつ、`#include` では見えない真の依存を捕捉。ファイル内呼び出し（自己エッジ）は除外
- **`ASTParser.extractCalls(source, language)`** — 呼び出し識別子の抽出 API。C 系のコメント/文字列除去を内蔵

### Changed

- **`cg deps`** — 呼び出しエッジを `name() [call]` と注記して `#include` 依存と区別
- **`cg impact`** — 既存の「シンボル名→定義ファイル」解決を通じて `calls` エッジも自動的に逆到達解析へ反映（追加ロジック不要）

### Impact

- Linux カーネルコア再インデックスでエッジが 8,308（import のみ）→ 16,979（import + call）に増加
- `cg impact lib/cmdline.c` が「依存なし」→ **836 ファイルが推移的に影響**と正しく報告。`cg deps lib/cmdline.c` が `simple_strtoull`/`simple_strtol`/`skip_spaces`/`strlen`/`strncmp` の呼び出し依存を提示

### Known limitation (次バージョン候補)

- `cg impact` は直接／推移の区別を出力しない（コアユーティリティでは推移閉包が広くなりがち）。深さ別・直接依存のみ表示オプションが次の改善候補
- `calls` 解決は「一意定義名」に限定するため、同名 `static` 関数への呼び出しはエッジ化されない（安全側の取りこぼし）

### Tests

- codegraph: `extractCalls` のキーワード/コメント/文字列除外を検証（125 → 126）
- musubi: `#include` なしで別ファイルの関数を呼ぶ C ケースで `cg deps`/`cg impact` が call エッジを辿ることを検証（55 → 56）

## [0.5.17] - 2026-07-09

CodeGraph の C パーサーを全面修正（Linux カーネルコア dogfooding より）。実カーネルコード（`kernel/` + `lib/`、1018 ファイル）に対する検証で、関数定義がほぼ検出されず（1018 ファイルで 244 関数のみ）、`struct` の *使用箇所* を大量に誤ってノード化（44,786 個の偽 `class` ノード）していた問題を発見・修正。

### Fixed

- **C 関数定義の検出** — カーネル/K&R スタイルで `{` が次行にある場合や、引数リストが複数行にまたがる場合に関数定義を検出できなかった問題を修正。定義認識型の専用パーサー（`parseCLike`）を追加し、列 0 のシグネチャ・複数行引数・次行の `{` を正しく扱う。マクロ呼び出し（`EXPORT_SYMBOL(x)`）・プロトタイプ宣言・制御文（`if`/`for`/`return` 等）は関数として誤検出しない
- **`struct`/`union`/`enum` の過剰ノード化** — フィールド・引数・ローカル変数中の型 *使用* をすべて `class` ノード化していたのを、*定義*（`tag {`）のみに限定。カーネルコアで偽ノードが 44,786 → 934 に減少
- **ノード数の不整合** — `cg index` が報告するノード数（エンジンの重複排除後）と `.musubix/codegraph.json` に永続化される配列（重複あり）が食い違っていた問題を修正。ノード id / エッジ三つ組で重複排除してから永続化し、報告値＝永続化値に統一

### Impact

- Linux カーネルコアの再インデックスで検出関数が 244 → 22,027、偽 `class` ノードが 44,786 → 934、報告/永続化ノード数が一致（34,052）、`lib/cmdline.c` の全 5 関数を正しく検出（従来は 0 件）
- `cg search` / `cg stats` が関数シンボルを実際に返せるようになった

### Known limitation (次バージョン候補)

- `cg deps` / `cg impact` は依然 `#include` エッジのみを辿るため、関数呼び出し（コールグラフ）の横断依存は追跡されない。ヘッダー経由で参照される多用途モジュールが「孤立リーフ」に見える偽陰性が残る。シンボルレベルの `calls` エッジ抽出が次の改善対象

### Tests

- codegraph: C 定義検出・マクロ/プロトタイプ除外・struct 定義限定の 3 ケースを追加（122 → 125）

## [0.5.16] - 2026-07-09

CodeGraph に推移的到達可能性分析 `cg impact` を追加（Moodle 分析の続き）。

### Added

- **`cg impact <path>` — 推移的な影響範囲分析** — 依存エッジを逆方向に辿り、「対象ファイルが変更/侵害された場合に（間接的に含め）影響を受けるファイル群」を BFS で列挙。import ターゲットは「定義シンボル名」または「パス系 import のファイル名」でインデックス済みファイルに解決（PHP の名前空間 `use` と TS/JS/Python の相対 import の両方に対応）。脆弱性の伝播・変更影響の把握に利用可能

### Notes

- 解決は正規表現パーサーが捕捉する短いシンボル名に基づくヒューリスティックで、`provider` のような共通クラス名が並行ディレクトリに複数存在する場合は影響範囲を保守的に過剰近似することがある（安全側）

### Tests

- `cg impact` の推移的到達（base→mid→top）・引数必須の検証テストを追加。全ワークスペース 1703 テスト green

## [0.5.15] - 2026-07-09

CodeGraph に依存関係エッジと `cg deps` を追加（Moodle 分析の続き）。

### Added

- **CodeGraph の依存エッジ生成 + `cg deps` コマンド** — `cg index` が import/use ノードから「ファイル → 依存モジュール」の `imports` エッジを生成し永続化。`cg deps [パスの一部]` でファイルごとの依存モジュールを一覧表示。従来 `edges` は常に 0 だったが、実依存グラフを構築できるようになった（影響範囲分析の基盤）

### Fixed

- **PHP の import 抽出が文章中の "use"/"include" を誤検知する問題を修正** — 正規表現 `/(?:use|require|include)\s+([\w\\]+)/` がコメントや説明文中の英単語 "use"/"include" も import として拾い、`cg deps` に `the`/`a`/`it` 等の偽依存が混入していた。行頭アンカー（`^\s*`）と名前形状の制約を追加し、実際の `use Foo\Bar;` / `require_once ...` 文のみを抽出。Moodle 認証系のエッジは 202（ノイズ込み）→ 120（実 `use` 文のみ）に是正され、`oauth2` クラスは `core\di` / `core\oauth2\client` / `moodle_url` 等の実名前空間依存を正確に表示

### Tests

- PHP import 精度（プロース中の "use" を非検知・実 `use` 文を検知）、`cg deps` の依存エッジ表示のテストを追加。全ワークスペース 1701 テスト green

## [0.5.14] - 2026-07-09

Moodle 分析で判明した「テストファイルの指摘がノイズになる」問題に対応。

### Added

- **`security --exclude-tests`** — テスト/フィクスチャファイル（`tests/`・`__tests__/`・`*_test.*`・`*.spec.*`・`fixtures/`・`phpunit`・`behat` 等）をスキャン対象から除外するフラグ。スキップ件数を要約に表示。Moodle 認証系（144ファイル）では 22 テストファイルを除外し、本番コードの指摘が 11件（すべてテスト由来）→ **0件**にクリーン化（0.5.13 の偽陽性修正と併せ、Moodle 本番認証コードは検出項目ゼロ）

### Tests

- `isTestFile` 判定と `--exclude-tests` がテストファイルの指摘を除外することの検証テストを追加。全ワークスペース 1698 テスト green

## [0.5.13] - 2026-07-09

実世界コードベース（Moodle 5.x, 50k+ PHP ファイル）での CodeGraph 脆弱性分析ドッグフーディングで発見した課題を改修。

### Fixed

- **`cg index` が永続化されず `cg search` / `cg stats` が常に 0 になる問題を修正** — 索引したグラフをメモリに構築するだけで保存していなかったため、「索引 → 検索/統計」という CodeGraph 分析の基本ワークフローが別プロセス間で成立しなかった。`.musubix/codegraph.json` に永続化し、`search`/`stats` は保存済みグラフを読み込むよう変更（`cg search` は一致ノードをファイルパス付きで表示）。Moodle 認証系 782 ノードの索引→`search password` で 43 関数を特定できることを確認
- **secret detector が長い低エントロピー文字列を誤検知する問題を修正** — 32文字以上の英数字文字列を無条件に「秘密鍵疑い」としていたため、識別子や i18n 言語キー（例: Moodle の `verifyagedigitalconsentnotpossible`）を誤検知していた。エントロピー＋文字種チェック（`isLikelySecret`）を追加し、真に高エントロピー・混在文字種の文字列のみ検出
- **hardcoded-password ルールが書式マーカーを誤検知する問題を修正** — `$extpassword = '{MD5}' . ...`（LDAP のハッシュ種別マーカー）を「ハードコードパスワード」と誤検知していた。`{MD5}`/`{SHA}` 等の書式マーカー・極短リテラルを除外（`isNotFormatMarker`）

### Tests

- cg 永続化（index→stats→search ラウンドトリップ）、secret 精度（言語キー/書式マーカーを非検知・真の秘密は検知）のテストを追加。全ワークスペース 1697 テスト green

## [0.5.12] - 2026-07-09

MCP stdio トランスポートのリクエスト直列化。エンドツーエンド統合を検証。

### Fixed

- **MCP stdio が受信行を並行処理して状態共有ツールがレースする問題を修正** — `StdioTransport` は `line` イベントごとにハンドラを await せず起動していたため、状態変更ツール（`ontology`/`workflow`/`knowledge` の load→mutate→save、`skills` セッションレジストリ）に対して**応答待ちせず連続送信するとレース**し、書き込みが失われることがあった（例: トリプル3件同時追加が total 1 に化ける）。受信行をキューにチェーンして**到着順に1件ずつ直列処理**するよう変更。これにより並行送信でも書き込みが失われず、`skills` の register→execute も順序保証される

### Verified

- 公開版 0.5.11 を `npx musubix2 init` で導入し、生成された `.mcp.json` の設定コマンド（`./node_modules/.bin/musubix2 mcp`）に対して MCP クライアント相当の完全ハンドシェイク（initialize → initialized → tools/list → tools/call）を実行。**61 ツールの取得と各カテゴリの実データ応答をエンドツーエンドで確認**

### Tests

- 直列化のリグレッションテスト（遅いリクエストが先でも到着順に処理）を追加。全ワークスペース 1693 テスト green

## [0.5.11] - 2026-07-09

MCP ツール実 API 配線・最終回。残る formal-verify / lean / skills を実装し、**ISSUE-18 を完全解決**（全 13 カテゴリ・61 ツールが実パッケージ API で動作）。

### Fixed

- **MCP `formal-verify` / `lean` の5ツールを実 API へ配線** — `verify.ears-to-smt`（`createEarsToSmtConverter` で EARS → SMT-LIB2）、`verify.z3.solve`（`createZ3Adapter().solve`）、`verify.lean.convert`（`createEarsToLeanConverter` で Lean 4 定理生成）、`verify.lean.run`（`createLeanProofRunner`）、`verify.hybrid`（`createHybridVerifier`）。EARS テキストから `ParsedRequirement` / `Specification` を構築（パターンは EARS バリデータで分類）。Z3/Lean ツールチェーン非依存の変換系は完全動作、実行系はツールチェーン有無に応じて結果を返す
- **MCP `skills` の3ツールを実 API へ配線** — サーバーセッション存続の `SkillManager` シングルトンを導入し、`skills.register`（メタデータからスキル登録）→ `skills.list` → `skills.execute`（同一セッション内でスキルを実行）が機能。従来は存在しない `sm.registerSkill?.()` 等で空を返していた

### Milestone

- **MCP catalog の「偽の空成功」問題を完全解消** — 存在しない export への optional-call（`alias.fn?.()`）が 0 になり、全 61 ツールが実 API を呼ぶ

### Known limitations

- MCP stdio トランスポートは受信行を並行処理するため、状態共有ツール（`skills` セッションレジストリ、`ontology`/`workflow`/`knowledge` の永続化）は**応答待ちせず連続送信するとレース**し得る（通常のエージェントは逐次呼出しのため影響なし）
- `verify.z3.solve` / `verify.lean.run` は外部 Z3 / Lean ツールチェーンが必要（未導入時は結果内で通知）

### Tests

- formal-verify（SMT/Lean 変換）・skills（register→execute）の実データ検証テストを追加。全ワークスペース 1692 テスト green

## [0.5.10] - 2026-07-09

MCP ツール実 API 配線・第3弾（ISSUE-18 継続）。research / neural / workflow を実装。

### Fixed

- **MCP `research` の3ツールを実 API へ配線** — `research.query` / `research.iterative` / `research.evidence` を `createResearchEngine`（`research` / `researchIterative`）と `createKnowledgeAccumulator` に配線。提供されたソースに対して実際に調査・要約・確信度・エビデンスを返す
- **MCP `neural` の5ツールを実 API へ配線** — `neural.embed`（TF-IDF）/ `neural.search`（提供ドキュメントを索引し類似検索）/ `neural.patterns.extract`（wake フェーズ）/ `neural.patterns.consolidate`（sleep フェーズ）/ `neural.library.learn`（E-graph ライブラリ学習）。`createNeuralSearchEngine` / `createTfIdfEmbeddingModel` / `createWakePhase` / `createSleepPhase` / `createLibraryLearner` に配線
- **MCP `workflow` の4ツールを実 API へ配線＋永続化** — `workflow.phase.current` / `workflow.phase.transition`（品質ゲート判定付き）/ `workflow.gate.check` / `workflow.approve` を `createStateTracker` / `createPhaseController` に配線し、`<basePath>/.musubix/workflow-state.json` に永続化（CLI と共有）。従来は存在しない `wf.createWorkflowEngine?.()` で空を返していた

### Known Issues

- 残る MCP ツール（`skills` / `formal-verify` / `lean`）は構造化入力や実行モデルの都合で未配線。順次対応予定（0.5.11 以降）。`skills` は SkillManager がインメモリのため MCP 越しの register/execute に設計上の制約あり

### Tests

- research / neural（検索ランキング・ライブラリ学習）/ workflow（承認永続化・ゲート判定）の実データ検証テストを追加。全ワークスペース 1687 テスト green

## [0.5.9] - 2026-07-09

MCP ツール実 API 配線・第2弾（ISSUE-18 継続）。code-analysis と ontology を実装。

### Fixed

- **MCP `code-analysis` の4ツールを実 API へ配線** — `code.parse`（`createASTParser().parse` で実 AST ノード）、`code.graph.build` / `code.graph.search`（`createGraphEngine` + `GraphRAGSearch`、インラインソースを索引して検索）、`code.dfg.analyze`（`createDataFlowAnalyzer().buildDFG`）。従来は存在しない `cg.parseSource?.()` 等を呼び空を返していた
- **MCP `ontology` の5ツールを実 API へ配線＋永続化** — `ontology.triple.add` / `triple.query` / `rules.apply`（OWL 2 RL 推移律推論）/ `consistency.check` / `sparql.query`（パターン検索）。`createOntologyStore` / `createRuleEngine` / `createConsistencyValidator` に配線し、`<basePath>/.musubix/ontology.json` に永続化（CLI と共有）。従来は存在しない `ont.createTripleStore?.()` 等で空を返していた

### Known Issues

- 残る MCP ツール（`research` / `neural` / `formal-verify` / `lean` / `workflow` / `skills` / `wake-sleep` / `library-learner`）は引き続き実 API 配線が必要（0.5.10 以降）
- MCP stdio トランスポートは受信行を並行処理するため、同一クライアントが**状態変更ツールを応答待ちせず連続送信**するとレースし得る（通常のエージェントは逐次呼出しのため影響なし）

### Tests

- code.parse / graph.search、ontology 追加→クエリ→推移律推論の実データ検証テストを追加。全ワークスペース 1681 テスト green

## [0.5.8] - 2026-07-09

MCP ツール監査（ISSUE-18 継続）で判明した「存在しない export を呼び偽の空成功を返すツール群」の実 API 配線を開始。

### Fixed

- **MCP `sdd-core` の8ツールが偽の空/成功を返す問題を修正** — `sdd.requirements.create/validate/list`、`sdd.design.generate/verify`、`sdd.codegen.generate`、`sdd.test.generate`、`sdd.trace.verify` が `core.createRequirement?.()` 等の存在しない関数を呼び、フォールバックの空データを返していた。実 API（`createEARSValidator` / `MarkdownEARSParser` / `createDesignGenerator` / `createSOLIDValidator` / `createCodeGenerator` / `createUnitTestGenerator`）へ配線。`sdd.trace.verify` は渡された要件 ID とソースの `REQ-XXX-NNN` 参照から実カバレッジを算出
- **MCP `decisions.create/list/search` を修正** — 存在しない `dec.createADR?.()` 等を呼んでいたのを `createDecisionManager()` の `load()`＋`create/list/search` に配線（永続化対応）
- **MCP `synthesis.dsl.build/synthesize/version-space` を修正** — 存在しない `syn.buildDSL?.()` 等を、`createDSLBuilder`（ops パイプライン実行）/ `createSynthesisEngine`（例からルール合成）/ `createVersionSpaceManager`（正例・負例から仮説導出）へ配線

### Known Issues

- 残る MCP ツール（`code-analysis` / `ontology` の一部 / `research` / `neural` / `formal-verify` / `lean` / `workflow` / `skills` / `wake-sleep` / `dfg` / `library-learner`）も同様に存在しない export を呼んでおり、順次実 API へ配線予定（0.5.9 以降）

### Tests

- 上記 sdd-core / synthesis / decisions ツールの実データ検証テストを追加。全ワークスペース 1677 テスト green

## [0.5.7] - 2026-07-09

MCP サーバー（Claude Code / GitHub Copilot 統合の主要経路）のドッグフーディングで発見した致命的バグを改修。

### Fixed

- **【重大】MCP サーバー(stdio)が即終了して全く機能しない問題を修正** — `musubix2 mcp` は `initialize` にすら応答せず ~300ms で終了していた。原因は `StdioTransport.start()` が readline 設定後すぐ resolve → `run()` が即 return → CLI の `process.exit()` がサーバーを即座に殺していたこと。`StdioTransport.waitForClose()` を追加し、`mcp` 起動時にクライアント切断（stdin EOF）まで待機してプロセスを生存させる。これにより MCP 統合が実際に動作するようになった（`tools/list` = 61 ツール）
- **MCP `knowledge.entity.get` / `search` / `traverse` が `{}` を返す問題を修正** — 非同期の `store.getEntity/search/traverse` を await しておらず、未解決 Promise をシリアライズしていた（CLI の同種バグと同型）
- **MCP `security.*` ツールが常に空結果を返す問題を修正** — `security.scan` / `secrets.detect` / `taint.analyze` / `compliance.check` が `@musubix2/security` に存在しない関数（`sec.scan?.()` 等）を optional-call し、`?.` で握り潰して偽の空成功を返していた。実 API（`createSecurityScanner` / `createSecretDetector` / `TaintAnalyzer` / `createComplianceChecker`）へ配線し、`code` 引数でソースを直接スキャンできるよう変更

### Known Issues

- 一部の MCP ツール（`synthesis` / `research` / `workflow` / `skills` / `decisions` / `formal-verify` / `neural` / `ontology` 系の一部）は依然として存在しない export を optional-call しており空結果を返す。次リリースで各パッケージ実 API へ順次配線予定

### Tests

- `StdioTransport.waitForClose`、MCP security 実スキャン、knowledge get の round-trip テストを追加。全ワークスペース 1669 テスト green

## [0.5.6] - 2026-07-09

ドッグフーディングで残課題としていた3つの機能ギャップ（スタブ/データ未連携）を実装。

### Added

- **`trace matrix` / `trace:verify` の実データ連携** — 従来は常に空入力で「100%」を返していたが、要件定義書（`storage/specs/requirements.md`、`--specs` で変更可）から `REQ-XXX-NNN` を抽出し、ソース（`--src`、既定 `src`）内の `REQ-` 参照を走査して**要件→コードの実カバレッジ**を算出。未参照要件をギャップとして列挙。`trace:verify --strict` で未カバー時に非ゼロ終了（品質ゲート）
- **`ontology add` / `ontology list` と永続化** — トリプルを追加する CLI が無く `stats` が常に0だった。`ontology add <s> <p> <o>` を追加し、`.musubix/ontology.json` に永続化。`list`/`stats`/`validate` は保存済みトリプルを読み込む（空時は「データ無し」を明示）
- **`synthesis dsl --ops` による実変換** — 従来は入力をそのまま返すだけ（空パイプライン）だった。`--ops trim,camelCase,replace:from:to,...` で変換パイプラインを構築し実行。ops 未指定時は明示エラー（サイレントエコーを廃止）

### Tests

- trace 実カバレッジ・`--strict` ゲート、ontology 永続化、synthesis DSL パイプラインのテストを追加。全ワークスペース 1664 テスト green

## [0.5.5] - 2026-07-09

v0.5.4 の再ドッグフーディングで、残っていたディレクトリ入力クラッシュを改修。

### Fixed

- **`test:gen <dir>` がディレクトリで EISDIR クラッシュする問題を修正** — `readFileSync` 直呼びだったため「`src/` 全体のテスト雛形生成」という自然な用途でクラッシュしていた。`collectFiles()` でディレクトリ配下を走査し、ファイルごとに `// ── <file> ──` ヘッダ付きで雛形を出力（単一ファイル指定時は従来通り）
- **`explain <dir>` の不親切な EISDIR クラッシュを修正** — ディレクトリ指定時に生の `EISDIR`（`❌` プレフィックスも無し）で落ちていた。「explain はファイルかコードスニペットを期待（ディレクトリ不可）」と明示するエラーに変更

### Tests

- test:gen ディレクトリ対応、explain ディレクトリの明示エラーのリグレッションテストを追加。全ワークスペース 1656 テスト green

## [0.5.4] - 2026-07-09

v0.5.3 の再ドッグフーディングで、成功表示するのに実体が伴わない/クラッシュするコマンドを改修。

### Fixed

- **`scaffold package` / `scaffold skill` がファイルを生成していなかった問題を修正** — 「✅ Scaffolded」とツリーを表示するだけで実ファイルを一切作成していなかった。`package.json`/`tsconfig.json`/`src`/`tests`（package）、`skill.json`/`index.ts`/`tests`（skill）を実際に生成するよう実装（既存ディレクトリは上書き拒否）
- **`learn analyze <dir>` がディレクトリで EISDIR クラッシュする問題を修正** — `readFileSync` 直呼びだった。v0.5.2 で追加した `collectFiles()` を用い、ディレクトリ配下を再帰解析
- **`workflow` の承認・遷移状態が CLI 呼び出し間で永続化されない問題を修正** — `handleWorkflow` が毎回新規 `StateTracker` を生成し、`approve`/`transition` の結果を保存していなかった（`status` は常に未承認表示）。`StateTracker` に `toJSON()`/`restore()` を追加し、`.musubix/workflow-state.json` に永続化。`status` 表示もこの状態を読み込む

### Tests

- 上記のリグレッションテスト（scaffold 実ファイル生成・上書き拒否、learn ディレクトリ、workflow 永続化、StateTracker シリアライズ）を追加。全ワークスペース 1654 テスト green

## [0.5.3] - 2026-07-09

v0.5.2 の再ドッグフーディングで、CLI 状態が呼び出し間で永続化されない課題を発見・改修。

### Fixed

- **`knowledge` コマンドが CLI 呼び出し間で永続化されない問題を修正** — `handleKnowledge` が `store.load()` / `store.save()` を呼ばず、async な `putEntity`/`getEntity` 等を await していなかった。このため `put` は「✅ Stored」と表示しても `get` は `{}`（未解決 Promise の stringify）、`stats` は常に 0 件だった。起動時に `load()`、更新後に `save()`、全 async 呼び出しを await するよう修正
- **`decision` コマンドが CLI 呼び出し間で永続化されない問題を修正** — `DecisionManager` は ADR の `.md` を書き出すが `load()` が無く、`list`/`get`/`search` は in-memory Map のみ参照。さらに `counter` が毎回 0 リセットされ、常に `ADR-001` が生成・上書きされていた。`adrs.json` による永続化と `load()` を追加し、`counter` を既存最大 ID から再開。CLI ハンドラで `load()` を呼ぶよう修正

### Tests

- 永続化のリグレッションテスト 10 件を追加（knowledge round-trip、ADR 再読込・採番継続・空ディレクトリ）。musubi 240 + decisions 16 = 256 テスト green

## [0.5.2] - 2026-07-09

v0.5.1 の再ドッグフーディングで発見した、未検証だったコマンド群の課題を改修。

### Fixed

- **`cg index <dir>` がディレクトリでクラッシュする問題を修正** — `readFileSync` を対象パスへ直呼びしていたため、コードベース索引の主用途であるディレクトリ指定が `EISDIR` で失敗していた。再帰走査ヘルパー `collectFiles()` を追加し、ディレクトリ配下の対応拡張子ファイルを全て索引（`node_modules`/`.git`/`dist` 等は除外）
- **`security <dir>` がディレクトリ非対応だった問題を修正** — 同じく `readFileSync` 直呼び。`collectFiles()` で再帰スキャンに対応し、各指摘に `file:line` を付与

### Added

- **`security --fail-on <critical|high|medium|low|info>`** — 指定重大度以上の指摘が存在する場合に非ゼロ終了する品質ゲート（オプトイン。既定は後方互換で exit 0）。CRITICAL 検出でも exit 0 だった問題に対応（Article IX 品質ゲート）

### Changed

- **`trace matrix` / `trace:verify` の0件データ時の表示を是正** — トレース系ハンドラは実データ未連携で常に空入力のため、`Completeness: 100%` / `Requirements: 0/0` / `No gaps found` と誤解を招いていた。データ0件時は「データ無し（N/A）」を明示（実データ連携は今後の課題として明記）

### Tests

- 上記のリグレッションテスト 6 件を追加。musubi パッケージ 233 テスト green

## [0.5.1] - 2026-07-09

Webアプリ開発（TaskFlow）でのドッグフーディングにより発見した CLI パイプラインの課題を改修。

### Fixed

- **エラー時に終了コード 0 を返す問題を修正** — コマンドの `action` クロージャが各ハンドラの戻り値（`ExitCodeValue`）を捨て、`run()` が dispatch 後に常に `SUCCESS` を返していた。ファイル不在（ENOENT）や引数不足でも exit 0 となり CI で検知不能だった。`action` の戻り型を `Promise<ExitCodeValue | void>` にし、`dispatch`→`run` まで終了コードを伝播（全 30 ハンドラ呼び出し・8 usage エラー）
- **文書化されたサブコマンド形式が動かない問題を修正** — `requirements analyze <file>` は "Unknown command"、`design generate <file>` は `generate` をファイル名として開こうとし ENOENT、`codegen generate <file>` は `generate` という名のクラスを生成していた。verb 許容ヘルパー `resolveTarget()` を追加し、`requirements` エイリアスを新設。README / CLAUDE.md / help 記載の全形式が動作
- **要件が解析できない際のサイレント失敗を改善** — `REQ-` を含むが見出し形式でない文書に対し "No requirements found" のみで exit 0 だったのを、必要な文書構造（`## REQ-XXX-000:` 見出し + `**要件**:` フィールド、3文字ドメインコード）を提示し `VALIDATION_ERROR` を返すよう変更

### Added

- **`init` が SDD ワークスペースを雛形生成** — `steering/` と `storage/specs/requirements.md`（パーサー準拠のスターター要件）を非破壊で作成。生成される CLAUDE.md の「ディレクトリ構成」を実 ls 出力から正規の SDD レイアウトに変更
- **CLAUDE.md テンプレートに「要件定義書フォーマット（必須）」節を追加** — パーサーが要求する見出し + フィールド構造を明記（EARS 文パターンのみ記載でパース構造が未文書化だった課題に対応）

### Tests

- CLI 修正のリグレッションテスト 6 件を追加（verb 許容・終了コード伝播・パーサー診断）。musubi パッケージ 227 テスト green

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
