# harness-auditor

Harness 7-axis scoring and remediation guidance for Agent Skills quality assessment.

## What It Does

Audits Agent Skills and their surrounding environment (AGENTS.md, Custom Agents, assets, references, MCP config) against the Harness 7-axis framework. Produces a scored report with prioritized improvement recommendations.

## When to Use

- Evaluating the quality of a skill or suite before release.
- Diagnosing why a skill underperforms or isn't activated.
- Running a pre-merge or pre-commit quality check.
- Scoring harness maturity (Beginner → Intermediate → Advanced → Expert).

## The 7 Axes

| # | Axis | What It Checks |
|---|------|---------------|
| 1 | Tool Coverage | Description quality, keyword separation, WHEN/DO routing, Agent-Axis mapping |
| 2 | Context Efficiency | SKILL.md line count, conditional references, assets/references usage |
| 3 | Quality Gates | Validation loops, failure recovery, checklists |
| 4 | Memory Persistence | Gotchas specificity, learning-capture skill, compaction resilience |
| 5 | Eval Coverage | Validation loops, CI integration points |
| 6 | Security Guardrails | Prohibited operations, data handling, read-only agents |
| 7 | Cost Efficiency | MCP limits, default tools, compact design |

## Scoring

- **0**: Not addressed
- **1**: Basic implementation
- **2**: Good implementation
- **3**: Expert implementation

Maturity levels: Beginner (0–7) / Intermediate (8–14) / Advanced (15–18) / Expert (19–21)

## Output

Produces a structured audit report with per-axis scores, severity-rated findings (🔴/🟡/🟢), and specific remediation actions.
