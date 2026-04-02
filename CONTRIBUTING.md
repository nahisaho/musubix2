# コントリビューションガイド

MUSUBIX2 プロジェクトへの貢献ありがとうございます。以下のガイドラインに従ってください。

## 開発環境セットアップ

```bash
# 必要なツール
# - Node.js 20 以上
# - npm

# セットアップ
cd src
npm install
npm run build
npm test
```

## ブランチ戦略

- `main` ブランチは常にデプロイ可能な状態を保つ
- 機能開発は `feature/<機能名>` ブランチで行う
- バグ修正は `fix/<内容>` ブランチで行う
- `main` へのマージは Pull Request 経由で行う

```
feature/add-new-module → main
fix/resolve-error     → main
```

## コーディング規約

- **TypeScript strict モード** を使用（`strict: true`）
- **ESM**（ES Modules）形式でインポート・エクスポートを行う
- テストフレームワークは **Vitest** を使用
- 型定義は明示的に記述し、`any` の使用は避ける

## テストの書き方

テストファースト（TDD）を推奨します。

1. **Red** — 失敗するテストを書く
2. **Green** — テストが通る最小限のコードを書く
3. **Refactor** — コードを整理する

```typescript
import { describe, it, expect } from 'vitest';

describe('MyModule', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

## PR プロセス

1. feature/fix ブランチを作成し、変更をコミットする
2. Pull Request を作成する
3. **CI が全て通ること** が必須
4. 最低 1 名のレビュー承認を得る
5. Squash マージで `main` に統合する

## パッケージ追加手順

モノレポ内に新しいパッケージを追加する場合:

1. `src/packages/` 配下に新しいディレクトリを作成
2. `package.json` と `tsconfig.json` を設定
3. エントリポイントとテストファイルを作成
4. ルートの `package.json` で workspace 参照を設定

## コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/ja/) に従います。

```
<type>(<scope>): <subject>

feat:     新機能
fix:      バグ修正
docs:     ドキュメントのみの変更
style:    コードの意味に影響しない変更（空白、フォーマット等）
refactor: バグ修正や機能追加を伴わないコード変更
test:     テストの追加・修正
chore:    ビルドプロセスやツールの変更
```

例:

```
feat(core): イベント処理モジュールを追加
fix(api): レスポンスのステータスコードを修正
docs: CONTRIBUTING.md を更新
```
