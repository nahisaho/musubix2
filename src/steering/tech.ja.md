# 技術スタック定義

## 言語・ランタイム
- **TypeScript** 5.7+ (strict mode)
- **Node.js** 20+
- **ESM** (type: "module", NodeNext resolution)

## ビルド
- **tsc -b** (Project References, composite, incremental)
- **npm workspaces** (monorepo 管理)

## テスト
- **Vitest** (globals: true, v8 coverage)
- カバレッジ閾値: 80% (lines, branches, functions, statements)
- テストパターン: `*.test.ts`, `*.spec.ts`

## リンター・フォーマッター
- **ESLint** 9+ (flat config)
- **Prettier** 3+ (single quote, trailing comma)

## 依存ライブラリ（予定）
- `commander` — CLI フレームワーク
- `zod` — スキーマバリデーション
- `yaml` — YAML パーサー
- `chalk` — ターミナル色付け
- `@modelcontextprotocol/sdk` — MCP 統合

## 4層アーキテクチャ
```
domain/          → エンティティ、値オブジェクト、インターフェース
application/     → ユースケース、サービス
infrastructure/  → アダプター、ファイル I/O
interface/cli/   → Commander.js コマンド
```

## コーディング規約
- シングルクォート、セミコロン必須
- `argsIgnorePattern: '^_'` で未使用引数許容
- `ActionableError` による修正提案付きエラー
- `registerXCommand(program)` パターンで CLI 登録
