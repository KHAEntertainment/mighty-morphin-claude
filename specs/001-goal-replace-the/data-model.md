# Phase 1: Data Model

This feature introduces new configuration files for Claude-Code integration. These files define the behavior of the hooks, slash commands, and sub-agents.

## Configuration Files

### `settings.json`

This file configures the `PostToolUse` hook to trigger the `morphApply.js` script.

**Scope**: Can be located in `.claude/` (project) or `~/.claude/` (global).

**Structure**:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node <path-to-script>/morphApply.js",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

### `commands/morph-apply.md`

This file defines the `/morph-apply` slash command.

**Scope**: Can be located in `.claude/commands/` (project) or `~/.claude/commands/` (global).

**Structure**:

```markdown
---
argument-hint: [description] [file_path]
description: Apply Morph Fast-Apply to merge a described change into a file.
allowed-tools: Bash(node:*)
---

## Context
- Current git status: !`git status -s`

## Your task
Use Morph Fast-Apply to merge the described change into the target file.

Description: $1
File: $2
```

### `agents/morph-agent.md`

This file defines the proactive sub-agent.

**Scope**: Can be located in `.claude/agents/` (project) or `~/.claude/agents/` (global).

**Structure**:

```markdown
---
name: morph-agent
description: PROACTIVELY use for structural edits. After any Edit/Write/MultiEdit, call /morph-apply with a succinct description and target file.
tools: Edit, Write, MultiEdit, Bash
---

You are a specialist for reliable merges. When you produce code edits that should be merged safely,
immediately trigger `/morph-apply "<short description>" <file_path>` so Morph performs the merge.
Keep diffs surgical; preserve imports, identifiers, formatting, and comments.
```
