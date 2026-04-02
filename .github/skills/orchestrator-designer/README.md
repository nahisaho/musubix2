# orchestrator-designer

AGENTS.md Orchestrator design with WHEN/DO routing, phase gates, and multi-skill workflow coordination.

## What It Does

Designs AGENTS.md files that coordinate multiple Agent Skills through structured WHEN/DO routing patterns, phase transition rules, task classification trees, urgency triage, and prohibited operations.

## When to Use

- Setting up a new multi-skill workflow that needs structured routing.
- Designing phase transitions with approval gates between skills.
- Creating task classification trees for automatic skill selection.
- Generating AGENTS.md files for skill suites.

## How It Works

1. **Collect**: Gather available skills and their descriptions.
2. **Design**: Create WHEN/DO routing rules (5-7 patterns recommended).
3. **Gate**: Define phase transitions with approval points (⏸️) at critical junctures.
4. **Triage**: Add urgency-based workflow variants (normal/urgent/critical).
5. **Prohibit**: Explicitly state what the agent must NOT do.
6. **Validate**: Ensure all skills are routed, no keyword conflicts, approval points present.

## Output Structure

The generated AGENTS.md includes:
- YAML frontmatter with suite-level `name` and `description`
- WHEN/DO dispatch rules
- Task classification decision tree
- Full workflow with phase gates
- Urgency triage table
- Prohibited operations
- Quality Gates with verification loop
- Gotchas (3+ items)

## Key Rules

- AGENTS.md is the suite root file — deployed to `<project>/.github/AGENTS.md`.
- Keep WHEN/DO patterns to 5-7 (more than 10 causes unstable routing).
- Approval gates (⏸️) at critical decisions only (not every phase).
- Always include urgency triage for flexible workflow execution.
