# purpose-discovery

Structured requirements elicitation for Agent Skills development through one-question-at-a-time dialogue.

## What It Does

Evaluates user input against 8 required elements (PURPOSE, DOMAIN, AUDIENCE, SCOPE, WORKFLOWS, INTEGRATIONS, REFERENCE MODEL, QUALITY CRITERIA) and conducts targeted dialogue to fill gaps before skill generation begins.

## When to Use

- A user requests Agent Skills development but the request is vague or incomplete.
- Key information (domain, audience, workflows, integrations) is missing.
- Requirements need structuring into an optimized specification before generation.

## How It Works

1. **Sufficiency Check**: Evaluate user input against 8 elements. If 5+ are clear, proceed directly.
2. **1Q1A Dialogue**: Ask exactly one question per turn (closed/choice preferred). Maximum 8 rounds.
3. **Structured Spec**: Compile answers into a standardized specification template.
4. **User Approval**: Present spec for approval before passing to `skill-scaffolder`.

## Key Rules

- **One question at a time** — never batch multiple questions.
- **Closed questions preferred** — faster for the user, more precise answers.
- **Maximum 8 rounds** — after 8, proceed with stated assumptions.
- **User approval required** — no generation without approved specification.

## Integration

This skill is invoked automatically by `skill-scaffolder` (Phase 0) and `skill-developer` agent when user input has fewer than 5/8 elements clearly defined.
