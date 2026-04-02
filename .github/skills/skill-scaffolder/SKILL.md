---
name: skill-scaffolder
description: >
  Generate Harness-optimized Agent Skill packages with full suite support.
  Creates AGENTS.md orchestrators, SKILL.md sub-skills, Custom Agents,
  copilot-instructions.md, .mcp.json, and assets/references/scripts directories.
  Use when creating a new skill suite from scratch, bootstrapping a skill folder,
  or generating any component of a Harness-optimized skill package.
metadata:
  author: coreclaw
  version: "2.0"
---

# Skill Scaffolder

Generate Harness-optimized Agent Skill packages — from single skills to full suites.

## Use This Skill When

- Creating a new Agent Skill suite from scratch.
- Bootstrapping a single skill with Harness patterns.
- Generating suite infrastructure (AGENTS.md, agents/, .mcp.json).

## Workflow

### Phase 0: Purpose Discovery（必須 — 情報不足時に1問1答で要件を収集）

**スキル生成の前に、必ず `purpose-discovery` スキルの基準で入力を評価する。**

1. ユーザー入力を8要素（PURPOSE, DOMAIN, AUDIENCE, SCOPE, WORKFLOWS, INTEGRATIONS, REFERENCE MODEL, QUALITY CRITERIA）で評価
2. 5/8以上が明確 → Phase 1 へ進む
3. 5/8未満 → `purpose-discovery` スキルの1問1答ダイアログで不足情報を収集
4. 収集完了後、構造化仕様書を生成しユーザー承認を得る ⏸️
5. 承認済み仕様書を元に Phase 1 へ進む

### Phase 1: Package Generation

1. Determine package type:
   - **Single skill**: SKILL.md only
   - **Suite**: AGENTS.md + multiple SKILL.md + agents/ + copilot-instructions.md

2. For suites, generate in order:
   a. `group.json`, `skill.json`, `README.md`
   b. `AGENTS.md` (Orchestrator with WHEN/DO routing)
   c. `copilot-instructions.md` (suite-specific conventions)
   d. `agents/*.md` (Custom Agents with tool restrictions)
   e. `skills/<skill-name>/SKILL.md` (each sub-skill)
   f. `.mcp.json` (if external tools needed)

3. For each SKILL.md, include:
   - Frontmatter: `name`, `description` (+ `tu_tools` if MCP)
   - Body: Use This Skill When, Workflow, Deliverables, Quality Gates, Gotchas (3+), Validation Loop

4. **Supplementary Directory Assessment（必須）**:
   生成した各スキルに対して、以下の判定を実行し、結果に応じて作成する。

   **assets/ 判定**:
   - [ ] スキルが定型フォーマットの出力を生成するか？（レポート、分析結果、テンプレート）
   - [ ] 出力構造が再利用可能か？（毎回同じ構造を使う）
   → いずれかYES → `assets/` に出力テンプレートを作成し、SKILL.md から条件付き参照

   **references/ 判定**:
   - [ ] スキルが100行以上の参照情報（フレームワーク定義、API仕様、規約等）を必要とするか？
   - [ ] SKILL.md に含めると500行を超えるか？
   → いずれかYES → `references/` に分離し、SKILL.md から条件付き参照（「〜の場合に読む」）

   **scripts/ 判定**:
   - [ ] バリデーションを自動化できるか？（構文チェック、整合性確認）
   - [ ] データ変換やフォーマット処理が必要か？
   → いずれかYES → `scripts/` に実行可能コードを作成

   **判定後の確認**:
   - 作成した assets/ は SKILL.md から条件付きで参照されているか
   - 作成した references/ は「いつ読むか」が明示されているか
   - 判定の結果「不要」となったディレクトリは作成しない

5. Add conditional references in SKILL.md:
   - ✅ `Reuse assets/output-template.md when producing standardized analysis output`
   - ✅ `Read references/api-errors.md when API returns non-200 status`
   - ❌ `See references/ for details`

6. Self-validation (see Validation Loop)

## Supplementary Directory Decision Guide

| Condition | Action |
|-----------|--------|
| Skill produces reports with fixed structure | Create `assets/` with report templates |
| Reference content exceeds 100 lines | Move to `references/` with conditional refs |
| Validation needs executable checks | Create `scripts/` with validation code |
| Skill is self-contained and compact | No supplementary dirs needed |

## Output Templates

Reuse templates in this skill's `assets/` directory:
- `assets/agents-md-template.md` — AGENTS.md orchestrator template
- `assets/skill-md-template.md` — SKILL.md sub-skill template
- `assets/copilot-instructions-template.md` — copilot-instructions.md template
- Refer to `references/suite-checklist.md` when validating completeness

## Gotchas

- `description` に「Use when」を含めないと、エージェントがスキルを発見できない死蔵スキルになる
- フォルダ名と `name` フィールドが不一致だと CI バリデーションに失敗する
- SKILL.md が500行を超えるとコンテキストウィンドウを圧迫する。超える場合は references/ に分離する
- references/ を無条件参照にすると Context Efficiency が劣化する。必ず条件付き参照にする
- スイート構成のルート Orchestrator は AGENTS.md にすること（SKILL.md ではない）。デプロイ先は `.github/AGENTS.md`
- assets/ のテンプレートは「構造」を提供するもの。具体的なデータは含めない

## Validation Loop

1. 生成したパッケージを確認
2. **Phase 1: 構造チェック**:
   - [ ] `name` フィールドが命名規則に従い、フォルダ名と一致
   - [ ] `description` が「何をするか」+「Use when」の2部構成
   - [ ] スイート構成なら AGENTS.md が存在する
   - [ ] 本文500行以内（超過分は references/ に分離済み）
   - [ ] Gotchas セクションが3項目以上
   - [ ] 検証ループに失敗時リカバリ手順が含まれる
   - [ ] Quality Gates にチェックリストが含まれる
   → 不合格項目がある場合: 修正して再チェック

3. **Phase 2: Supplementary Directory チェック**:
   各スキルに対して以下を確認:
   - [ ] 定型出力を生成するスキルに `assets/` テンプレートがあるか
   - [ ] 100行超の参照情報が `references/` に分離されているか
   - [ ] assets/references が SKILL.md から条件付きで参照されているか
   - [ ] 不要な空ディレクトリが残っていないか
   → 不足がある場合: assets/references/scripts を作成し、SKILL.md に条件付き参照を追加

4. **Phase 3: Harness 7軸チェック（3/3 目標）**:

生成完了後、全スキルに対して 7軸スコアリングを実施。

| # | 軸 | スコア3の基準 | チェック内容 |
|---|-----|------------|------------|
| 1 | Tool Coverage | 3 | WHEN/DO + 全スキルにキーワード棲み分け + Agent→軸マッピング |
| 2 | Context Efficiency | 3 | 全SKILL.md≤100行 + 全参照が条件付き + assets/refs活用 |
| 3 | Quality Gates | 3 | 全スキルに失敗時リカバリ + チェックリスト |
| 4 | Memory Persistence | 3 | 具体的Gotchas(閾値・コマンド付き) + learning-capture + コンパクション耐性 |
| 5 | Eval Coverage | 3 | 全スキルにValidation Loop + CI統合ポイント |
| 6 | Security Guardrails | 3 | データ取り扱いルール + 匿名化 + PII禁止 + 禁止事項 |
| 7 | Cost Efficiency | 3 | MCP上限 + デフォルト明示 + 最シンプルフレームワーク原則 |

**合格条件**: 全7軸でスコア3（総合 21/21 = Expert）
**最低合格**: 全7軸でスコア1以上（総合 7/21 以上）

5. スコア3未満の軸がある場合の修正フロー:

| 軸 | 2→3 に必要な改善 |
|----|----------------|
| Tool Coverage | Agent→Harness軸マッピング追加、description キーワード棲み分け検証 |
| Context Efficiency | 無条件参照→条件付き、assets/references 追加・活用 |
| Quality Gates | 失敗時リカバリ手順追加、具体的な不合格条件定義 |
| Memory Persistence | Gotchas に具体的閾値・コマンド追記、コンパクション耐性テーブル追加 |
| Eval Coverage | CI統合（validate_skill.py）参照追加 |
| Security Guardrails | Data Handling & Confidentiality セクション追加 |
| Cost Efficiency | MCP 10サーバー上限、デフォルトツール優先ルール追加 |

6. 修正後に再スコアリング
7. 全軸スコア3を確認してから完了とする（3未満でもスコア1以上なら合格として完了可）
