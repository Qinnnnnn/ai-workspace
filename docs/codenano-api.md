# Codenano API Reference

Node.js Fastify HTTP 服务，封装 codenano SDK（基于 Claude Code 核心架构）。

**Powered by Claude Code Architecture**

**Base URL**: `http://localhost:8000`

> **注意**: 本文档描述的某些功能（如 WebSocket Hooks、MCP、Custom Tools）在当前实现中可能不可用，详见各节说明。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ANTHROPIC_AUTH_TOKEN` | **是** | - | Anthropic API 密钥 |
| `ANTHROPIC_BASE_URL` | 否 | - | API 端点（覆盖 config.baseURL） |
| `ANTHROPIC_MODEL` | 否 | `claude-sonnet-4-6` | 默认模型 |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别 |
| `AGENT_SERVICE_PORT` | 否 | `8000` | 服务端口 |
| `SB_TTL_MINUTES` | 否 | `30` | Session TTL（分钟） |

## Session API

### 创建 Session

**端点**: `POST /api/v1/sessions`

**请求体**:
```json
{
  "config": {
    "model": "claude-sonnet-4-6",
    "maxTurns": 50,
    "toolPreset": "core"
  },
  "toolPermissions": {
    "Bash": "deny"
  }
}
```

**响应**: `200 OK`
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "workspace": "/home/user/.agent-core/workspaces/550e8400-e29b-41d4-a716-446655440000"
}
```

### config 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `model` | string | `claude-sonnet-4-6` | Claude 模型 |
| `provider` | string | `anthropic` | 提供商：`anthropic`、`bedrock` |
| `awsRegion` | string | - | AWS 区域（provider=bedrock 时） |
| `baseURL` | string | - | API 端点（优先级高于环境变量） |
| `fallbackModel` | string | - | 529 错误时的备用模型 |
| `toolPreset` | string | `core` | 工具预设：`core`、`extended`、`all` |
| `tools` | ToolDef[] | - | 自定义工具，与 `toolPreset` 互斥 |
| `maxTurns` | number | `30` | 最大对话轮数 |
| `thinkingConfig` | string | `disabled` | `adaptive` 或 `disabled` |
| `maxOutputTokens` | number | `16384` | 最大输出 token 数 |
| `maxOutputRecoveryAttempts` | number | - | 输出超限恢复尝试次数 |
| `maxOutputTokensCap` | boolean | - | 是否 cap 最大输出 tokens |
| `streamingToolExecution` | boolean | - | 流式工具执行 |
| `identity` | string | - | Agent 身份标识 |
| `language` | string | - | 响应语言 |
| `systemPrompt` | string | - | 自定义系统提示词 |
| `overrideSystemPrompt` | string | - | 完全替换系统提示词 |
| `appendSystemPrompt` | string | - | 追加到系统提示词 |
| `autoCompact` | boolean | `true` | 自动压缩上下文 |
| `autoLoadInstructions` | boolean | - | 自动加载 instructions |
| `mcpServers` | MCPServerConfig[] | - | MCP 服务器配置 |
| `persistence` | object | - | 持久化配置 |
| `memory` | object | - | 记忆配置 |

### toolPermissions 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `toolPermissions` | Record<string, 'allow' \| 'deny'> | `{}` | 工具权限配置，未指定的工具由 agent 决定 |

### persistence 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 启用持久化 |
| `storageDir` | string | codenano 默认 | 存储目录 |
| `resumeSessionId` | string | - | 恢复的 session ID |

### memory 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `memoryDir` | string | codenano 默认 | 记忆目录 |
| `autoLoad` | boolean | - | 自动加载记忆 |
| `extractStrategy` | string \| object | - | 提取策略：`disabled`、`auto` 或 `{interval: number}` |
| `extractMaxTurns` | number | - | 提取最大轮数 |
| `useForkedAgent` | boolean | - | 使用 fork 代理 |

### MCPServerConfig 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 服务器名称 |
| `transport` | string | 传输类型：`stdio`、`sse`、`http` |
| `command` | string | 启动命令 |
| `args` | string[] | 命令参数 |
| `env` | object | 环境变量 |
| `url` | string | 服务器 URL（transport=sse/http 时） |
| `headers` | object | HTTP 请求头（transport=http 时） |

### 工具权限

| 模式 | 行为 |
|------|------|
| `allow` | 工具直接执行 |
| `deny` | 工具被阻止 |

> **注意**: `ask` 模式当前未实现。WebSocket Hooks 功能暂不可用。

---

### 发送消息

**端点**: `POST /api/v1/sessions/:id/message`

**请求体**:
```json
{
  "prompt": "Hello, explain this code",
  "stream": true
}
```

**流式响应** (`stream: true`):
```
Content-Type: text/event-stream

data: {"type":"query_start","queryTracking":{...}}
data: {"type":"text","text":"Hello! I'd be happy to..."}
data: {"type":"tool_use","toolName":"Bash","toolInput":{...}}
data: {"type":"result","result":{...}}
```

**SSE 事件类型**: `query_start`、`text`、`tool_use`、`result`

**非流式响应** (`stream: false`):
```json
{
  "result": {
    "text": "...",
    "usage": { "inputTokens": 100, "outputTokens": 200 },
    "stopReason": "end_turn"
  }
}
```

---

### 获取 Session

**端点**: `GET /api/v1/sessions/:id`

**响应**: `200 OK`
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "workspace": "/home/user/.agent-core/workspaces/550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-04-20T10:00:00.000Z",
  "lastActivity": "2026-04-20T10:05:00.000Z"
}
```

---

### 列出所有 Sessions

**端点**: `GET /api/v1/sessions`

**响应**: `200 OK`
```json
{
  "sessions": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2026-04-20T10:00:00.000Z",
      "lastActivity": "2026-04-20T10:05:00.000Z",
      "workspace": "/home/user/.agent-core/workspaces/550e8400-e29b-41d4-a716-446655440000",
      "active": true
    }
  ]
}
```

---

### 获取 Session 历史

**端点**: `GET /api/v1/sessions/:id/history`

**响应**: `200 OK`
```json
{
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": [{ "type": "text", "text": "Hi" }] }
  ]
}
```

---

### 删除 Session

**端点**: `DELETE /api/v1/sessions/:id`

**响应**: `200 OK`
```json
{ "ok": true }
```

---

## Memory API

### 保存 Memory

**端点**: `POST /api/v1/memory`

**请求体**:
```json
{
  "key": "project-context",
  "content": "This is a Python ML project",
  "type": "context",
  "description": "项目上下文"
}
```

**响应**: `200 OK`
```json
{ "ok": true, "filepath": "/path/to/memory.md" }
```

---

### 获取 Memory

**端点**: `GET /api/v1/memory/:key`

**响应**: `200 OK`
```json
{
  "name": "project-context",
  "description": "项目上下文",
  "type": "context",
  "content": "This is a Python ML project"
}
```

---

### 列出 Memories

**端点**: `GET /api/v1/memory`

**查询参数**: `pattern` - 前缀匹配

**响应**: `200 OK`
```json
{ "memories": [...] }
```

---

### 删除 Memory

**端点**: `DELETE /api/v1/memory/:key`

**响应**: `200 OK`
```json
{ "ok": true }
```

---

## Cost API

### 获取模型定价

**端点**: `GET /api/v1/cost/pricing`

**查询参数**: `model` - 可选，指定模型

**响应**: `200 OK` (所有模型)
```json
{
  "models": [
    { "model": "claude-sonnet-4-6", "pricing": { "input": 0.003, "output": 0.015 } },
    { "model": "claude-opus-4-6", "pricing": { "input": 0.015, "output": 0.075 } },
    { "model": "claude-haiku-4-5-20251001", "pricing": { "input": 0.0008, "output": 0.004 } }
  ]
}
```

**响应**: `200 OK` (指定模型)
```json
{
  "model": "claude-sonnet-4-6",
  "pricing": { "input": 0.003, "output": 0.015 }
}
```

---

### 计算成本

**端点**: `POST /api/v1/cost/calculate`

**请求体**:
```json
{
  "model": "claude-sonnet-4-6",
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 500,
    "cacheCreationInputTokens": 0,
    "cacheReadInputTokens": 0
  }
}
```

**响应**: `200 OK`
```json
{
  "model": "claude-sonnet-4-6",
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 500,
    "cacheCreationInputTokens": 0,
    "cacheReadInputTokens": 0
  },
  "costUSD": 0.0135
}
```

---

## Git API

### 获取 Git 状态

**端点**: `GET /api/v1/git/state`

**查询参数**: `path` - 可选，仓库路径

**响应**: `200 OK`
```json
{
  "branch": "main",
  "clean": false,
  "ahead": 2,
  "behind": 0,
  "status": "modified"
}
```

---

## Skills API

### 列出 Skills

**端点**: `GET /api/v1/skills`

**查询参数**: `path` - 可选，skills 目录，默认 `.claude/skills`

**响应**: `200 OK`
```json
{
  "skills": [{
    "name": "code-review",
    "description": "Review code changes",
    "filePath": "/workspace/.claude/skills/code-review.md",
    "allowedTools": ["Bash", "FileRead"],
    "arguments": [{ "name": "target", "required": true }],
    "context": {}
  }]
}
```

---

### 获取 Skill 内容

**端点**: `GET /api/v1/skills/:name`

**响应**: `200 OK`
```json
{
  "name": "code-review",
  "description": "Review code changes",
  "content": "## Code Review...",
  "filePath": "/workspace/.claude/skills/code-review.md"
}
```

---

### 展开 Skill 内容

**端点**: `POST /api/v1/skills/expand`

**请求体**:
```json
{
  "content": "Review {{target}} for bugs",
  "args": "target=src/main.py"
}
```

**响应**: `200 OK`
```json
{ "expanded": "Review src/main.py for bugs" }
```

---

## 错误响应

统一格式：
```json
{ "error": "错误描述" }
```

| 状态码 | 说明 |
|--------|------|
| `400` | 请求参数无效 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |

---

## 优雅关闭

收到 SIGTERM/SIGINT 时：
1. 停止接受新请求
2. 中止所有活跃 session
3. 退出进程

---

## 未实现的 API（文档仅供参考）

以下功能在当前版本中暂未实现：

### MCP API

| 端点 | 说明 |
|------|------|
| `POST /api/v1/mcp/connect` | 连接 MCP 服务器 |
| `GET /api/v1/mcp/tools` | 列出 MCP Tools |
| `POST /api/v1/mcp/tools/call` | 调用 MCP Tool |
| `DELETE /api/v1/mcp/:serverId` | 断开 MCP 服务器 |

### Tools API

| 端点 | 说明 |
|------|------|
| `POST /api/v1/tools` | 定义自定义工具 |
| `GET /api/v1/tools` | 列出自定义工具 |
| `GET /api/v1/tools/:name` | 获取自定义工具 |
| `DELETE /api/v1/tools/:name` | 删除自定义工具 |

### WebSocket Hooks

| 端点 | 说明 |
|------|------|
| `GET /ws/sessions/:id/hooks` | WebSocket Hook 连接 |

Hook 类型（暂不可用）：

| 类型 | 触发时机 |
|------|----------|
| `onPreToolUse` | 工具执行前 |
| `onPostToolUse` | 工具执行后 |
| `onTurnStart` | 对话轮开始 |
| `onTurnEnd` | 对话轮结束 |
| `onError` | 发生错误 |
| `onCompact` | 压缩时 |
| `onMaxTurns` | 达到最大轮数 |
| `onSessionStart` | Session 启动时 |
