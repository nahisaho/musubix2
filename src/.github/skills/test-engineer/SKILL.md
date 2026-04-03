---
name: test-engineer
description: >
  テストファースト（Red→Green→Blue）サイクルを強制し、ユニットテスト生成、
  カバレッジ検証、EARS ID リンケージを実行する。Vitest ベース。
  Use when creating tests, checking coverage, enforcing test-first policy,
  running quality gates, or validating Article III compliance.
license: MIT
version: "1.0.0"
triggers:
  - テスト作成
  - テスト実行
  - カバレッジ
  - Red-Green-Blue
  - test-first
  - Article III
---

# Test Engineer

テストファースト（Red→Green→Blue）開発サイクルを強制するスキル。
Article III（テストファースト）と Article IX（品質ゲート）の執行者。

## 前提条件

- `steering/` を参照済みであること
- Vitest が設定済みであること（`vitest.config.ts`）
- テスト対象の DES 仕様が存在すること

## Red→Green→Blue サイクル

```
1. RED:   失敗するテストを書く（EARS 要件 ID をテスト名に含む）
2. GREEN: テストが通る最小限のコードを書く
3. BLUE:  リファクタリング（テストは緑のまま）
```

**このサイクルの順序をスキップしてはならない。**

## ワークフロー

### 1. テスト生成

```
WHEN ユーザーがテスト生成を要求する:
1. DES 仕様の受入基準を解析
2. UnitTestGenerator で Vitest テストケースを生成
3. 各テストに EARS 要件 ID をリンク: describe('REQ-XXX-NNN: ...')
4. CoverageReporter でカバレッジ目標を設定
```

**CLI**: `npx musubix codegen test <design-file>`

### 2. カバレッジ検証

```
WHEN ユーザーがカバレッジ確認を要求する:
1. Vitest カバレッジレポートを取得
2. CoverageGateConfig の閾値（80%）と比較
3. 未カバーの EARS 要件を検出
4. 不足テストの提案を生成
```

**CLI**: `npx vitest run --coverage`

### 3. 品質ゲートチェック

```
WHEN Phase 遷移時に品質ゲートを実行する:
1. QualityGateRunner で全ゲートを実行
2. テストカバレッジ ≥ 80%
3. 全 EARS 要件に対応するテストが存在
4. 全テストが PASS
5. 結果をレポート
```

## テストファイル配置

```
packages/<name>/tests/
├── domain/
│   └── <Entity>.test.ts
├── application/
│   └── <Service>.test.ts
└── integration/
    └── <Feature>.integration.test.ts
```

## テスト命名規約

```typescript
describe('REQ-XXX-NNN: 要件タイトル', () => {
  it('should <期待動作> when <条件>', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Vitest 設定基準

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

## 品質ゲート

- [ ] テストカバレッジ 80% 以上（lines, functions, branches, statements）
- [ ] 全 EARS 要件に少なくとも1つのテストが対応
- [ ] テスト名に REQ ID がリンクされている
- [ ] Red→Green→Blue の順序が守られている
- [ ] 全テストが PASS

## Gotchas

1. **テストなしのコミット禁止**: Article III により、テストのないコードは Phase 4 完了の品質ゲートを通過できない。
2. **モック依存の分離**: `SkillTestHarness` パターンに従い、外部依存はモック注入する。テスト内で直接ファイルシステムにアクセスしない。
3. **EARS ID リンクの維持**: テスト名を変更する場合、REQ ID リンクも必ず更新する。`traceability-auditor` で検証可能。

## スクリプト

| スクリプト | 説明 | 使い方 |
|-----------|------|--------|
| `scripts/generate.sh` | テスト生成 | `./scripts/generate.sh [args]` |
