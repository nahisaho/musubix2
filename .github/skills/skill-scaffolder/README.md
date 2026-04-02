# skill-scaffolder

Full-suite Agent Skills package generator with Harness optimization built in.

## What It Does

Generates complete Agent Skills packages — from single skills to full suites with AGENTS.md orchestrators, Custom Agents, copilot-instructions.md, MCP configuration, and supplementary directories (assets/references/scripts).

## When to Use

- Creating a new Agent Skill suite from scratch.
- Bootstrapping a single skill with Harness patterns.
- Generating suite infrastructure (AGENTS.md, agents/, .mcp.json).

## How It Works

1. **Phase 0 — Purpose Discovery**: Evaluate input sufficiency (8 elements). If gaps exist, route to `purpose-discovery` for 1Q1A dialogue.
2. **Phase 1 — Package Generation**: Generate metadata, AGENTS.md, copilot-instructions, agents, sub-skills, and MCP config.
3. **Phase 2 — Supplementary Directory Assessment**: For each skill, evaluate whether assets/ (templates), references/ (detailed definitions), or scripts/ (validation code) are needed. Create and add conditional references.
4. **Phase 3 — Harness 7-Axis Check**: Score all generated skills against 7 axes targeting 3/3. Fix any axis below threshold.

## Key Features

- 3 output templates available in `assets/`: AGENTS.md, SKILL.md, copilot-instructions.md
- Suite completeness checklist in `references/suite-checklist.md`
- Supplementary directory decision guide (when to create assets/references/scripts)
- Mandatory Harness 7-axis post-generation validation

## Supplementary Files

```
skill-scaffolder/
├── SKILL.md
├── assets/
│   ├── agents-md-template.md
│   ├── skill-md-template.md
│   └── copilot-instructions-template.md
└── references/
    └── suite-checklist.md
```
