# kokkAI Symphony Backlog

This backlog converts the proposal into concrete implementation tickets for
Symphony. Create these as Linear issues in order. Each issue should link back to
this document and to `docs/prototype-spec.md`.

## Ticket 1: Bootstrap The Prototype Repository

### Goal

Create the initial project layout for a web app, API, shared schemas, and seed
data directories.

### Deliverables

- repo structure for `apps/web`, `apps/api`, `packages/shared`, and `data`
- base linting, formatting, and local run instructions
- a health check page and a health check API route

### Acceptance Criteria

- the repository installs and starts locally
- web and API entrypoints are reachable
- the structure matches `docs/prototype-spec.md`

## Ticket 2: Define The Shared Deliberation Schema

### Goal

Create the canonical schema for dossiers, personas, citations, mode outputs, and
cross-mode diffs.

### Deliverables

- documented JSON schemas or typed models
- example payloads checked into the repository
- a stable contract the UI and API can share

### Acceptance Criteria

- one sample dossier validates against the schema
- one sample run output validates against the schema
- fields required by the comparison UI are covered

## Ticket 3: Add A Seed Policy Dossier

### Goal

Create one curated dossier from Japanese primary-source material that is safe to
use in the prototype.

### Deliverables

- one dossier directory under `data/dossiers`
- normalized metadata, summary, and source chunks
- provenance fields for each chunk

### Acceptance Criteria

- a reader can identify every source used
- the dossier is small enough for fast iteration
- the backend can load it without custom manual steps

## Ticket 4: Implement Persona Registry And Mode Config

### Goal

Model the three modes and their personas in structured data rather than ad-hoc
prompts.

### Deliverables

- seeded persona files for all three modes
- explicit constraints and goals per persona
- a loader used by the backend

### Acceptance Criteria

- the system can enumerate the personas for each mode
- party-preserving and party-removed modes differ in configuration
- citizen personas express stakeholder diversity

## Ticket 5: Build The Deliberation Engine Interface

### Goal

Introduce a backend service that runs deliberation through a provider-agnostic
interface.

### Deliverables

- `mock` provider with deterministic outputs
- provider interface for future local/open-weight model adapters
- persisted run result matching the shared schema

### Acceptance Criteria

- the same dossier can be run in three modes through one API surface
- mock outputs are deterministic enough for regression tests
- provider swapping does not require UI changes

## Ticket 6: Add Citation Mapping And Diff Generation

### Goal

Generate traceable citations and cross-mode comparison summaries.

### Deliverables

- citation mapping from output claims to source chunks
- diff generator for agreements, disagreements, and unstable points
- uncertainty annotations when outputs diverge

### Acceptance Criteria

- every surfaced claim links to at least one source reference
- the UI can display agreements and disagreements directly
- unstable points are explicit in the API response

## Ticket 7: Expose FastAPI Endpoints

### Goal

Ship the minimal HTTP API needed by the frontend.

### Deliverables

- dossier listing endpoint
- dossier detail endpoint
- run-deliberation endpoint
- run result endpoint

### Acceptance Criteria

- a frontend can render the full MVP from the API
- endpoints return typed, documented payloads
- local development requires no external service beyond the repo

## Ticket 8: Build The Next.js Comparison Demo

### Goal

Create the public-demo style UI that shows the three modes side by side.

### Deliverables

- landing page or dossier list
- dossier detail and compare view
- evidence panel and stakeholder impact table
- mode-diff summary section

### Acceptance Criteria

- a user can understand cross-mode differences without reading raw JSON
- source provenance is visible in the interface
- the UI works on desktop and mobile

## Ticket 9: Add Regression Checks

### Goal

Protect the MVP from schema and UI regressions while the prototype evolves.

### Deliverables

- backend tests for schema and loader logic
- frontend component or integration tests
- one smoke test for the main comparison flow

### Acceptance Criteria

- the repo has an automated local validation command
- deterministic mock outputs are used in tests
- failures point to concrete regressions

## Ticket 10: Prepare Demo Operations And Documentation

### Goal

Make the prototype understandable and runnable by collaborators.

### Deliverables

- local setup guide
- architecture overview
- limitations and known-risks section
- demo script or walkthrough

### Acceptance Criteria

- a new collaborator can run the MVP from scratch
- limitations are documented clearly
- the prototype can be demoed without undocumented steps

## Suggested Initial Linear Order

1. Ticket 1
2. Ticket 2
3. Ticket 3
4. Ticket 4
5. Ticket 5
6. Ticket 6
7. Ticket 7
8. Ticket 8
9. Ticket 9
10. Ticket 10

## Operating Rule For Symphony

Prefer the smallest vertical slice that produces a visible product. Do not start
with broad ingestion or model-ops work when a mocked but inspectable demo can be
completed first.
