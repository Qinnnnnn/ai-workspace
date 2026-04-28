> **受 Claude Code 启发，轻量级 AI 编程 Agent SDK，生产级架构。**
>
> 从 Claude Code 生产架构中提取核心引擎，约 8,000 行专注代码，让每个人都能构建自己的 AI 编程工具。

---

## 项目灵感

基于 **Claude Code** 的生产级 Agent 架构改造。

Claude Code 是 Anthropic 官方推出的 CLI 工具，为全球开发者提供 AI 编程能力。其核心架构经过海量真实代码库验证，稳定可靠。

**codenano** 提取其核心引擎，保留精华，去除终端 UI 绑定，做成轻量级 SDK，让每个人都能基于这套架构构建自己的 AI 编程工具。

```
Claude Code (Anthropic 官方)
        │
        │ 提取核心架构
        ▼
    codenano SDK
        │
        └── codenano-api (HTTP/SSE 服务)
```

---

## 模块

### [codenano](./codenano/) — Agent SDK

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

---

### [codenano-api](./codenano-api/) — HTTP/SSE 服务

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
| `GET /api/v1/memory` | 列出记忆 |
| `POST /api/v1/memory` | 保存记忆 |

---

### [codenano-webui](./codenano-webui/) — Web UI

基于 codenano-api 的 Web 界面，提供可视化会话管理。

```bash
cd codenano-webui
npm install && npm run dev
```

| 特性 | 描述 |
|------|------|
| **会话管理** | 创建、恢复、搜索历史会话 |
| **流式输出** | 实时展示 Agent 响应 |
| **记忆管理** | 查看和编辑跨会话记忆 |
| **停止生成** | 一键中止长时间运行的任务 |


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
┌───────────────────────────────────────────────────────────────────┐
│                           AI Workspace                             │
├───────────────┬──────────────────────┬────────────────────────────┤
│   codenano    │    codenano-api      │       codenano-webui       │
│  ───────────  │    ────────────      │       ────────────         │
│  TypeScript   │    TypeScript        │  React + TypeScript        │
│  Node.js      │    Fastify           │  Vite                      │
│  Anthropic SDK│    SSE + REST        │  Radix UI                  │
│  ~8,000 lines │    RESTful + SSE     │  SSE (消费 API 流式响应)   │
└───────────────┴──────────────────────┴────────────────────────────┘
```

---

## 架构概览

```
                        ┌──────────────────┐
                        │  codenano-webui  │
                        │   (Web Client)   │
                        └────────┬─────────┘
                                 │ HTTP/SSE
                        ┌────────▼─────────┐
                        │   codenano-api   │
                        │     (Fastify)    │
                        └────────┬─────────┘
                                 │ SDK
                        ┌────────▼─────────┐
                        │    codenano      │
                        │     (Agent)     │
                        └────────┬─────────┘
                                 │ Tools
              ┌──────────────────┼──────────────────┐
              │                  │                  │
        ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
        │   File    │     │   Bash    │     │   MCP     │
        │  System   │     │ Command   │     │  Server   │
        └───────────┘     └───────────┘     └───────────┘
```