## Purpose

Manage session persistence, history loading, and registry as source of truth for sessions.

## ADDED Requirements

### Requirement: Session Navigation

When user clicks a session in the sidebar, the UI SHALL navigate to the chat view displaying the session's history.

#### Scenario: Click session in sidebar
- **WHEN** user clicks a session in the sidebar
- **THEN** the UI navigates to the chat view
- **AND** the session's history is loaded and displayed

### Requirement: Registry as Source of Truth

Session history SHALL only be accessible for sessions registered in the in-memory registry. If a session is not in the registry, the API SHALL return 404.

JSONL files without corresponding registry entries are considered dirty/incomplete data (may result from crashes, bugs, or manual deletion). Loading them silently could cause inconsistent behavior.

#### Scenario: Get history for registered session
- **WHEN** client calls `GET /api/v1/sessions/:id/history`
- **AND** the session exists in the registry
- **THEN** the session's history is returned from JSONL storage

#### Scenario: Get history for unregistered session
- **WHEN** client calls `GET /api/v1/sessions/:id/history`
- **AND** the session does not exist in the registry
- **THEN** `404 Not Found` is returned

### Requirement: Session Persistence

Session metadata SHALL be written to JSONL file on session creation. Session history SHALL be restorable from JSONL by session ID.

#### Scenario: Session creates JSONL file
- **WHEN** a session is created
- **THEN** a JSONL file is created at `~/.agent-core/sessions/<sessionId>.jsonl`
- **AND** the first entry is a metadata entry with sessionId, model, and createdAt

#### Scenario: Session writes messages to JSONL
- **WHEN** a session sends a message
- **THEN** the message is appended to the JSONL file
- **AND** each message entry contains role and content

#### Scenario: Session loads history from JSONL
- **WHEN** a session is resumed with an existing sessionId
- **AND** the JSONL file exists with metadata
- **THEN** the session's messages are loaded from the JSONL file
