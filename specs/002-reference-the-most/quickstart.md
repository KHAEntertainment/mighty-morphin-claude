# Quickstart Guide: PreToolUse Interception for Morph Fast-Apply

## Overview
This guide demonstrates how the `PreToolUse` interception mechanism works, allowing MorphLLM to directly apply file edits requested by Claude, with a fallback to Claude's standard operations if MorphLLM fails.

## Prerequisites
- A running Claude environment integrated with the `PreToolUseHook` and `MorphEditInterceptor`.
- Access to the filesystem where edits will be applied.

## Scenario 1: Successful MorphLLM Edit Application

### Goal
To observe MorphLLM successfully intercepting and applying a file edit, bypassing Claude's default write operation.

### Steps
1. **Prepare a test file**: Create a file named `test_file.txt` with some initial content (e.g., "Hello, world!").
2. **Simulate Claude's edit request**: Instruct Claude to modify `test_file.txt`. For example, ask Claude to "Change 'Hello' to 'Goodbye' in `test_file.txt`."
3. **Observe interception**: The `PreToolUseHook` should intercept Claude's `write_file` or `replace` tool call.
4. **Verify MorphLLM application**: The `MorphEditInterceptor` should process the request, communicate with MorphLLM, and apply the change directly to `test_file.txt`.
5. **Confirm file content**: Verify that `test_file.txt` now contains "Goodbye, world!" and that Claude's standard file write operation was skipped (e.g., by checking logs or internal state if available).

### Expected Outcome
- `test_file.txt` content is updated by MorphLLM.
- Claude's standard file write operation is not executed for this specific edit.

## Scenario 2: MorphLLM Failure and Claude Fallback

### Goal
To observe Claude's standard file write operation acting as a fallback when MorphLLM fails to apply an edit.

### Steps
1. **Prepare a test file**: Create a file named `another_test_file.txt` with some initial content (e.g., "Initial content.").
2. **Simulate Claude's edit request**: Instruct Claude to modify `another_test_file.txt`. For example, ask Claude to "Add 'New line.' to `another_test_file.txt`."
3. **Simulate MorphLLM failure**: Configure or mock the `MorphEditInterceptor` (or MorphLLM itself) to intentionally fail when processing this specific edit request.
4. **Observe fallback**: The `PreToolUseHook` should intercept the call, attempt to use `MorphEditInterceptor`, but upon its failure, return `false`, allowing Claude's original tool call to proceed.
5. **Confirm file content**: Verify that `another_test_file.txt` now contains "Initial content.\nNew line." and that Claude's standard file write operation was executed as a fallback.

### Expected Outcome
- `another_test_file.txt` content is updated by Claude's standard file write operation.
- Logs should indicate that MorphLLM failed and the fallback mechanism was engaged.
