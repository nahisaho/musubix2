# MUSUBIX2 アプリ開発ガイド ③ — GitHub Copilot CLI で自然言語ではじめる

ガイド ①（[グリーンフィールド](./guide-greenfield-ja.md)）では `musubix2 …` を
**コマンドで** 実行しました。本ガイドでは、同じ SDD ワークフローを **GitHub Copilot CLI**
に **自然言語で話しかけるだけ** で進める方法を解説します。ターミナルから離れずに、
要件 → 設計 → コード → 検証を対話で回せます。

> 対象バージョン: MUSUBIX2 `v0.5.93`。ツール名・カテゴリは実際の MCP サーバーから
> 取得したものです。
> Claude Code / VS Code の GitHub Copilot でも同じ MCP サーバーを使えます（[補足](#7-他のクライアントでも同じ)）。

---

## 0. 仕組み — なぜ自然言語で動くのか

GitHub Copilot CLI（`copilot` コマンド）は、ターミナルで動く **エージェント型** の
コーディング支援ツールです。MUSUBIX2 はこれに 2 つのものを与えます。

1. **MCP サーバー `musubix2 mcp`** — MCP（Model Context Protocol）経由で **61 個のツール**
   （EARS 検証・設計生成・コード生成・形式検証・トレーサビリティ・セキュリティ・
   CodeGraph …）を公開します。Copilot CLI はあなたの依頼を解釈し、適切なツールを
   呼び出します。
2. **`.github/copilot-instructions.md`** — Copilot への指示書。SDD の 5 フェーズ強制
   ルールと 9 憲法条項が書かれており、Copilot が「いきなり実装」せず
   要件 → 設計 → タスク → 実装の順で進めるよう誘導します（Copilot CLI はこのファイルを
   カスタム指示として自動で読み込みます）。

```
あなた（ターミナルで自然言語）
   ↓  「〜な機能が欲しい」
GitHub Copilot CLI  ── .github/copilot-instructions.md（SDD フェーズ強制）に従い
   ↓  MCP ツール呼び出し
musubix2 MCP サーバー（61 ツール / stdio）
   ↓
要件・設計・コード・テスト・検証結果
```

つまり **コマンドを覚えなくても**、Copilot CLI に会話するだけで SDD のガードレールが
効きます。

---

## 1. セットアップ

### 前提

- **GitHub Copilot CLI** がインストール済みで、`copilot` が使えること
  （`npm install -g @github/copilot` などでインストール。要 Copilot サブスクリプション）。
- Node.js 20+（`npx musubix2` を実行するため）。

### 手順 1 — プロジェクトに Copilot 連携をセットアップ

```bash
npx musubix2 init myapp --platform copilot --name "MyApp"
cd myapp
```

`--platform copilot` で次が生成されます。

| ファイル | 役割 |
|---------|------|
| `.github/copilot-instructions.md` | SDD フェーズ強制ルール・9 憲法条項（Copilot のカスタム指示） |
| `.github/skills/<skill>/SKILL.md` | 8 つの SDD Agent Skills |
| `.vscode/mcp.json` | VS Code 用 MCP 登録（Copilot CLI では下記の手順で登録） |
| `storage/specs/requirements.md` | 要件のひな形 |

### 手順 2 — MCP サーバーを Copilot CLI に登録

MUSUBIX2 の MCP サーバーは stdio で動く、クライアント非依存のプロセスです。
Copilot CLI に **stdio サーバー** として登録します。サーバー起動コマンドは:

```bash
npx musubix2 mcp        # stdio で 61 ツールを公開
```

Copilot CLI 側では、以下の定義で MCP サーバーを追加します（Copilot CLI の MCP 設定、
またはセッション内の `/mcp` コマンドで管理）。

```json
{
  "servers": {
    "musubix2": {
      "type": "stdio",
      "command": "npx",
      "args": ["musubix2", "mcp"]
    }
  }
}
```

> ローカルインストール（`npm i -D musubix2`）済みなら
> `"command": "./node_modules/.bin/musubix2", "args": ["mcp"]` でも構いません。

### 手順 3 — Copilot CLI を起動

プロジェクトディレクトリで対話セッションを開始します。

```bash
copilot
```

Copilot CLI は `.github/copilot-instructions.md` をカスタム指示として読み込み、
登録済みの MCP サーバー `musubix2`（61 ツール）を利用可能にします。セッション内で
`/mcp` と打つと、接続状態と利用可能なツールを確認できます。

> 一問だけ投げたいときは `copilot -p "…"` のワンショット実行も使えます。

---

## 2. 会話で進める SDD ワークフロー

以下は「短縮 URL サービス」を題材にした Copilot CLI での会話例です。
**あなたの発話（自然言語）** と、Copilot が内部で呼ぶ **MCP ツール** を対比しています。

### Phase 1 — 要件定義

> **あなた**: 「ユーザーが長い URL を送ったら短縮リンクを作る機能が欲しい。
> あと、無効な URL は拒否したい。」

Copilot は要件を **EARS 形式** に整形し、検証します。

- `sdd.requirements.create` — 文を EARS に分類（ubiquitous / event-driven / …）
- `sdd.requirements.validate` — パターンと問題点を検証

> **Copilot**: 「以下の EARS 要件に整形しました。信頼度も添えます。
> - REQ-LINK-001 [event-driven, 1.00]: WHEN a user submits a long URL, THE system SHALL create a short link.
> - REQ-SEC-001 [unwanted, 1.00]: IF a submitted URL is invalid, THEN THE system SHALL reject the request.
> `storage/specs/requirements.md` に保存しました。レビューをお願いします。」

要件を対話的に詰めたいときは「1 問ずつ聞いて」と言えば、
`sdd.requirements.interview.start / answer / state / generate` が使われます。

### Phase 2 — 設計

> **あなた**: 「この要件で設計して。SOLID もチェックして。」

- `sdd.design.generate` — 要件からドメイン凝集サービス・設計パターンを生成
- `sdd.design.verify` — SOLID 原則を検証

> **Copilot**: 「`LinkService`（Observer/State）と `SecService`（Strategy）に
> 分割しました。SOLID スコアは 100/100 です。」

### Phase 3 — タスク分解

> **あなた**: 「実装タスクに分解して。」

Copilot は設計を実装単位に分解し、`storage/tasks/tasks.md` に整理します
（`workflow.phase.transition` でフェーズを進め、`workflow.approve` で承認を記録）。

### Phase 4 — 実装・検証

> **あなた**: 「LinkService の雛形を作って、テストと形式検証も。」

- `sdd.codegen.generate` — interface・状態 enum・トレースコメント付きの雛形
- `sdd.test.generate` — 公開メソッドごとのテスト
- `verify.ears-to-smt` / `verify.z3.solve` — 要件の論理的整合性を SMT で検証
- `sdd.trace.verify` — 要件 ↔ コードの被覆を確認
- `security.scan` / `security.secrets.detect` — 秘密情報・脆弱パターン検出

> **Copilot**: 「`ILinkService` を実装する `LinkService` を生成しました
> （`// Implements: REQ-LINK-001` 付き）。テスト 5 件、形式検証は整合、トレース
> 被覆 100%、セキュリティ検出 0 件です。」

### 既存コードの分析（リファクタリング）

> **あなた**: 「このコードベースの循環依存とリライト候補を教えて。」

- `code.graph.build` — 依存グラフを構築
- `code.graph.search` — ノード/エッジ検索
- `code.dfg.analyze` — データフロー解析

（CodeGraph の詳細は [ガイド ②](./guide-refactoring-ja.md) を参照）

---

## 3. MCP ツール カタログ（61 ツール / 13 カテゴリ）

自然言語の依頼は、最終的に以下のいずれかのツールに解決されます。「何ができるか」の
早見表として使ってください。

| カテゴリ | 主なツール | 自然言語の例 |
|---------|-----------|-------------|
| **sdd-core** (12) | `sdd.requirements.create/validate/list`, `sdd.design.generate/verify`, `sdd.codegen.generate`, `sdd.test.generate`, `sdd.trace.verify`, `sdd.requirements.interview.*` | 「EARS で検証」「設計して」「雛形を生成」 |
| **formal-verify** (5) | `verify.ears-to-smt`, `verify.z3.solve`, `verify.lean.convert/run`, `verify.hybrid` | 「要件が矛盾していないか検証」 |
| **code-analysis** (4) | `code.parse`, `code.graph.build`, `code.graph.search`, `code.dfg.analyze` | 「依存グラフを分析」「循環を探して」 |
| **security** (4) | `security.scan`, `security.secrets.detect`, `security.taint.analyze`, `security.compliance.check` | 「秘密情報が漏れていないか」 |
| **knowledge** (7) | `knowledge.entity.get/put/delete`, `knowledge.relation.add`, `knowledge.search/traverse/stats` | 「この決定を知識グラフに残して」 |
| **decisions** (3) | `decisions.create`, `decisions.list`, `decisions.search` | 「ADR に記録して」 |
| **policy** (3) | `policy.validate`, `policy.gate.run`, `policy.articles.list` | 「憲法条項に違反していないか」 |
| **ontology** (5) | `ontology.triple.add/query`, `ontology.rules.apply`, `ontology.consistency.check`, `ontology.sparql.query` | 「ドメイン概念の整合性を確認」 |
| **workflow** (4) | `workflow.phase.current/transition`, `workflow.gate.check`, `workflow.approve` | 「次のフェーズへ」「承認」 |
| **research** (3) | `research.query`, `research.iterative`, `research.evidence` | 「〜について調査して」 |
| **neural** (5) | `neural.search`, `neural.embed`, `neural.patterns.*`, `neural.library.learn` | 「似たコードを検索」「パターンを学習」 |
| **synthesis** (3) | `synthesis.dsl.build`, `synthesis.synthesize`, `synthesis.version-space` | 「入出力例から変換を合成」 |
| **skills** (3) | `skills.list`, `skills.register`, `skills.execute` | 「使えるスキルを一覧」 |

---

## 4. コマンドとの使い分け

| | 自然言語（本ガイド） | コマンド（[ガイド ①](./guide-greenfield-ja.md)） |
|---|---------------------|----------------------------|
| 実行者 | GitHub Copilot CLI が MCP ツールを呼ぶ | 自分で `musubix2 …` を打つ |
| 向いている場面 | 探索的な開発、レビューを挟む対話 | CI / スクリプト / 再現可能な自動化 |
| ガードレール | `.github/copilot-instructions.md` が SDD フェーズを強制 | 各コマンドの終了コードで制御 |

両者は **同じエンジン**（core パッケージ）を使うので、成果物（要件・設計・コード・
トレース）は完全に互換です。Copilot CLI で作った要件を CI では
`npx musubix2 trace:verify --strict` で守る、といった併用が自然です。

---

## 5. うまく使うコツ

- **フェーズを言葉で区切る**: 「まず要件だけ」「設計に進んで」のように段階を明示すると、
  Copilot は `.github/copilot-instructions.md` の SDD ルールに沿って進めます。
- **レビューを挟む**: 各フェーズの成果物（`storage/specs/…`）を確認してから次へ。
  「承認」と伝えると `workflow.approve` が記録されます。
- **`/mcp` で確認**: ツールが呼ばれないときは、セッション内で `/mcp` を打って
  `musubix2` サーバーが接続済みか（61 ツールが見えているか）確認します。
- **CI と併用**: 会話で作った要件・設計を、CI では `npx musubix2 cg gate` /
  `trace:verify --strict` / `security --fail-on high` で守ります
  （[逆引き辞典 › CI に組み込む](./command-cookbook-ja.md#ci-に組み込む)）。

---

## 6. トラブルシュート

| 症状 | 対処 |
|------|------|
| ツールが呼ばれない | `/mcp` で `musubix2` サーバーの接続を確認。未登録なら手順 2 を再確認 |
| MCP サーバーが起動しない | `npx musubix2 mcp` を単体実行してエラーを確認。Node.js 20+ か確認 |
| SDD フェーズを飛ばして実装してしまう | `.github/copilot-instructions.md` が存在するか、`init --platform copilot` 済みか確認 |
| 「いきなり全部作って」で暴走する | 「まず要件だけ」のようにフェーズを区切って依頼する |

---

## 7. 他のクライアントでも同じ

MUSUBIX2 の MCP サーバー（`npx musubix2 mcp`、stdio）は **クライアント非依存** です。
GitHub Copilot CLI に限らず、MCP 対応の任意の AI クライアントから同じ 61 ツールを
呼び出せます。

- **VS Code の GitHub Copilot（エージェントモード）**: `--platform copilot` が生成する
  `.vscode/mcp.json` により自動でロードされます。
- **Claude Code**: `--platform claude` で `.mcp.json`・`CLAUDE.md`・`.claude/skills/`
  が生成され、`/mcp` で接続を確認できます。

いずれのクライアントでも、指示書（`.github/copilot-instructions.md` / `CLAUDE.md`）と
MCP サーバーの組み合わせで同じ SDD ガードレールが効きます。

---

## 8. まとめ

GitHub Copilot CLI ベースの MUSUBIX2 は「Copilot CLI × MCP 61 ツール ×
`.github/copilot-instructions.md` のフェーズ強制」で成り立っています。
**コマンドを覚えずとも**、ターミナルで会話するだけで
要件 → 設計 → コード → 検証の SDD ガードレールが効き、生成物には
トレーサビリティ・形式検証・設計パターンが自動で織り込まれます。

- 再現性・自動化が要る場面 → [ガイド ① コマンドベース](./guide-greenfield-ja.md)
- 既存コードの分析・リファクタリング → [ガイド ② CodeGraph](./guide-refactoring-ja.md)
- コマンドの逆引き → [コマンド逆引き辞典](./command-cookbook-ja.md)
