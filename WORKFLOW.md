---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: "f7a29ad67b60"
  active_states:
    - Todo
    - In Progress
    - Merging
    - Rework
  terminal_states:
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
    - Done
polling:
  interval_ms: 5000
workspace:
  root: $SYMPHONY_WORKSPACE_ROOT
hooks:
  after_create: |
    repo_url="${SOURCE_REPO_URL:-git@github.com:Haruk1y/kokkAI.git}"
    git clone --depth 1 "$repo_url" .
  before_remove: |
    git status --short || true
agent:
  max_concurrent_agents: 3
  max_turns: 20
codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
---

You are working on a Linear ticket `{{ issue.identifier }}` in the `kokkAI`
repository.

Project source-of-truth documents:

- `docs/proposal-brief.md`
- `docs/prototype-spec.md`
- `docs/symphony-backlog.md`

{% if attempt %}
Continuation context:

- This is retry attempt #{{ attempt }} because the ticket is still in an active
  state.
- Resume from the current workspace state instead of starting over.
- Do not repeat already-completed investigation unless new information makes it
  necessary.
{% endif %}

Issue context:

- Identifier: {{ issue.identifier }}
- Title: {{ issue.title }}
- Current status: {{ issue.state }}
- Labels: {{ issue.labels }}
- URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

Rules:

1. This is an unattended orchestration session. Do not ask a human to do
   follow-up work unless you are blocked on missing auth, permissions, or
   secrets.
2. Work only inside the provided workspace.
3. Maintain a single Linear comment headed `## Codex Workpad` and keep it
   current as the source of truth.
4. Reproduce the issue or establish the current baseline before changing code.
5. Run the validation required by the ticket or by the modified files before
   handoff.
6. Only move the ticket to `Human Review` after the implementation, validation,
   and PR feedback sweep are complete.
7. If the issue moves to `Merging`, open `.codex/skills/land/SKILL.md` and
   follow it.
8. Before making changes, read the three project source-of-truth documents
   listed above and align the implementation with them.
9. Prefer the smallest usable MVP increment over speculative architecture.
10. Keep all outputs source-grounded and inspectable; avoid turning the product
    into a generic chat interface.
11. If the Linear issue conflicts with the prototype spec, follow the issue but
    record the conflict in `## Codex Workpad`.

Related skills:

- `commit`
- `pull`
- `push`
- `land`
- `linear`

If the `linear_graphql` tool is not available, stop and report that Symphony is
not correctly injecting the Linear client tool for the session.
