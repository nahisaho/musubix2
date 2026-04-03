# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-03

### Added

- **25 packages** in monorepo architecture with npm workspaces
- **SDD Engine** — Requirements → Design → Task Breakdown → Implementation → Completion workflow
- **EARS Requirements** — 6 pattern types (Ubiquitous, Event-Driven, State-Driven, Optional, Unwanted, Complex)
- **Traceability** — Full bidirectional tracing between requirements, design, code, and tests
- **Formal Verification** — EARS → SMT-LIB2 conversion for Z3 verification
- **Lean 4 Integration** — EARS → Lean 4 theorem conversion with environment detection
- **Code Graph** — AST analysis, dependency graphs, and GraphRAG search
- **Knowledge Graph** — Entity-relationship storage and exploration
- **Ontology MCP** — N3 triple store, rule engine, consistency verification
- **Policy Engine** — Constitutional rule enforcement and quality gates
- **Security Scanner** — Compliance checks, vulnerability scanning, secret detection
- **Workflow Engine** — SDD phase management with quality gate enforcement
- **MCP Server** — 105+ tools via Model Context Protocol
- **Agent Orchestrator** — Sub-agent management and cross-model review orchestration
- **Neural Search** — Embedding-based similarity search engine
- **Deep Research** — Knowledge accumulation research engine with security filters
- **Domain Classification** — 62 domains with Japanese keywords and components
- **Code Generation** — 12 template types, 16 programming languages
- **CLI** — 16 commands via `npx musubix <command>`
- **GitHub Copilot Skills** — 8 skills for orchestration, review, requirements, design, codegen, testing, traceability, and constitution enforcement
- **CI/CD** — GitHub Actions with Node.js 20/22 matrix, typecheck, lint, test, coverage
- **1193 tests** across 85 test files with 80% coverage thresholds

### Infrastructure

- TypeScript 5.7+ with ESM (`type: "module"`, `NodeNext`)
- Project References with composite/incremental builds (`tsc -b`)
- Vitest with v8 coverage provider
- ESLint + Prettier formatting
- Docker support

[0.1.0]: https://github.com/nahisaho/musubix2/releases/tag/v0.1.0
