## Context

**Current Behavior (Before Fix):**
When a user clicks a session in the sidebar:
1. WebUI calls `setActiveId(sessionId)` and triggers `loadHistory(sessionId)`
2. API `/history` endpoint checks registry, then loads from JSONL
3. API returns history data correctly
4. **Bug**: WebUI didn't navigate to chat view - still showed homepage

**Root Cause (Two Issues):**

1. **WebUI Navigation Bug** (`codenano-webui/src/App.tsx`):
   - `activeSession` computed value depends on `streamSessionRef.current`
   - `streamSessionRef.current` was only set during message sending
   - When clicking a session, `activeSession` remained null
   - `ThreadShell` rendered homepage instead of chat view

2. **API Registry Fallback Bug** (`codenano-api/src/routes/sessions.ts`):
   - `/history` endpoint had JSONL fallback for sessions not in registry
   - Registry is source of truth - dirty JSONL (exists without registry entry) should not be loaded
   - Changed to return 404 when session not in registry

**Files Involved:**
- `codenano-webui/src/App.tsx` line 342: `handleSelect` sets `streamSessionRef.current`
- `codenano-api/src/routes/sessions.ts` line 227: `/history` returns 404 when session not in registry

## Goals / Non-Goals

**Goals:**
- Fix session history display after clicking session in sidebar
- Ensure registry is source of truth for session existence

**Non-Goals:**
- Change session persistence logic in codenano library
- Modify JSONL file handling

## Decisions

### Decision 1: Fix WebUI Navigation

**Choice:** Set `streamSessionRef.current = sessionId` in `handleSelect`.

**Rationale:** `streamSessionRef.current` gates whether `activeSession` is null. Setting it on session click enables proper navigation.

### Decision 2: Registry is Source of Truth

**Choice:** `/history` returns 404 if session not in registry, no JSONL fallback.

**Rationale:** JSONL without registry entry is dirty data (created during bugs/crashes). Should not be loaded silently.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Sessions created before fix have JSONL but no registry | Will return 404 - user can still send messages to create new history |
| `streamSessionRef` might not be cleaned on `onGoHome` | Not critical - will be overwritten on next session select |

## Migration Plan

1. **Deploy webui fix** - no rebuild needed
2. **Deploy API fix** - no rebuild needed
3. **No data migration needed**
4. **Rollback**: Revert both file changes
