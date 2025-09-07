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
