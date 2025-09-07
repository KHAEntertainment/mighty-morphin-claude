# Phase 0: Research

## Technical Stack

*   **Language**: TypeScript 5.1.6
*   **Platform**: Node.js >= 20.3.1
*   **Dependencies**:
    *   `openai`: To interact with the MorphLLM API.
    *   `fs-extra`: For file system operations.
    *   `picocolors`: For colored output in the console.
    *   `keytar`: For securely storing the MorphLLM API key.
    *   `commander`, `glob`, `uuid`: Existing project dependencies.

## Key Decisions

The implementation will follow the detailed guide provided in `docs/upgrade-guide.md`. The key decisions are:

*   **Integration Strategy**: A Claude-Code native integration using hooks, slash commands, and a sub-agent.
*   **Installation**: An interactive installer will allow users to choose between project-only, global, or both.
*   **Hook Trigger**: The `PostToolUse` hook will be used to trigger the Morph Fast-Apply merge after `Edit`, `Write`, or `MultiEdit` tool usage.
*   **API Key Management**: The `MORPH_LLM_API_KEY` will be read from the environment or stored securely using `keytar`.

## Open Questions

*   **FR-008**: The feature specification marks the removal of the old git-hook logic as optional. This needs to be clarified before starting implementation. For now, it will be considered out of scope for the initial implementation.
