# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
