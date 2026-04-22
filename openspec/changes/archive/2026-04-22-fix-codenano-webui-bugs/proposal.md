## Why

codenano-webui has two blocking bugs that prevent users from sending messages and managing sessions properly:
1. `crypto.randomUUID()` is not supported in the browser environment, causing send message to crash
2. DELETE session API returns 400 because the request client sets `Content-Type: application/json` even when there's no body

## What Changes

- **Fix crypto.randomUUID compatibility**: Replace `crypto.randomUUID()` with a cross-browser UUID generation function
- **Fix DELETE request Content-Type**: Only set `Content-Type: application/json` when the request has a body

## Capabilities

### New Capabilities
- `cross-browser-uuid`: Cross-browser compatible UUID generation to replace `crypto.randomUUID()`

### Modified Capabilities
- None - these are bug fixes to existing implementation, not requirement changes

## Impact

- **Affected code**:
  - `codenano-webui/src/App.tsx` - uses `crypto.randomUUID()` in `handleSend`
  - `codenano-webui/src/api/client.ts` - sets Content-Type header unconditionally
- **Browser compatibility**: Fixes support for browsers that don't support `crypto.randomUUID()` (e.g., older Chrome versions, some mobile browsers)
