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
- **100% Traceability** — Full bidirectional tracing: Requirements ↔ Design ↔ Code ↔ Tests
- **Quality Gates** — Automated verification at phase transitions
- **MCP Server** — Model Context Protocol with 105+ tools
- **Formal Verification** — EARS → SMT-LIB2 conversion for Z3 / Lean 4 verification

---

## Installation

```bash
npm install musubix2
```

## Quick Start

```bash
git clone https://github.com/nahisaho/musubix2.git
cd musubix2/src
npm install
npm run build    # or: npx tsc -b
npm run test     # or: npx vitest run
```

---

## Architecture

- **Monorepo**: 25 packages (npm workspaces)
- **Language**: TypeScript (ESM)
- **Test Framework**: Vitest
- **Build**: `tsc -b` (Project References)
- **Runtime**: Node.js ≥ 20

```
musubix2/
└── src/
    ├── packages/          # 25 workspace packages
    ├── steering/          # Project constitution, rules, ADRs
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
| `codegraph` | AST analysis, dependency graphs, and GraphRAG search |
| `core` | Core MUSUBIX2 library providing the SDD engine |
| `decisions` | Architecture Decision Records (ADR) management |
| `deep-research` | Knowledge accumulation research engine with security filters |
| `dfg` | Data Flow Graph / Control Flow Graph construction and analysis |
| `expert-delegation` | Semantic query routing to domain experts |
| `formal-verify` | EARS → SMT-LIB2 conversion and Z3 verification |
| `knowledge` | Entity-relationship knowledge graph storage and exploration |
| `lean` | Lean 4 environment detection, EARS → Lean conversion |
| `library-learner` | Library learning using E-graphs |
| `mcp-server` | MCP server with 105+ tools |
| `musubi` | Lightweight core SDD wrapper and CLI |
| `neural-search` | Embedding-based similarity search engine |
| `ontology-mcp` | N3 triple store, rule engine, consistency verification |
| `pattern-mcp` | AST pattern extraction and MCP server |
| `policy` | Constitutional rule enforcement and quality gate engine |
| `sdd-ontology` | Domain concept modeling for SDD workflows |
| `security` | Compliance checks, vulnerability scanning, secret detection |
| `skill-harness` | Runtime contracts, I/O schemas, test harnesses |
| `skill-manager` | Pluggable agent skill registration and lifecycle management |
| `synthesis` | DSL builder, version spaces, program synthesis |
| `wake-sleep` | Pattern extraction and integration via Wake-Sleep cycles |
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

---

## CLI Commands

```bash
npx musubix --help          # Show help
npx musubix req             # Requirements management
npx musubix design          # Design generation
npx musubix codegen         # Code generation
npx musubix trace           # Traceability verification
npx musubix policy          # Policy verification
npx musubix workflow        # Workflow management
npx musubix security        # Security scanning
npx musubix status          # Status display
```

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
