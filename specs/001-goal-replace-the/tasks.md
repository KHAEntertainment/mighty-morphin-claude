# Tasks: Claude-Code Native Integration for Morph Fast-Apply

**Input**: Design documents from `/Users/bbrenner/Documents/Scripting Projects/mighty-morphin-claude/specs/001-goal-replace-the/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Paths shown below assume single project structure.

## Phase 3.1: Setup
- [x] T001 Update `package.json` to add `openai`, `fs-extra`, and `picocolors` to dependencies.
- [x] T002 Create new directories `src/hooks` and `src/scripts`.
- [x] T003 Update `tsconfig.json` to ensure `outDir` is set to `dist`.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: This test MUST be written and MUST FAIL before ANY implementation**
- [x] T004 [P] Create the smoke test script `scripts/smokeHook.sh` as defined in `docs/upgrade-guide.md`.

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T005 Implement the `morphApply.ts` hook in `src/hooks/morphApply.ts` as defined in `docs/upgrade-guide.md`.
- [x] T006 Implement the interactive installer script `setupClaude.ts` in `src/scripts/setupClaude.ts` as defined in `docs/upgrade-guide.md`.

## Phase 3.4: Integration
- [x] T007 Create the project-level command file `.claude/commands/morph-apply.md` as defined in `docs/upgrade-guide.md`.
- [x] T008 Create the project-level agent file `.claude/agents/morph-agent.md` as defined in `docs/upgrade-guide.md`.
- [x] T009 Update the project-level settings file `.claude/settings.json` with the hook configuration as defined in `docs/upgrade-guide.md`.
- [x] T010 Create the global-level command file `~/.claude/commands/morph-apply.md` as defined in `docs/upgrade-guide.md`.
- [x] T011 Create the global-level agent file `~/.claude/agents/morph-agent.md` as defined in `docs/upgrade-guide.md`.
- [x] T012 Update the global-level settings file `~/.claude/settings.json` with the hook configuration as defined in `docs/upgrade-guide.md`.

## Phase 3.5: Polish
- [x] T013 [P] Update the `README.md` with the new installation and usage instructions as defined in `docs/upgrade-guide.md`.
- [ ] T014 Run the installer `npm run setup:claude` to configure the project.
- [ ] T015 Run the smoke test `npm run test:hook` to verify the implementation.

## Dependencies
- T001, T002, T003 must be completed before other tasks.
- T004 must be completed before T005.
- T005 and T006 must be completed before T007-T012.
- T013 can be done in parallel with other tasks.
- T014 and T015 must be done last.

## Parallel Example
```
# T004 and T013 can be run in parallel:
Task: "[P] Create the smoke test script scripts/smokeHook.sh as defined in docs/upgrade-guide.md."
Task: "[P] Update the README.md with the new installation and usage instructions as defined in docs/upgrade-guide.md."
```
