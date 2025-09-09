# Contract: PreToolUseHook

## Description
This contract defines the interface for the `PreToolUseHook` class, which integrates with Claude's `PreToolUse` mechanism to intercept file edit operations and delegate them to the `MorphEditInterceptor`.

## Methods

### `onPreToolUse(toolName: string, toolInput: any, toolResp?: any): Promise<boolean>`

**Purpose**: This method is called by Claude's `PreToolUse` mechanism before a tool is executed. It determines if the tool call should be intercepted and handled by MorphLLM.

**Parameters**:
- `toolName`: `string` - The name of the tool Claude is about to use (e.g., `write_file`, `replace`).
- `toolInput`: `any` - The arguments passed to the tool.
- `toolResp`: `any` (optional) - The tool response (may include `filePath`).

**Returns**:
- `Promise<boolean>` - A promise that resolves to `true` if the tool call was successfully intercepted and handled by MorphLLM (meaning Claude's original tool execution should be skipped). Returns `false` if the tool call was not intercepted or if MorphLLM failed to handle it, indicating that Claude's original tool execution should proceed as a fallback.

**Behavior**:
1. Checks if `toolName` corresponds to a file edit operation (e.g., `write_file`, `replace`).
2. If it is a file edit operation:
   a. Resolves `filePath` from `toolResp.filePath` or `toolInput.file_path`.  
   b. Constructs an `EditRequest` object from `toolInput` and the resolved `filePath`.  
   c. Calls `MorphEditInterceptor.interceptAndApply(editRequest)`.  
   d. If `MorphEditInterceptor` returns a successful `EditResult`, returns `true`.  
   e. If `MorphEditInterceptor` returns a failed `EditResult`, logs the error and returns `false` (allowing Claude's original tool to execute as a fallback).  
3. If it is not a file edit operation, returns `false` immediately.

## Dependencies
- Depends on the `MorphEditInterceptor` class.
- Integrates with Claude's internal `PreToolUse` hook system.

## Error Handling
- Should gracefully handle errors from `MorphEditInterceptor` by logging them and returning `false`.
