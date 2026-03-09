---
name: pull
description:
  Merge the latest `origin/main` into the current branch and resolve conflicts.
  Use when the branch needs syncing before review, push, or merge.
---

# Pull

## Workflow

1. Verify the working tree is clean or intentionally committed.
2. Enable rerere:
   - `git config rerere.enabled true`
   - `git config rerere.autoupdate true`
3. Fetch latest refs:
   - `git fetch origin`
4. Sync the current branch with its remote copy:
   - `git pull --ff-only origin $(git branch --show-current)`
5. Merge `origin/main`:
   - `git -c merge.conflictstyle=zdiff3 merge origin/main`
6. If conflicts appear:
   - inspect them with `git status` and `git diff`
   - resolve carefully
   - `git add <files>`
   - `git commit` or `git merge --continue`
7. Run the relevant validation for the current task.
8. Summarize the merge result and any assumptions.

## Ask The User Only If

- the correct resolution depends on product intent that cannot be inferred
- a conflict changes a user-visible contract and there is no safe default
- the branch or remote target cannot be determined locally
