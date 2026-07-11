# MUSUBIX2 アプリ開発ガイド ③ — 自然言語ではじめる（AI エージェント + MCP）

ガイド ①（[グリーンフィールド](./guide-greenfield-ja.md)）では `musubix …` を
**コマンドで** 実行しました。本ガイドでは、同じ SDD ワークフローを **自然言語で**
—— Claude Code や GitHub Copilot に話しかけるだけで —— 進める方法を解説します。

> 対象バージョン: MUSUBIX2 `v0.5.80`。ツール名・カテゴリは実際の MCP サーバーから
> 取得したものです。

---

## 0. 仕組み — なぜ自然言語で動くのか

`musubix init --platform claude`（または `copilot` / `both`）を実行すると、次の 2 つが
セットアップされ、AI エージェントが MUSUBIX2 を「道具」として使えるようになります。

1. **`.mcp.json`** — MCP（Model Context Protocol）サーバー `musubix2 mcp` の登録。
   このサーバーは **61 個のツール**（EARS 検証・設計生成・コード生成・形式検証・
   トレーサビリティ・セキュリティ・CodeGraph …）を公開します。エージェントは
   あなたの依頼を解釈し、適切なツールを呼び出します。
2. **`CLAUDE.md`** — エージェントへの指示書。SDD の 5 フェーズ強制ルールと 9 憲法
   条項が書かれており、エージェントが「いきなり実装」せず要件 → 設計 → タスク →
   実装の順で進めるよう誘導します。

```
あなた（自然言語）
   ↓  「〜な機能が欲しい」
Claude Code / Copilot  ── CLAUDE.md（SDD フェーズ強制）に従い
   ↓  MCP ツール呼び出し
musubix2 MCP サーバー（61 ツール）
   ↓
要件・設計・コード・テスト・検証結果
```

つまり **コマンドを覚えなくても**、会話するだけで SDD のガードレールが効きます。

---

## 1. セットアップ

```bash
# プロジェクトに AI エージェント連携をセットアップ
musubix init myapp --platform claude --name "MyApp"
cd myapp
```

生成物:

| ファイル | 役割 |
|---------|------|
| `.mcp.json` | MCP サーバー `musubix2 mcp` の登録（61 ツール） |
| `CLAUDE.md` | SDD フェーズ強制ルール・9 憲法条項（エージェント指示書） |
| `.claude/skills/` | SDD Agent Skills（要件/設計/コード/テスト/トレース等） |
| `storage/specs/requirements.md` | 要件のひな形 |

Claude Code でこのディレクトリを開けば、`.mcp.json` により MUSUBIX2 の MCP ツールが
自動でロードされます（`/mcp` で接続状態を確認できます）。GitHub Copilot の場合は
`--platform copilot` で `.github/copilot-instructions.md` が生成されます。

> MCP サーバーは手動でも起動できます: `musubix mcp`（stdio）または
> `musubix mcp --transport sse --port 3100`。

---

## 2. 会話で進める SDD ワークフロー

以下は「短縮 URL サービス」を題材にした会話例です。**あなたの発話（自然言語）** と、
エージェントが内部で呼ぶ **MCP ツール** を対比しています。

### Phase 1 — 要件定義

> **あなた**: 「ユーザーが長い URL を送ったら短縮リンクを作る機能が欲しい。
> あと、無効な URL は拒否したい。」

エージェントは要件を **EARS 形式** に整形し、検証します。

- `sdd.requirements.create` — 文を EARS に分類（ubiquitous / event-driven / …）
- `sdd.requirements.validate` — パターンと問題点を検証

> **エージェント**: 「以下の EARS 要件に整形しました。信頼度も添えます。
> - REQ-LINK-001 [event-driven, 1.00]: WHEN a user submits a long URL, THE system SHALL create a short link.
> - REQ-SEC-001 [unwanted, 1.00]: IF a submitted URL is invalid, THEN THE system SHALL reject the request.
> `storage/specs/requirements.md` に保存しました。レビューをお願いします。」

要件を対話的に詰めたいときは「1 問ずつ聞いて」と言えば、
`sdd.requirements.interview.start / answer / state / generate` が使われます。

### Phase 2 — 設計

> **あなた**: 「この要件で設計して。SOLID もチェックして。」

- `sdd.design.generate` — 要件からドメイン凝集サービス・設計パターンを生成
- `sdd.design.verify` — SOLID 原則を検証

> **エージェント**: 「`LinkService`（Observer/State）と `SecService`（Strategy）に
> 分割しました。SOLID スコアは 100/100 です。」

### Phase 3 — タスク分解

> **あなた**: 「実装タスクに分解して。」

エージェントは設計を実装単位に分解し、`storage/tasks/tasks.md` に整理します
（`workflow.phase.transition` でフェーズを進め、`workflow.approve` で承認を記録）。

### Phase 4 — 実装・検証

> **あなた**: 「LinkService の雛形を作って、テストと形式検証も。」

- `sdd.codegen.generate` — interface・状態 enum・トレースコメント付きの雛形
- `sdd.test.generate` — 公開メソッドごとのテスト
- `verify.ears-to-smt` / `verify.z3.solve` — 要件の論理的整合性を SMT で検証
- `sdd.trace.verify` — 要件 ↔ コードの被覆を確認
- `security.scan` / `security.secrets.detect` — 秘密情報・脆弱パターン検出

> **エージェント**: 「`ILinkService` を実装する `LinkService` を生成しました
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
| 実行者 | Claude Code / Copilot が MCP ツールを呼ぶ | 自分で `musubix …` を打つ |
| 向いている場面 | 探索的な開発、レビューを挟む対話 | CI / スクリプト / 再現可能な自動化 |
| ガードレール | CLAUDE.md が SDD フェーズを強制 | 各コマンドの終了コードで制御 |

両者は **同じエンジン**（core パッケージ）を使うので、成果物（要件・設計・コード・
トレース）は完全に互換です。会話で作った要件を CI では
`musubix trace:verify --strict` で守る、といった併用が自然です。

---

## 5. まとめ

自然言語ベースの MUSUBIX2 は「AI エージェント × MCP 61 ツール × CLAUDE.md の
フェーズ強制」で成り立っています。**コマンドを覚えずとも**、会話するだけで
要件 → 設計 → コード → 検証の SDD ガードレールが効き、生成物には
トレーサビリティ・形式検証・設計パターンが自動で織り込まれます。

- 再現性・自動化が要る場面 → [ガイド ① コマンドベース](./guide-greenfield-ja.md)
- 既存コードの分析・リファクタリング → [ガイド ② CodeGraph](./guide-refactoring-ja.md)
