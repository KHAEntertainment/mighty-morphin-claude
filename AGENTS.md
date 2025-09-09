# Repository Guidelines

## Project Structure & Module Organization
- `src/cli.ts`: CLI entry wiring subcommands.
- `src/commands/`: User-facing commands (install, precommit, watch, etc.).
- `src/core/`: Shared utilities (backend, config, keychain, fs, patch, log).
- `src/hooks/` and `.claude/hooks/`: Hook implementation and installed hook artifact.
- `src/scripts/`: Setup and helper scripts. Built output lives in `dist/`.
- `tests/contract`, `tests/integration`: Jest test suites. Fixtures in `scripts/fixtures`.
- `docs/`, `ADRS/`, `templates/`, `specs/`: Documentation and design notes.

## Build, Test, and Development Commands
- `npm ci` — install deps (use for CI).
- `npm run build` — compile TypeScript to `dist/`.
- `npm test` — run Jest test suite.
- `npm run lint` — ESLint with TypeScript rules + Prettier compatibility.
- `npm run typecheck` — TS type checking without emit.
- `npm run setup:claude` — configure and install Claude-Code integration.
- `npm run test:hook` — smoke test the post-tool-use hook.

## Coding Style & Naming Conventions
- Language: TypeScript (ES2022, NodeNext modules). Indent 2 spaces.
- Files: kebab-case `.ts` (e.g., `hook-entrypoint.ts`, `precommit.ts`).
- Names: camelCase for vars/functions; PascalCase for types/interfaces.
- Linting: ESLint (`.eslintrc.cjs`); unused args must be prefixed with `_`.
- Formatting: Prettier (via `eslint-config-prettier`). Do not edit `dist/` or `.claude/hooks/*.js` directly; change `src/*` and rebuild.

## Testing Guidelines
- Framework: Jest + ts-jest (`jest.config.cjs`).
- Location: `tests/contract` and `tests/integration`.
- Naming: `*.test.ts` (e.g., `morph-edit-interceptor.test.ts`).
- Run: `npm test` (single file: `npm test -- tests/integration/successful_morph_edit.test.ts`).
- Add tests for new behavior and regressions; prefer small, focused cases.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat(scope): short summary` (e.g., `feat(core): add backend retry`).
- Common scopes: `core`, `commands`, `hooks`, `scripts`, `docs`.
- PRs include: clear description, linked issues (`Closes #123`), test plan/output, and doc updates when applicable.

## Security & Configuration Tips
- Node.js: 18.18+ (or 20+) per `package.json` engines.
- Secrets: `MORPH_LLM_API_KEY` stored via OS keychain (fallback to env var). Never commit secrets.
- Dev Containers: if needed, set `NODE_PATH` per README to resolve global modules.
