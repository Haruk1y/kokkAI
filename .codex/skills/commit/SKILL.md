---
name: commit
description:
  Create a clean git commit from the current changes. Use when asked to commit,
  finalize staged work, or prepare a commit message.
---

# Commit

## Goals

- Produce a commit that matches the actual staged diff.
- Use a short conventional subject line.
- Include what changed, why it changed, and what validation ran.

## Steps

1. Read the current session context and inspect `git status`, `git diff`, and
   `git diff --staged`.
2. Confirm only intended files are staged.
3. Stage missing intended files with `git add`.
4. Choose a subject like `feat: ...`, `fix: ...`, or `docs: ...`.
5. Write a body with:
   - Summary
   - Rationale
   - Tests
6. Create the commit with `git commit -F <message-file>`.
7. Append `Co-authored-by: Codex <codex@openai.com>` unless the user requested
   another identity.

## Output

- One commit that accurately reflects the staged changes.
