---
name: purpose-discovery
description: >
  Discover the true objective for Agent Skills development through structured
  one-question-at-a-time dialogue. Extracts requirements, structures prompts,
  and generates optimized specifications before skill generation begins.
  Use when a user's skill development request is ambiguous, lacks detail,
  or needs clarification before generating Agent Skills packages.
metadata:
  author: coreclaw
  version: "1.0"
---

# Purpose Discovery for Skills Development

Clarify the user's true objective and generate an optimized specification before skill generation.

## Use This Skill When

- A user requests Agent Skills development but the request is vague.
- Key information (domain, audience, workflows, integrations) is missing.
- Requirements need structuring before generation begins.

## Workflow

### Phase 1: Information Sufficiency Check

Evaluate the user's input against these 8 required elements:

| # | Element | Question to ask if missing |
|---|---------|--------------------------|
| 1 | **PURPOSE** | What decision, workflow, or outcome should this skill enable? |
| 2 | **DOMAIN** | What professional domain or subject area? |
| 3 | **AUDIENCE** | Who will use this skill? |
| 4 | **SCOPE** | Single skill or suite? How many sub-skills? |
| 5 | **WORKFLOWS** | What are the main task types or phases? |
| 6 | **INTEGRATIONS** | Does it need MCP tools, databases, or APIs? |
| 7 | **REFERENCE MODEL** | Is there an existing skill group to reference? |
| 8 | **QUALITY CRITERIA** | What defines success? |

**Sufficiency rule**: 5+ elements clear → proceed to Phase 3.
<5 elements clear → enter Phase 2 dialogue.

### Phase 2: One-Question-at-a-Time Dialogue

**Rules**:
- Ask exactly **one question** per turn. Never batch multiple questions.
- Prefer closed or multiple-choice questions over open-ended.
- After each answer, re-check sufficiency (5+ elements met?).
- Maximum 8 rounds. After 8, proceed with stated assumptions.

**Priority order** (ask most impactful gaps first):
1. PURPOSE → 2. DOMAIN → 3. WORKFLOWS → 4. SCOPE
5. AUDIENCE → 6. INTEGRATIONS → 7. REFERENCE MODEL → 8. QUALITY CRITERIA

### Phase 3: Structured Prompt Generation

Compile into optimized specification:

```markdown
# Agent Skills Development Specification

## Objective
[One-sentence purpose statement]

## Domain & Audience
- Domain: [domain]
- Primary users: [audience]

## Architecture
- Type: [Single / Suite]
- Sub-skills: [list]
- Custom Agents: [list with roles]

## Workflow Phases
| Phase | Sub-skill | Description | Gate |
|-------|-----------|-------------|------|
| 0 | [name] | [desc] | ⏸️/auto |

## Integrations
- MCP: [list or none]
- Databases: [list or none]

## Reference Model
- Based on: [existing group or none]

## Quality Criteria
- [criteria]

## Assumptions
- [any assumptions from incomplete info]
```

### Phase 4: User Approval ⏸️

Present specification and wait for approval.
- Approved → pass to `skill-scaffolder`.
- Modifications → update and re-present.

## Deliverables

- Structured specification (input for skill-scaffolder).
- `results/skill-spec.md` (saved for reference).

## Quality Gates

- [ ] PURPOSE is clear and actionable.
- [ ] At least 5/8 elements explicitly addressed.
- [ ] Specification uses standard template format.
- [ ] User approved specification before generation begins.
- [ ] Assumptions are explicitly stated.

If any gate fails: return to Phase 2 dialogue.

## Gotchas

- 複数の質問を一度に投げてはならない。1問1答を厳守する
- ユーザーの最初の入力は「要望」であり「仕様」ではない。仕様は対話を経て構造化される
- PURPOSE が曖昧なまま SCOPE を決めてはならない。目的不明確だとスキル数の判断を誤る
- 8ラウンドで情報が揃わない場合は仮定を明記して進む。無限ループに入らないこと
- 既存スイートを参考にする場合も、ユーザー目的に合わせてカスタマイズすること

## Validation Loop

1. Sufficiency Check を実行
2. チェック: 5/8要素が明確か、PURPOSE が具体的か
3. 不足 → 1問1答で追加ヒアリング
4. ユーザー承認後のみスキル生成に進む
