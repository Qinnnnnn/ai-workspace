## Purpose

Provide complete Linux namespace isolation for agent sessions using bwrap, allowing agents to operate in a sandboxed environment without affecting the host system.

## ADDED Requirements

### Requirement: Sandbox provides complete Linux environment isolation

The system SHALL create a bwrap sandbox for each session that provides complete Linux namespace isolation, including user, PID, and UTS namespaces. The sandbox MUST behave as a complete Linux machine from the agent's perspective.

### Requirement: Agent can access all system tools

The sandbox SHALL allow the agent to execute any system tool available on the host (Node.js, Python, git, compilers, shells, etc.) without restrictions.

### Requirement: Write operations are restricted to designated paths

All write operations within the sandbox SHALL be restricted to `/workspace` and `/tmp`. Write operations to any other path SHALL be blocked or redirected to tmpfs.

### Requirement: Host filesystem remains unmodified

The host filesystem SHALL NOT be modified by any agent action within any sandbox. All state changes SHALL be isolated to the sandbox's tmpfs or the session's workspace directory.

### Requirement: Sandbox has isolated hostname

The sandbox SHALL have an isolated hostname derived from the session ID (`sandbox-{session_id[:8]}`), not affecting the host's hostname.

## ADDED Scenarios

#### Scenario: Agent installs npm package in sandbox

- **WHEN** agent executes `npm install express` in the sandbox
- **THEN** the package is installed in `/workspace/node_modules` or `/tmp`
- **THEN** the host filesystem remains unchanged

#### Scenario: Agent writes to arbitrary filesystem path

- **WHEN** agent attempts to write to `/etc/some_file`
- **THEN** the write operation fails or goes to tmpfs
- **THEN** no change occurs on the host filesystem

#### Scenario: Agent runs Python script

- **WHEN** agent executes `python3 /workspace/script.py`
- **THEN** the script runs with full access to system Python packages
- **THEN** any files created by the script are in `/workspace` or `/tmp`

#### Scenario: Multiple sessions run simultaneously with different tools

- **WHEN** session A runs Node.js and session B runs Python
- **THEN** both sessions operate independently without interference
- **THEN** each session sees its own isolated environment
