---
name: symphony-linear-ops
description: |
  Operate OpenAI Symphony against Linear-backed projects. Use when setting up
  `.env.symphony.local` and `WORKFLOW.md`, resolving the correct Linear
  `project_slug` from a project URL, validating `LINEAR_API_KEY`, checking
  team workflow states, creating or updating Linear issues for autonomous
  prototyping, or diagnosing why Symphony is not picking up work.
---

# Symphony Linear Ops

Use this skill for end-to-end Symphony + Linear operations in this repo or a
similar repo-local setup.

## Use This Skill When

- wiring `LINEAR_API_KEY` into `.env.symphony.local`
- updating `WORKFLOW.md` for a Linear-backed Symphony project
- translating a Linear project URL into the correct Symphony `project_slug`
- validating Linear auth before running Symphony
- checking whether team workflow states match Symphony's active and terminal
  states
- creating or updating Linear issues for autonomous prototyping
- diagnosing `401`, missing-token, or zero-candidate-issue failures

## Workflow

### 1. Start From Official And Local Ground Truth

Prefer these sources in this order:

- official Symphony usage in `/tmp/openai-symphony/elixir/README.md`
- local Symphony implementation when behavior is unclear:
  - `/tmp/openai-symphony/elixir/lib/symphony_elixir/config.ex`
  - `/tmp/openai-symphony/elixir/lib/symphony_elixir/linear/client.ex`
  - `/tmp/openai-symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- repo-local workflow files:
  - `WORKFLOW.md`
  - `.env.symphony.local`
  - `docs/symphony-backlog.md`

### 2. Resolve `project_slug` Correctly

Symphony does not use the full project URL segment. It filters on Linear
`project.slugId`.

For a project URL like:

```text
https://linear.app/<workspace>/project/<project-name>-<slugId>/overview
```

set `WORKFLOW.md` `tracker.project_slug` to only:

```text
<slugId>
```

not `<project-name>-<slugId>`.

### 3. Verify Linear Auth Before Editing Anything Else

Use a direct GraphQL `viewer` query first.

- For Linear personal API keys, send `Authorization: <API_KEY>`
- Do not prepend `Bearer` for personal API keys
- Treat any GraphQL `errors` array as failure even if HTTP status is `200`

If `viewer` fails, stop and fix auth before changing project configuration.

### 4. Confirm Project, Team, And Workflow States

After auth succeeds:

- fetch the project by `slugId`
- get its `projectId` and owning team
- fetch team workflow states
- compare the real state names with `WORKFLOW.md`

If Symphony depends on custom states like `Rework`, `Human Review`, or
`Merging`, make sure they actually exist in the team before starting Symphony.

### 5. Create Or Update Issues Deliberately

When creating a prototype backlog:

- pass `teamId`
- pass `projectId`
- pass `stateId` explicitly
- put the first actionable ticket in `Todo`
- leave future tickets in `Backlog` unless there is a reason to schedule them

Inside Symphony app-server sessions, prefer the injected `linear_graphql` tool.
Outside app-server, use direct GraphQL requests.

### 6. Start Symphony And Validate It

Source `.env.symphony.local`, then start Symphony with the required safety
acknowledgement flag.

Successful validation means:

- Symphony starts without `Linear API token missing`
- Symphony does not log `401 Authentication required`
- the project URL in the status UI uses the expected `slugId`
- candidate issues appear when at least one issue is in an active state

### 7. Debug The Common Failure Modes

- `Linear API token missing in WORKFLOW.md`
  means the env file was not sourced or `LINEAR_API_KEY` did not resolve
- `401 Authentication required`
  means the API key is invalid, expired, or not actually loaded
- no candidate issues
  usually means wrong `project_slug`, wrong state names, or simply no issues in
  active states
- missing `linear_graphql`
  means you are not inside a Symphony app-server session

## References

Read `references/linear-graphql.md` when you need concrete GraphQL payloads,
curl commands, or the exact verification sequence.
