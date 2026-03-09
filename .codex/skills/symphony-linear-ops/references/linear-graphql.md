# Linear GraphQL For Symphony

Use these requests outside Symphony app-server sessions when `linear_graphql` is
not available.

## Auth

- Endpoint: `https://api.linear.app/graphql`
- Personal API key header:

```text
Authorization: <API_KEY>
```

- For personal keys, do not use `Bearer`

## Viewer Check

```bash
curl -sS https://api.linear.app/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: $LINEAR_API_KEY" \
  --data '{"query":"query Me { viewer { id name email } }"}'
```

## Resolve Project By `slugId`

```bash
curl -sS https://api.linear.app/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: $LINEAR_API_KEY" \
  --data '{"query":"query ProjectBySlug($slug: String!) { projects(filter: { slugId: { eq: $slug } }, first: 5) { nodes { id name slugId url state teams { nodes { id key name } } } } }","variables":{"slug":"f7a29ad67b60"}}'
```

## Get Team Workflow States

```bash
curl -sS https://api.linear.app/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: $LINEAR_API_KEY" \
  --data '{"query":"query TeamStates($teamId: String!) { team(id: $teamId) { id key name states { nodes { id name type } } } }","variables":{"teamId":"TEAM_ID"}}'
```

## Candidate Issues For Symphony

This matches Symphony's polling shape closely enough for debugging:

```bash
curl -sS https://api.linear.app/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: $LINEAR_API_KEY" \
  --data '{"query":"query CandidateIssues($projectSlug: String!, $stateNames: [String!]!) { issues(filter: { project: { slugId: { eq: $projectSlug } }, state: { name: { in: $stateNames } } }, first: 20) { nodes { identifier title state { name } url } } }","variables":{"projectSlug":"f7a29ad67b60","stateNames":["Todo","In Progress","Merging","Rework"]}}'
```

## Create An Issue

`IssueCreateInput` accepts `teamId`, optional `projectId`, and optional
`stateId`.

```graphql
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      identifier
      title
      url
      state {
        name
      }
    }
  }
}
```

Typical input:

```json
{
  "title": "Prototype 01: Bootstrap the Prototype Repository",
  "description": "Markdown body here",
  "teamId": "TEAM_ID",
  "projectId": "PROJECT_ID",
  "stateId": "TODO_STATE_ID"
}
```

## Start Symphony

```bash
set -a
source /Users/yajima/Desktop/dev/kokkAI/.env.symphony.local
set +a

cd /tmp/openai-symphony/elixir
MISE_DISABLE_PRUNE=1 mise exec -- ./bin/symphony \
  --i-understand-that-this-will-be-running-without-the-usual-guardrails \
  /Users/yajima/Desktop/dev/kokkAI/WORKFLOW.md \
  --port "${SYMPHONY_PORT:-4050}"
```

## Logs To Check

- `/tmp/openai-symphony/elixir/log/symphony.log.1`

Useful failure signatures:

- `Linear API token missing in WORKFLOW.md`
- `Linear GraphQL request failed status=401`
- no issues returned for the active-state filter

## App-Server Note

Inside Symphony app-server sessions, prefer the repo-local `linear` skill and
the injected `linear_graphql` tool instead of external `curl`.
