## Purpose

Provide sandbox-aware file tools that perform native host file operations with path sandboxing. File operations use Node.js `fs` directly on the host for performance, with paths resolved through `hostWorkspaceDir`.

## Requirements

### Requirement: SandboxFileTool performs native host file operations
The system SHALL use Node.js `fs` module directly on the host for file read/write operations, enabling high-performance file handling without escaping issues.

**Note**: Sandbox versions of FileTools (SandboxFileReadTool, SandboxFileWriteTool, SandboxFileEditTool) were created with sandbox support. When `context.hostWorkspaceDir` is set, paths are sandboxed via `resolveSecurePhysicalPath()`. Use `sandboxCoreTools()` to get sandbox-aware tools.

#### Scenario: Read file from workspace
- **WHEN** LLM invokes SandboxFileReadTool with path `/workspace/src/main.py`
- **THEN** the system SHALL read the file at `{hostWorkspaceDir}/src/main.py`
- **AND** return file content to LLM

#### Scenario: Write file to workspace
- **WHEN** LLM invokes SandboxFileWriteTool with path `/workspace/src/main.py` and content
- **THEN** the system SHALL write content to `{hostWorkspaceDir}/src/main.py`
- **AND** the file SHALL be created/overwritten with exact content

#### Scenario: Edit file in workspace
- **WHEN** LLM invokes SandboxFileEditTool with path, old_string, new_string
- **THEN** the system SHALL read file at `{hostWorkspaceDir}/{path}`
- **AND** replace `old_string` with `new_string`
- **AND** write the modified content back

#### Scenario: EditTool replaces all occurrences by default
- **WHEN** LLM invokes SandboxFileEditTool with path and old_string that appears multiple times
- **THEN** the system SHALL replace ALL occurrences of `old_string` with `new_string`
- **AND** report the number of replacements made

#### Scenario: EditTool fails when old_string not found
- **WHEN** LLM invokes SandboxFileEditTool with path and old_string that does not exist in file
- **THEN** the system SHALL return an error indicating "old_string not found in file"
- **AND** the file SHALL remain unmodified

#### Scenario: WriteTool creates parent directories
- **WHEN** LLM invokes SandboxFileWriteTool with path `/workspace/src/utils/helpers.ts` but `/workspace/src/utils/` does not exist
- **THEN** the system SHALL create parent directories as needed
- **AND** write the file content

### Requirement: SandboxFileTool prevents path traversal attacks
The system SHALL validate all file paths against the workspace boundary to prevent unauthorized host file access.

#### Scenario: Path traversal attempt is blocked
- **WHEN** LLM attempts to read `/workspace/../../../etc/shadow` via SandboxFileReadTool
- **THEN** the system SHALL resolve to physical path outside `{hostWorkspaceDir}`
- **AND** the `startsWith()` check SHALL fail
- **AND** an error SHALL be returned with message "Security Violation: Path traversal attempt blocked"

#### Scenario: Relative path traversal is blocked
- **WHEN** LLM attempts to read `/workspace/../.ssh/id_rsa` via SandboxFileReadTool
- **THEN** the same path traversal check SHALL apply
- **AND** the operation SHALL be rejected

#### Scenario: Symlink escape is blocked
- **WHEN** LLM creates a symlink inside workspace pointing outside
- **AND** then tries to read through that symlink
- **THEN** `realpath()` resolution SHALL reveal the true path
- **AND** the operation SHALL be rejected if outside workspace

### Requirement: File operations succeed without permission errors
The system SHALL ensure files created by SDK on host can be accessed by container's agent user.

#### Scenario: UID alignment prevents permission errors
- **WHEN** SDK writes a file as host user (ubuntu UID)
- **AND** container's agent user has matching UID
- **THEN** the agent user SHALL be able to read/write/execute that file
