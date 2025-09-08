# Data Model: PreToolUse Interception for Morph Fast-Apply

## Entities

### EditRequest
Represents the intercepted edit request from Claude, containing the necessary information for MorphLLM to process the edit.

**Fields:**
- `goal`: `string` - A description of the user's intent or the overall goal of the edit (e.g., "Refactor function `foo` to use `bar`").
- `targetFiles`: `Array<string>` - A list of absolute file paths that are intended to be modified by the edit request.
- `originalContent`: `Map<string, string>` - A map where keys are file paths and values are the original content of those files before the edit. This is crucial for generating diffs or for rollback purposes.
- `editOperations`: `Array<EditOperation>` - A detailed list of specific edit operations (e.g., insertions, deletions, replacements) that Claude intends to perform. (Further refinement of `EditOperation` structure may be needed during implementation).

### EditResult
Represents the outcome of the MorphLLM FastApply operation, indicating success or failure and details of the changes made.

**Fields:**
- `success`: `boolean` - True if MorphLLM successfully applied the changes; false otherwise.
- `message`: `string` - A human-readable message providing details about the outcome (e.g., "Edits applied successfully", "MorphLLM failed to apply changes: [error message]").
- `modifiedFiles`: `Array<string>` - A list of absolute file paths that were actually modified by MorphLLM.
- `diffs`: `Map<string, string>` - A map where keys are file paths and values are the diffs (e.g., in unified diff format) between the original and modified content for each file.
- `error`: `string` (optional) - If `success` is false, this field contains a detailed error message or stack trace from MorphLLM.

## Relationships
- An `EditRequest` is processed by MorphLLM to produce an `EditResult`.
