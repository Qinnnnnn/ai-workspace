# AI Workspace

```
 ██████╗ ██████╗ ██╗██╗   ██╗███████╗
 ██╔══██╗██╔══██╗██║██║   ██║██╔════╝
 ██║  ██║██████╔╝██║██║   ██║█████╗
 ██║  ██║██╔══██╗██║╚██╗ ██╔╝██╔══╝
 ██████╔╝██║  ██║██║ ╚████╔╝ ███████╗
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
```

> 一个充满可能性的 AI 编程工作空间。轻量、模块化、生产就绪。

---

## 模块

### [codenano](./codenano/) — AI 编程 Agent SDK

轻量级 AI 编程 Agent SDK，灵感来自生产级 Agent 架构。

```typescript
import { createAgent, coreTools } from 'codenano'

const agent = createAgent({
  model: 'claude-sonnet-4-6',
  tools: coreTools(),
})

const result = await agent.ask('Read package.json and summarize it')
```

| 特性 | 描述 |
|------|------|
| ~8,000 行代码 | 专注核心，无冗余 |
| 17 内置工具 | Read/Edit/Write/Glob/Grep/Bash + 更多 |
| 流式输出 | 实时看到 Agent 思考过程 |
| 会话持久化 | JSONL 保存/恢复 |
| 跨会话记忆 | 自动提取并持久化重要上下文 |
| MCP 协议 | 连接任意 MCP 服务器 |
| 8 个生命周期钩子 | 精细控制 Agent 行为 |
| 生产级可靠性 | 自动压缩、错误恢复、Token 预算 |

**[深入文档](./codenano/README.md)**

---

### [codenano-api](./codenano-api/) — HTTP/WebSocket 服务

Node.js Fastify 服务，封装 codenano SDK 提供 RESTful API。

```bash
cd codenano-api
npm install && npm run build
ANTHROPIC_AUTH_TOKEN=sk-ant-... npm start
```

| 端点 | 功能 |
|------|------|
| `POST /api/v1/sessions` | 创建会话 |
| `POST /api/v1/sessions/:id/message` | 发送消息 (支持 SSE 流式) |
| `GET /ws/sessions/:id/hooks` | WebSocket 钩子通道 |
| `POST /api/v1/memory` | 持久化记忆 |
| `POST /api/v1/mcp/connect` | 连接 MCP 服务器 |
| `GET /api/v1/cost/pricing` | 模型定价查询 |

**[完整 API 文档](./docs/codenano-api.md)**

---

### [openspec](./openspec/) — 变更管理系统

结构化变更管理系统，支持 proposal → design → specs → tasks 工作流。

```
openspec/
├── specs/           # 主规格文档
│   ├── agent-api/
│   ├── session-management/
│   ├── memory-api/
│   ├── mcp-api/
│   └── sandbox-isolation/
└── changes/         # 变更提案 (delta specs)
    └── per-session-workspace-isolation/
        ├── proposal.md
        ├── design.md
        ├── specs/
        └── tasks.md
```

**[查看规格](./openspec/specs/)**

---

## 快速开始

### 1. 安装依赖

```bash
# codenano SDK
npm install codenano

# 或启动 API 服务
cd codenano-api && npm install
```

### 2. 设置环境变量

```bash
export ANTHROPIC_AUTH_TOKEN=sk-ant-your-token-here
```

### 3. 运行示例

```bash
# SDK 示例
node -e "
const { createAgent, coreTools } = require('codenano')
const agent = createAgent({ model: 'claude-sonnet-4-6', tools: coreTools() })
agent.ask('What is 2+2?').then(r => console.log(r.text))
"

# 或启动 API 服务
ANTHROPIC_AUTH_TOKEN=your-token npm start
```

---

## 技术栈

```
┌─────────────────────────────────────────────────────────┐
│                        AI Workspace                      │
├─────────────────────────────────────────────────────────┤
│  codenano         │  codenano-api    │  openspec       │
│  ─────────────    │  ─────────────   │  ─────────      │
│  TypeScript       │  TypeScript      │  Markdown       │
│  Node.js          │  Fastify        │  JSON Schema    │
│  Anthropic SDK    │  WebSocket      │  Git-based      │
└─────────────────────────────────────────────────────────┘
```

| 组件 | 技术 | 用途 |
|------|------|------|
| Runtime | Node.js 18+ | JavaScript 运行时 |
| Language | TypeScript 5.7 | 类型安全 |
| SDK | Anthropic SDK | Claude API |
| HTTP | Fastify | 高性能 Web 框架 |
| Streaming | Server-Sent Events | 实时流式响应 |
| Persistence | JSONL | 会话和记忆存储 |
| MCP | STDIO/SSE/HTTP | Model Context Protocol |

---

## 文档

- [Codenano SDK](./codenano/README.md) — 完整 SDK 文档
- [Codenano API](./docs/codenano-api.md) — REST API 参考
- [本地开发](./docs/local-development.md) — 开发环境设置

---

## 架构概览

```
                        ┌──────────────┐
                        │   Client     │
                        └──────┬───────┘
                               │ HTTP/WS
                        ┌──────▼───────┐
                        │ codenano-api │
                        │   (Fastify)  │
                        └──────┬───────┘
                               │ SDK
                        ┌──────▼───────┐
                        │   codenano   │
                        │   (Agent)    │
                        └──────┬───────┘
                               │ Tools
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │   File    │   │   Bash    │   │   MCP     │
        │  System   │   │ Command   │   │  Server   │
        └───────────┘   └───────────┘   └───────────┘
```

---

<p align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

</p>
