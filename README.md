```
 ██████╗ ██████╗ ██╗██╗   ██╗███████╗
 ██╔══██╗██╔══██╗██║██║   ██║██╔════╝
 ██║  ██║██████╔╝██║██║   ██║█████╗
 ██║  ██║██╔══██╗██║╚██╗ ██╔╝██╔══╝
 ██████╔╝██║  ██║██║ ╚████╔╝ ███████╗
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
```

> **生产级 AI 编程 Agent 架构，开源可用。**
>
> 灵感来自业界领先的 AI 编程工具，专注于轻量、模块化、生产就绪。

---

## 血统

本项目基于 **Claude Code** 的生产级 Agent 架构改造。

Claude Code 是 Anthropic 官方推出的 CLI 工具，为全球开发者提供 AI 编程能力。其核心架构经过海量真实代码库验证，稳定可靠。

**codenano** 提取其核心引擎，保留精华，去除终端 UI 绑定，做成轻量级 SDK，让每个人都能基于这套架构构建自己的 AI 编程工具。

```
Claude Code (Anthropic 官方)
        │
        │ 提取核心架构
        ▼
    codenano SDK
        │
        ├── codenano-api (HTTP/WebSocket 服务)
        └── openspec (变更管理系统)
```

---

## 模块

### [codenano](./codenano/) — AI 编程 Agent SDK

轻量级 AI 编程 Agent SDK，保留 Claude Code 核心架构。

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
| **~8,000 行代码** | 专注核心架构，无 UI 冗余 |
| **17 内置工具** | Read/Edit/Write/Glob/Grep/Bash + WebSearch + MCP |
| **流式输出** | 实时看到 Agent 思考过程 |
| **会话持久化** | JSONL 保存/恢复 |
| **跨会话记忆** | 自动提取并持久化重要上下文 |
| **MCP 协议** | 连接任意 MCP 服务器 |
| **8 个生命周期钩子** | 精细控制 Agent 行为 |
| **生产级可靠性** | 自动压缩、错误恢复、Token 预算 |

> 继承自 Claude Code 的生产验证架构，经过真实代码库海量验证。

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
| `POST /api/v1/sessions/:id/message` | 发送消息 (SSE 流式) |
| `GET /ws/sessions/:id/hooks` | WebSocket 钩子通道 |
| `POST /api/v1/memory` | 持久化记忆 |
| `POST /api/v1/mcp/connect` | 连接 MCP 服务器 |

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
└── changes/         # 变更提案
    └── per-session-workspace-isolation/
        ├── proposal.md
        ├── design.md
        ├── specs/
        └── tasks.md
```

---

## 快速开始

```bash
# 安装 SDK
npm install codenano

# 运行
node -e "
const { createAgent, coreTools } = require('codenano')
const agent = createAgent({ model: 'claude-sonnet-4-6', tools: coreTools() })
agent.ask('What is 2+2?').then(r => console.log(r.text))
"
```

---

## 技术栈

```
┌─────────────────────────────────────────────────────────┐
│                        AI Workspace                      │
├─────────────────┬──────────────────┬───────────────────┤
│    codenano     │   codenano-api   │     openspec      │
│   ───────────   │   ────────────   │    ─────────      │
│  TypeScript     │  TypeScript      │   Markdown        │
│  Node.js        │  Fastify         │   JSON Schema     │
│  Anthropic SDK  │  WebSocket       │   Git-based       │
└─────────────────┴──────────────────┴───────────────────┘
```

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

## 与 Claude Code 的关系

| 特性 | Claude Code | codenano |
|------|-------------|----------|
| Agent 循环 | `while(true) → model → tool_use → execute → repeat` | ✅ 相同模式 |
| 核心工具集 | Read/Edit/Write/Bash/Grep/Glob | ✅ 相同 |
| 流式执行 | ✅ | ✅ |
| 会话持久化 | ✅ | ✅ |
| 记忆系统 | ✅ | ✅ |
| MCP 协议 | ✅ | ✅ |
| CLI/TUI | ✅ 终端 UI | ❌ 纯 SDK |
| 权限系统 | 6 种模式 + 规则层 | 简化版钩子 |

codenano 保留了 Claude Code 的**核心引擎**，去除了终端 UI 绑定，适合构建：

- AI 编程 API 服务
- 自定义 AI 编码助手
- CI/CD 集成工具
- 代码审查/分析服务

---

<p align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**Powered by Claude Code Architecture**

</p>
