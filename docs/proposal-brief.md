# kokkAI Proposal Brief

This document translates `未踏IT2026_提案資料1.pdf` into a concise product brief
that Codex and Symphony can use as implementation context.

## Product Goal

`kokkAI` is a policy deliberation support system. It should help users compare
how the same policy dossier changes when deliberation is run under different
institutional conditions, instead of returning a single "best answer".

## Core Product Hypothesis

If the same primary-source policy materials are discussed in multiple
deliberation modes, users can better understand:

- the main points of conflict
- possible compromise proposals
- minority opinions
- stakeholder-specific impacts
- which conclusions are unstable across different constraints

## Required Deliberation Modes

### 1. AI Committee (Institution Replay)

- Agents represent public roles such as lawmakers, parties, and administration.
- Party and institutional constraints are preserved.
- Goal:
  organize current-system arguments, agreements, and minority positions.

### 2. AI Committee (Party Bias Removed)

- Uses the same source materials.
- Removes party labels and seat-count effects.
- Goal:
  extract core policy tradeoffs that remain after political incentives are
  stripped away.

### 3. AI Citizens' Assembly

- Agents represent citizens with varied age, region, income, occupation, health,
  family structure, and mobility constraints.
- Goal:
  surface stakeholder viewpoints that are often missing in formal politics.

## Outputs Expected From Every Run

- consensus proposal or provisional agreement
- minority opinions
- list of major points of contention
- stakeholder impact table
- evidence-backed citations to primary sources
- cross-mode diff report

## Data Constraints

Only Japanese primary sources should be used in the early product:

- Diet minutes
- bill documents
- hearing records
- e-Gov public comments
- white papers
- party manifestos
- local government, NPO, and industry public documents
- statistics

Avoid private data and SNS data in the MVP.

## Proposed Deliverables

- a public web demo for browsing outputs and comparing modes
- reusable OSS for the protocol, personas, evaluation, and verification pipeline
- a path to real use cases such as education, municipal feedback summarization,
  journalism, and policy advocacy support

## Suggested Technical Direction From The Proposal

- Python for ingestion, RAG, agents, and evaluation
- FastAPI for backend APIs
- TypeScript and Next.js for the web UI
- SQLite or PostgreSQL for data storage
- local or domestic-model-friendly inference stack such as `llama.cpp`,
  `vLLM`, or Hugging Face-hosted open-weight models

## MVP Interpretation For Automation

The proposal is broad. For autonomous prototyping, interpret the MVP as:

1. one curated policy dossier
2. three deliberation modes
3. structured outputs with citations
4. a browser UI that compares the modes side by side
5. a backend that can run either mock deliberation or real model-backed
   deliberation behind the same interface

## Product Principles

- do not hide disagreement; expose it
- keep source provenance visible
- optimize for inspectability over rhetorical fluency
- make "uncertain or unstable" conclusions explicit
- prefer a reproducible local-first prototype before broadening scope
