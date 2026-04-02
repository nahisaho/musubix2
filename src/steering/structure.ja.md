# プロジェクト構造定義

## ディレクトリ構成

```
src/
├── .github/                  # AI エージェント設定
│   ├── copilot-instructions.md
│   ├── AGENTS.md
│   ├── agents/
│   └── skills/               # SDD ワークフロースキル
│       ├── requirements-analyst/
│       ├── design-generator/
│       ├── code-generator/
│       ├── test-engineer/
│       ├── traceability-auditor/
│       └── constitution-enforcer/
├── steering/                 # プロジェクトメモリ（Article VI）
│   ├── product.ja.md         # プロダクト定義
│   ├── tech.ja.md            # 技術スタック
│   ├── structure.ja.md       # 本ファイル
│   ├── project.yml           # プロジェクトメタデータ
│   └── rules/
│       └── constitution.md   # 9条憲法（不変）
├── packages/                 # npm workspaces
│   ├── core/                 # SDD エンジン中核
│   ├── knowledge/            # ナレッジグラフ
│   ├── mcp-server/           # MCP サーバー
│   ├── policy/               # 憲法・ポリシー
│   ├── skill-manager/        # スキル管理
│   └── ...
├── package.json              # workspaces root
├── tsconfig.base.json        # 共通コンパイラ設定
├── tsconfig.json             # Project References
├── vitest.config.ts          # テスト設定
├── eslint.config.js          # リンター設定
└── .prettierrc               # フォーマッター設定
```

## パッケージ構成規約

各パッケージは以下の 4層構造に従う:

```
packages/<name>/
├── src/
│   ├── domain/               # エンティティ、値オブジェクト
│   ├── application/          # ユースケース、サービス
│   ├── infrastructure/       # アダプター、外部接続
│   └── interface/
│       └── cli/              # CLI コマンド
│           └── commands.ts
├── tests/
│   ├── domain/
│   ├── application/
│   └── integration/
├── src/index.ts              # 唯一の公開エントリポイント
├── package.json
├── tsconfig.json
└── README.md
```

## 命名規約

- パッケージ名: `@musubix2/<name>` (kebab-case)
- ファイル名: kebab-case (`skill-manager.ts`)
- クラス名: PascalCase (`SkillManager`)
- インターフェース名: PascalCase、接頭辞なし (`Skill`, not `ISkill`)
- 定数: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- 関数名: camelCase (`registerCommand`)
