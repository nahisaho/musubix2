# MUSUBIX2 は何が違うのか — ニューロシンボリックと LLM コーディングエージェント（Claude Code / Codex / Devin）

> 本記事の主張は、MUSUBIX2 `v0.5.66` で **実際にコマンドを実行した結果** に基づいています。
> 出力はすべて再現可能です。

## 要旨（先に結論）

Claude Code・OpenAI Codex・Devin は、いずれも **大規模言語モデル（LLM）を中核とする
コーディングエージェント** です。自然言語から柔軟にコードを書き、幅広いタスクをこなす
一方で、その出力は本質的に **確率的**（実行ごとに変わりうる）で、ハルシネーション
（もっともらしい誤り）を含みうり、形式的な保証を与えません。

MUSUBIX2 は **ニューロシンボリック** という設計をとります。LLM に親和的なワークフロー
（要件 → 設計 → コード → 検証）の上に、**決定的なシンボリック（記号的）エンジン**
—— EARS 検証・CodeGraph 静的解析・トレーサビリティ・EARS→SMT 形式化 —— を重ねます。
これらは LLM が構造的に持てない性質、すなわち **再現性・厳密な依存解析・厳密な
トレーサビリティ・機械可読な形式成果物** を提供します。

重要なのは、MUSUBIX2 は LLM エージェントの **置き換えではなく補完** だという点です。
実際 MUSUBIX2 は MCP（Model Context Protocol）経由で Claude Code / Copilot から呼び出せ、
LLM エージェントに「記号的な背骨」を与えます（[自然言語ガイド](./guide-natural-language-ja.md)）。

---

## 2 つのパラダイム

| 観点 | 純ニューラル（Claude Code / Codex / Devin） | ニューロシンボリック（MUSUBIX2） |
|------|-------------------------------------------|--------------------------------|
| 中核 | LLM（確率的推論） | LLM ＋ 決定的な記号エンジン |
| 出力の再現性 | 実行ごとに変わりうる | **同一入力 → 同一出力** |
| コード理解 | LLM が読んで推測 | **CodeGraph による厳密な依存グラフ** |
| 整合性チェック | LLM が「たぶん大丈夫」 | **EARS→SMT で矛盾を検出**（z3 なしでも基本ケース） |
| 要件↔コード | 対応は暗黙 | **トレーサビリティ行列（厳密な被覆率）** |
| 実行コスト | トークン・ネットワーク | **ローカル・ミリ秒・トークン 0** |
| 得意領域 | 曖昧な指示からの生成、探索 | 保証・検証・ゲート・再現性 |

「どちらが優れているか」ではなく **役割が異なります**。以下、MUSUBIX2 の記号的性質を
実験で示します。

---

## 実験1: 決定性 — 同じ入力は必ず同じ出力

LLM は temperature やサンプリングにより、同じプロンプトでも出力が揺れます。MUSUBIX2 の
記号エンジンは決定的です。同じ要件で形式検証を 2 回実行し、差分を取ります。

```bash
musubix verify reqs.md | grep assert > v1.txt
musubix verify reqs.md | grep assert > v2.txt
diff v1.txt v2.txt
```

```
>> 2回の出力は完全一致（決定的）
  ✓ REQ-PAY-001 [event-driven] → (assert (=> a_customer_confirms_an_order charge_the_card))
  ✓ REQ-PAY-002 [event-driven] → (assert (=> a_customer_requests_a_refund refund_the_charge))
  ✓ REQ-SEC-001 [unwanted]     → (assert (not store_the_full_card_number))
```

設計生成も同様で、成果物（`design.json`）はタイムスタンプ以外 **完全に一致** します。

```
>> 設計成果物は決定的（generatedAt 以外は完全一致）
```

**なぜ重要か**: CI・監査・差分レビューでは「同じ入力なら同じ結果」が前提になります。
確率的なエージェントの出力を CI のゲートに直接使うのは困難ですが、MUSUBIX2 の成果物は
そのまま合否判定に使えます。

---

## 実験2: CodeGraph — 記号的な静的依存解析

LLM は大規模コードの依存関係を「読んで推測」しますが、見落としや幻覚が起こりえます。
CodeGraph はソースを **決定的に** 解析し、循環依存・影響範囲・リライト候補を厳密に
算出します。しかも **ローカルで数百ミリ秒、LLM 呼び出しなし** です。

```bash
musubix cg index src        # → real 0m0.507s（オフライン・トークン 0）
musubix cg cycles
```

```
Found 1 dependency cycle(s):
  Cycle 1 (2 files):
    ↻ src/db.ts
    ↻ src/notify.ts
```

2 回実行しても結果は同一（決定的）。さらに、これを **CI のアーキテクチャゲート** に
できます。

```bash
musubix cg gate --max-cycles 0 --forbid "api:db"
# ❌ Gate failed: 1/2 check(s) violated. → 終了コード 1
```

「循環依存ゼロ」「api は db を import してはならない」といったルールを **終了コードで
機械判定** します。LLM に「循環がないか確認して」と頼むのとは、保証の質が違います。

---

## 実験3: トレーサビリティ — 記号的な要件↔コード対応

MUSUBIX2 は生成コードに `// Implements: REQ-…` を刻み、要件とコードの対応を **厳密に**
計測します。2 要件のうち 1 つだけ実装した状態で検証すると:

```bash
musubix trace:verify --specs reqs.md --src src --strict
```

```
Coverage: 50%
Requirements: 1/2 referenced in src
Gaps (requirements not referenced in code):
  - REQ-PAY-001
# 終了コード: 2（--strict で未被覆は非ゼロ終了）
```

「被覆率 50%」「未実装は REQ-PAY-001」と **正確に特定** し、CI を落とせます。LLM に
「全要件を実装した？」と聞くのとは異なり、答えは監査可能な事実です。

---

## 実験4: 形式検証 — EARS から SMT-LIB2 へ

MUSUBIX2 は EARS 要件を **SMT-LIB2**（形式論理のソルバー入力）に決定的に変換し、
**論理的な矛盾を検出** します。矛盾する 2 要件を与えてみます。

```
## REQ-ACC-001: Grant
**要件**: THE system SHALL grant access.
## REQ-ACC-002: Deny
**要件**: THE system SHALL NOT grant access.
```

```bash
musubix verify contradiction.md
```

```
  ✓ REQ-ACC-001 [ubiquitous] → (assert (=> true grant_access))
  ✓ REQ-ACC-002 [unwanted]   → (assert (not grant_access))

⚠ Requirements are inconsistent — 1 conflict(s):
  - Combined assertions are unsatisfiable — potential conflict detected.
# 終了コード: 1（矛盾を検出して CI を落とせる）
```

`grant_access` を「真」と「偽」の両方で要求しているため、**充足不能（unsat）**として
検出されます。基本的な矛盾（同一命題の肯定と否定）は **z3 が無くても** 検出できます。
生成される SMT-LIB2 は `(check-sat)` を含む完全なスクリプトで、**z3 を導入すれば
条件付きのより複雑な矛盾も** 数学的に検査できます（内蔵チェックは健全＝誤検出なし・
不完全＝取りこぼしは z3 が補完）。

LLM に「この要件、矛盾してない？」と聞くのと違い、答えは **決定的で監査可能** です。

---

## 「vs」ではなく「with」— エージェントに記号の背骨を与える

MUSUBIX2 は Claude Code や Devin と競合するものではありません。`init --platform claude`
で MCP サーバー（**61 ツール**）が登録され、LLM エージェントは自然言語の依頼を
MUSUBIX2 の記号エンジンに解決させられます。

```
あなた: 「この要件で設計して、トレーサビリティも確認して」
   ↓
Claude Code ── MCP ツール呼び出し ──> musubix2（決定的な設計生成・trace 検証）
```

つまり **LLM の柔軟さ × 記号エンジンの保証** を同時に得られます。詳細は
[自然言語ガイド](./guide-natural-language-ja.md) を参照してください。

---

## 使い分けの指針

| やりたいこと | 向いているもの |
|-------------|--------------|
| 曖昧な要望から素早くプロトタイプ | LLM エージェント（Claude Code / Codex / Devin） |
| 要件の EARS 検証・形式化 | MUSUBIX2 `requirements` / `verify` |
| 依存構造の把握・循環検出・リライト候補 | MUSUBIX2 `cg`（CodeGraph） |
| 要件↔コードの被覆を CI で保証 | MUSUBIX2 `trace:verify --strict` |
| アーキテクチャ ルールを CI で強制 | MUSUBIX2 `cg gate` |
| 再現可能な設計・コード雛形の生成 | MUSUBIX2 `design` / `codegen` |
| これら全部を会話で | Claude Code ＋ MUSUBIX2（MCP） |

---

## まとめ

- Claude Code / Codex / Devin は **純ニューラル**：柔軟で汎用的だが確率的で、形式的
  保証を与えない。
- MUSUBIX2 は **ニューロシンボリック**：LLM ワークフローに **決定的な記号エンジン**
  （EARS・CodeGraph・トレーサビリティ・SMT 形式化）を重ね、**再現性・厳密な依存解析・
  厳密なトレーサビリティ・機械可読な検証成果物** を提供する。
- 両者は排他ではなく **補完** —— MCP を通じて LLM エージェントに組み込み、
  「柔軟さ」と「保証」を両立できる。

関連ドキュメント:
[① 要件定義から](./guide-greenfield-ja.md) ／
[② CodeGraph リファクタリング](./guide-refactoring-ja.md) ／
[③ 自然言語（AI エージェント + MCP）](./guide-natural-language-ja.md) ／
[CodeGraph リファレンス](./codegraph.md)
