# mighty-morphin-claude Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-08

## Active Technologies
-  +  (002-reference-the-most)

## Project Structure
```
src/
tests/
```

## Commands
# Add commands for 

## Code Style
: Follow standard conventions

## Recent Changes
- 002-reference-the-most: Added  + 

<!-- MANUAL ADDITIONS START -->
# Mighty Morphin Claude - Project Context

## Project Overview

**Mighty Morphin Claude** is a cross-platform command-line tool and Claude-Code hook helper that integrates the MorphLLM Fast Apply API into your development workflow. The project provides a low-latency, deterministic way to apply structural edits to source code by writing simple intent files and letting a background watcher call the Morph Apply backend.

When paired with code assistants like Claude or GPT-4, Mighty Morphin Claude makes it trivial to reason about changes conversationally and offload the actual file updates to a specialized apply model.

### Key Features

- **Claude-Code Native Integration**: Automatically apply Morph Fast-Apply merges in place of standard code edits
- **Manual Control**: A `/morph-apply` slash command for manual merges
- **Proactive Sub-agent**: A sub-agent that suggests using `/morph-apply` for code edits
- **Flexible Installation**: Install the integration at project level, global level, or both
- **Secure API Key Storage**: Securely store your Morph API key using the operating system keychain

## Project Structure

```
/workspaces/mighty-morphin-claude/
├── src/
│   ├── cli.ts              # Entry point that wires up subcommands
│   ├── commands/           # Implementations for each top-level command
│   ├── core/               # Shared utilities (backend adapters, keychain, diff/patch)
│   ├── hooks/              # Claude-Code integration hooks
│   └── scripts/            # Installation and setup scripts
├── docs/                   # Additional documentation including MorphLLM API reference
├── ADRS/                   # Architectural decision records
├── dist/                   # Compiled output (TypeScript -> JavaScript)
├── .morph/                 # Runtime data directory (created at runtime)
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Technology Stack

- **Language**: TypeScript (ES2022)
- **Runtime**: Node.js (version 18.18.0 or higher)
- **Module System**: ES Modules
- **Build Tool**: TypeScript compiler (tsc)
- **Package Manager**: npm
- **Key Dependencies**:
  - `commander` - CLI framework
  - `keytar` - OS keychain integration
  - `openai` - OpenAI client for Morph API access
  - `fs-extra`, `glob` - File system utilities
  - `picocolors` - Terminal colors

## Core Components

### CLI Commands

The main CLI tool (`morph-hook`) provides several subcommands:

1. **install** - Configure and store your Morph API key
2. **watch** - Watch the queue for edit intents and process them
3. **enqueue** - Enqueue an edit intent for processing
4. **precommit** - Reconcile staged changes with Morph before committing
5. **status** - Show recent Morph operations
6. **githook** - Manage Git hooks for morph-hook (install/uninstall)

### Claude Integration Hook

The `src/hooks/morphApply.ts` file contains a specialized hook that integrates with Claude-Code. This hook:

- Reads tool usage data from stdin
- Extracts file paths and content updates
- Calls the Morph API to merge changes
- Writes the merged result back to disk

### Core Modules

- **backend.ts** - Handles communication with MorphLLM (both CLI and HTTP backends)
- **config.ts** - Manages configuration in `~/.morph/config.json`
- **keychain.ts** - Secure API key storage using OS keychain
- **patch.ts** - Applies edits to the file system
- **fsutils.ts** - File system utilities for reading files and resolving globs
- **log.ts** - Logging utilities for tracking operations

## Building and Running

### Development Commands

```bash
# Build the project
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Smoke test for hook integration
npm run test:hook
```

### Installation and Setup

```bash
# Install Claude-Code integration
npm run setup:claude
```

### Runtime Usage

```bash
# Watch for edit intents
morph-hook watch

# Enqueue an edit intent
morph-hook enqueue "Rename function processItems to transformItems" -f "src/**/*.ts"

# Check status of recent operations
morph-hook status

# Install Git pre-commit hook
morph-hook githook install
```

## Integration Patterns

### Automatic Merging

Once installed, the integration automatically merges code edits when you use the `Edit`, `Write`, or `MultiEdit` tools in Claude-Code.

### Manual Merging

You can manually trigger a merge using the `/morph-apply` slash command:

```
/morph-apply "<description of your change>" <file_path>
```

### Proactive Sub-agent

The `morph-agent` will proactively suggest using the `/morph-apply` command in place of standard code edits.

## Configuration

Configuration is stored in `~/.morph/config.json` and includes:
- Account name
- API base URL (defaults to https://api.morphllm.com)

API keys are securely stored in the OS keychain using `keytar`, with fallback to environment variables (`MORPH_LLM_API_KEY` or `MORPH_API_KEY`).

## Architecture Decisions

Refer to `ADRS/` for architectural decision records. The key decision was to use a command + hook design rather than an MCP (Model-Controlled Plugin) approach for better performance and determinism.

## Runtime Directories

At runtime, the tool creates:
- `.morph/queue/` - Intent files to be processed
- `.morph/out/` - Log files from operations
- `~/.morph/` - User configuration and keychain

These directories are git-ignored by default.

## Development Conventions

- TypeScript with strict typing
- ES Modules
- Modular command structure
- Error handling with proper exit codes
- Cross-platform compatibility
- Secure key storage
- Comprehensive logging
<!-- MANUAL ADDITIONS END -->