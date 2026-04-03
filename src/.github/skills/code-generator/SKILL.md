---
name: code-generator
description: >
  設計仕様からテンプレートベースのコード生成、ドメインスキャフォールド、
  静的解析、ステータス遷移分析を実行する。4層アーキテクチャ準拠。
  Use when generating code from design specs, scaffolding domain packages,
  running static analysis, or starting SDD Phase 4 implementation.
license: MIT
version: "1.0.0"
triggers:
  - コード生成
  - スキャフォールド
  - 静的解析
  - Phase 4 開始
  - codegen
---

# Code Generator

設計仕様から 4層アーキテクチャ準拠のコードを生成するスキル。
SDD ワークフロー Phase 4（Implementation）の中核。

## 前提条件

- Phase 3（Tasks）が承認済みであること
- `steering/` を参照済みであること
- 設計文書（`storage/specs/DES-*.md`）が存在すること

## ワークフロー

### 1. コード生成

```
WHEN ユーザーがコード生成を要求する:
1. DES 仕様から TypeScript インターフェースを抽出
2. CodeGenerator.generate() でテンプレートベース生成
3. 4層構成で出力:
   - domain/     → インターフェース、エンティティ、値オブジェクト
   - application/ → ユースケース、サービス
   - infrastructure/ → アダプター、ファイル I/O
   - interface/cli/ → Commander.js コマンド
4. EARS 要件 ID をコメントとしてリンク
```

**CLI**: `npx musubix codegen generate <design-file>`

### 2. ドメインスキャフォールド

```
WHEN ユーザーが新規パッケージのスキャフォールドを要求する:
1. ScaffoldGenerator で3モードから選択:
   - minimal: domain/ + tests/ のみ
   - standard: 4層 + package.json + tsconfig.json
   - full: standard + CLI + README + CHANGELOG
2. ディレクトリ構造を生成
3. package.json に workspace 参照を追加
```

**CLI**: `npx musubix codegen scaffold <package-name> [--mode minimal|standard|full]`

### 3. 静的解析

```
WHEN ユーザーが静的解析を要求する:
1. StaticAnalyzer で複雑度・結合度を計測
2. QualityMetricsCalculator でメトリクスを算出
3. codegraph の ASTParser と連携
```

**CLI**: `npx musubix codegen analyze <path>`

### 4. ステータス遷移分析

```
WHEN ユーザーがステータス遷移の分析を要求する:
1. StatusTransitionGenerator でドメインモデルの状態遷移を抽出
2. 状態遷移図（Mermaid stateDiagram）を生成
3. 不正遷移の検出
```

**CLI**: `npx musubix codegen status <entity>`

## パッケージ構成テンプレート

```
packages/<name>/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── interfaces/
│   ├── application/
│   │   └── services/
│   ├── infrastructure/
│   │   └── adapters/
│   └── interface/
│       └── cli/
│           └── commands.ts    # registerXCommand(program)
├── tests/
│   ├── domain/
│   ├── application/
│   └── integration/
├── package.json
├── tsconfig.json
└── README.md
```

## CLI コマンド登録パターン

```typescript
import { Command } from 'commander';

export function registerXCommand(program: Command): void {
  const cmd = program.command('x');
  cmd.command('subcommand')
    .description('...')
    .option('--flag <value>', '...')
    .action(async (options) => {
      // implementation
    });
}
```

## 品質ゲート

- [ ] 生成コードが `tsc --noEmit` でエラーなし
- [ ] 4層アーキテクチャに準拠（domain が infrastructure に依存しない）
- [ ] CLI コマンドが `registerXCommand` パターンに従う
- [ ] EARS 要件 ID がコード内コメントにリンク
- [ ] package.json の依存が workspace プロトコルを使用

## Gotchas

1. **ESM 必須**: `type: "module"` を package.json に設定。`import` 文に `.js` 拡張子を付けること（TypeScript でもビルド後のパスを指定）。
2. **依存性逆転の徹底**: `domain/` 内で `infrastructure/` の具象クラスを import してはならない。必ずインターフェースを経由。
3. **ActionableError の使用**: 標準 Error ではなく `ActionableError` を使用し、ユーザーへの修正提案を含める。

## スクリプト

| スクリプト | 説明 | 使い方 |
|-----------|------|--------|
| `scripts/generate.sh` | 設計からコード生成 | `./scripts/generate.sh [args]` |
| `scripts/scaffold.sh` | プロジェクト構造スキャフォールド | `./scripts/scaffold.sh [args]` |
| `scripts/explain.sh` | コード説明 | `./scripts/explain.sh [args]` |
| `scripts/synthesis.sh` | プログラム合成 | `./scripts/synthesis.sh [args]` |
