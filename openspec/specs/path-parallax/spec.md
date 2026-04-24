## Purpose

Provide virtual-to-physical path mapping (path parallax) where the LLM operates in a virtual `/workspace` directory that maps to a physical workspace directory on the host.

## Requirements

### Requirement: Virtual-to-physical path mapping
The system SHALL provide path parallax where LLM operates in a virtual `/workspace` directory that maps to a physical workspace directory on the host.

**Applicability**: This requirement applies when SandboxFileTools are used with `hostWorkspaceDir` set in ToolContext.

#### Scenario: Virtual workspace is isolated
- **WHEN** LLM uses SandboxFileTools with `hostWorkspaceDir` set
- **THEN** the path SHALL be interpreted as relative to `/workspace`
- **AND** the physical path SHALL be `{hostWorkspaceDir}/{virtualPath}`
- **AND** `{hostWorkspaceDir}` is the session's physical workspace directory

#### Scenario: Path traversal is blocked
- **WHEN** LLM attempts to access a path outside workspace via SandboxFileTools (e.g., `/workspace/../../../etc/shadow`)
- **THEN** the system SHALL resolve the final physical path
- **AND** if the final path does NOT start with `{hostWorkspaceDir}`, the operation SHALL be rejected
- **AND** an error SHALL be returned to LLM indicating security violation

#### Scenario: Relative paths are resolved correctly
- **WHEN** LLM uses relative path (e.g., `./src/main.py`) with SandboxFileTools
- **THEN** the path SHALL be resolved relative to `/workspace`
- **AND** the same `startsWith()` validation SHALL be applied

#### Scenario: Symlink traversal is prevented
- **WHEN** a path traverses a symlink that leads outside workspace via SandboxFileTools
- **THEN** the system SHALL use `realpath()` to resolve the actual final path
- **AND** the `startsWith()` validation SHALL be applied to the resolved path
