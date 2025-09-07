# ADR‑0001: Command/Hook vs. MCP

Date: 2025‑09‑07

## Context

The initial motivation for this project came from the desire to integrate
MorphLLM’s Fast Apply model into a conversational coding workflow.  Users
requested the ability to apply structural code changes recommended by an
assistant (e.g. Claude) without relying on direct model actions (sometimes
called *MCPs* or model‑controlled plugins).  An MCP approach would require
the model to invoke explicit file update commands at runtime, which often
incurs additional latencies due to permission prompts and reduces
determinism.

## Decision

We chose to implement Morph integration using a command + hook design rather
than an MCP.  Commands write intent files into a queue and return
immediately.  A separate watcher process reads those intents, invokes the
Morph Apply API, and then applies the resulting edits to disk.  A Git
pre‑commit hook invokes Morph before changes are committed.  This design
provides several benefits:

1. **No model prompts** – The code assistant does not have to call any
   privileged file operation tools.  It simply writes an intent file.
2. **Low latency** – The watcher runs outside the model session and can be
   implemented in a highly efficient language with streaming and caching.
3. **Deterministic** – The diff/patch step can include additional
   formatting, linting, or validation hooks to ensure consistent results.
4. **Editor agnostic** – Because intents are just files, this approach
   integrates easily with any editor or environment that can write to the
   repository.

## Consequences

The command + hook approach introduces some operational complexity:

* A watcher process must be running in the background (or triggered via
  Git hooks) for edits to take effect.
* Users must configure their Morph API key ahead of time via the
  `morph-hook install` command.  Key management is delegated to the OS
  keychain.
* Because the watcher writes to `.morph/out` asynchronously, there may be
  a short delay between enqueueing an intent and seeing the edits applied.

These trade‑offs were deemed acceptable in exchange for a more robust and
portable integration with MorphLLM.