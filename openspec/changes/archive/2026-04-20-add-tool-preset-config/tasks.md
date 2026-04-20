## 1. codenano-cli: Add tool preset imports

- [x] 1.1 Import `extendedTools`, `allTools` from `codenano` in `src/index.ts`

## 2. codenano-cli: Update InitParams type

- [x] 2.1 Add `toolPreset?: 'core' | 'extended' | 'all'` to `InitParams` interface in `src/types/rpc.ts`

## 3. codenano-cli: Add tool preset mapping in init handler

- [x] 3.1 Add `toolPreset` mapping logic in `server.register('init', ...)` handler
- [x] 3.2 Default to `coreTools()` when `toolPreset` is undefined or invalid
- [x] 3.3 Throw clear error when preset value is unrecognized
- [x] 3.4 Build codenano-cli: `npm run build`

## 4. codenano-service: Pass toolPreset in session creation

- [x] 4.1 `create_session` in `session_manager.py` accepts `toolPreset` from config
- [x] 4.2 `toolPreset` passed in `init_config` to codenano-cli's init RPC call
- [x] 4.3 Default to `"core"` if not provided

## 5. codenano-service: Accept toolPreset in API

- [x] 5.1 `POST /api/v1/sessions` body accepts optional `toolPreset` field
- [x] 5.2 Pass `toolPreset` through to `create_session` in `routes/sessions.py`
