# kokkAI Symphony Setup

This repository now contains the minimum files needed to run
[OpenAI Symphony](https://github.com/openai/symphony) against `kokkAI`.

## Current State

- `origin` points to `git@github.com:Haruk1y/kokkAI.git`
- the repository is almost empty right now
- Symphony can still run, but each issue workspace will clone an almost empty
  repo until application code is added

## Files Added For Symphony

- `WORKFLOW.md`
- `.env.symphony.example`
- `docs/proposal-brief.md`
- `docs/prototype-spec.md`
- `docs/symphony-backlog.md`
- `.codex/skills/commit/SKILL.md`
- `.codex/skills/pull/SKILL.md`
- `.codex/skills/push/SKILL.md`
- `.codex/skills/land/SKILL.md`
- `.codex/skills/linear/SKILL.md`
- `.github/pull_request_template.md`

## Host Setup

Symphony itself runs from the official repository. The current public reference
implementation is under `elixir/`.

The commands below use `/tmp/openai-symphony` for a quick local setup. If you
want the installation to survive cleanup or reboot, clone it to a persistent
directory and adjust the commands accordingly.

1. Install `mise` and `gh`

```bash
brew install mise gh
```

2. Clone Symphony and build it

```bash
git clone https://github.com/openai/symphony /tmp/openai-symphony
cd /tmp/openai-symphony/elixir
mise trust
mise install
mise exec -- mix setup
mise exec -- mix build
```

3. Export the required environment variables

```bash
cd /Users/yajima/Desktop/dev/kokkAI
cp .env.symphony.example .env.symphony.local
set -a
source .env.symphony.local
set +a
```

4. Log into GitHub CLI if you want Symphony to open PRs and land them

```bash
gh auth login
```

5. Start Symphony with this repository's workflow file

```bash
cd /tmp/openai-symphony/elixir
mise exec -- ./bin/symphony \
  --i-understand-that-this-will-be-running-without-the-usual-guardrails \
  /Users/yajima/Desktop/dev/kokkAI/WORKFLOW.md \
  --port "${SYMPHONY_PORT:-4050}"
```

## Linear Requirements

Before starting Symphony, configure Linear:

- create a personal API key and export it as `LINEAR_API_KEY`
- create or choose a project, then set its slug in `WORKFLOW.md`
- either add the custom states `Rework`, `Human Review`, and `Merging`, or edit
  `WORKFLOW.md` to match your existing workflow

To find the project slug, open the project in Linear and copy the URL. The slug
is the project-specific part of the URL.

## Notes

- `codex` is already installed on this machine, so the workflow uses
  `codex app-server` directly.
- The default source repo URL is the current remote:
  `git@github.com:Haruk1y/kokkAI.git`
- If you prefer HTTPS or a different target repo, change
  `SOURCE_REPO_URL` in `.env.symphony.local`
- GitHub PR automation in the repo-local skills assumes `gh auth status`
  succeeds, and it is not logged in yet on this machine

## Proposal-Driven Prototyping

The repository now includes a structured implementation context derived from
`未踏IT2026_提案資料1.pdf`.

- `docs/proposal-brief.md`
  translates the proposal into product goals and constraints
- `docs/prototype-spec.md`
  defines the MVP and suggested architecture
- `docs/symphony-backlog.md`
  turns the proposal into issue-sized implementation steps for Symphony

The intended workflow is:

1. create a Linear project for `kokkAI`
2. create issues from `docs/symphony-backlog.md`
3. update the `project_slug` in `WORKFLOW.md`
4. start Symphony
5. move the first issue to `Todo`

This gives Symphony enough context to do autonomous MVP development instead of
working from the PDF directly.

## First Useful Check

After Symphony starts, move one Linear ticket for the configured project to
`Todo`. Symphony should claim it, clone this repo into the workspace root, and
open a Codex app-server session for that issue.
