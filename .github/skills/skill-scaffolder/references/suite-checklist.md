# Suite Completeness Checklist

Read this reference when validating that a generated suite is complete.

## Required Files

### Metadata (all suites)
- [ ] `README.md` — group description, version, sub-skill count
- [ ] `group.json` — name, description, icon, count
- [ ] `skill.json` — name, version, description, entrypoint: "AGENTS.md"

### Orchestration (all suites)
- [ ] `AGENTS.md` — WHEN/DO routing, task classification, phase gates, urgency triage, prohibited operations, Gotchas, verification loop

### Instructions (recommended)
- [ ] `copilot-instructions.md` — language rules, file-first policy, verification loop, agent table, Gotchas

### Custom Agents (recommended)
- [ ] At least 1 orchestration agent (full tools)
- [ ] At least 1 read-only audit agent (read/search only)
- [ ] Each agent has: name, description, tools list, role description, workflow, constraints

### Sub-skills (required)
- [ ] Each in `skills/<suite-name>-<suffix>/SKILL.md`
- [ ] Each has: name, description (with "Use when"), workflow, deliverables, quality gates, Gotchas (3+), validation loop
- [ ] Folder name matches `name` field
- [ ] Each ≤ 500 lines

### MCP (if external tools needed)
- [ ] `.mcp.json` with server configuration
- [ ] `tu_tools` in relevant SKILL.md frontmatter
- [ ] "Available Tools (MCP)" section in relevant SKILL.md
- [ ] Fallback procedure documented

### Supplementary Directories (as needed)
- [ ] `assets/` templates referenced from SKILL.md
- [ ] `references/` docs with conditional references only
- [ ] `scripts/` with executable validation/transformation code

## Quality Checks

### Harness 7-Axis Coverage
- [ ] Tool Coverage: WHEN/DO routing covers all request types
- [ ] Context Efficiency: all SKILL.md ≤ 500 lines, conditional references
- [ ] Quality Gates: validation loop in every skill
- [ ] Memory Persistence: Gotchas 3+ in every file, learning-capture skill
- [ ] Eval Coverage: failure recovery in validation loops
- [ ] Security Guardrails: prohibited operations, data handling rules
- [ ] Cost Efficiency: description keywords don't overlap between skills

### Naming Conventions
- [ ] Skill names: lowercase alphanumeric + hyphens, ≤ 64 chars
- [ ] No leading/trailing hyphens, no double hyphens
- [ ] Suite prefix: all sub-skills share `<suite-name>-` prefix
- [ ] Folder name = `name` field in every SKILL.md
