# kokkAI Prototype Spec

This is the implementation-facing specification for the first Symphony-driven
prototype.

## Objective

Build a usable demo that lets a user inspect one policy topic through three
deliberation modes and compare the resulting arguments, evidence, and tradeoffs.

## MVP Scope

### In Scope

- one end-to-end demo dossier stored in the repository
- ingestion of curated source documents into a normalized local format
- structured personas and mode configuration
- a deliberation engine abstraction with:
  - a deterministic mock mode for local development
  - a real-model adapter interface for later replacement
- citation-aware structured outputs
- a FastAPI backend
- a Next.js frontend for comparison and traceability

### Out Of Scope

- live ingestion of all Japanese policy sources
- production-grade fact verification
- user accounts or permissions
- public write access or participation workflows
- large-scale model serving infrastructure

## Primary User Journeys

### Researcher / Journalist

1. Open a dossier page.
2. Read a short briefing.
3. Compare outputs from the three modes.
4. Inspect evidence and source links.
5. Export or summarize the key differences.

### Civic Learner / Student

1. Choose a policy topic.
2. Read "why positions differ".
3. Understand stakeholder tradeoffs.
4. Review a compromise proposal and minority objections.

## Functional Requirements

### Dossier Ingestion

- Store a policy dossier as normalized JSON or Markdown plus metadata.
- Track title, summary, source list, and document chunks.
- Preserve source provenance at chunk level.

### Persona Registry

- Define personas for each mode in structured data.
- Keep agent metadata inspectable.
- Support role, goals, constraints, and bias flags.

### Deliberation Output Schema

Every run should return:

- `mode`
- `topic`
- `briefing`
- `consensus`
- `minority_opinions`
- `contention_points`
- `stakeholder_impacts`
- `citations`
- `uncertainty_notes`
- `diffable_summary`

### Comparison UI

- show three-mode summary cards
- show points of agreement and disagreement
- show evidence panels with citations
- show stakeholder impact tables
- show unstable points highlighted across modes

## Suggested Repository Shape

```text
apps/
  web/
  api/
packages/
  shared/
data/
  dossiers/
  personas/
```

## Suggested Backend Shape

- `apps/api/app/main.py`
- `apps/api/app/routes/dossiers.py`
- `apps/api/app/routes/runs.py`
- `apps/api/app/services/ingestion.py`
- `apps/api/app/services/deliberation.py`
- `apps/api/app/services/diffing.py`
- `packages/shared/` for shared schemas if a TS/Python split is introduced

## Suggested Frontend Shape

- dossier list page
- dossier detail page
- three-column comparison view
- evidence drawer or side panel
- mode diff summary section

## Development Strategy

1. bootstrap the repo structure and shared schema
2. add one hand-curated dossier and seed personas
3. make the backend return deterministic mock deliberation outputs
4. build the frontend against the stable schema
5. swap in real model-backed execution behind the same service interface
6. add evaluation and regression checks

## Validation Criteria

The prototype is acceptable when:

- it can run locally end to end
- one dossier can be explored through all three modes
- each claim in the UI can be traced to a source reference
- differences across modes are visible without reading raw logs
- the app remains useful even when only mock outputs are available

## Risks To Control

- building too much ingestion before validating the UI and schema
- coupling the UI to a specific model provider
- producing polished text without source-grounded traceability
- letting the MVP become a general chat app instead of a comparison product
