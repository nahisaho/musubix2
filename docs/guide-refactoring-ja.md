# MUSUBIX2 アプリ開発ガイド ② — 既存アプリのリファクタリング（CodeGraph 分析）

このガイドは、**既存のコードベースを CodeGraph（`cg`）で分析** し、循環依存・
レイヤリング違反・リライト候補を特定して安全にリファクタリングする手順を、実際の
コマンドと出力とともに解説します。

> このガイド内のコマンド出力は MUSUBIX2 `v0.5.67` で実際に実行して取得したものです。

---

## 0. CodeGraph とは

CodeGraph はソースコードから **シンボル・ファイルレベルの依存グラフ** を構築し、
分析・診断・可視化・CI ゲーティングを行うツールです。多言語対応
（C, C++, TypeScript, JavaScript, Python, Java, Go, Rust, Ruby, PHP ほか）で、
以下を抽出します。

- **定義** — 関数・メソッド、および型定義（struct/enum、class/interface、trait、
  module）。メソッドは所有型にネストされます。
- **import エッジ** — `import` / `#include` / `use` …（ファイル → モジュール）
- **call エッジ** — ファイルをまたぐ関数・メソッド呼び出し（一意名で定義元へ解決）

グラフは `.musubix/codegraph.json` に永続化され、以降の分析はこれを参照します。

**いつ使うか**: 大規模化したコードの依存構造を把握したい、循環依存を潰したい、
特定モジュールを別言語に書き換えたい（例: TS → Rust）、アーキテクチャ ルールを
CI で守りたい、といった場面です。

---

## 例題：レイヤリングが崩れた「レガシー」アプリ

本ガイドでは、4 ファイルの小さな TypeScript アプリを題材にします。`api → service
→ db` の想定に反して `db` と `notify` が相互参照する **循環依存** を含みます。

```
src/
├── api.ts       … handleOrder() → OrderService
├── service.ts   … OrderService.place() → save(), notify()
├── db.ts        … save() → audit()          （notify.ts を import）
└── notify.ts    … notify(), audit() → save() （db.ts を import） ← 循環！
```

---

## 1. インデックス作成

まずコードをインデックスします。

```bash
musubix cg index src
```

```
✅ Indexed src: 4 file(s), 11 nodes, 10 edges
   Saved to .musubix/codegraph.json
```

### 全体像の把握

```bash
musubix cg stats
```

```
Nodes: 11
Edges: 10
Languages: typescript
Files: 4
Node kinds: import=5, function=4, class=1, method=1
Edge kinds: imports=5, calls=5
Top called functions:
  save — 2 caller(s)
  place — 1 caller(s)
  audit — 1 caller(s)
  notify — 1 caller(s)
```

`save` が最も呼ばれている（2 箇所）＝変更時の影響が大きいホットスポットです。

---

## 2. 循環依存の検出

リファクタリングで最初に潰すべきは循環依存です。

```bash
musubix cg cycles
```

```
Found 1 dependency cycle(s):

  Cycle 1 (2 files):
    ↻ src/db.ts
    ↻ src/notify.ts
```

`db.ts ↔ notify.ts` の循環が見つかりました。`db` が `notify` の `audit` を、
`notify` が `db` の `save` を参照しているためです。**共通の依存を第 3 の
モジュール（例: `logger.ts`）へ抽出** するのが定石です。

---

## 3. 依存関係の可視化

### あるファイルの依存

```bash
musubix cg deps service
```

```
Dependencies (4 edges across 1 file(s)):
  src/service.ts
    → ./db
    → ./notify
    → notify() [call]
    → save() [call]
```

### 2 点間の依存経路

```bash
musubix cg path api db
```

```
Dependency path (2 hop(s)):
  ◉ src/api.ts
  → src/service.ts
  → src/db.ts
```

`api` は `service` 経由で `db` に依存している、と経路が分かります。

### グラフのエクスポート（Graphviz）

```bash
musubix cg export --format dot --out graph.dot
dot -Tsvg graph.dot -o graph.svg     # Graphviz で画像化
```

```
digraph codegraph {
  rankdir=LR;
  node [shape=box, fontsize=10];
  "src/api.ts" [label="api.ts"];
  …
}
```

`--format json` で機械可読な出力、`--cluster` でディレクトリ単位のクラスタリングも
可能です。

---

## 4. 影響範囲分析

あるモジュールを変更したときに壊れうる範囲を調べます。

```bash
musubix cg impact db
```

```
Impact of 1 file(s) matching 'db':
  ⦿ src/db.ts

  2 direct dependent(s):
    ← src/notify.ts
    ← src/service.ts

  1 indirect (transitive) dependent(s):
    …
```

`db.ts` を変更すると `notify` と `service` が直接、`api` が推移的に影響を受けます。
`--depth N` で推移の深さを制限、`--direct` で直接依存のみ、`--json` で機械可読
出力にできます。リファクタリング前に「どこまでテストすべきか」を見積もれます。

---

## 5. リライト候補の特定

モジュールを切り出して書き換える（例: TS → Rust）際、**自己完結度が高く・利用され・
循環に絡まない** ファイルほど良い候補です。CodeGraph はこれをスコア化します。

```bash
musubix cg candidates 3
```

```
Rewrite candidates (top 3 of 3, by self-containment × usage, minus cycle entanglement):
    score   fns  deps  users   cyc  file
      1.0     2     2      2     1  src/notify.ts
      0.8     1     2      2     1  src/db.ts
      0.3     1     2      0     0  src/api.ts
```

`score = (関数数 + 利用者数) / (依存数 + 1) − 循環ペナルティ`。ここでは `notify.ts`
が最有力ですが `cyc=1`（循環に絡む）なので、**まず循環を解消してから** 切り出すのが
安全、と読み取れます。

---

## 6. アーキテクチャ ゲート（CI）

分析結果を CI の合否条件にできます。**循環ゼロ** を強制する例:

```bash
musubix cg gate --max-cycles 0
```

```
  ❌ cycles ≤ 0 — 1 dependency cycle(s)
       [2] src/db.ts, …

❌ Gate failed: 1/1 check(s) violated.
# 終了コード: 1（CI が失敗する）
```

**レイヤリング ルール**（`api` は `db` を直接 import してはならない）を強制する例:

```bash
musubix cg gate --max-cycles 5 --forbid "api:db"
```

```
  ✅ cycles ≤ 5 — 1 dependency cycle(s)
  ✅ forbid api → db — 0 forbidden edge(s)

✅ Gate passed (2 check(s)).
```

`--forbid "A:B[,C:D]"` で「A が B を import してはならない」という禁止エッジを
複数指定できます。CI では終了コードでビルドを制御します。

### GitHub Actions への組み込み例

```yaml
name: Architecture Gate
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx musubix2 cg index src
      - run: npx musubix2 cg gate --max-cycles 0 --forbid "ui/:db/"
```

---

## 7. リファクタリングのループ

推奨する進め方:

1. `cg index src` — 現状をインデックス
2. `cg cycles` / `cg gate --max-cycles 0` — 循環を特定
3. 共通依存を第 3 モジュールへ抽出して循環を解消
4. `cg impact <module>` — 影響範囲を確認してからリファクタ
5. `cg candidates` — 切り出し候補を選定
6. 変更後、再度 `cg index` し **`cg diff <baseline.json>`** で差分を確認

```bash
musubix cg export --format json --out baseline.json   # 変更前を保存
# … リファクタリング …
musubix cg index src
musubix cg diff baseline.json                          # ノード/エッジ/循環の増減
```

7. `cg gate` を CI に組み込み、**再発を防止**

---

## まとめ

CodeGraph は「まず測る」ためのツールです。循環依存・レイヤリング違反・ホットスポット
・リライト候補を **客観的な指標** で可視化し、影響範囲を見積もってから安全に
リファクタリングを進め、アーキテクチャ ルールを CI で守り続けられます。

新規開発（要件定義からの生成）については
[ガイド ①（グリーンフィールド）](./guide-greenfield-ja.md) を参照してください。
CodeGraph の全サブコマンドの詳細は [codegraph.md](./codegraph.md) にあります。
