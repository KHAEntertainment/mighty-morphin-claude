# Tasks: PreToolUse Interception for Morph Fast-Apply

**Input**: Design documents from `/specs/[###-feature-name]/`
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
- [ ] T001 Install project dependencies (`npm install`)
- [ ] T002 Build the project (`npm run build`)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T003 [P] Implement contract test for `MorphEditInterceptor` - Successful Edit Application in `specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`
- [ ] T004 [P] Implement contract test for `MorphEditInterceptor` - Failed Edit Application (MorphLLM Failure) in `specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`
- [ ] T005 [P] Implement contract test for `MorphEditInterceptor` - File System Application Failure in `specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`
- [ ] T006 [P] Implement contract test for `PreToolUseHook` - Intercepts and Handles `write_file` Successfully in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`
- [ ] T007 [P] Implement contract test for `PreToolUseHook` - Intercepts `write_file` but MorphLLM Fails in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`
- [ ] T008 [P] Implement contract test for `PreToolUseHook` - Does Not Intercept Non-File Edit Tools in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`
- [ ] T009 [P] Implement contract test for `PreToolUseHook` - Handles Invalid `toolArgs` for `write_file` in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`
- [ ] T010 [P] Implement integration test for Successful MorphLLM Edit Application in `src/tests/integration/test_successful_morph_edit.ts`
- [ ] T011 [P] Implement integration test for MorphLLM Failure and Claude Fallback in `src/tests/integration/test_morph_fallback.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T012 [P] Define `EditRequest` interface/class in `src/core/backend.ts`
- [ ] T013 [P] Define `EditResult` interface/class in `src/core/backend.ts`
- [ ] T014 Implement `MorphEditInterceptor` class in `src/core/backend.ts`
- [ ] T015 Implement `PreToolUseHook` class in `src/hooks/morphApply.ts`
- [ ] T016 Update `src/core/backend.ts` to support the interceptor's interaction with MorphLLM.
- [ ] T017 Provide a main export point in `src/cli.ts` for Claude integration.



## Phase 3.5: Polish
- [ ] T018 [P] Research specific performance metrics for `PreToolUse` interception and `MorphLLM FastApply`.
- [ ] T019 [P] Determine if `llms.txt` format is required for library documentation.
- [ ] T020 [P] Investigate requirements and best practices for structured logging.
- [ ] T021 [P] Define the versioning strategy (MAJOR.MINOR.BUILD) for this feature.
- [ ] T022 [P] Determine how BUILD increments will be handled.
- [ ] T023 [P] Plan for handling breaking changes.

## Dependencies
- Tests (T003-T011) before implementation (T012-T017)
- T012, T013 (data models) block T014 (MorphEditInterceptor) and T015 (PreToolUseHook)
- T014 (MorphEditInterceptor) blocks T015 (PreToolUseHook)
- T015 (PreToolUseHook) blocks T016 (backend update) and T017 (export point)
- Implementation (T012-T017) before polish (T018-T023)

## Parallel Example
```
# Launch T003-T011 together (all test tasks are parallelizable):
Task: "Implement contract test for `MorphEditInterceptor` - Successful Edit Application in `specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`"
Task: "Implement contract test for `MorphEditInterceptor` - Failed Edit Application (MorphLLM Failure) in `specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`"
Task: "Implement contract test for `MorphEditInterceptor` - File System Application Failure in `specs/002-reference-the-most/tests/test-morph-edit-interceptor.md`"
Task: "Implement contract test for `PreToolUseHook` - Intercepts and Handles `write_file` Successfully in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`"
Task: "Implement contract test for `PreToolUseHook` - Intercepts `write_file` but MorphLLM Fails in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`"
Task: "Implement contract test for `PreToolUseHook` - Does Not Intercept Non-File Edit Tools in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`"
Task: "Implement contract test for `PreToolUseHook` - Handles Invalid `toolArgs` for `write_file` in `specs/002-reference-the-most/tests/test-pre-tool-use-hook.md`"
Task: "Implement integration test for Successful MorphLLM Edit Application in `src/tests/integration/test_successful_morph_edit.ts`"
Task: "Implement integration test for MorphLLM Failure and Claude Fallback in `src/tests/integration/test_morph_fallback.ts`"
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

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task