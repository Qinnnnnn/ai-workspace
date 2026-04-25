## Why

The current API layer (`codenano-api`) only supports sandbox mode when creating sessions. Every session creation immediately creates a Docker container, making local development and debugging cumbersome. Adding local mode support allows developers to quickly iterate on agent behavior without container overhead.

## What Changes

- **New `sandbox` config field**: `POST /api/v1/sessions` accepts `config.sandbox` (boolean, defaults to `true` for backward compatibility)
- **Local mode session creation**: When `sandbox: false`, the API skips Docker container creation and uses the local filesystem directly
- **Tool selection in local mode**: Local mode respects `toolPreset` config (`core` / `extended` / `all`), unlike sandbox mode which always uses `sandboxCoreTools()`
- **RuntimeContext branching**: The existing `RuntimeContext` discriminated union (`local` | `sandbox`) is leveraged, with the API now constructing the appropriate variant

## Capabilities

### New Capabilities

- `local-runtime-mode`: Support creating sessions that run directly on the host filesystem without Docker isolation. Tools are selected via `toolPreset` and paths resolve directly.

### Modified Capabilities

- `session-management`: The session creation flow now branches based on `sandbox` config. When `sandbox: false`, Docker container lifecycle is skipped.
- `docker-sandbox-runtime`: No change to sandbox behavior itself — this capability remains unchanged for `sandbox: true` cases.
- `tool-preset-config`: In local mode, `toolPreset` selection is honored (sandbox mode still uses fixed `sandboxCoreTools()`).

## Impact

**Affected code:**
- `codenano-api/src/routes/sessions.ts`: Add conditional branching for sandbox vs local
- `codenano-api/src/types/index.ts`: Add `sandbox?: boolean` to `SessionCreateConfig`
- `codenano-api/src/services/docker-service.ts`: Unchanged (only called when sandbox: true)

**No impact:**
- `codenano/src/agent.ts`: Already has RuntimeContext branching via `runtime?.type === 'sandbox'`
- `codenano/src/tools/index.ts`: Unchanged
- Existing sandbox sessions behave identically
