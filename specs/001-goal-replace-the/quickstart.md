# Phase 1: Quickstart

This guide provides instructions on how to install and use the Claude-Code native integration for Morph Fast-Apply.

## Installation

1.  **Run the installer**:

    ```bash
    npm run setup:claude
    ```

2.  **Choose the installation scope**:

    The installer will prompt you to choose between:
    *   **Project**: Installs the integration in the current project's `.claude` directory.
    *   **Global**: Installs the integration in your home directory's `~/.claude` directory.
    *   **Both**: Installs in both locations.

3.  **Provide your MorphLLM API Key**:

    If the `MORPH_LLM_API_KEY` environment variable is not set, the installer will offer to store it securely in your OS keychain.

## Usage

### Automatic Merging

Once installed, the integration will automatically merge your code edits when you use the `Edit`, `Write`, or `MultiEdit` tools in Claude-Code.

### Manual Merging

You can manually trigger a merge using the `/morph-apply` slash command:

```
/morph-apply "<description of your change>" <file_path>
```

### Proactive Sub-agent

The `morph-agent` will proactively suggest using the `/morph-apply` command after you make code edits.

## Smoke Test

To verify that the integration is working correctly, you can run the smoke test:

```bash
npm run test:hook
```
