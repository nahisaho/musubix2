# CodeGraph (`cg`) — Static Dependency Analysis

CodeGraph builds a symbol- and file-level dependency graph from source code and
provides analysis, diagnosis, visualization, and CI-gating on top of it. It
parses **C, C++, TypeScript, JavaScript, Python, Java, Go, Rust** and more; C
and TypeScript/JS are the most thoroughly validated.

The graph is persisted to `.musubix/codegraph.json` under the current directory,
so `index` runs once and every other subcommand reads that snapshot.

## Workflow

```bash
npx musubix cg index src/            # build the graph (writes .musubix/codegraph.json)
npx musubix cg stats                 # inspect what was captured
npx musubix cg impact src/auth.ts    # what breaks if auth.ts changes?
npx musubix cg gate --max-cycles 0   # CI: fail on any circular dependency
```

## What gets captured

`cg index` extracts, per file:

- **Definitions** — functions, class methods (`obj.method()`), structs/unions/
  enums (C), classes/interfaces (TS).
- **Import edges** — `#include` / `import` / `use` … (file → module).
- **Call edges** — cross-file function and method calls, resolved to the unique
  defining file. C internal linkage (`static`) binds locally; standard-library
  method names (`map`, `set`, `get`, …) are never resolved to user methods.

`cg index` prints `N file(s), N nodes, N edges`; the reported counts match the
persisted graph exactly.

## Command reference

| Command | Purpose |
|---------|---------|
| `cg index <path>` | Build/refresh the graph from a file or directory |
| `cg search <query>` | Find indexed symbols by name substring |
| `cg stats` | Node/edge counts, kind breakdowns, most-called functions |
| `cg deps [fragment]` | Outgoing dependencies per file (`→ header`, `→ name() [call]`) |
| `cg impact <fragment>` | Reverse reachability — what depends on the target |
| `cg path <from> <to>` | Shortest dependency chain from one file to another |
| `cg candidates [N]` | Rank files by rewrite suitability (self-containment × usage) |
| `cg cycles [fragment] [N]` | Circular file dependencies (strongly-connected components) |
| `cg gate …` | CI quality gate — non-zero exit on rule violations |
| `cg export [fragment]` | Emit the file-level graph as Graphviz DOT or JSON |
| `cg diff <baseline> [current]` | Compare two graph snapshots |
| `cg languages` | List supported languages |

Run `npx musubix cg <subcommand> --help` for per-command usage.

### `cg impact <fragment> [--direct] [--depth N] [--json]`

Which files are (transitively) affected if the matched file changes. Splits
**direct** (depth-1) dependents from **indirect** ones.

```bash
npx musubix cg impact lib/cmdline.c            # full transitive closure
npx musubix cg impact lib/cmdline.c --direct   # only immediate callers
npx musubix cg impact lib/cmdline.c --depth 2  # up to 2 hops
npx musubix cg impact lib/cmdline.c --json     # machine-readable
```

### `cg path <from-fragment> <to-fragment> [--json]`

Shows the shortest dependency chain from a file matching `<from>` to one
matching `<to>` (over depends-on edges) — answers "why does A need B?".

```bash
npx musubix cg path src/api.ts src/db.ts
#   ◉ src/api.ts
#   → src/service.ts
#   → src/db.ts
```

### `cg candidates [N] [--json]`

Ranks files for an isolated rewrite (e.g. to Rust): `score = (functions +
dependents) / (1 + external deps)` — substantive, well-used, self-contained
files first. Test/fixture files are excluded.

```
  score   fns  deps  users  file
   28.6    35    14    394  lib/string.c
   19.3   228    11      4  lib/maple_tree.c
    8.0    17     8     55  lib/kstrtox.c
```

### `cg cycles [fragment] [N] [--json]`

Reports strongly-connected components (size > 1) of the file-level graph, i.e.
circular dependencies, largest first. Per-cycle listings are capped for
readability.

### `cg gate [--max-cycles N] [--forbid A:B[,C:D]] [--json]`

CI quality gate. Evaluates rules against the current graph and **exits non-zero
on any violation** (exit 1 = failed, 0 = passed, 2 = no rule given).

- `--max-cycles N` — fail if dependency cycles exceed `N`.
- `--forbid A:B` — fail if any file matching `A` depends on one matching `B`
  (layering rule; comma-separate multiple rules).

```bash
npx musubix cg gate --max-cycles 0                 # no cycles allowed
npx musubix cg gate --forbid "ui/:db/,api/:ui/"    # layering rules
npx musubix cg gate --max-cycles 5 --json          # for scripting
```

### `cg export [fragment] [--format dot|json] [--out <file>] [--cluster]`

Emits the file-level dependency graph. DOT nodes are files (labelled by
basename); `imports` are dashed, `calls` solid. `--cluster` (DOT only) groups
nodes into a `subgraph cluster_<dir>` per directory, which makes large graphs
navigable in Graphviz.

```bash
npx musubix cg export --out graph.dot && dot -Tsvg graph.dot -o graph.svg
npx musubix cg export --cluster --out graph.dot   # grouped by directory
npx musubix cg export auth --format json          # subgraph as JSON
```

### `cg diff <baseline.json> [current.json] [--json]`

Compares two persisted graphs (files and dependency edges added/removed).
`current` defaults to the working `.musubix/codegraph.json`. Useful for
change-impact review across branches.

```bash
cp .musubix/codegraph.json /tmp/before.json   # snapshot before a change
# … make changes, then re-index …
npx musubix cg index src/
npx musubix cg diff /tmp/before.json           # what changed?
```

## JSON output for automation

`impact`, `cycles`, `candidates`, `diff`, and `gate` accept `--json` for
machine-readable output that pipes cleanly into `jq` or CI scripts:

```bash
npx musubix cg impact src/core.ts --json | jq '.counts.direct'
npx musubix cg cycles --json | jq '.count'
```

## CI integration example (GitHub Actions)

```yaml
- name: Architecture gate
  run: |
    npx musubix cg index src/
    npx musubix cg gate --max-cycles 0 --forbid "ui/:infra/"
```

The `gate` step fails the job (non-zero exit) when a new circular dependency or
a forbidden layering edge is introduced.
