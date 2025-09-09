# Tasks: PreToolUse Interception for Morph Fast-Apply

**Input**: Design documents from `/specs/002-reference-the-most/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [x] T001 Install project dependencies (`npm install`) - Completed
- [x] T002 Configure linting and testing (e.g., `tsconfig.json`, `jest.config.js`) - Completed

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T003 [P] Implement contract test for `MorphEditInterceptor` - Successful Edit Application in `/workspaces/mighty-morphin-claude/specs/002-reference-the-most/tests/test-morph-edit-interceptor.md` - Completed
- [x] T004 [P] Implement contract test for `PreToolUseHook` - Intercepted File Edit - MorphLLM Success in `/workspaces/mighty-morphin-claude/specs/002-reference-the-most/tests/test-pre-tool-use-hook.md` - Completed
- [x] T005 [P] Implement integration test for Successful MorphLLM Edit Application (Scenario 1) in `tests/integration/successful_morph_edit.test.ts` - Completed
- [x] T006 [P] Implement integration test for MorphLLM Failure and Claude Fallback (Scenario 2) in `tests/integration/morph_fallback.test.ts` - Completed

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T007 [P] Define `EditRequest` data model in `src/core/backend.ts` - Completed
- [x] T008 [P] Define `EditResult` data model in `src/core/backend.ts` - Completed
- [x] T009 Implement `MorphEditInterceptor` class in `src/core/backend.ts` - Completed
- [x] T010 Implement `PreToolUseHook` class in `src/hooks/morphApply.ts` - Completed
- [x] T011 Update `src/core/backend.ts` to support the interceptor's interaction with MorphLLM. - Completed
- [x] T012 Create `src/index.ts` as the main export point for Claude integration. - Completed

## Phase 3.5: Polish
- [x] T013 [P] Add JSDoc comments to new classes and methods in `src/core/backend.ts` and `src/hooks/morphApply.ts`. - Completed
- [x] T014 [P] Ensure all new code adheres to project's linting rules. - Completed

## Dependencies
- Setup tasks (T001-T002) before all other tasks.
- Test tasks (T003-T006) before core implementation tasks (T007-T012).
- Data model tasks (T007-T008) before `MorphEditInterceptor` (T009) and `PreToolUseHook` (T010).
- `MorphEditInterceptor` (T009) before `PreToolUseHook` (T010).
- `PreToolUseHook` (T010) before updating `backend.ts` (T011) and creating `index.ts` (T012).
- Core implementation tasks (T007-T012) before polish tasks (T013-T014).

## Parallel Example
```
# Launch T003-T006 together (all test tasks are parallelizable):
Task: "Implement contract test for `MorphEditInterceptor` - Successful Edit Application in `/workspaces/mighty-morphin-claude/specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`"
Task: "Implement contract test for `PreToolUseHook` - Intercepted File Edit - MorphLLM Success in `/workspaces/mighty-morphin-claude/specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`"
Task: "Implement integration test for Successful MorphLLM Edit Application (Scenario 1) in `tests/integration/successful_morph_edit.test.ts`"
Task: "Implement integration test for MorphLLM Failure and Claude Fallback (Scenario 2) in `tests/integration/morph_fallback.test.ts`"

# Launch T007-T008 together (data model definitions are parallelizable):
Task: "Define `EditRequest` data model in `src/core/backend.ts`"
Task: "Define `EditResult` data model in `src/core/backend.ts`"

# Launch T013-T014 together (polish tasks are parallelizable):
Task: "Add JSDoc comments to new classes and methods in `src/core/backend.ts` and `src/hooks/morphApply.ts`"
Task: "Ensure all new code adheres to project's linting rules."
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests
- [x] All entities have model tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task