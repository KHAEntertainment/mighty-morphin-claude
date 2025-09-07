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
for a copy of the upstream MorphLLM documentation, and [`ADRS/ADR-0001-command-hook-vs-mcp.md`](ADRS/ADR-0001-command-hook-vs-mcp.md)
for an architectural rationale.

## Features

*   **Claude-Code Native Integration**: Automatically apply Morph Fast-Apply merges after code edits.
*   **Manual Control**: A `/morph-apply` slash command for manual merges.
*   **Proactive Sub-agent**: A sub-agent that suggests using `/morph-apply` after code edits.
*   **Flexible Installation**: Install the integration at the project level, global level, or both.
*   **Secure API Key Storage**: Securely store your Morph API key using the operating system keychain.

## Installation

To install the Claude-Code integration, run the following command from the root of the repository:

```bash
npm run setup:claude
```

The installer will guide you through the process of choosing an installation scope (project, global, or both) and configuring your MorphLLM API key.

To rerun the installer at any time, simply run the command again.

## Usage

### Automatic Merging

Once installed, the integration will automatically merge your code edits when you use the `Edit`, `Write`, or `MultiEdit` tools in Claude-Code.

### Manual Merging

You can manually trigger a merge using the `/morph-apply` slash command:

```
/morph-apply "<description of your change>" <file_path>
```

### Proactive Sub-agent

The `morph-agent` will proactively suggest using the `/morph-apply` command after you make code edits.

### Smoke Test

To verify that the integration is working correctly, you can run the smoke test:

```bash
npm run test:hook
```

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