## MODIFIED Requirements

### Requirement: Workspace isolation in tools

File operation tools SHALL be constrained to operate only within the session's workspace directory. The workspace path SHALL be passed via `ToolContext.cwd` and tools SHALL execute commands with `cwd` set to this value.

#### Scenario: FileReadTool uses context cwd
- **WHEN** FileReadTool executes
- **THEN** it SHALL use `context.cwd` for path validation and file operations
- **AND** paths outside `context.cwd` SHALL be rejected with an error

#### Scenario: FileWriteTool uses context cwd
- **WHEN** FileWriteTool executes
- **THEN** it SHALL use `context.cwd` for path validation and file operations
- **AND** write operations outside `context.cwd` SHALL be rejected with an error

#### Scenario: BashTool uses context cwd for execution
- **WHEN** BashTool executes
- **THEN** it SHALL use `context.cwd` for command validation via path-guard
- **AND** `execSync`/`exec` SHALL be called with `cwd: context.cwd` option
- **AND** commands referencing paths outside `context.cwd` SHALL be rejected with an error

#### Scenario: GlobTool uses context cwd for search directory
- **WHEN** GlobTool executes
- **THEN** it SHALL use `context.cwd` as the default search directory
- **AND** `execSync` SHALL be called with `cwd: context.cwd` option

#### Scenario: GrepTool uses context cwd for search path
- **WHEN** GrepTool executes
- **THEN** it SHALL use `context.cwd` as the default search path
- **AND** `execSync` SHALL be called with `cwd: context.cwd` option

### Requirement: ToolContext uses cwd field

The `ToolContext` interface SHALL include a `cwd` field of type `string`. This field SHALL be populated by the tool executor from `AgentConfig.workspace` and SHALL be used by tools as the session's working directory.

#### Scenario: ToolContext contains cwd
- **WHEN** a tool's execute function is called
- **THEN** the `ToolContext` SHALL contain `cwd: string`
- **AND** the value SHALL match `AgentConfig.workspace`

#### Scenario: Tool executor sets cwd from workspace config
- **WHEN** the tool executor builds `ToolContext`
- **THEN** the `cwd` field SHALL be set to `config.workspace`
