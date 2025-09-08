# Contract: PreToolUseHook

## Description
This contract defines the interface for the `PreToolUseHook` class, which integrates with Claude's `PreToolUse` mechanism to intercept file edit operations and delegate them to the `MorphEditInterceptor`.

## Methods

### `onPreToolUse(toolName: string, toolArgs: any): Promise<boolean>`

**Purpose**: This method is called by Claude's `PreToolUse` mechanism before a tool is executed. It determines if the tool call should be intercepted and handled by MorphLLM.

**Parameters**:
- `toolName`: `string` - The name of the tool Claude is about to use (e.g., `write_file`, `replace`).
- `toolArgs`: `any` - The arguments passed to the tool.

**Returns**:
- `Promise<boolean>` - A promise that resolves to `true` if the tool call was successfully intercepted and handled by MorphLLM (meaning Claude's original tool execution should be skipped). Returns `false` if the tool call was not intercepted or if MorphLLM failed to handle it, indicating that Claude's original tool execution should proceed as a fallback.

**Behavior**:
1. Checks if `toolName` corresponds to a file edit operation (e.g., `write_file`, `replace`).
2. If it is a file edit operation:
   a. Constructs an `EditRequest` object from `toolArgs`.
   b. Calls `MorphEditInterceptor.interceptAndApply(editRequest)`.
   c. If `MorphEditInterceptor` returns a successful `EditResult`, returns `true`.
   d. If `MorphEditInterceptor` returns a failed `EditResult`, logs the error and returns `false` (allowing Claude's original tool to execute as a fallback).
3. If it is not a file edit operation, returns `false` immediately.

## Dependencies
- Depends on the `MorphEditInterceptor` class.
- Integrates with Claude's internal `PreToolUse` hook system.

## Error Handling
- Should gracefully handle errors from `MorphEditInterceptor` by logging them and returning `false`.
