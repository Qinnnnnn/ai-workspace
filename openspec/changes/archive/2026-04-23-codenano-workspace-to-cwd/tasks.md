## 1. codenano-api 修改

- [x] 1.1 `src/routes/sessions.ts`: 变量 `workspace` → `cwd`（第 36, 39, 76, 91, 94 行）
- [x] 1.2 `src/routes/sessions.ts`: API 响应字段 `workspace` → `cwd`（第 94, 118, 126, 148 行）
- [x] 1.3 `src/services/session-registry.ts`: 接口 `SessionEntry.workspace` → `cwd`（第 17 行）
- [x] 1.4 `src/services/session-registry.ts`: `register()` 参数 `workspace` → `cwd`（第 50, 59 行）
- [x] 1.5 `src/services/session-registry.ts`: `list()` 返回字段 `workspace` → `cwd`（第 80, 86 行）
- [x] 1.6 `src/services/session-registry.ts`: `destroy()` 中 `entry.workspace` → `entry.cwd`（第 110 行）

## 2. codenano-webui 修改

- [x] 2.1 `src/api/sessions.ts`: `CreateSessionResponse.workspace` → `cwd`（第 15 行）
- [x] 2.2 `src/lib/types.ts`: `SessionSummary.workspace` → `cwd`（第 50 行）
