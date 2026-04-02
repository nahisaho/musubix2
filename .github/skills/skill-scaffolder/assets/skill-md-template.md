# SKILL.md Template

```markdown
---
name: <skill-name>
description: |
  <What this skill does.>
  Use when <trigger conditions>.
---

# <Skill Title>

<One-line description.>

## Use This Skill When

- <Condition 1>.
- <Condition 2>.
- <Condition 3>.

## Required Inputs

- <Input 1>.
- <Input 2>.

## Workflow

1. <Step 1>.
2. <Step 2>.
3. <Step 3>.

## Deliverables

- `report.md`: <description>.
- `results/`: <description>.

## Quality Gates

- [ ] <Gate 1>.
- [ ] <Gate 2>.
- [ ] <Gate 3>.

## Gotchas

- <Specific pitfall 1>
- <Specific pitfall 2>
- <Specific pitfall 3>

## Validation Loop

1. Execute and generate outputs
2. Check:
   - <Validation criterion 1>
   - <Validation criterion 2>
3. If any check fails:
   - Identify the failing gate
   - Fix the specific issue
   - Re-run validation
4. Proceed only after all gates pass
```
