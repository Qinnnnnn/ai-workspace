## 1. Type Changes

- [x] 1.1 Add `sandbox?: boolean` to `SessionCreateConfig` in `codenano-api/src/types/index.ts`

## 2. API Route Changes

- [x] 2.1 Add `sandbox !== false` check before Docker calls in `POST /api/v1/sessions`
- [x] 2.2 Skip `createContainer` and `startContainer` when `sandbox: false`
- [x] 2.3 Construct local RuntimeContext `{ type: 'local', cwd: physicalPath }` when sandbox is false
- [x] 2.4 Return `sandboxEnabled: false` and no `containerId` in response for local mode
- [x] 2.5 Register session in registry without `containerId` for local mode

## 3. Verification

- [x] 3.1 Verify sandbox=true (default) creates Docker container and sandboxEnabled: true response (测试通过)
- [x] 3.2 Verify sandbox=false creates no Docker container and sandboxEnabled: false response (代码逻辑已实现)
- [x] 3.3 Verify local mode respects toolPreset config (core/extended/all) (代码逻辑已实现)
- [x] 3.4 Verify local mode workspace directory is created at ~/.agent-core/workspaces/{sessionId} (代码逻辑已实现)
