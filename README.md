# MUSUBIX2

[![CI](https://github.com/nahisaho/musubix2/actions/workflows/ci.yml/badge.svg)](https://github.com/nahisaho/musubix2/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/musubix2.svg)](https://www.npmjs.com/package/musubix2)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

**Specification Driven Development (SDD) System** — AI-powered requirements-driven development tool

[**日本語**](README-ja.md) | English

---

## Overview

MUSUBIX2 is a **Specification Driven Development (SDD)** system that enforces a Requirements → Design → Implementation workflow. It guarantees that all code is traceable to EARS-format requirements.

### Key Features

- **EARS Requirements** — Structured requirements using Easy Approach to Requirements Syntax (6 patterns)
- **Requirements Interview** — 1-question-at-a-time gathering of missing information before generating specs
- **100% Traceability** — Full bidirectional tracing: Requirements ↔ Design ↔ Code ↔ Tests
- **Quality Gates** — Automated verification at phase transitions
- **Dual-Platform Setup** — One-command install for GitHub Copilot and Claude Code with auto-detection
- **Agent Skills** — 8 bundled SDD skills (orchestrator, requirements, design, codegen, test, trace, policy, review)
- **MCP Server** — Model Context Protocol with 61 tools, JSON-RPC 2.0, stdio/SSE transports
- **Formal Verification** — EARS → SMT-LIB2 conversion for Z3 / Lean 4 verification
- **Multi-Language AST** — Recursive descent parsers for Python, Java, Go, Rust, Ruby, PHP
- **Git-native Knowledge** — Auto-build knowledge graphs from git history (co-change, author expertise)
- **Neurosymbolic AI** — TF-IDF search, Wake-Sleep patterns, E-graph learning, program synthesis

---

## Installation

```bash
npm install musubix2
```

## Quick Start

Set up SDD in your project (installs instructions, Agent Skills, and MCP config for the detected platform):

```bash
npx musubix2 init --platform auto    # auto-detect GitHub Copilot / Claude Code
npx musubix2 init --platform both    # set up both platforms
npx musubix2 init --dry-run          # preview changes without writing files
npx musubix2 init --update           # update existing setup (with .bak backups)
```

Generated per platform:

| Platform | Files |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/skills/*`, `.vscode/mcp.json` |
| Claude Code | `CLAUDE.md`, `.claude/skills/*`, `.mcp.json` |

Start the MCP server directly:

```bash
npx musubix2 mcp                     # stdio transport (default)
npx musubix2 mcp --transport sse     # HTTP/SSE transport
```

The stdio server stays alive for the client session and exposes 61 tools across
13 categories (`tools/list`). The `sdd-core`, `knowledge`, `security`,
`code-analysis`, `ontology`, `synthesis`, and `decisions` tools run against real
package APIs; the remaining groups are being wired incrementally.

### Development (from source)

```bash
git clone https://github.com/nahisaho/musubix2.git
cd musubix2/src
npm install
npm run build    # or: npx tsc -b
npm run test     # or: npx vitest run
```

---

## Architecture

- **Monorepo**: 26 packages (npm workspaces)
- **Language**: TypeScript (ESM)
- **Test Framework**: Vitest
- **Build**: `tsc -b` (Project References)
- **Runtime**: Node.js ≥ 20

```
musubix2/
└── src/
    ├── packages/          # 26 workspace packages
    ├── steering/          # Project constitution, rules, ADRs
    ├── storage/specs/     # SDD documents: requirements/ designs/ plans/ reviews/
    ├── package.json       # Root workspace definition
    ├── tsconfig.json      # TypeScript project references
    └── vitest.config.ts   # Test configuration
```

---

## Packages

| Package | Description |
|---|---|
| `agent-orchestrator` | Sub-agent management and task delegation orchestrator |
| `assistant-axis` | Assistant identity stabilization, domain classification, drift analysis |
| `codegraph` | AST analysis, multi-language parser (6 languages), GraphRAG search |
| `core` | Core MUSUBIX2 library providing the SDD engine |
| `decisions` | Architecture Decision Records (ADR) management |
| `deep-research` | Iterative research engine with evidence chains and security filters |
| `dfg` | Data Flow Graph / Control Flow Graph construction and analysis |
| `expert-delegation` | Semantic query routing to domain experts |
| `formal-verify` | EARS → SMT-LIB2 conversion and Z3 subprocess verification |
| `git-knowledge` | Git log/blame → knowledge graph (co-change analysis, author expertise) |
| `knowledge` | Entity-relationship knowledge graph storage and exploration |
| `lean` | Lean 4 EARS → Lean conversion and hybrid verification |
| `library-learner` | Library learning using E-graphs and structural similarity |
| `mcp-server` | MCP server with 61 tools, JSON-RPC 2.0, stdio/SSE transports |
| `musubi` | Lightweight core SDD wrapper, CLI (29 commands), dual-platform installer, skill packaging |
| `neural-search` | TF-IDF embedding-based similarity search engine |
| `ontology-mcp` | N3 triple store, rule engine, consistency verification |
| `pattern-mcp` | AST pattern extraction and MCP server |
| `policy` | Constitutional rule enforcement and quality gate engine |
| `sdd-ontology` | Domain concept modeling for SDD workflows |
| `security` | Compliance checks, vulnerability scanning, secret detection |
| `skill-harness` | Runtime contracts, I/O schemas, test harnesses |
| `skill-manager` | Pluggable agent skill registration and lifecycle management |
| `synthesis` | DSL builder (16 transforms), version spaces, program synthesis |
| `wake-sleep` | N-gram + PMI pattern extraction via Wake-Sleep cycles |
| `workflow-engine` | SDD phase management, state tracking, quality gate enforcement |

---

## SDD Workflow

```
Requirements ──▶ Design ──▶ Task Breakdown ──▶ Implementation ──▶ Completion
```

Quality gates are applied at each phase transition — progress is blocked until criteria are met.

### Constitutional Principles

| Article | Principle |
|---|---|
| I | **Library-First** — Every package is usable as a standalone library |
| II | **CLI Interface** — All features accessible via `npx musubix <command>` |
| III | **Test-First** — Red → Green → Blue cycle, 80% coverage threshold |
| IV | **EARS Format** — 6 structured requirement patterns |
| V | **Traceability** — 100% tracing across Requirements ↔ Design ↔ Code ↔ Tests |
| VI | **Project Memory** — `steering/` as the single source of truth |
| VII | **Design Pattern Documentation** — Document rationale whenever a design pattern is applied |
| VIII | **ADR Records** — Record significant design decisions as Architecture Decision Records |
| IX | **Quality Gates** — Phase transitions are blocked until gates pass |

---

## CLI Commands

```bash
npx musubix --help              # Show help

# SDD Workflow
npx musubix init                # Initialize SDD project (--platform auto|copilot|claude|both)
                                #   also scaffolds steering/ and storage/specs/requirements.md
npx musubix requirements analyze <file>   # Validate EARS requirements (alias: req <file>)
npx musubix req:wizard          # Requirements creation wizard
npx musubix req:interview       # 1-question-at-a-time requirements gathering
npx musubix design generate <file>        # Design generation (or: design <file>)
npx musubix design:c4 <file>    # C4 diagram generation (--level context|container|component)
npx musubix design:verify <file># Design verification (SOLID)
npx musubix tasks               # Task breakdown management (validate|list|stats)
npx musubix codegen generate <name>       # Code generation (--type class|interface|function)
npx musubix test:gen <file|dir> # Test generation (accepts a file or a directory)
npx musubix trace matrix        # Requirement → code coverage matrix (--specs <file> --src <dir>)
npx musubix trace:verify        # Coverage verification (--specs --src [--strict])
npx musubix workflow            # Workflow management (status|approve|transition, persisted)
npx musubix status              # Status display

# Analysis & Verification
npx musubix cg index <file|dir> # Code graph analysis (index|search|stats|languages)
npx musubix security <file|dir> # Security scanning (--fail-on critical|high|medium|low|info)
npx musubix policy              # Policy verification
npx musubix ontology add <s> <p> <o>      # Ontology management (add|list|validate|stats, persisted)

# Knowledge & Research
npx musubix knowledge           # Knowledge graph operations (put|get|link|query|stats, persisted)
npx musubix decision            # ADR management (create|list|get|accept|deprecate, persisted)
npx musubix deep-research       # Deep research queries

# Neurosymbolic
npx musubix explain <file|code> # Code explanation
npx musubix learn analyze <file|dir>      # Library pattern learning
npx musubix synthesis dsl <input> --ops trim,camelCase,...   # DSL transform pipeline
npx musubix skills              # Skill management (list|validate|create)
npx musubix scaffold package <name>       # Project scaffolding (project|package|skill, writes files)
npx musubix repl                # Interactive REPL
npx musubix watch               # File watcher

# MCP
npx musubix mcp                 # Start MCP server (--transport stdio|sse, --port)
```

> Error paths return non-zero exit codes (missing files, invalid arguments,
> `--strict`/`--fail-on` gate failures), so these commands are CI-friendly.
> Stateful commands (`knowledge`, `decision`, `ontology`, `workflow`) persist
> under the project directory and survive across separate invocations.

---

## Agent Skills

`init` installs 8 SDD Agent Skills for GitHub Copilot (`.github/skills/`) and Claude Code (`.claude/skills/`):

| Skill | Role |
|---|---|
| `orchestrator` | Routes tasks to skills, enforces phase transitions and quality gates |
| `requirements-analyst` | EARS requirements creation, validation, and 1-question interview (Phase 1) |
| `design-generator` | SOLID-compliant design docs, C4 diagrams, ADRs (Phase 2) |
| `code-generator` | Template-based code generation with 4-layer architecture (Phase 4) |
| `test-engineer` | Red → Green → Blue enforcement, test generation, coverage gates |
| `traceability-auditor` | Trace matrix generation, gap detection, impact analysis |
| `constitution-enforcer` | Validates the 9 constitutional articles (CONST-001–009) |
| `review-orchestrator` | Cross-model alternating review and consensus checks |

---

## Development

```bash
cd src
npx tsc -b                                    # Build
npx vitest run                                # Run tests
npx vitest run --coverage                     # Tests with coverage
npx eslint packages/*/src                     # Lint
npx prettier --write "packages/*/src/**/*.ts" # Format
```

---

## Documentation

- [日本語 README](README-ja.md)
- [Contributing Guide (日本語)](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE)
