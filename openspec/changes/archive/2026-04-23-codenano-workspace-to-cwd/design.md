## Context

codenano-core 在 `81e392c` 中将 `AgentConfig.workspace` 和 `ToolContext.workspace` 统一改为 `cwd`。codenano-api 传递给 core 的字段名错误（仍用 `workspace`），API 响应字段也仍用 `workspace`。codenano-webui 期望 `workspace` 字段。

此变更需要：
1. codenano-api 内部修改变量名/字段名
2. API 响应字段从 `workspace` 改为 `cwd`
3. codenano-webui 更新类型定义

## Goals / Non-Goals

**Goals:**
- codenano-api 和 codenano-webui 的 `workspace` → `cwd` 完全对齐
- codenano-api 传给 codenano-core 的参数名正确（`cwd` 而非 `workspace`）

**Non-Goals:**
- 不做老版本兼容或字段转换层
- 不修改 codenano-core（已在其他 commit 中完成）

## Decisions

### 变量名统一为 `cwd`

codenano-api 内部变量 `workspace`（如 `const workspace = join(...)`）统一改为 `cwd`，保持与 codenano-core 一致。

**替代方案**: 保持内部变量名 `workspace`，仅在传 core 时做 `cwd: workspace` 映射。否决——内部不一致增加维护负担。

### API 响应字段直接改名

API 响应中 `workspace` 字段直接改为 `cwd`，不做双字段兼容。

**替代方案**: 同时返回 `workspace` 和 `cwd`。否决——用户明确要求不做兼容，直接改名。

## Risks / Trade-offs

无显著风险。纯重命名操作，不改变业务逻辑。
