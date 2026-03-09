---
name: linear
description: |
  Use Symphony's `linear_graphql` tool for raw Linear GraphQL operations during
  app-server sessions.
---

# Linear GraphQL

Use this skill only inside Symphony app-server sessions where the
`linear_graphql` tool is available.

## Tool Input

```json
{
  "query": "query or mutation document",
  "variables": {
    "optional": "graphql variables"
  }
}
```

## Rules

- Send one GraphQL operation per tool call.
- Request only the fields you need.
- Treat a response-level `errors` array as a failed operation.

## Common Queries

### Get an issue by key

```graphql
query IssueByKey($key: String!) {
  issue(id: $key) {
    id
    identifier
    title
    url
    description
    branchName
    state {
      id
      name
      type
    }
    project {
      id
      name
    }
  }
}
```

### Get workflow states for the issue's team

```graphql
query IssueTeamStates($id: String!) {
  issue(id: $id) {
    id
    team {
      id
      key
      name
      states {
        nodes {
          id
          name
          type
        }
      }
    }
  }
}
```

### Update a comment

```graphql
mutation UpdateComment($id: String!, $body: String!) {
  commentUpdate(id: $id, input: { body: $body }) {
    success
    comment {
      id
      body
    }
  }
}
```

### Create a comment

```graphql
mutation CreateComment($issueId: String!, $body: String!) {
  commentCreate(input: { issueId: $issueId, body: $body }) {
    success
    comment {
      id
      body
    }
  }
}
```
