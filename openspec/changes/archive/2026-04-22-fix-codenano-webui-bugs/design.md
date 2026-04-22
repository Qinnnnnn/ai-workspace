## Context

Two bugs prevent basic usage of codenano-webui:

1. **crypto.randomUUID issue**: `App.tsx:230` calls `crypto.randomUUID()` in `handleSend()`. This API is not available in all browser environments (e.g., older Chrome, some mobile browsers). The error `TypeError: crypto.randomUUID is not a function` crashes the send handler, preventing any API request.

2. **DELETE Content-Type issue**: The `request()` function in `client.ts` unconditionally sets `Content-Type: application/json` header. DELETE requests have no body, but Fastify on the backend rejects requests with `Content-Type: application/json` but empty body with 400 `FST_ERR_CTP_EMPTY_JSON_BODY`.

## Goals / Non-Goals

**Goals:**
- Fix `crypto.randomUUID()` to use a cross-browser compatible UUID generation
- Fix DELETE requests to not include `Content-Type: application/json` when there's no body

**Non-Goals:**
- Not adding new features, only fixing these specific bugs
- Not changing API contract with backend

## Decisions

### 1. Replace crypto.randomUUID with v4 UUID generation

**Decision**: Create a simple `uuid()` helper function using `crypto.getRandomValues()` which has broader browser support.

**Rationale**: `crypto.getRandomValues()` is supported in all modern browsers and IE11+. A simple v4 UUID implementation using it is ~10 lines and avoids adding a dependency.

**Alternative**: Could import `uuid` package, but adds unnecessary dependency for a simple function.

### 2. Only set Content-Type when body exists

**Decision**: Modify `request()` in `client.ts` to only set `Content-Type: application/json` when `init?.body` is truthy.

**Rationale**: The `Content-Type: application/json` header tells the server to parse the body as JSON. When there's no body, this header is inappropriate and causes the Fastify backend to error.

## Risks / Trade-offs

- **Risk**: UUID format compatibility — **Mitigation**: v4 UUID format is standard and only used as a client-side message ID, backend only cares about `sessionId`
- **Risk**: None identified for Content-Type fix — it's a straightforward correction
