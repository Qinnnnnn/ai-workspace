## ADDED Requirements

### Requirement: All command-execution tools proxy through Docker container
The system SHALL proxy all command-execution tools (BashTool, GlobTool, GrepTool) through `docker exec` to ensure commands execute inside the isolated sandbox container.

**Note**: The 6 coreTools are split into two categories:
- **Host-executed (SecureFileTool)**: FileReadTool, FileWriteTool, FileEditTool — SDK uses Node.js `fs` directly on host
- **Container-executed (SandboxTool)**: BashTool, GlobTool, GrepTool — executed via `docker exec`

#### Scenario: BashTool execution via docker exec
- **WHEN** LLM invokes BashTool with command `ls -la`
- **THEN** the system SHALL execute `docker exec {containerId} bash -c "cd /workspace && ls -la"`
- **AND** stdout SHALL be returned to LLM as command output
- **AND** stderr SHALL be returned to LLM as error output (if any)

#### Scenario: GlobTool execution via docker exec
- **WHEN** LLM invokes GlobTool with pattern `**/*.ts`
- **THEN** the system SHALL execute `docker exec {containerId} bash -c "cd /workspace && find . -name '*.ts'"`
- **AND** results SHALL be returned to LLM

#### Scenario: GrepTool execution via docker exec
- **WHEN** LLM invokes GrepTool with pattern `function.*test` and path `/workspace/src`
- **THEN** the system SHALL execute `docker exec {containerId} bash -c "cd /workspace && rg -- 'function.*test' src"`
- **AND** matches SHALL be returned to LLM
- **AND** the `--` separator SHALL be used to prevent pattern from being interpreted as an option

#### Scenario: GrepTool handles patterns with special characters
- **WHEN** LLM invokes GrepTool with pattern containing single quotes (e.g., `don't worry`)
- **THEN** the system SHALL escape single quotes appropriately for bash (`'\''`)
- **OR** use ripgrep's `-e pattern` flag to avoid quoting issues
- **AND** the search SHALL succeed without syntax errors

#### Scenario: Command respects timeout
- **WHEN** LLM invokes a container-executed tool with a long-running command
- **THEN** the execution SHALL be subject to timeout (default: 120 seconds)
- **AND** if timeout is exceeded, the system SHALL throw timeout error
- **AND** LLM SHALL receive error message suggesting `run_in_background` parameter

#### Scenario: Working directory is /workspace for all tools
- **WHEN** LLM invokes BashTool, GlobTool, or GrepTool
- **THEN** the command SHALL execute with `/workspace` as current working directory
- **AND** this SHALL be achieved via `cd /workspace && {command}` wrapper

#### Scenario: Environment variables are controlled
- **WHEN** a command is executed inside container
- **THEN** only explicitly whitelisted environment variables SHALL be passed
- **AND** host environment variables SHALL NOT be automatically forwarded

### Requirement: Command execution is isolated
The system SHALL ensure command execution cannot escape the sandbox container or affect the host.

#### Scenario: Dangerous commands are contained
- **WHEN** LLM executes `rm -rf /` inside container
- **THEN** the operation SHALL be limited to container's filesystem
- **AND** host files SHALL remain unaffected

#### Scenario: Container process isolation
- **WHEN** a command starts a background process
- **THEN** the process SHALL belong to container's namespace
- **AND** it SHALL be subject to container's resource limits
