# gotchas-curator

Consulting learning capture and Gotchas maintenance for Memory Persistence across Agent Skills.

## What It Does

Captures learnings from completed tasks, agent mistakes, and edge cases, then records them as concrete, actionable Gotcha entries in the relevant skill's SKILL.md. Implements the Memory Persistence axis of the Harness 7-axis framework.

## When to Use

- An agent made a mistake that should be prevented in future sessions.
- A task revealed an unexpected edge case or pitfall.
- A review identified an improvement opportunity.
- Completing a task and recording lessons learned.

## How It Works

1. **Identify**: What happened, why it matters, which skill is affected.
2. **Structure**: Format as a 1-2 line, concrete, actionable Gotcha entry.
3. **Validate**: Check for duplicates, verify specificity (no generic advice), confirm target skill stays under 500 lines.
4. **Apply**: Add to the target skill's Gotchas section.

## Good vs Bad Gotchas

```
✅ Good: "JWT tokens without `exp` claim must be rejected. Never allow tokens without expiration."
❌ Bad:  "Be careful with security."
```

## Key Rules

- Gotchas must include specific commands, values, or thresholds — not generic advice.
- One Gotcha per location — don't duplicate across multiple skills.
- Record learnings immediately after the mistake occurs (details fade with time).
- If a skill's Gotchas exceed 10 items, organize by category.
