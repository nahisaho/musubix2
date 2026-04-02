# AGENTS.md Template

```markdown
---
name: <suite-name>
description: |
  <Suite description. What it does and what it covers.>
  Use when <trigger conditions>.
---

# <Suite Title> v0.1.0

<One-line summary>. Route work to the narrowest sub-skill, save all outputs as files.

## Core Rules

- Write `report.md` in the same language as the user's input.
- Save every artifact to files. Do not leave results only in chat.
- Prefer the narrowest matching sub-skill.

## Routing Rules

### WHEN/DO Dispatch

WHEN: <trigger condition 1>
DO: → `<suite-name>-<skill-1>`

WHEN: <trigger condition 2>
DO: → `<suite-name>-<skill-2>`

### Task Classification

1. <Decision question 1>?
   - YES → `<suite-name>-<skill-1>`
   - NO → next
2. <Decision question 2>?
   - YES → `<suite-name>-<skill-2>`
   - NO → Answer directly

### Full Workflow

Phase 0 → `<suite-name>-<skill-1>`: <description> ⏸️ User approval
Phase 1 → `<suite-name>-<skill-2>`: <description>
Phase 2 → `<suite-name>-<skill-3>`: <description> ⏸️ User approval

### Urgency Triage

| Urgency | Keywords | Workflow |
|---------|----------|---------|
| Normal | (default) | Full workflow |
| Urgent | "urgent", "ASAP" | Abbreviated |
| Critical | "immediately" | Summary only |

## Verification Loop

PLAN → EXECUTE → VERIFY → REPORT → LOG

## Quality Gates

- [ ] <Gate 1>
- [ ] <Gate 2>
- [ ] <Gate 3>

## Prohibited Operations

- <Prohibition 1>
- <Prohibition 2>

## Gotchas

- <Gotcha 1>
- <Gotcha 2>
- <Gotcha 3>
```
