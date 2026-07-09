# MUSUBIX2 — デュアルプラットフォームインストール 機能要件定義書

**文書ID**: REQ-MUSUBIX2-002
**プロジェクト**: MUSUBIX2
**バージョン**: 0.4.0
**作成日**: 2026-04-05
**ステータス**: Approved
**承認日**: 2026-04-05
**準拠規格**: EARS（Easy Approach to Requirements Syntax）
**親文書**: REQ-MUSUBIX2-001 v1.5

---

## 1. 文書概要

### 1.1 目的

 musubix2 npm パッケージを `npm install` と `npx musubix2 init` の最小 2 ステップで、GitHub Copilot（VS Code Agent Mode）と Claude Code の両方に導入可能にする。ユーザーが手動でファイルをコピーしたり、プラットフォーム固有の設定を行う必要をなくす。npm の install ライフサイクルスクリプト（preinstall / postinstall）には依存しない。

### 1.2 スコープ

| 対象 | 内容 |
|------|------|
| IN | npm パッケージ配布物の拡張、`init` によるセットアップ完結、CLAUDE.md 生成、.mcp.json 生成、.claude/ スキル同梱 |
| OUT | VS Code 拡張機能としての配布、Cursor 固有対応、Web UI |

### 1.3 背景

v0.3.8 時点で musubix2 は以下の構成で配布されている：

```
dist/          ← バンドル済み JS
bin/           ← CLI エントリポイント (musubix.mjs)
.github/       ← Copilot Agent Skills (14 skills)
```

Claude Code 向けには `CLAUDE.md`（プロジェクト指示）、`.mcp.json`（MCP サーバー設定）、`.claude/skills/`（Claude スキル）が必要だが、現在は同梱されていない。

### 1.4 プラットフォーム対応マトリクス

| プラットフォーム | 設定ファイル | スキル形式 | MCP 設定 |
|-----------------|-------------|-----------|----------|
| GitHub Copilot (VS Code) | `.github/copilot-instructions.md` | `.github/skills/*/SKILL.md` | `.vscode/mcp.json` |
| Claude Code | `CLAUDE.md` | `.claude/skills/*/SKILL.md` | `.mcp.json` |

---

## 2. 要件一覧

### 2.1 インストーラー（REQ-INS グループ）

#### REQ-INS-001: ワンコマンドインストール

**EARS パターン**: EVENT-DRIVEN
**優先度**: P0

> WHEN ユーザーがプロジェクトルートで `npx musubix2 init` を実行した時、THE システム SHALL プラットフォーム検出を行い、検出されたプラットフォーム向けの設定ファイルとスキルファイルを自動生成する。

**受入基準**:
- `npx musubix2 init` が 10 秒以内に完了する
- 既存ファイルを上書きしない（`--force` フラグなし時）
- 実行結果のサマリーを stdout に表示する

---

#### REQ-INS-002: プラットフォーム自動検出

**EARS パターン**: EVENT-DRIVEN
**優先度**: P0

> WHEN `musubix2 init` が実行された時、THE システム SHALL 以下の手がかりからプラットフォームを自動検出する：
> - `.vscode/` ディレクトリの存在 → GitHub Copilot
> - `.claude/` ディレクトリの存在 → Claude Code
> - 上記のプロジェクト内手がかりが存在せず、かつ `claude` コマンドが存在する → Claude Code 利用可能候補
> - 両方存在する場合 → デュアルモード

**受入基準**:
- 検出結果を `{ copilot: boolean, claude: boolean }` 形式で返す
- `--platform auto|copilot|claude|both` フラグで明示指定可能
- `musubix2 init` 自体が生成した `.claude/` は検出根拠から除外する（`.claude/.musubix-managed` マーカーファイルで判定）
- `claude` コマンド検出のみでは自動的に `claude: true` を確定せず、初期検出結果は `{ copilot: false, claude: false }` のままユーザー確認にフォールバックする
- 検出不可時はユーザーに選択を促す

---

#### REQ-INS-003: Copilot 向けセットアップ

**EARS パターン**: COMPLEX
**優先度**: P0

> IF プラットフォーム検出結果に `copilot: true` が含まれる場合、THEN THE システム SHALL 以下のファイルを生成する：
> - `.github/copilot-instructions.md`（プロジェクト指示）
> - `.github/skills/*/SKILL.md`（14 Agent Skills）
> - `.vscode/mcp.json`（MCP サーバー設定）

**受入基準**:
- 生成されるスキル数が 14 以上
- `.vscode/mcp.json` に musubix2 MCP サーバーの stdio 設定が含まれる
- 既存の `.github/copilot-instructions.md` がある場合、musubix セクションのみ追記する
- 既存の `.vscode/mcp.json` がある場合、`musubix2` サーバーエントリのみ追加・更新する

---

#### REQ-INS-004: Claude Code 向けセットアップ

**EARS パターン**: COMPLEX
**優先度**: P0

> IF プラットフォーム検出結果に `claude: true` が含まれる場合、THEN THE システム SHALL 以下のファイルをアトミックに生成する：
> - `CLAUDE.md`（プロジェクト指示）
> - `.claude/skills/*/SKILL.md`（14 Agent Skills）
> - `.mcp.json`（MCP サーバー設定）

**受入基準**:
- `CLAUDE.md` に SDD ワークフロー指示、9 条憲法、プロジェクト構成が含まれる
- `.claude/skills/` に 14 スキル分の SKILL.md が配置される
- `.mcp.json` に musubix2 MCP サーバーの stdio 設定が含まれる
- `.mcp.json` と `.claude/skills/` は同一実行で同時に生成される（片方だけの生成は禁止）
- I/O 失敗（権限不足、ディスクフル等）により 1 つでも書き込めない場合、対象 3 成果物は全て未変更のままロールバックする。既存ファイルへの追記・マージ操作は I/O 失敗には該当しない
- 既存の `CLAUDE.md` がある場合、musubix セクションのみ追記する
- 既存の `.mcp.json` がある場合、`musubix2` サーバーエントリのみ追加・更新する

---

#### REQ-INS-005: MCP サーバー設定生成

**EARS パターン**: EVENT-DRIVEN
**優先度**: P0

> WHEN `musubix2 init` がMCPサーバー設定を生成する時、THE システム SHALL プラットフォームに応じた正しい MCP 設定ファイルを生成する：
> - Copilot 向け: `.vscode/mcp.json` 形式
> - Claude Code 向け: `.mcp.json` 形式

**受入基準**:
- 設定ファイルは以下の優先順位で起動定義を生成する:
	1. ローカル依存が存在する場合: command=`./node_modules/.bin/musubix2`, args=`["mcp"]`
	2. ローカル依存が存在しない場合: command=`npx`, args=`["musubix2", "mcp"]`
- 両形式とも command と args を分離した JSON 表現で出力する（形式差分は REQ-CFG-003 を参照）
- 上記のどちらでも stdio トランスポートで起動できる
- 105+ ツールが MCP 経由で利用可能

---

#### REQ-INS-006: install ライフサイクルスクリプト非依存

**EARS パターン**: UNWANTED
**優先度**: P1

> THE システム SHALL NOT npm の install ライフサイクルスクリプト（preinstall / postinstall）でセットアップ処理を実行しない。すべてのセットアップは `npx musubix2 init` で完結する。

**受入基準**:
- `package.json` の `scripts` に `preinstall` / `postinstall` が存在しない
- `npm install musubix2` はファイル生成・環境変更を一切行わない
- `npx musubix2 init` 単体でプラットフォーム検出からファイル生成まで完結する

> 改訂履歴: v1.1 で「postinstall 自動セットアップ（`MUSUBIX_AUTO_INIT=1` オプトイン）」から本要件に置換。
> npm が install ライフサイクルスクリプトを非推奨化したことに伴う変更。

---

### 2.2 設定ファイル生成（REQ-CFG グループ）

#### REQ-CFG-001: CLAUDE.md テンプレート生成

**EARS パターン**: EVENT-DRIVEN
**優先度**: P0

> WHEN Claude Code 向けセットアップが実行された時、THE システム SHALL プロジェクトコンテキストを反映した `CLAUDE.md` を生成する。

**受入基準**:
- SDD ワークフロー強制ルール（5 Phase）が記載される
- 9 条憲法が記載される
- ディレクトリ構成がプロジェクトから自動推定される
- EARS 要件構文ガイドが含まれる

---

#### REQ-CFG-002: copilot-instructions.md テンプレート生成

**EARS パターン**: EVENT-DRIVEN
**優先度**: P0

> WHEN Copilot 向けセットアップが実行された時、THE システム SHALL プロジェクトコンテキストを反映した `.github/copilot-instructions.md` を生成する。

**受入基準**:
- 内容は CLAUDE.md と同等のプロジェクト指示を含む
- Copilot Agent Mode 固有のスキル参照セクションが含まれる

---

#### REQ-CFG-003: MCP 設定フォーマット対応

**EARS パターン**: UBIQUITOUS
**優先度**: P0

> THE システム SHALL Copilot 形式（`.vscode/mcp.json`）と Claude Code 形式（`.mcp.json`）の両方の MCP 設定フォーマットを生成できる。

**備考**: 起動コマンドの解決規則と優先順位は REQ-INS-005 が定義し、本要件は出力 JSON の形式差分を対象とする。

**受入基準**:
- Copilot 形式: `{ "servers": { "musubix2": { "type": "stdio", "command": "...", "args": [...] } } }` または同等の互換表現
- Claude 形式: `{ "mcpServers": { "musubix2": { "command": "...", "args": [...] } } }`

---

### 2.3 スキル配布（REQ-SKL グループ）

#### REQ-SKL-001: Copilot Agent Skills パッケージング

**EARS パターン**: UBIQUITOUS
**優先度**: P0

> THE システム SHALL npm パッケージに `.github/skills/` ディレクトリを同梱し、`musubix2 init` 時にプロジェクトへコピーする。

**受入基準**:
- 14 スキル（orchestrator, requirements-analyst, design-generator, code-generator, test-engineer, constitution-enforcer, traceability-auditor, review-orchestrator, skill-scaffolder, orchestrator-designer, description-optimizer, purpose-discovery, gotchas-curator, harness-auditor）が配布される
- SKILL.md と scripts/ が各スキルに含まれる
- 既存の `.github/skills/` が存在する場合は差分マージし、同名スキルは `--force` 指定時のみ上書きする

---

#### REQ-SKL-002: Claude Code 用指示変換

**EARS パターン**: EVENT-DRIVEN
**優先度**: P1

> WHEN Claude Code 向けセットアップが実行された時、THE システム SHALL Copilot Agent Skills の SKILL.md をベースに、各スキルの概要と起動条件を `CLAUDE.md` のスキルセクションに統合する。

**備考**: 個別スキルファイルの配置は REQ-SKL-003 / REQ-INS-004 が担当する。本要件は CLAUDE.md 内のスキル索引セクション生成を対象とする。

**受入基準**:
- 14 スキルの名称・概要・起動条件が CLAUDE.md のスキルセクションに含まれる
- 各スキルから `.claude/skills/<name>/SKILL.md` へのパス参照が記載される
- Claude Code のカスタムスラッシュコマンド形式に対応

---

#### REQ-SKL-003: Claude Skills パッケージング

**EARS パターン**: UBIQUITOUS
**優先度**: P0

> THE システム SHALL npm パッケージに `.claude/skills/` ディレクトリを同梱し、`musubix2 init` 時にプロジェクトへコピーする。

**受入基準**:
- `.claude/skills/*/SKILL.md` が 14 スキル分以上配布される
- 各スキルに参照アセット（scripts または references）が含まれる
- 既存の `.claude/skills/` が存在する場合は差分マージし、同名スキルは `--force` 指定時のみ上書きする
- `.mcp.json` が生成される場合、`.claude/skills/` も同一実行で生成または更新される

---

### 2.4 MCP サーバー CLI（REQ-MCP グループ）

#### REQ-MCP-001: MCP サーバー CLI エントリポイント

**EARS パターン**: EVENT-DRIVEN
**優先度**: P0

> WHEN ユーザーが `npx musubix2 mcp` を実行した時、THE システム SHALL stdio トランスポートで MCP サーバーを起動し、105+ ツールを公開する。

**受入基準**:
- `musubix2 mcp` で MCP サーバーが起動する
- JSON-RPC over stdio で通信可能
- `tools/list` で 105+ ツールが列挙される
- 起動から 3 秒以内に最初のリクエストを受付可能

---

#### REQ-MCP-002: MCP サーバー SSE モード

**EARS パターン**: OPTIONAL
**優先度**: P2

> WHERE SSE モードが要求された場合、THE システム SHALL `musubix2 mcp --transport sse --port <port>` で HTTP SSE トランスポートを提供する。

**受入基準**:
- `--transport sse` フラグで SSE モードに切替可能
- デフォルトポートは 3100

---

### 2.5 安全性（REQ-SAF グループ）

#### REQ-SAF-001: 既存ファイル保護

**EARS パターン**: UNWANTED
**優先度**: P0

> THE システム SHALL NOT `--force` フラグなしで既存の設定ファイルを全体上書きする。

**備考**: 追記（musubix セクション追加）やエントリマージ（MCP サーバーエントリ追加）は「上書き」に該当しない。各要件の受入基準で定義された追記・マージ操作は `--force` なしでも実行される。

**受入基準**:
- 既存ファイルの全体上書きが必要な場合はスキップし、警告メッセージを表示する
- `--force` フラグ指定時のみ全体上書きを許可する
- 追記・マージ操作はファイル保護の対象外とする

---

#### REQ-SAF-002: ドライラン

**EARS パターン**: OPTIONAL
**優先度**: P1

> WHERE `--dry-run` フラグが指定された場合、THE システム SHALL ファイルシステムへの書き込みを行わず、生成予定のファイル一覧のみを表示する。

**受入基準**:
- `musubix2 init --dry-run` で生成予定ファイルが一覧表示される
- ファイルシステムが変更されない

---

### 2.6 アップデート（REQ-UPD グループ）

#### REQ-UPD-001: バージョンアップ対応

**EARS パターン**: EVENT-DRIVEN
**優先度**: P1

> WHEN ユーザーが `musubix2 init --update` を実行した時、THE システム SHALL 既存の設定ファイルを最新バージョンのテンプレートで更新する。

**受入基準**:
- ユーザーカスタマイズ部分を保持したまま musubix セクションのみ更新する
- 更新前のファイルを `.bak` 拡張子でバックアップする
- diff サマリーを表示する

---

## 3. 要件マトリクス

| ID | 名称 | パターン | 優先度 | グループ |
|----|------|---------|--------|---------|
| REQ-INS-001 | ワンコマンドインストール | EVENT-DRIVEN | P0 | インストーラー |
| REQ-INS-002 | プラットフォーム自動検出 | EVENT-DRIVEN | P0 | インストーラー |
| REQ-INS-003 | Copilot 向けセットアップ | COMPLEX | P0 | インストーラー |
| REQ-INS-004 | Claude Code 向けセットアップ | COMPLEX | P0 | インストーラー |
| REQ-INS-005 | MCP サーバー設定生成 | EVENT-DRIVEN | P0 | インストーラー |
| REQ-INS-006 | postinstall 自動セットアップ | EVENT-DRIVEN | P1 | インストーラー |
| REQ-CFG-001 | CLAUDE.md テンプレート | EVENT-DRIVEN | P0 | 設定ファイル |
| REQ-CFG-002 | copilot-instructions.md テンプレート | EVENT-DRIVEN | P0 | 設定ファイル |
| REQ-CFG-003 | MCP 設定フォーマット | UBIQUITOUS | P0 | 設定ファイル |
| REQ-SKL-001 | Copilot Skills パッケージング | UBIQUITOUS | P0 | スキル配布 |
| REQ-SKL-002 | Claude Code 用指示変換 | EVENT-DRIVEN | P1 | スキル配布 |
| REQ-SKL-003 | Claude Skills パッケージング | UBIQUITOUS | P0 | スキル配布 |
| REQ-MCP-001 | MCP サーバー CLI | EVENT-DRIVEN | P0 | MCP |
| REQ-MCP-002 | MCP SSE モード | OPTIONAL | P2 | MCP |
| REQ-SAF-001 | 既存ファイル保護 | UNWANTED | P0 | 安全性 |
| REQ-SAF-002 | ドライラン | OPTIONAL | P1 | 安全性 |
| REQ-UPD-001 | バージョンアップ対応 | EVENT-DRIVEN | P1 | アップデート |

### 優先度分布

| 優先度 | 件数 | 要件 |
|--------|------|------|
| P0 | 12 | REQ-INS-001〜005, REQ-CFG-001〜003, REQ-SKL-001, REQ-SKL-003, REQ-MCP-001, REQ-SAF-001 |
| P1 | 4 | REQ-INS-006, REQ-SKL-002, REQ-SAF-002, REQ-UPD-001 |
| P2 | 1 | REQ-MCP-002 |
| **計** | **17** | |

---

## 4. 前提条件と制約

### 4.1 前提条件

- Node.js >= 20
- npm >= 10
- musubix2 v0.3.8（REQ-MUSUBIX2-001 v1.5 準拠）が基盤

### 4.2 制約

- npm パッケージサイズ: 500KB 以下（現在 215KB）
- テンプレートファイルは `dist/templates/` にバンドルする
- MCP サーバーは既存の `@musubix2/mcp-server` パッケージを利用する

### 4.3 互換性

| 項目 | 対応バージョン |
|------|---------------|
| VS Code | 1.99+ |
| GitHub Copilot Chat | 0.25+ |
| Claude Code | 1.0+ |
| Node.js | >= 20 |

---

## 5. 用語集

| 用語 | 定義 |
|------|------|
| Agent Skills | VS Code Copilot Agent Mode のスキル定義（SKILL.md + scripts/） |
| CLAUDE.md | Claude Code のプロジェクトレベル指示ファイル |
| MCP | Model Context Protocol — AI ツール間の標準通信プロトコル |
| stdio | 標準入出力を使ったプロセス間通信 |
| SSE | Server-Sent Events — HTTP ベースの一方向ストリーミング |

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 著者 |
|-----------|------|---------|------|
| 1.1 | 2026-07-09 | REQ-INS-006 改訂: postinstall 自動セットアップを廃止し「install ライフサイクルスクリプト非依存」（UNWANTED）に置換、目的/スコープから auto-init を除去 | MUSUBIX2 |
| 0.7 | 2026-04-05 | 再レビュー反映: 目的を install+init / auto-init に整合化、REQ-INS-002 に auto フラグ追加、Claude候補検出時の初期返却値を明確化 | MUSUBIX2 |
| 0.6 | 2026-04-05 | 再々レビュー反映: アトミック中断条件をI/O失敗に限定、MCP設定のマージ動作追加、SKL-001にマージ動作追加、SAF-001の追記/マージ除外明記、INS-005の曖昧表現修正 | MUSUBIX2 |
| 0.5 | 2026-04-05 | 再レビュー反映: Claude検出の誤検知抑制、REQ-INS-004のアトミック失敗条件明確化、REQ-INS-005/REQ-CFG-003のcommand/args整合化 | MUSUBIX2 |
| 0.4 | 2026-04-05 | C1: REQ-INS-004に.claude/skills追加、C2: REQ-MCP-001の責務整理、C3: INS-003/004をCOMPLEXに修正、M1: 循環検出対策、M2: SKL-002役割明確化 | MUSUBIX2 |
| 0.3 | 2026-04-05 | MCP利用時に .claude/skills を同時展開する要件を REQ-SKL-003 / REQ-MCP-001 に追加 | MUSUBIX2 |
| 0.2 | 2026-04-05 | レビュー反映: 集計修正、REQ-INS-006/REQ-SKL-003追加、MCP起動規則明確化、UNWANTED表現修正 | MUSUBIX2 |
| 0.1 | 2026-04-05 | 初版作成（15 要件） | MUSUBIX2 |
