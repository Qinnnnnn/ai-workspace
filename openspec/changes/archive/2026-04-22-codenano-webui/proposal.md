## Why

现有的 `webui` 模块是基于旧的 WebSocket 协议设计的，与 codenano-api 的 SSE + REST API 架构不匹配，无法直接对接。为 codenano-api 构建一个全新的 webui，可以实现完美优雅的集成，同时避免遗留代码负担。

## What Changes

- 新建 `codenano-webui/` 目录，实现完整的 React WebUI
- 使用 React 18 + Vite + TypeScript + TailwindCSS + Radix UI 技术栈
- 通过 REST API 对接 codenano-api 的会话管理
- 通过 SSE 流式对接 codenano-api 的消息流
- 支持：会话列表、新建会话、发送消息、接收流式响应、工具调用展示、删除会话
- **BREAKING**: 独立新项目，与现有 webui 完全分离

## Capabilities

### New Capabilities

- `codenano-webui`: 纯对话 UI，与 codenano-api 完美对接
  - 会话管理（创建、列表、删除）
  - 实时消息流（支持 SSE 流式渲染）
  - 工具调用卡片展示（tool_use / tool_result）
  - 消息输入与发送

### Modified Capabilities

- 无（不修改现有 specs）

## Impact

- **新增目录**: `codenano-webui/`
- **依赖**: codenano-api (已有)
- **技术栈**: React 18, Vite, TypeScript, TailwindCSS, Radix UI
