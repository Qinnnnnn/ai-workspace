## Why

codenano 是一个功能完整的 TypeScript agent SDK，但在服务化场景下缺少 HTTP 接口和执行安全防护。将 codenano 用 FastAPI 包装后，可以作为一个内部 AI agent 服务供团队使用，同时通过 bwrap 沙箱防止危险的 bash 操作。

## What Changes

- 新建 **codenano-cli**：codenano 的 JSON-RPC CLI wrapper，让 Python 可以调用 codenano
- 新建 **FastAPI 服务**：提供 session 管理 + SSE 流式响应 + bwrap 沙箱
- 实现 **超轻量沙箱**：每个 session 在 bwrap 中运行，限制文件系统和网络

## Capabilities

### New Capabilities

- `codenano-cli`: codenano 的 long-running JSON-RPC CLI 入口，支持 stream event 推送
- `agent-api`: 暴露 session 创建、消息发送、流式响应、关闭的 REST API + SSE
- `session-sandbox`: bwrap 沙箱封装，session 进程在受限环境中运行

## Impact

- 新增 `codenano-cli/` 目录（TypeScript CLI）
- 新增 `fastapi/` 目录（Python FastAPI 服务）
- 新增 `.env`（配置）
- codenano 本身不做任何修改（纯包装）
