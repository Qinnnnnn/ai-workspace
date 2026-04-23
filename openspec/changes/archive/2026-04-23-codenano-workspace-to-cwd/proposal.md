## Why

codenano-core 在 commit `81e392c` 中将 `ToolContext.workspace` 和 `AgentConfig.workspace` 统一改为 `cwd`，以消除术语歧义（workspace 在此上下文中本质是"当前工作目录"）。codenano-api 和 codenano-webui 仍使用旧名称 `workspace`，需要同步更新以保持一致。

## What Changes

- **codenano-api** `src/routes/sessions.ts`: 变量 `workspace` → `cwd`，API 响应字段 `workspace` → `cwd`
- **codenano-api** `src/services/session-registry.ts`: 接口字段 `workspace` → `cwd`，相关方法参数/返回值同步更新
- **codenano-webui** `src/api/sessions.ts`: `CreateSessionResponse.workspace` → `cwd`
- **codenano-webui** `src/lib/types.ts`: `SessionSummary.workspace` → `cwd`

**BREAKING**: API 响应字段从 `workspace` 改为 `cwd`，老版本客户端需要升级。

## Capabilities

### New Capabilities

无新能力引入，仅重命名。

### Modified Capabilities

- **workspace-persistence**: 字段名从 `workspace` 改为 `cwd`，对应 API 响应格式变化。
  - `GET /api/v1/sessions/{id}` 响应中 `workspace` 字段改为 `cwd`
  - `GET /api/v1/sessions` 响应中 `workspace` 字段改为 `cwd`
  - `POST /api/v1/sessions` 响应中 `workspace` 字段改为 `cwd`

## Impact

- **codenano-api**: 需修改 2 个文件，共 13 处重命名
- **codenano-webui**: 需修改 2 个文件，共 2 处重命名
- **影响范围**: API 消费者（webui、其他调用方）需同步更新字段名
