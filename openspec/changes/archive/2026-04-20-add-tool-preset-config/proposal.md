## Why

Currently codenano-cli hardcodes `coreTools()` when creating an agent, making tools a fixed, non-configurable feature. Callers of codenano-service cannot choose which tool preset (core, extended, all) to enable. The codenano library already defines three tool presets but they are not exposed through the API.

## What Changes

- **codenano-cli**: Parse `toolPreset` parameter in init config, map to `coreTools()` / `extendedTools()` / `allTools()`
- **codenano-service**: Accept optional `toolPreset` field when creating a session, pass through to codenano-cli via init RPC
- **API**: `POST /api/v1/sessions` body supports `{ "toolPreset": "core" | "extended" | "all" }` (default: `"core"`)

## Capabilities

### New Capabilities

- `tool-preset-config`: Allow callers to configure which codenano tool preset is active per session. Three presets are available:
  - `core` (default): FileRead, FileEdit, FileWrite, Glob, Grep, Bash (6 tools)
  - `extended`: core + WebFetch, Tasks, Todos (13 tools)
  - `all`: extended + WebSearch, LSP, Agent, AskUser, Skill (18 tools, includes stubs)

### Modified Capabilities

- None — this is purely additive configuration, no existing capability requirements change.

## Impact

- **Files modified**:
  - `codenano-cli/src/index.ts` — add toolPreset mapping logic
  - `codenano-cli/src/types/rpc.ts` — add `toolPreset` to InitParams config
  - `codenano-service/api/routes/sessions.py` — pass toolPreset in create_session
  - `codenano-service/services/session_manager.py` — pass toolPreset to codenano-cli init
- **API change**: `POST /api/v1/sessions` accepts optional `toolPreset` in body
- **Dependencies**: codenano library (coreTools, extendedTools, allTools)
