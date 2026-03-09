# kokkAI Prototype

This repository now contains the initial bootstrap for `HAR-5`, plus the
Symphony workflow and proposal-derived context needed to keep autonomous work
grounded in the project spec.

## Repository Layout

```text
apps/
  api/        Node HTTP API with `/` and `/health`
  web/        Node HTTP web app with `/` and `/health`
packages/
  shared/     Shared health helpers and deliberation contract used by web and API
data/
  seeds/        Prototype seed data consumed by the API
  dossiers/     Example dossier payloads for the shared deliberation schema
  personas/     Example persona registry payloads
  runs/         Example single-mode deliberation outputs
  comparisons/  Example cross-mode diff payloads
docs/
  *.md        Proposal brief, prototype spec, and Symphony backlog
scripts/      Repo-local dev, lint, format, and smoke-test utilities
```

## Local Development

Requirements:

- Node.js 20+
- npm 10+

Install the workspace:

```bash
npm install
```

Start the web app and API together:

```bash
npm run dev
```

Entry points:

- Web: `http://localhost:3000/`
- Web health page: `http://localhost:3000/health`
- API: `http://localhost:3001/`
- API health route: `http://localhost:3001/health`

## Quality Gates

Normalize repository formatting:

```bash
npm run format
```

Run syntax and data-file checks:

```bash
npm run lint
```

Validate the shared deliberation schema examples:

```bash
npm run contracts
```

Run the full validation sweep:

```bash
npm run validate
```

## Shared Deliberation Contract

`HAR-6` adds the first canonical contract for the prototype comparison flow.

- JSON Schema: `packages/shared/schemas/deliberation.schema.json`
- Runtime validators: `packages/shared/src/deliberation.js`
- Example dossier: `data/dossiers/summer-electricity-relief.example.json`
- Example persona registry: `data/personas/summer-electricity-relief.example.json`
- Example mode runs: `data/runs/*.example.json`
- Example comparison: `data/comparisons/summer-electricity-relief.example.json`

The contract covers the fields called out in `docs/prototype-spec.md` for the
comparison UI: dossier briefing, mode briefing and consensus, minority opinions,
contention points, stakeholder impacts, citations, uncertainty notes, and
cross-mode agreement/disagreement summaries.

The root schema now validates any of the four shared payload kinds directly via
their `kind` discriminator, while the runtime validators also enforce
cross-reference checks such as citation targets, persona references, and
comparison claim links.

## Symphony Workflow

The repository also includes the minimum files needed to run
[OpenAI Symphony](https://github.com/openai/symphony) against `kokkAI`.

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
- `.codex/skills/symphony-linear-ops/SKILL.md`
- `.github/pull_request_template.md`

Symphony itself runs from the official repository. The current public reference
implementation is under `elixir/`.

To run it locally:

1. Install `mise` and `gh`
2. Clone Symphony and build it under a persistent directory or `/tmp`
3. Copy `.env.symphony.example` to `.env.symphony.local` and export it
4. Log into GitHub CLI with `gh auth login` if you want automated PR creation
5. Start Symphony with `WORKFLOW.md`

## Proposal-Driven Prototyping

The repository includes structured implementation context derived from
`未踏IT2026_提案資料1.pdf`.

- `docs/proposal-brief.md`
  translates the proposal into product goals and constraints
- `docs/prototype-spec.md`
  defines the MVP and suggested architecture
- `docs/symphony-backlog.md`
  turns the proposal into issue-sized implementation steps for Symphony

This gives Symphony enough context to do autonomous MVP development instead of
working from the PDF directly.

## Notes

- The bootstrap intentionally uses a minimal Node workspace so the MVP can be
  installed and validated quickly.
- `codex` is already installed on this machine, so the workflow uses
  `codex app-server` directly.
- The default source repo URL is `git@github.com:Haruk1y/kokkAI.git`.
