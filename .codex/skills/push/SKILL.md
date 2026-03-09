---
name: push
description:
  Push the current branch to origin and create or update the corresponding pull
  request. Use when asked to publish work or open a PR.
---

# Push

## Prerequisites

- `gh` is installed.
- `gh auth status` succeeds for this repository.

## Workflow

1. Identify the current branch.
2. Run the task-relevant validation from the workpad or ticket.
   - If no validation is defined yet, run at least `git diff --check`.
3. Push the branch:
   - `git push -u origin HEAD`
4. If push is rejected because the remote moved:
   - run the `pull` skill
   - rerun validation
   - push again
5. Ensure a PR exists for the branch:
   - create one if missing
   - update title/body if one already exists
6. Use `.github/pull_request_template.md` when writing the PR body.
   - replace every placeholder with concrete content
7. Return the PR URL.

## Notes

- Do not change remotes or protocols as a workaround for auth failures.
- Use `--force-with-lease` only if the branch history was intentionally
  rewritten.
