## Purpose

HTTP API for cross-session memory operations. Memories persist beyond individual sessions and can be used to share context across different conversation threads.

## ADDED Requirements

### Requirement: Save memory

The service SHALL provide `POST /api/v1/memory` accepting `{"key": "...", "content": "...", "type": "general"}`. The memory SHALL be persisted via `saveMemory(key, content, {type})`.

#### Scenario: Save new memory
- **WHEN** caller sends `POST /api/v1/memory` with `{"key": "project-context", "content": "This is a Python ML project", "type": "context"}`
- **THEN** memory is saved and response is `{"ok": true}`

#### Scenario: Save memory with default type
- **WHEN** caller sends `POST /api/v1/memory` with `{"key": "note", "content": "Remember this"}`
- **THEN** memory is saved with type `"general"`

#### Scenario: Overwrite existing memory
- **WHEN** caller sends `POST /api/v1/memory` with a key that already exists
- **THEN** the existing memory content is replaced
- **THEN** response is `{"ok": true}`

### Requirement: Load memory by key

The service SHALL provide `GET /api/v1/memory/:key` returning `{"key": "...", "content": "...", "type": "...", "createdAt": "...", "updatedAt": "..."}`.

#### Scenario: Load existing memory
- **WHEN** caller sends `GET /api/v1/memory/project-context`
- **THEN** response is the memory object with key, content, type, and timestamps

#### Scenario: Memory not found
- **WHEN** caller sends `GET /api/v1/memory/nonexistent`
- **THEN** response is `404 Not Found` with `{"error": "Memory not found"}`

### Requirement: Scan memories

The service SHALL provide `GET /api/v1/memory` with optional query parameter `?pattern=...`. Returns all memories matching the pattern (glob-style matching on key).

#### Scenario: List all memories
- **WHEN** caller sends `GET /api/v1/memory`
- **THEN** response is `{"memories": [{"key": "...", "content": "...", "type": "..."}, ...]}`

#### Scenario: Scan memories with pattern
- **WHEN** caller sends `GET /api/v1/memory?pattern=project-*`
- **THEN** response contains only memories with keys starting with `project-`

### Requirement: Delete memory

The service SHALL provide `DELETE /api/v1/memory/:key` to remove a memory.

#### Scenario: Delete existing memory
- **WHEN** caller sends `DELETE /api/v1/memory/project-context`
- **THEN** memory is removed
- **THEN** response is `{"ok": true}`

#### Scenario: Delete nonexistent memory
- **WHEN** caller sends `DELETE /api/v1/memory/nonexistent`
- **THEN** response is `404 Not Found` with `{"error": "Memory not found"}`
