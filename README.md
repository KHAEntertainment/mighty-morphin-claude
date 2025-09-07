# Morph Hook

**Morph Hook** is a cross&#x2011;platform command&#x2011;line tool and Git hook helper for integrating
the [MorphLLM Fast Apply](https://docs.morphllm.com/models/apply) API into your development
workflow without requiring any special IDE plug‑ins or model-control APIs. The
goal of this project is to provide a low‑latency, deterministic way to apply
structural edits to your source code by writing simple *intent* files and
letting a background watcher call the Morph Apply backend.  When paired with
your favourite code‑assistant (Claude, GPT‑4o, etc.), Morph Hook makes it
trivial to reason about changes conversationally and offload the actual file
updates to a specialised apply model.

This repository contains the TypeScript sources for the command, watch service,
and Git pre‑commit integration.  See [`docs/morphllm.md`](docs/morphllm.md)
for a copy of the upstream MorphLLM documentation, and [`ADR-0001-command-hook-vs-mcp.md`](ADRS/ADR-0001-command-hook-vs-mcp.md)
for an architectural rationale.

## Features

* Securely store your Morph API key using the operating system keychain via
  [`keytar`](https://github.com/atom/node-keytar).
* Enqueue edit intents from the command line.  Intent JSON files live under
  `.morph/queue` and contain your goal along with optional file globs and
  hints.
* Watch for queued intents and call Morph Apply via either a local CLI or
  HTTP API.  The watcher writes logs and diff files into `.morph/out`.
* Provide a Git pre‑commit hook that ensures staged changes are reconciled
  through Morph before committing.
* Expose additional utilities like `morph-hook status` to summarise recent
  operations and `morph-hook githook install` to set up hooks with a single
  command.

## Usage

This project is still in early development.  To build it locally you will
need a current version of Node.js and npm.  After cloning the repository run:

```bash
npm install
npm run build

# configure your API key
npx morph-hook install

# enqueue a dry‑run goal
npx morph-hook enqueue "Rename Foo to Bar" --files "src/**/*.ts" --dry-run

# start watching
npx morph-hook watch

```

To enforce Morph Apply on every commit, install the Git hook:

```bash
npx morph-hook githook install

# commit as usual
git add -A
git commit -m "feat: my changes"

```

See `morph-hook --help` for a full list of commands and flags.

## Project structure

This repository follows a simple modular layout:

| Path | Purpose |
|------|---------|
| `src/cli.ts` | Command-line entry point that wires up subcommands |
| `src/commands/` | Implementations for each top-level command |
| `src/core/` | Shared utilities (backend adapters, keychain, diff/patch) |
| `docs/` | Additional documentation including MorphLLM API reference |
| `ADRS/` | Architectural decision records |

## Contribution

Contributions are welcome!  Feel free to open issues or submit pull requests
with bug fixes and enhancements.  See [`CONTRIBUTING.md`](CONTRIBUTING.md) for
guidelines.

## License

This project is licensed under the MIT License.  See [`LICENSE`](LICENSE) for
details.