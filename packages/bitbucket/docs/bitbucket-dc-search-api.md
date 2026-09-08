# Bitbucket Data Center Search REST API

This document captures what we know about the Bitbucket Data Center search REST endpoint. The endpoint is **not part of the published Atlassian REST API reference** — the only "Search"-tagged endpoints in the [official v906 reference](https://developer.atlassian.com/server/bitbucket/rest/v906/api-group-search/) are admin-only `/indexing/...` resources. The endpoint described here is the same one the Bitbucket web UI calls.

> **Status:** observed against Bitbucket DC 9.x. The request schema has been **fully enumerated** by sending bogus fields and reading the Jackson `Unrecognized field` errors at every level (top-level, `limits`, `PagingInfo`). Response field shapes verified empirically. The effects of `limits.primary` and `limits.secondary` were probed (see below). Verify against your instance with the curl examples below.

## Endpoint

```
POST {BITBUCKET_API_BASE_PATH}/search/latest/search
```

- `BITBUCKET_API_BASE_PATH` is the `/rest` root, e.g. `https://bitbucket.example.com/rest` (no trailing slash). Note this is **not** under `/rest/api/latest/`.

### Headers

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <BITBUCKET_API_TOKEN>` (HTTP access token) |
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

The token needs at least **Repository Read** on every repo whose results you want. Results are filtered server-side by caller permissions.

### Request body

The Bitbucket-internal class is `RestSearchRequest`. Its schema has been **fully enumerated** by sending bogus fields at each level and reading the Jackson `Unrecognized field` errors (which list all known properties):

- `RestSearchRequest`: exactly `query`, `entities`, `limits`
- `RestSearchRequest$Limits`: exactly `primary`, `secondary`
- `RestSearchRequest$PagingInfo` (the value type for each entity): exactly `start`, `limit`

There are **no hidden parameters** for snippet size, context lines, highlighting, fragment count, or anything similar. Probes for `context`, `highlight`, `fragmentSize`, `snippetSize`, `maxFragments` were all rejected with the exhaustive 2-property error on `PagingInfo`.

```jsonc
{
  "query": "BarHandler project:PROJ",
  "entities": {
    "code": { "start": 0, "limit": 25 }
  }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `query` | string (required) | Bitbucket search expression. See [Bitbucket search syntax](https://confluence.atlassian.com/bitbucketserver/bitbucket-search-syntax-814204781.html). Max 250 chars / 9 expressions. |
| `entities.code.limit` | int | Max number of files (top-level hits) returned. Verified to accept at least `500`; `1000` returns `500`. |
| `entities.code.start` | int | Pagination offset for the code entity. Use `nextStart` from the response. |
| `limits.primary` | int | Hard cap on results in the **primary** result category. When set lower than `entities.code.limit`, it wins (e.g. `limit=10, primary=5` → 5 results). Redundant for code-only searches since `entities.code.limit` already caps the same set. |
| `limits.secondary` | int | Cap on results in a "secondary" category. **No observable effect** on code-only searches — the response always reports `code.category = "primary"` and no other category appears in this Bitbucket DC instance. Likely intended for the UI's combined search where repositories appear alongside code. |

`entities` is a `Map<String, PagingInfo>`: any string key is accepted as JSON, but only `"code"` actually returns results. Probes for `repository`, `repositories`, `commits`, `pullrequests`, `pull_requests`, `branches`, `users`, `projects`, and `files` all returned `500`. The `repositories` entity exposed by the Bitbucket UI is not available on this instance (or requires a different code path).

#### Snippet/context size is server-controlled

There is no client-side knob for the size of `hitContexts` (the snippets returned per file). The number of blocks and lines per block is decided entirely by Bitbucket. Trim client-side if you need fewer lines.

#### Total hit count is capped

`code.count` saturates at `10000` for broad queries (almost certainly the underlying Elasticsearch `index.max_result_window` default). Pagination via `start`/`nextStart` works up to that cap.

#### Query syntax — what works

The full operator/modifier list lives in [Bitbucket search syntax](https://confluence.atlassian.com/bitbucketserver/bitbucket-search-syntax-814204781.html). What's worth highlighting from empirical testing on Bitbucket DC 9.x:

- **Combine terms with modifiers using a SPACE (implicit `AND`), not the literal `AND` operator.** This matches the [Atlassian docs](https://confluence.atlassian.com/bitbucketserver/bitbucket-search-syntax-814204781.html), which state that adjacent terms are implicitly AND-ed. Empirically on Bitbucket DC 9.x: `BarHandler project:EAS` returns the 2 real matches scoped to `EAS` (`scope.type: "PROJECT"`, `query.substituted: false`), while `BarHandler AND project:EAS` returns ~10 000 hits with `query.substituted: true` — Bitbucket couldn't extract the modifier from the `term AND modifier:value` shape, rewrote the query, and effectively dropped the term. Use the explicit `AND` only between two search terms (e.g. `foo AND bar`), never between a term and a modifier.
  > Earlier revisions of this document had this backwards. The reversed claim was caused by a flawed test where the term genuinely had no matches in the chosen project; the explicit-`AND` query then "worked" only because Bitbucket's substitution fallback returned everything in the project. The corrected behaviour above has been verified by comparing `totalHits`, `scope`, and `query.substituted` for `project:`, `repo:`, `path:`, and `ext:` modifiers.
- **`repo:` requires the `projectkey/repositoryslug` form.** A bare `repo:my-repo` errors with `OrphanRepositoryModifierException`. Use `repo:PROJ/my-repo`, or pair a bare slug with a `project:` modifier using the implicit AND (`repo:my-repo project:PROJ`).
- The response's `scope` field reflects how Bitbucket interpreted the query: a `project:` modifier yields `scope.type: "PROJECT"`; a `repo:` modifier yields `scope.type: "REPOSITORY"`; an unscoped query yields `scope.type: "GLOBAL"`.
- When the query parser couldn't make sense of the expression (e.g. an unrecognised modifier), the response sets `query: null`. A successful parse yields `query: { substituted: true|false }`, where `substituted: true` means Bitbucket could not read the expression as written and rewrote it.

Other operators and modifiers from the docs (verified to be accepted):

| Modifier | Example | Meaning |
| --- | --- | --- |
| `project:<key>` | `foo project:PROJ` | Limit to a project (combine with a space, **not** `AND`) |
| `repo:<projectkey>/<slug>` | `foo repo:PROJ/my-repo` | Limit to a repository |
| `path:<glob>` | `react path:src/**/*.tsx` | Filter by file path |
| `lang:<lang>` | `jira lang:java` | Filter by language |
| `ext:<ext>` | `jira ext:cs` | Filter by file extension |
| `archived:<true\|false\|*>` | `archived:*` | Include archived repos (default excludes them) |
| `fork:<true\|false>` | `fork:false` | Limit by fork status |

Operators (must be ALL CAPS): `AND`, `OR`, `NOT`, `-`, `( )`.

Other considerations from the docs:

- Only the default branch of each repository is indexed.
- Single characters within search terms are not indexed (`foo a bar` ≡ `foo bar`).
- Wildcards (`?`, `*`) and regex are not supported in the query body itself.
- Files larger than 512 KiB are not indexed.

### Response body

Verified shape against Bitbucket DC 9.x:

```jsonc
{
  "scope": { "type": "PROJECT", "project": { "key": "PROJ", "id": 1128, "name": "My Project", "public": false, "type": "NORMAL" } },
  "code": {
    "category": "primary",
    "start": 0,
    "isLastPage": false,
    "nextStart": 3,
    "count": 464,
    "values": [
      {
        "repository": {
          "slug": "my-repo",
          "id": 3849,
          "name": "my-repo",
          "hierarchyId": "ab0e54073be2ecbcfb73",
          "scmId": "git",
          "state": "AVAILABLE",
          "statusMessage": "Available",
          "forkable": true,
          "public": false,
          "archived": false,
          "project": { "key": "PROJ", "id": 1128, "name": "My Project", "public": false, "type": "NORMAL" }
        },
        "file": "src/Foo/BarHandler.cs",
        "hitContexts": [
          [
            { "line": 17, "text": "public sealed class <em>BarHandler</em> : IBarHandler" },
            { "line": 18, "text": "{" }
          ]
        ],
        "pathMatches": [
          { "text": "src/Foo/" },
          { "text": "BarHandler", "match": true },
          { "text": ".cs" }
        ],
        "hitCount": 4
      }
    ]
  },
  "query": { "substituted": false }
}
```

Field notes:

| Field | Notes |
| --- | --- |
| `scope.type` | `"GLOBAL"`, `"PROJECT"`, or `"REPOSITORY"` based on what `project:`/`repo:` modifiers extracted. |
| `code.category` | Always `"primary"` for the code entity. |
| `code.count` | Total matching files (capped by Bitbucket's internal max). |
| `code.values.length` | Number of files actually returned in this page. (There is no separate `size` / `limit` field in the response.) |
| `code.isLastPage` / `nextStart` | Pagination markers. |
| `values[].file` | Path within the repository (default branch). |
| `values[].hitContexts` | **Array of arrays** of `{ line, text }`. Each inner array is one contiguous snippet block. |
| `values[].hitContexts[][].text` | Snippet line. Highlighted spans are wrapped in `<em>…</em>` HTML tags; the text is also HTML-escaped (`<`, `>`, `&` → entities). |
| `values[].pathMatches` | Tokens of the file path; tokens that matched the query have `match: true`. |
| `values[].hitCount` | Total hits in this file (may exceed the number of `hitContexts` actually returned). |
| `query` | `{ substituted: bool }` on a successful parse, or `null` when Bitbucket couldn't interpret the query (e.g. unrecognised modifier). |

If the request body is malformed, expect `400` with `{ "errors": [{ "message": "...", "context": "...", "exceptionName": "..." }] }`. The `context` field points to the offending JSON path (e.g. `entities`).

## Curl examples

> The examples below assume you've exported:
>
> ```pwsh
> $env:BITBUCKET_API_BASE_PATH = "https://bitbucket.example.com/rest"
> $env:BITBUCKET_API_TOKEN = "<your-token>"
> ```
>
> POSIX shells: replace `$env:NAME` with `$NAME` and use `export NAME=...` to set.

### Minimal global search

```pwsh
curl.exe --silent --show-error `
  --header "Authorization: Bearer ${env:BITBUCKET_API_TOKEN}" `
  --header "Content-Type: application/json" `
  --header "Accept: application/json" `
  --data '{ "query": "BarHandler", "entities": { "code": { "limit": 25 } } }' `
  "${env:BITBUCKET_API_BASE_PATH}/search/latest/search"
```

### Restrict to a project (combine with a space, not `AND`)

```pwsh
$body = '{ "query": "BarHandler project:PROJ", "entities": { "code": { "limit": 25 } } }'

curl.exe --silent --show-error `
  --header "Authorization: Bearer ${env:BITBUCKET_API_TOKEN}" `
  --header "Content-Type: application/json" `
  --header "Accept: application/json" `
  --data $body `
  "${env:BITBUCKET_API_BASE_PATH}/search/latest/search"
```

### Restrict to a repository

```pwsh
$body = '{ "query": "TODO repo:PROJ/my-repo", "entities": { "code": { "limit": 50 } } }'

curl.exe --silent --show-error `
  --header "Authorization: Bearer ${env:BITBUCKET_API_TOKEN}" `
  --header "Content-Type: application/json" `
  --header "Accept: application/json" `
  --data $body `
  "${env:BITBUCKET_API_BASE_PATH}/search/latest/search"
```

### Paginate

```pwsh
# Take .code.nextStart from the previous response and pass it back in:
$body = '{ "query": "TODO project:PROJ", "entities": { "code": { "limit": 25, "start": 25 } } }'
curl.exe --silent --show-error `
  --header "Authorization: Bearer ${env:BITBUCKET_API_TOKEN}" `
  --header "Content-Type: application/json" `
  --header "Accept: application/json" `
  --data $body `
  "${env:BITBUCKET_API_BASE_PATH}/search/latest/search"
```

### Probe the request schema

Sending an obviously bogus body returns a 400 whose error message lists the accepted fields — handy when reverse-engineering:

```pwsh
curl.exe --silent --show-error `
  --header "Authorization: Bearer ${env:BITBUCKET_API_TOKEN}" `
  --header "Content-Type: application/json" `
  --header "Accept: application/json" `
  --data '{ "query": "x", "entities": { "code": { "foo": 1 } } }' `
  "${env:BITBUCKET_API_BASE_PATH}/search/latest/search"
```

Example response excerpt (yields the property names this doc relies on):

```
"Unrecognized field \"foo\" (class …RestSearchRequest$PagingInfo), not marked as ignorable (2 known properties: \"start\", \"limit\"])"
```

## Sources

- Atlassian Bitbucket DC REST API (v906) Search group — only documents `/indexing/...` admin endpoints, **not** `/search/latest/search`: <https://developer.atlassian.com/server/bitbucket/rest/v906/api-group-search/>
- Bitbucket DC search syntax (operators and modifiers): <https://confluence.atlassian.com/bitbucketserver/bitbucket-search-syntax-814204781.html>
- HTTP access tokens (auth): <https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html>
- Request schema: discovered empirically by sending malformed bodies and reading the Jackson `Unrecognized field` errors, plus capture of the Bitbucket UI's XHR.
- Response shape: captured from `https://bitbucket.example.com/rest/search/latest/search` (Bitbucket DC 9.x).
- [`key4ng/lite-bb`](https://github.com/key4ng/lite-bb) — a `gh`-style Rust CLI for Bitbucket Cloud and Server/DC. Its `bb search code` subcommand and `bb api rest/search/latest/search ...` example independently confirm the same endpoint and `{ "query": ..., "entities": { "code": { "start": ..., "limit": ... } } }` request shape used here.
