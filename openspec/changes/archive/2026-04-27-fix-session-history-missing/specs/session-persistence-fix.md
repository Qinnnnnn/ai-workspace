## Context

This change is a bug fix that restores the intended behavior of session persistence. No new capabilities are introduced and no existing requirements are modified.

The existing `session-persistence` capability in `openspec/specs/session-persistence/spec.md` defines the expected behavior. This bug fix ensures the implementation matches the specification.

## No Spec Changes Required

This change does not add new requirements or modify existing requirements. It fixes a bug where the implementation deviated from the existing specification.

**Existing relevant requirements (from `openspec/specs/session-persistence/spec.md`):**
- Session metadata SHALL be written to the JSONL file on session creation
- Session history SHALL be restorable from the JSONL file by session ID

The bug caused metadata to not be written when `resumeSessionId` was set on a new session, which violates the first requirement above. The fix ensures compliance with existing requirements.
