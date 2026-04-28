## Purpose

Provide Docker-based sandbox isolation for agent sessions, hosted on a **remote Docker host** via SSH. Each session runs in an isolated Docker container with in-memory workspace (tmpfs) and no host filesystem dependency.

## MODIFIED Requirements

### Requirement: Docker sandbox lifecycle management
The system SHALL provide Docker container lifecycle management for session isolation. Each session SHALL have exactly one associated container that starts when the session is created and stops when the session is destroyed. The Docker daemon SHALL be accessed via SSH tunnel to a remote host.

#### Scenario: Create session starts container on remote host
- **WHEN** a session is created via `POST /api/v1/sessions`
- **THEN** the system SHALL create a Docker container named `codenano-sandbox-{sessionId}` on the remote Docker host
- **AND** the container SHALL have `/workspace` mounted as tmpfs with a 512MB size limit
- **AND** the container SHALL start with resource limits (0.5 CPU)
- **AND** the container's working directory SHALL be `/workspace`

#### Scenario: Delete session stops container
- **WHEN** a session is destroyed via `DELETE /api/v1/sessions/{sessionId}`
- **THEN** the system SHALL stop and remove the associated Docker container on the remote host

#### Scenario: Container uses specified Docker image
- **WHEN** a container is started
- **THEN** it SHALL use the image specified in `SANDBOX_DOCKER_IMAGE` env var (default: `codenano-sandbox:latest`)
- **AND** the container's working directory SHALL be `/workspace`

#### Scenario: SSH tunnel for Docker communication
- **WHEN** dockerode or docker CLI needs to communicate with the remote Docker host
- **THEN** the connection SHALL be established via SSH using credentials from `DOCKER_HOST_HOST`, `DOCKER_HOST_USER`, and `DOCKER_HOST_KEY_PATH`
- **AND** no Docker TCP ports shall be exposed on the remote host

#### Scenario: Docker daemon unavailable
- **WHEN** SSH connection to Docker host fails or Docker daemon is not accessible
- **THEN** the system SHALL return HTTP 503 with error message
- **AND** the session SHALL NOT be created

### Requirement: Remote Docker file operations
The system SHALL route all file operations through `docker exec` executed via SSH on the remote Docker host. No file operations SHALL directly access the host filesystem.

#### Scenario: Read file from sandbox
- **WHEN** `SandboxFileReadTool` is invoked with a file path
- **THEN** the system SHALL execute `docker exec {containerId} cat {path}` via SSH
- **AND** the stdout output SHALL be returned as the file content

#### Scenario: Write file to sandbox
- **WHEN** `SandboxFileWriteTool` is invoked with a file path and content
- **THEN** the system SHALL execute `docker exec -i {containerId} bash -c 'mkdir -p $(dirname {path}) && cat > {path}'` with content streamed via stdin
- **AND** the system SHALL NOT interpolate content into the shell command string

#### Scenario: Edit file in sandbox
- **WHEN** `SandboxFileEditTool` is invoked
- **THEN** the system SHALL read the file via `docker exec cat`
- **AND** perform string replacement in Node.js memory
- **AND** write the updated content back via `docker exec -i cat > {path}` with stdin streaming

#### Scenario: Glob search in sandbox
- **WHEN** `SandboxGlobTool` is invoked
- **THEN** the system SHALL execute `docker exec {containerId} bash -c 'find /workspace ...'` via SSH
- **AND** return the stdout output as the list of matched paths

#### Scenario: Grep search in sandbox
- **WHEN** `SandboxGrepTool` is invoked
- **THEN** the system SHALL execute `docker exec {containerId} bash -c 'rg ... /workspace'` via SSH
- **AND** return the stdout output as the search results

#### Scenario: Bash command in sandbox
- **WHEN** `SandboxBashTool` is invoked
- **THEN** the system SHALL execute `docker exec {containerId} bash -c '{command}'` via SSH
- **AND** return the stdout/stderr output

### Requirement: Path security validation
The system SHALL validate that all file paths accessed within the sandbox remain within the `/workspace` directory. Validation SHALL be performed inside the container.

#### Scenario: Path traversal attempt is blocked
- **WHEN** a tool requests access to a path like `/etc/passwd` or `/workspace/../../../etc/passwd`
- **THEN** the system SHALL execute `realpath -m {path}` followed by a prefix check `[[ "$rp" == /workspace/* ]]` inside the container
- **AND** if the resolved path does not start with `/workspace/`, the request SHALL be rejected with a security violation error
- **AND** the original request SHALL NOT be executed
- **NOTE**: `realpath -m` is used instead of `realpath --relative-base` because `realpath -m` resolves paths without requiring the file to exist (needed for `Write` tool on new files)

### Requirement: Tmpfs workspace isolation
The system SHALL use container tmpfs for workspace storage, ensuring complete isolation from the host filesystem and ephemeral session data.

#### Scenario: Workspace is in-memory
- **WHEN** a container is created
- **THEN** `/workspace` SHALL be mounted as tmpfs with a maximum size of 512MB
- **AND** no bind mount or volume SHALL be used for workspace
- **AND** session data SHALL NOT persist after container deletion
