# Coreclaw Marketplace — Project Instructions

## プロジェクト概要

このリポジトリは Agent Skills のマーケットプレイス配布レイヤーです。
プロジェクトルート直下に `<agent-skills-name>/` としてスキルグループが配置されます。

## ディレクトリ構成

### スイート構成（フルスタック）
Agent Skills スイートは以下の構成で配置すること:

```
<agent-skills-name>/
├── AGENTS.md              # Orchestrator（WHEN/DOルーティング）→ .github/AGENTS.md にデプロイ
├── copilot-instructions.md # スイート固有の規約
├── README.md              # グループ説明
├── group.json             # グループメタデータ
├── skill.json             # パッケージメタデータ
├── .mcp.json              # MCP サーバー設定（必要な場合）
├── agents/                # Custom Agents
│   └── <agent-name>.md
└── skills/                # Sub-skills
    └── <skill-name>/
        ├── SKILL.md       # 必須: メタデータ + 指示内容
        ├── scripts/       # 任意: 実行可能なコード
        ├── references/    # 任意: 参照ドキュメント（条件付き参照）
        └── assets/        # 任意: テンプレート、リソース
```

### ファイル用途ガイド

| ファイル | 用途 | 必須/任意 |
|---------|------|----------|
| `AGENTS.md` | WHEN/DOルーティング、Phase遷移、タスク分類 | スイート必須 |
| `copilot-instructions.md` | スイート固有の規約・品質基準 | 推奨 |
| `SKILL.md` | スキルのメタデータ + 指示内容 | 必須 |
| `scripts/` | バリデーション・変換等の実行可能コード | 必要な場合のみ |
| `references/` | 詳細仕様・定義（条件付き参照で利用） | 大量の参照情報がある場合 |
| `assets/` | 出力テンプレート・雛形 | 定型出力がある場合 |
| `.mcp.json` | MCP サーバー設定 | 外部ツール連携時 |
| `agents/*.md` | Custom Agent ペルソナ定義 | 専門役割が必要な場合 |

### 配置ルール
- **Sub-skills は必ず `skills/` サブディレクトリ配下**に置くこと
- **references/ は条件付き参照**:「いつ読むか」を SKILL.md に明示する
- **assets/ はテンプレート名でマッチング**: 目的に合致するテンプレートのみ使用する

### 開発用ツール（メタスキル）の配置場所
スキル開発支援ツールは `.github/` 配下に配置:

```
.github/
├── skills/                # 開発支援スキル
│   └── <skill-name>/
│       ├── SKILL.md
│       ├── assets/        # テンプレート
│       └── references/    # 仕様参照
├── agents/                # 開発支援 Custom Agents
│   └── <agent-name>.md
└── copilot-instructions.md
```

## Agent Skills 開発規約

### SKILL.md のルール
- `name` と `description` は必須
- `description`: 「何をするか」+「Use when <起動条件>」の2部構成
- 本文は500行（約5,000トークン）以内
- 参照ファイルは条件付き参照（「いつ読むか」を明示）

### AGENTS.md のルール
- WHEN/DO 構文でスキルルーティングを定義
- タスク分類ツリーで判定フローを明示
- Phase 遷移ルールと承認ポイント（⏸️）を定義
- 禁止事項を明記
- 緊急度トリアージを含める

### Purpose Discovery First（必須）
**Agent Skills 開発の開始前に、ユーザー入力の情報充足度を必ず確認すること。**

1. ユーザー入力を8要素（PURPOSE, DOMAIN, AUDIENCE, SCOPE, WORKFLOWS, INTEGRATIONS, REFERENCE MODEL, QUALITY CRITERIA）で評価
2. 5/8以上が明確 → スキル生成に進む
3. 5/8未満 → `purpose-discovery` スキルで1問1答ダイアログ（1問ずつ、最大8ラウンド）
4. 構造化仕様書を生成し、ユーザー承認後にスキル生成を開始

### Harness 最適化 必須パターン
すべてのスキルに以下を含めること:
1. **Gotchas セクション** — 3項目以上の具体的な落とし穴
2. **検証ループ** — バリデーション手順と失敗時のリカバリ
3. **出力テンプレート** — 定型出力がある場合のフォーマット（assets/ に分離可）
4. **Quality Gates** — チェックリスト形式の品質基準

### Post-Generation Harness Check（必須）
**Agent Skills の開発完了後、コミット前に必ず Harness 7軸チェックを実施すること。**

| # | 軸 | 合格基準 | チェック内容 |
|---|-----|---------|------------|
| 1 | Tool Coverage | ≥1 | description起動条件、キーワード重複なし |
| 2 | Context Efficiency | ≥1 | SKILL.md≤500行、条件付き参照 |
| 3 | Quality Gates | ≥1 | 検証ループ + 失敗時リカバリ |
| 4 | Memory Persistence | ≥1 | Gotchas 3+（具体的） |
| 5 | Eval Coverage | ≥1 | 出力検証基準明示 |
| 6 | Security Guardrails | ≥1 | 禁止事項、データルール |
| 7 | Cost Efficiency | ≥1 | 冗長なし、デフォルト明示 |

- **ブロッキング**: いずれかの軸がスコア0 → 修正して再チェック
- **合格**: 全7軸スコア1以上
- **推奨**: 総合 14/21 以上

### Custom Agents のルール
- 読み取り専用の監査 Agent は `tools: [read_file, grep_search, list_directory]` に制限
- オーケストレーション Agent は全ツールアクセス可能
- 各 Agent の対応する Harness 軸を明記

### MCP 連携のルール
- `.mcp.json` にサーバー設定を定義
- スキルの `tu_tools` フロントマターで利用可能ツールを宣言
- MCP 利用不可時のフォールバック手順を記述
- 同時有効化は 10 サーバー以下（Context Efficiency）

### CI/CD
- PR で `<agent-skills-name>/**` が変更されると自動バリデーション
- Git タグ（`<group>/<skill>/v*`）でリリースワークフロー起動
- `registry.json` はリリース時に自動更新

### コーディングスタイル
- スクリプトは Python 3.10+
- YAML フロントマターは `---` で囲む
- Markdown の見出しは `##` から開始（`#` はスキルタイトル用）
