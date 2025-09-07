# Implementation Plan: Claude-Code Native Integration for Morph Fast-Apply

**Branch**: `001-goal-replace-the` | **Date**: 2025-09-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-goal-replace-the/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
This feature replaces the existing git-hook based integration with a native Claude-Code integration. It will automatically apply Morph Fast-Apply merges after code edits, provide a manual `/morph-apply` command, and include a proactive sub-agent to encourage its use. The technical approach is detailed in the `docs/upgrade-guide.md` file and involves creating a Node.js script that is triggered by a `PostToolUse` hook.

## Technical Context
**Language/Version**: TypeScript 5.1.6
**Primary Dependencies**: `openai`, `fs-extra`, `picocolors`, `keytar`, `commander`, `glob`, `uuid`
**Storage**: Filesystem (`.claude/` and `~/.claude/`) and OS Keychain (via `keytar`)
**Testing**: `eslint`, `prettier`, `tsc --noEmit`, and a smoke test (`scripts/smokeHook.sh`)
**Target Platform**: Node.js >= 20.3.1
**Project Type**: Single project (CLI tool)
**Performance Goals**: Low latency for hook execution to avoid blocking the user.
**Constraints**: The integration should not require any special IDE plugins or model-control APIs.
**Scale/Scope**: Individual developer usage.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: The project constitution at `/memory/constitution.md` is a template and does not contain specific principles. The plan will proceed assuming it complies with the general principles of good software design, such as those outlined in the plan template.

## Project Structure

### Documentation (this feature)
```
specs/001-goal-replace-the/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── settings.json
│   ├── morph-apply.md
│   └── morph-agent.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── hooks/
├── scripts/
└── core/

tests/

scripts/
```

**Structure Decision**: Option 1: Single project. The project is a CLI tool and does not have a separate frontend or backend.

## Phase 0: Outline & Research
Completed. See [research.md](./research.md) for details.

## Phase 1: Design & Contracts
Completed. See [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), and the [contracts/](./contracts) directory for details.

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base.
- Generate tasks from the implementation details in `docs/upgrade-guide.md`.
- Create tasks for each file to be created or modified.
- Create tasks for updating `package.json` and `README.md`.
- Create a task for running the smoke test.

**Ordering Strategy**:
- TDD order: Create the smoke test first.
- Dependency order: Create the `morphApply.js` hook script before the installer that uses it.
- Group tasks by functionality (e.g., installer, hook, commands, agents).

**Estimated Output**: 10-15 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations identified.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*