## Why

Session history cannot be restored after page refresh. When a user presses F5 and then clicks a session in the sidebar, the backend returns `{"history":[],"message":"No history found"}` even though the session exists and has messages stored in JSONL files.

Root cause: When creating a new session, the API route passes the newly generated session UUID to `agent.session(sessionId)`, which incorrectly sets `persistence.resumeSessionId = sessionId`. This causes `SessionImpl` to enter "resume" mode instead of "new session" mode, skipping metadata writes to the JSONL file.

## What Changes

1. **Modify `agent.session()` behavior**: When called with a `sessionId` parameter for a new session, do NOT set `resumeSessionId` in the persistence config
2. **Ensure metadata writes**: SessionImpl should always ensure metadata is written, even when attempting to resume a session that doesn't exist or has corrupted JSONL
3. **Add defensive loading**: When `loadSession` returns null during a "resume" attempt, still proceed to write metadata rather than silently skipping

## Capabilities

### New Capabilities
- `session-persistence`: Core session persistence mechanism - no new spec needed as this is a bug fix within existing behavior

### Modified Capabilities
- None - this is a bug fix that restores intended behavior, not a requirement change

## Impact

**Files Modified:**
- `codenano/src/agent.ts` - `session()` method
- `codenano/src/session.ts` - constructor persistence logic

**Side Effects:**
- Existing sessions with corrupted JSONL (missing metadata) will be repaired on next access
- The `resumeSessionId` field in persistence config becomes semantically clearer: it only indicates "restore from existing JSONL", not "this is a new session with a given ID"
