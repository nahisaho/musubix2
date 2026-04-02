# description-optimizer

Agent Skill description field optimization for maximum routing precision and discovery accuracy.

## What It Does

Analyzes and optimizes the `description` field in SKILL.md frontmatter to ensure skills are correctly discovered and activated by the AI agent. Detects keyword overlaps between skills and generates improved descriptions with clear trigger conditions.

## When to Use

- A skill is not being activated when it should be (dead skill).
- Multiple skills compete for the same trigger keywords.
- Improving Tool Coverage score in a Harness audit.
- Setting up a new multi-skill suite where descriptions need keyword separation.

## How It Works

1. **Analyze**: Parse current description for "what it does" + "Use when" structure.
2. **Compare**: Check for keyword overlaps with sibling skills in the same suite.
3. **Optimize**: Generate improved description with separated keywords and explicit trigger conditions.
4. **Validate**: Confirm no keyword collisions, 1024-char limit, and proper 2-part structure.

## Key Principles

- Descriptions are written for the **LLM routing engine**, not human readers.
- Every description must contain both "what it does" AND "Use when..." trigger conditions.
- Keywords between sibling skills must be **mutually exclusive** (no overlap).
- Keyword categories: planning, collecting, analyzing, generating, validating, optimizing.
