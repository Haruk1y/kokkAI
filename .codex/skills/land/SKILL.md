---
name: land
description:
  Land the current pull request by resolving conflicts, waiting for checks, and
  squash-merging once everything is green.
---

# Land

## Preconditions

- `gh` is installed and authenticated.
- The current branch has an open PR.
- The working tree is clean.

## Workflow

1. Confirm the PR for the current branch:
   - `gh pr view --json number,url,title,body,mergeable`
2. If there are local uncommitted changes:
   - run the `commit` skill
   - run the `push` skill
3. If the PR is conflicting:
   - run the `pull` skill
   - rerun validation
   - run the `push` skill
4. Inspect open review comments and review summaries:
   - `gh pr view --comments`
   - `gh pr view --json reviews`
   - `gh api repos/{owner}/{repo}/pulls/<pr_number>/comments`
5. Treat actionable review feedback as blocking until addressed or explicitly
   pushed back with rationale.
6. Wait for checks:
   - `gh pr checks --watch`
7. If a check fails:
   - inspect the failing run
   - fix the issue locally
   - commit and push
   - wait again
8. When checks are green and review feedback is resolved, squash-merge:
   - `gh pr merge --squash --subject "$pr_title" --body "$pr_body"`

## Rules

- Do not enable auto-merge.
- Do not merge while review comments are still outstanding.
- If ambiguity blocks progress, stop and ask the user instead of guessing.
