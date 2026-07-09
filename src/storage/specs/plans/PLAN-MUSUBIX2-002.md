# MUSUBIX2 — デュアルプラットフォームインストール 実装計画書

**文書ID**: PLAN-MUSUBIX2-002
**プロジェクト**: MUSUBIX2
**バージョン**: 0.2.0
**作成日**: 2026-04-05
**ステータス**: Approved
**承認日**: 2026-04-05
**参照要件**: REQ-MUSUBIX2-002 v0.7
**参照設計**: DES-MUSUBIX2-002 v0.5
**ベースライン**: musubix2 v0.3.8（REQ-MUSUBIX2-001 v1.5 完了済み）

---

## 概要

DES-MUSUBIX2-002 v0.5（14 DES 仕様、17 要件）に基づき、`musubix2` パッケージ（`src/packages/musubi`）と `@musubix2/mcp-server` パッケージへデュアルプラットフォーム初期化機能を実装する。
4 層アーキテクチャ（Domain → Infrastructure → Application → Interface）に従い、5 フェーズ・30 タスクで構築する。

## フェーズ構成

### Phase 0: パッケージ基盤準備
> npm 配布構成の拡張、テンプレート資産、ビルドスクリプト変更

| タスクID | タスク | DES | 配置先 | 依存 |
|----------|--------|-----|--------|------|
| P0-01 | `package.json` の `files` に `.claude` を追加、`dependencies` に `@musubix2/mcp-server` を追加、`scripts.postinstall` を追加 | DES-SKL-001, DES-MCP-001, DES-INS-006 | `src/packages/musubi/package.json` | なし |
| P0-02 | `prepublishOnly` スクリプトを拡張：`.claude/skills` を `.github/skills` と同構造でパッケージルートへ同期 | DES-SKL-001 | `src/packages/musubi/scripts/` | P0-01 |
| P0-03 | `.claude/skills/` ディレクトリ作成：既存 `.github/skills/` を Claude 形式に変換した 14 スキル SKILL.md を配置 | DES-SKL-001 | `src/packages/musubi/.claude/skills/` | P0-01 |
| P0-04 | テンプレート資産作成：`src/packages/musubi/src/templates/` に `claude-md.md`, `copilot-instructions.md`, `mcp/copilot.json`, `mcp/claude.json` を配置。ビルド時に `dist/templates/` へコピー | DES-CFG-001 | `src/packages/musubi/src/templates/` | P0-01 |
| P0-05 | スキルマニフェスト生成スクリプト：ビルド時に `.github/skills` と `.claude/skills` を走査し `dist/assets/skills-manifest.json` を生成 | DES-SKL-001 | `src/packages/musubi/scripts/` | P0-03 |

### Phase 1: Domain / Infrastructure 層
> 型定義、ファイル I/O、テンプレートレンダリング、資産カタログ

| タスクID | タスク | DES | 配置先 | 依存 |
|----------|--------|-----|--------|------|
| P1-01 | Domain 型定義：`InitOptions`, `InitSummary`, `PlatformSelection`, `PlatformHints`, `PlannedArtifact`, `InstallPlan`, `GeneratedFile`, `GeneratedDirectory`, `GeneratedArtifacts`, `WorkspaceSnapshot`, `WriteMode`, `WriteOperation`, `WriteSummary`, `InstallContext`, `ProjectContext`, `LaunchDefinition`, `McpConfigDocument`, `InitMode` | DES-INS-001〜006, DES-SAF-001 | `src/packages/musubi/src/domain/install/` | P0-01 |
| P1-02 | `PackageRootLocator`：`import.meta.url` から package root を解決 | DES-CFG-001 | `src/packages/musubi/src/infrastructure/assets/package-root-locator.ts` | P1-01 |
| P1-03 | `PackageAssetCatalog`：`skills-manifest.json` を読み込み、platform 別に `AssetEntry[]` を返す | DES-SKL-001 | `src/packages/musubi/src/infrastructure/assets/package-asset-catalog.ts` | P0-05, P1-02 |
| P1-04 | `TemplateRenderer`：`dist/templates/` のテンプレートへ `ProjectContext` を注入して文字列を返す | DES-CFG-001 | `src/packages/musubi/src/infrastructure/templates/template-renderer.ts` | P1-02 |
| P1-05 | `WorkspaceRootResolver`：`INIT_CWD` → `npm_config_local_prefix` → `cwd` の順で workspace root を解決 | DES-INS-006 | `src/packages/musubi/src/infrastructure/workspace/workspace-root-resolver.ts` | P1-01 |
| P1-06 | `WorkspaceWriter`：一時領域への書き込み → rename 反映、ロールバック、`.bak` バックアップ | DES-INS-004, DES-SAF-001, DES-UPD-001 | `src/packages/musubi/src/infrastructure/workspace/workspace-writer.ts` | P1-01 |

### Phase 2: Application 層
> ビジネスロジック（検出、計画、生成、マージ、設定生成）

| タスクID | タスク | DES | 配置先 | 依存 |
|----------|--------|-----|--------|------|
| P2-01 | `PlatformDetector`：`.vscode/`, `.claude/`, `.musubix-managed`, `claude` コマンド検出 | DES-INS-002 | `src/packages/musubi/src/application/install/platform-detector.ts` | P1-01 |
| P2-02 | `McpLaunchResolver`：ローカル依存優先、npx フォールバック | DES-INS-005 | `src/packages/musubi/src/application/install/mcp-launch-resolver.ts` | P1-01 |
| P2-03 | `McpConfigGenerator`：Copilot 形式（`.vscode/mcp.json`）と Claude 形式（`.mcp.json`）の JSON 生成 | DES-INS-005 | `src/packages/musubi/src/application/install/mcp-config-generator.ts` | P2-02 |
| P2-04 | `WorkspaceMergeService`：`create`/`replace`/`append-section`/`merge-json`/`merge-directory` の計画生成 | DES-SAF-001 | `src/packages/musubi/src/application/install/workspace-merge-service.ts` | P1-01 |
| P2-05 | `ClaudeSkillIndexBuilder`：スキル資産からスキルセクション（名称/概要/起動条件/パス）を生成 | DES-SKL-002 | `src/packages/musubi/src/application/install/claude-skill-index-builder.ts` | P1-03 |
| P2-06 | `CopilotSetupService`：`.github/copilot-instructions.md`, `.github/skills/*`, `.vscode/mcp.json` の成果物を準備 | DES-INS-003 | `src/packages/musubi/src/application/install/copilot-setup-service.ts` | P1-03, P1-04, P2-03, P2-04 |
| P2-07 | `ClaudeSetupTransaction`：`CLAUDE.md`, `.claude/skills/*`, `.mcp.json`, `.musubix-managed` をアトミックに生成（I/O 失敗時ロールバック） | DES-INS-004 | `src/packages/musubi/src/application/install/claude-setup-transaction.ts` | P1-03, P1-04, P1-06, P2-03, P2-04, P2-05 |
| P2-08 | `InstallPlanner`：`PlatformSelection` + `WorkspaceSnapshot` から `InstallPlan` を構築 | DES-INS-001 | `src/packages/musubi/src/application/install/install-planner.ts` | P1-01, P1-03 |
| P2-09 | `UpdateService`：`--update` 時の musubix 管理セクション更新 + `.bak` バックアップ + diff サマリー | DES-UPD-001 | `src/packages/musubi/src/application/install/update-service.ts` | P1-06, P2-04 |

### Phase 3: Interface 層（CLI / postinstall）
> CLI サブコマンド、確認フロー、ドライラン、postinstall、MCP ランチャー

| タスクID | タスク | DES | 配置先 | 依存 |
|----------|--------|-----|--------|------|
| P3-01 | `InitModeResolver`：`--platform`/`--dry-run`/`--update` の有無で `legacy-project-init` と `platform-bootstrap` を分岐 | DES-INS-001 | `src/packages/musubi/src/interface/cli/init-mode-resolver.ts` | P1-01 |
| P3-02 | `ConfirmationResolver`：TTY 対話プロンプト / 非対話時は `{copilot:false,claude:false}` + 警告 | DES-INS-002 | `src/packages/musubi/src/interface/cli/confirmation-resolver.ts` | P1-01 |
| P3-03 | `DryRunReporter`：`WriteOperation[]` を `create/update/skip` 分類し一覧表示 | DES-SAF-002 | `src/packages/musubi/src/interface/cli/dry-run-reporter.ts` | P1-01 |
| P3-04 | `InitCommandHandler`：全サービスの統合オーケストレーター。detect → confirm → plan → render → merge → write / dry-run | DES-INS-001 | `src/packages/musubi/src/interface/cli/init-command-handler.ts` | P2-01〜P2-09, P3-01, P3-02, P3-03 |
| P3-05 | `cli.ts` 拡張：既存 `init` コマンドへ `--platform`, `--dry-run`, `--update` フラグ追加。`InitModeResolver` による分岐を実装 | DES-INS-001 | `src/packages/musubi/src/cli.ts` | P3-01, P3-04 |
| P3-06 | `PostinstallBootstrap`：`MUSUBIX_AUTO_INIT=1` の時だけ `InitCommandHandler.run()` を呼び出し、失敗は警告ログ化 | DES-INS-006 | `src/packages/musubi/src/interface/cli/postinstall-bootstrap.ts` | P1-05, P3-04 |
| P3-07 | `McpCliLauncher`：`musubix2 mcp [--transport stdio|sse] [--port 3100]` サブコマンド。`@musubix2/mcp-server` の `MCPServer` を起動 | DES-MCP-001 | `src/packages/musubi/src/interface/cli/mcp-cli-launcher.ts` | P0-01, P3-08 |
| P3-08 | `SseTransportAdapter`：`--transport sse` 時の HTTP サーバー起動（`/sse`, `/messages`） | DES-MCP-002 | `src/packages/mcp-server/src/infrastructure/sse-transport-adapter.ts` | P0-01 |

### Phase 4: 統合テスト・品質ゲート
> クロスコンポーネント結合テスト、E2E テスト、品質ゲート通過

| タスクID | タスク | DES | 配置先 | 依存 |
|----------|--------|-----|--------|------|
| P4-01 | ユニットテスト完了確認：Phase 1〜3 の全タスクで作成したテストが PASS、カバレッジ 80% 以上 | 全 DES | `src/packages/musubi/tests/`, `src/packages/mcp-server/tests/` | P3-01〜P3-08 |
| P4-02 | E2E テスト：`musubix2 init --platform both --dry-run` → 出力検証、`musubix2 init --platform copilot` → ファイル生成検証、`musubix2 init --platform claude` → アトミック生成検証 | DES-INS-001〜006 | `src/packages/musubi/tests/e2e/` | P4-01 |
| P4-03 | E2E テスト：`musubix2 mcp` → JSON-RPC `tools/list` 応答検証（105+ ツール） | DES-MCP-001 | `src/packages/musubi/tests/e2e/` | P3-07 |
| P4-04 | 品質ゲート通過：`npm run build && npm run typecheck && npm run test` 全 PASS、カバレッジ Stmts/Branch/Funcs ≥ 80% | 全 DES | root | P4-01〜P4-03 |
| P4-05 | `package.json` バージョン更新：`0.3.8` → `0.4.0` | — | `src/packages/musubi/package.json` | P4-04 |
| P4-06 | CHANGELOG, README 更新 | — | `src/packages/musubi/` | P4-05 |

---

## 依存グラフ要約

```
Phase 0 (パッケージ基盤)
    ↓
Phase 1 (Domain / Infrastructure)
    ↓
Phase 2 (Application)
    ↓
Phase 3 (Interface / CLI)
    ↓
Phase 4 (統合テスト / 品質ゲート)
```

全フェーズは順序依存。各フェーズ内タスクは依存列に従って順序実行する。

## トレーサビリティマトリクス

| REQ | DES | タスク |
|-----|-----|--------|
| REQ-INS-001 | DES-INS-001 | P1-01, P2-08, P3-01, P3-04, P3-05 |
| REQ-INS-002 | DES-INS-002 | P1-01, P2-01, P3-02 |
| REQ-INS-003 | DES-INS-003 | P0-04, P1-03, P1-04, P2-03, P2-06 |
| REQ-INS-004 | DES-INS-004 | P0-03, P1-06, P2-05, P2-07 |
| REQ-INS-005 | DES-INS-005 | P2-02, P2-03 |
| REQ-INS-006 | DES-INS-006 | P0-01, P1-05, P3-06 |
| REQ-CFG-001 | DES-INS-004, DES-CFG-001 | P0-04, P1-04, P2-05, P2-07 |
| REQ-CFG-002 | DES-INS-003, DES-CFG-001 | P0-04, P1-04, P2-06 |
| REQ-CFG-003 | DES-INS-005 | P2-03 |
| REQ-SKL-001 | DES-INS-003, DES-SKL-001 | P0-02, P0-05, P1-03, P2-06 |
| REQ-SKL-002 | DES-INS-004, DES-SKL-002 | P2-05, P2-07 |
| REQ-SKL-003 | DES-INS-004, DES-SKL-001 | P0-03, P0-05, P1-03, P2-07 |
| REQ-MCP-001 | DES-MCP-001 | P0-01, P3-07 |
| REQ-MCP-002 | DES-MCP-002 | P3-08 |
| REQ-SAF-001 | DES-SAF-001 | P1-01, P2-04 |
| REQ-SAF-002 | DES-INS-001, DES-SAF-002 | P3-03, P3-04 |
| REQ-UPD-001 | DES-UPD-001 | P1-06, P2-09 |

## 実装方針

- **テストファースト**: 各タスクは Red → Green → Blue サイクルで実装。テストを先に書き、最小限の実装で通す
- **4 層遵守**: domain → infrastructure → application → interface の順で構築し、依存方向を厳守
- **既存資産再利用**: `@musubix2/mcp-server` の MCP 実装、既存 `cli.ts` のコマンドディスパッチャを活用
- **後方互換**: 既存 `musubix init [path]` の動作は一切変更しない。新フラグ検出時のみ新モードへ遷移
- **品質ゲート**: Phase 4 完了時に `npm run build && npm run typecheck && npm run test` が全 PASS、カバレッジ ≥ 80%

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 著者 |
|-----------|------|---------|------|
| 0.3 | 2026-07-09 | REQ-INS-006 改訂に伴い P0-01（postinstall 部分）/P1-05/P3-06 を廃止としてマーク（成果物は削除済み） | MUSUBIX2 |
| 0.2 | 2026-04-05 | レビュー反映: P2-08依存修正(P1-01,P1-03)、P3-07/P3-08依存方向修正、P0-03のDES参照修正 | MUSUBIX2 |
| 0.1 | 2026-04-05 | 初版作成（5 フェーズ、30 タスク） | MUSUBIX2 |
